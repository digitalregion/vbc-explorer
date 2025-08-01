#!/usr/bin/env node
/// <reference path="../types/human-standard-token-abi.d.ts" />

/*
Name: VirBiCoin Token Scanner
Version: 1.0.0
This file will scan the blockchain for new token contracts and update the database.
*/

import Web3 from 'web3';
import mongoose from 'mongoose';
import humanStandardTokenAbi from 'human-standard-token-abi';
import fs from 'fs';
import path from 'path';

// Import additional models for token transfers and holders
import '../models/index'; // Ensure all models are loaded

// Define Token schema inline since it's not exported from models/index
const tokenSchema = new mongoose.Schema({
  address: String,
  name: String,
  symbol: String,
  decimals: { type: Number, default: 18 },
  totalSupply: String,
  holders: { type: Number, default: 0 },
  type: String,
  supply: String,
  verified: { type: Boolean, default: false }
}, { collection: 'tokens' });

const Token = mongoose.models.Token || mongoose.model('Token', tokenSchema);

// Schema for tracking scan progress
const scanProgressSchema = new mongoose.Schema({
  scanType: { type: String, unique: true }, // 'tokens' or 'vrc721'
  lastScannedBlock: { type: Number, default: 0 },
  lastUpdateTime: { type: Date, default: Date.now }
}, { collection: 'scan_progress' });

const ScanProgress = mongoose.models.ScanProgress || mongoose.model('ScanProgress', scanProgressSchema);

// Basic VRC-721 (ERC721 Compatible) ABI for tokenURI and name
const minimalErc721Abi = [
  {
      "constant": true,
      "inputs": [],
      "name": "name",
      "outputs": [{ "name": "", "type": "string" }],
      "type": "function"
  },
  {
      "constant": true,
      "inputs": [],
      "name": "symbol",
      "outputs": [{ "name": "", "type": "string" }],
      "type": "function"
  },
  {
      "constant": true,
      "inputs": [{ "name": "_tokenId", "type": "uint256" }],
      "name": "tokenURI",
      "outputs": [{ "name": "", "type": "string" }],
      "type": "function"
  },
  {
      "constant": true,
      "inputs": [{ "name": "interfaceId", "type": "bytes4" }],
      "name": "supportsInterface",
      "outputs": [{ "name": "", "type": "bool" }],
      "type": "function"
  }
];

import { connectDB, Contract } from '../models/index';
import { loadConfig, getWeb3ProviderURL } from '../lib/config';

// Initialize database connection
const initDB = async () => {
  try {
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      console.log('🔗 Database already connected');
      return;
    }
    
    await connectDB();
    console.log('🔗 Database connection initialized successfully');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }
};

// Initialize database connection
initDB();

// Database disconnection function
async function disconnect() {
  try {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('MongoDB disconnection error:', error);
  }
}

// --- Configuration ---
const config = loadConfig();
const WEB3_PROVIDER_URL = getWeb3ProviderURL(); // Use centralized config
const START_BLOCK = 0; // Default start block if no sync state is found
const BLOCKS_PER_BATCH = 500; // Further reduced for CPU optimization
const SCAN_INTERVAL_MS = 900000; // 15 minutes (extended for CPU relief)
const BATCH_DELAY_MS = 1000; // Longer delay to reduce CPU load
const MAX_PARALLEL_BLOCKS = 20; // Limit parallel block fetching
const MEMORY_LIMIT_MB = parseInt(process.env.MEMORY_LIMIT_MB || '512'); // Optimized for 2GB instances

const web3 = new Web3(new Web3.providers.HttpProvider(WEB3_PROVIDER_URL));

// Memory monitoring function
const checkMemory = () => {
  const usage = process.memoryUsage();
  const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
  
  if (usedMB > MEMORY_LIMIT_MB) {
    console.log(`⚠️ Memory usage: ${usedMB}MB (limit: ${MEMORY_LIMIT_MB}MB)`);
    if (global.gc) {
      global.gc();
      console.log('🧹 Garbage collection executed');
    }
    return false;
  }
  return true;
};

// Improved batch processing with parallel execution and delay (CPU optimized)
const processBatchWithDelay = async (batch: any[], processor: Function, concurrency: number = 1) => {
  const results = [];
  
  // Process in smaller chunks for parallel execution
  for (let i = 0; i < batch.length; i += concurrency) {
    const chunk = batch.slice(i, i + concurrency);
    
    try {
      // Process chunk items in parallel
      const chunkPromises = chunk.map(async (item, index) => {
        try {
          return await processor(item);
        } catch (error) {
          console.error(`❌ Error processing item ${i + index}:`, error);
          return null;
        }
      });
      
      const chunkResults = await Promise.all(chunkPromises);
      
      // Filter out null results and add to results
      for (const result of chunkResults) {
        if (result) {
          results.push(result);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error processing chunk starting at ${i}:`, error);
    }
    
    // Memory check and delay between chunks
    if (!checkMemory()) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else if (i + concurrency < batch.length) {
      // Small delay between chunks to prevent overwhelming the node
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS / 10));
    }
  }
  
  return results;
};

async function isErc20Token(contractAddress: string): Promise<boolean> {
    try {
        const contract = new web3.eth.Contract(humanStandardTokenAbi, contractAddress);
        // Check for mandatory ERC20 functions
        await contract.methods.name().call();
        await contract.methods.symbol().call();
        await contract.methods.decimals().call();
        await contract.methods.totalSupply().call();
        return true;
    } catch (error) {
        // If any of the calls fail, it's likely not a standard ERC20 token
        return false;
    }
}

async function isErc721Token(contractAddress: string): Promise<boolean> {
  try {
    const contract = new web3.eth.Contract(minimalErc721Abi as any, contractAddress);
    // ERC721 interface ID is 0x80ac58cd. Check for ERC165 support.
    const supportsErc721Interface = await contract.methods.supportsInterface('0x80ac58cd').call();
    if (supportsErc721Interface) {
      return true;
    }
    // Fallback for contracts that don't explicitly support ERC165,
    // but might still have VRC-721 functions.
    // We check for tokenURI as a key indicator.
    await contract.methods.tokenURI(1).call();
    return true;
  } catch (error) {
    // If calls fail, it's not a standard VRC-721 token.
    // We can add more specific checks if needed.
    return false;
  }
}

// ERC721/VRC-721 Transfer event signature
const ERC721_TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// Function to get actual token transfers from blockchain with batching
async function getTokenTransfers(tokenAddress: string, fromBlock: number = 0): Promise<any[]> {
  try {
    console.log(`🔄 Fetching Transfer events for token ${tokenAddress} from block ${fromBlock}...`);
    
    // Get Transfer events for this token
    const logs = await web3.eth.getPastLogs({
      address: tokenAddress,
      topics: [ERC721_TRANSFER_TOPIC],
      fromBlock: fromBlock,
      toBlock: 'latest'
    });

    console.log(`🔍 Found ${logs.length} Transfer events for token ${tokenAddress}`);

    // Process logs in batches to reduce memory usage
    const batchSize = 100;
    const transfers = [];
    
    for (let i = 0; i < logs.length; i += batchSize) {
      const batch = logs.slice(i, i + batchSize);
      
      const batchTransfers = await processBatchWithDelay(batch, async (log: any) => {
        try {
          const block = await web3.eth.getBlock(log.blockNumber);
          
          // Decode transfer event (from, to, tokenId)
          const from = '0x' + log.topics[1].slice(26); // Remove padding
          const to = '0x' + log.topics[2].slice(26); // Remove padding
          const tokenId = web3.utils.hexToNumber(log.topics[3] || log.data);

          return {
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber,
            from: from.toLowerCase(),
            to: to.toLowerCase(),
            value: '1', // NFTs have value of 1
            tokenAddress: tokenAddress.toLowerCase(),
            timestamp: new Date(Number(block.timestamp) * 1000),
            tokenId: tokenId
          };
        } catch (error) {
          console.error(`❌ Error processing transfer log:`, error);
          return null;
        }
      });
      
      transfers.push(...batchTransfers.filter(t => t !== null));
      
      // Memory check and delay between batches
      if (!checkMemory()) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`✅ Successfully processed ${transfers.length} transfers for token ${tokenAddress}`);
    return transfers;
  } catch (error) {
    console.error(`❌ Error getting transfers for token ${tokenAddress}:`, error);
    return [];
  }
}

// Function to calculate token holders from transfers with optimization
async function calculateTokenHolders(transfers: any[]): Promise<any[]> {
  const holderBalances = new Map<string, number>();
  
  // Process transfers in batches
  const batchSize = 500;
  for (let i = 0; i < transfers.length; i += batchSize) {
    const batch = transfers.slice(i, i + batchSize);
    
    for (const transfer of batch) {
      const { from, to } = transfer;
      
      // If from is zero address, it's a mint
      if (from !== '0x0000000000000000000000000000000000000000') {
        const currentFrom = holderBalances.get(from) || 0;
        holderBalances.set(from, currentFrom - 1);
      }
      
      // Add to recipient
      const currentTo = holderBalances.get(to) || 0;
      holderBalances.set(to, currentTo + 1);
    }
    
    // Memory check between batches
    if (!checkMemory()) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Filter out zero balances and create holders array
  const holders = [];
  let rank = 1;
  
  for (const [address, balance] of holderBalances.entries()) {
    if (balance > 0) {
      holders.push({
        tokenAddress: transfers[0]?.tokenAddress || '',
        holderAddress: address,
        balance: balance.toString(),
        percentage: 0, // Will be calculated after we know total supply
        rank: rank++
      });
    }
  }
  
  // Sort by balance (highest first) and recalculate ranks
  holders.sort((a, b) => parseInt(b.balance) - parseInt(a.balance));
  
  // Calculate percentages based on total supply
  const totalSupply = holders.reduce((sum, holder) => sum + parseInt(holder.balance), 0);
  holders.forEach((holder, index) => {
    holder.rank = index + 1;
    holder.percentage = totalSupply > 0 ? (parseInt(holder.balance) / totalSupply) * 100 : 0;
  });
  
  return holders;
}

// Function to update token data with real blockchain data
async function updateTokenWithRealData(tokenAddress: string) {
  console.log(`🔄 Updating token ${tokenAddress} with real blockchain data...`);
  
  try {
    // Get actual transfers from blockchain
    const transfers = await getTokenTransfers(tokenAddress);
    console.log(`🔍 Found ${transfers.length} transfers for token ${tokenAddress}`);
    
    if (transfers.length === 0) {
      console.log(`📊 No transfers found for token ${tokenAddress}`);
      return;
    }
    
    // Calculate holders from transfers
    const holders = await calculateTokenHolders(transfers);
    console.log(`📈 Calculated ${holders.length} holders for token ${tokenAddress}`);
    
    // Connect to database
    await connectDB();
    
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    
    console.log('🔗 Database connection confirmed');
    
    // Upsert real transfers in batches
    const transferBatchSize = 200;
    for (let i = 0; i < transfers.length; i += transferBatchSize) {
      const batch = transfers.slice(i, i + transferBatchSize);
      
      const bulkOps = batch.map(transfer => ({
        updateOne: {
          filter: { transactionHash: transfer.transactionHash },
          update: { $set: transfer },
          upsert: true
        }
      }));
      
      await db.collection('tokentransfers').bulkWrite(bulkOps);
      
      // Memory check between batches
      if (!checkMemory()) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    console.log(`✅ Upserted ${transfers.length} real transfers`);
    
    // Remove old transfers not in the latest set
    const txHashes = transfers.map(t => t.transactionHash);
    await db.collection('tokentransfers').deleteMany({
      tokenAddress: tokenAddress.toLowerCase(),
      transactionHash: { $nin: txHashes }
    });

    // Upsert real holders in batches
    const holderBatchSize = 200;
    for (let i = 0; i < holders.length; i += holderBatchSize) {
      const batch = holders.slice(i, i + holderBatchSize);
      
      const bulkOps = batch.map(holder => ({
        updateOne: {
          filter: { tokenAddress: holder.tokenAddress, holderAddress: holder.holderAddress },
          update: { $set: holder },
          upsert: true
        }
      }));
      
      await db.collection('tokenholders').bulkWrite(bulkOps);
      
      // Memory check between batches
      if (!checkMemory()) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    console.log(`✅ Upserted ${holders.length} real holders`);
    
    // Remove old holders not in the latest set
    const holderAddresses = holders.map(h => h.holderAddress);
    await db.collection('tokenholders').deleteMany({
      tokenAddress: tokenAddress.toLowerCase(),
      holderAddress: { $nin: holderAddresses }
    });
    
    // Update token total supply based on mints
    const mints = transfers.filter(t => t.from === '0x0000000000000000000000000000000000000000');
    console.log(`🔍 Found ${mints.length} mint transactions for token ${tokenAddress}`);
    
    await db.collection('tokens').updateOne(
      { address: tokenAddress.toLowerCase() },
      { 
        $set: { 
          supply: mints.length.toString(),
          totalSupply: mints.length.toString(),
          holders: holders.length,
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`✅ Updated token ${tokenAddress}: supply=${mints.length}, holders=${holders.length}, total transfers=${transfers.length}`);
    
  } catch (error) {
    console.error(`❌ Error updating token ${tokenAddress} with real data:`, error);
  }
}

async function scanForTokens() {
  console.log('🔍 Starting incremental token scan...');
  try {
    // Ensure DB connection is active
    if (mongoose.connection.readyState !== 1) {
      console.log('🔌 Reconnecting to database...');
      await connectDB();
    }
    
    // Double-check connection
    if (mongoose.connection.readyState !== 1) {
      console.error('❌ Database connection failed after reconnection attempt');
      return;
    }
  } catch (error) {
    console.error('Failed to connect to database:', error);
    return;
  }

  try {
    // Get the latest scanned block from database
    let scanProgress = await ScanProgress.findOne({ scanType: 'tokens' });
    if (!scanProgress) {
      // Create initial scan progress record
      scanProgress = new ScanProgress({
        scanType: 'tokens',
        lastScannedBlock: START_BLOCK,
        lastUpdateTime: new Date()
      });
      await scanProgress.save();
    }

    const latestBlockNumberBigInt = await web3.eth.getBlockNumber();
    const latestBlockNumber = Number(latestBlockNumberBigInt);
    console.log(`🔍 Latest block number: ${latestBlockNumber}`);
    
    // Only scan new blocks since last scan
    let fromBlock = scanProgress.lastScannedBlock + 1;
    
    if (fromBlock > latestBlockNumber) {
      console.log(`✅ No new blocks to scan. Last scanned: ${scanProgress.lastScannedBlock}, Latest: ${latestBlockNumber}`);
      return;
    }
    
    console.log(`🚀 Scanning new blocks from ${fromBlock} to ${latestBlockNumber} (${latestBlockNumber - fromBlock + 1} blocks)`);

    while (fromBlock <= latestBlockNumber) {
      const toBlock = Math.min(fromBlock + BLOCKS_PER_BATCH - 1, latestBlockNumber);
      
      // 5000ブロック単位でログ出力
      if (fromBlock % 5000 === 0) {
        console.log(`🔍 Scanning blocks from ${fromBlock} to ${toBlock}...`);
      }

      // Check which blocks in this range have already been scanned for tokens
      const existingTokens = await Token.find({}).select('address').lean();
      const existingTokenAddresses = new Set(existingTokens.map(t => t.address.toLowerCase()));
      
      let newTokensFound = 0;
      let existingTokensSkipped = 0;

      // Process blocks in smaller chunks to reduce memory usage and CPU load
      const blockChunkSize = Math.min(MAX_PARALLEL_BLOCKS, 50); // Limit parallel processing
      for (let chunkStart = fromBlock; chunkStart <= toBlock; chunkStart += blockChunkSize) {
        const chunkEnd = Math.min(chunkStart + blockChunkSize - 1, toBlock);
        
        // Limit concurrent block fetches to reduce CPU load
        const blockPromises = [];
        for (let i = chunkStart; i <= chunkEnd; i++) {
          blockPromises.push(web3.eth.getBlock(i, true));
        }
        
        const blocks = await Promise.all(blockPromises);
        
        // Add delay between chunks to prevent CPU overload
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS / 2));
        
        for (const block of blocks) {
          if (block && block.transactions) {
            for (const tx of block.transactions) {
              // Check for contract creation transactions
              const txFull = typeof tx === 'string' ? await web3.eth.getTransaction(tx) : tx;
              if (txFull && !txFull.to) {
                const receipt = await web3.eth.getTransactionReceipt(txFull.hash);
                if (receipt && receipt.contractAddress) {
                  const contractAddress = receipt.contractAddress as string;
                  
                  // Skip if token already exists
                  if (existingTokenAddresses.has(contractAddress.toLowerCase())) {
                    existingTokensSkipped++;
                    continue;
                  }

                  console.log(`🏗️ Potential contract found at address: ${contractAddress} in block ${block.number}`);

                  // Check if it's an ERC20 token
                  if (await isErc20Token(contractAddress)) {
                      // Check if token already exists in DB
                      const existingToken = await Token.findOne({ address: contractAddress.toLowerCase() }).lean();
                      
                      if (existingToken) {
                          console.log(`⏭️ Skipping existing ERC20 token: ${contractAddress} (already in DB)`);
                          continue;
                      }
                      
                      const contract = new web3.eth.Contract(humanStandardTokenAbi, contractAddress);
                      const name = await contract.methods.name().call() as string;
                      const symbol = await contract.methods.symbol().call() as string;
                      const decimals = await contract.methods.decimals().call() as bigint;
                      const totalSupply = await contract.methods.totalSupply().call() as bigint;

                      console.log(`🪙 Found ERC20 Token: ${name} (${symbol})`);

                      // Ensure DB connection before database operations
                      if (mongoose.connection.readyState !== 1) {
                        console.log('🔌 Reconnecting to database for ERC20 token...');
                        await connectDB();
                      }

                      // Add new token to the database
                      const newToken = new Token({
                          name,
                          symbol,
                          address: contractAddress.toLowerCase(),
                          decimals: Number(decimals),
                          totalSupply: totalSupply.toString(),
                          type: 'ERC20',
                          holders: 0,
                          supply: totalSupply.toString(),
                      });
                      await newToken.save();
                      
                      // Also add to Contract collection for consistency
                      try {
                        const existingContract = await Contract.findOne({ address: contractAddress.toLowerCase() });
                        if (!existingContract) {
                          const newContract = new Contract({
                            address: contractAddress.toLowerCase(),
                            contractName: name,
                            tokenName: name,
                            symbol: symbol,
                            decimals: Number(decimals),
                            totalSupply: Number(totalSupply),
                            ERC: 2, // ERC20 = 2
                            verified: false,
                            blockNumber: block.number
                          });
                          await newContract.save();
                          console.log(`📝 Added contract ${contractAddress} to Contract collection`);
                        }
                      } catch (contractError) {
                        console.warn(`⚠️ Failed to add contract ${contractAddress} to Contract collection:`, contractError);
                      }
                      
                      newTokensFound++;
                      existingTokenAddresses.add(contractAddress.toLowerCase());
                  } else if (await isErc721Token(contractAddress)) {
                    console.log(`🎨 Contract ${contractAddress} is a VRC-721 (ERC721 Compatible) token.`);
                    
                    // Check if token already exists in DB
                    const existingToken = await Token.findOne({ address: contractAddress.toLowerCase() }).lean();
                    
                    if (existingToken) {
                        console.log(`⏭️ Skipping existing VRC-721 token: ${contractAddress} (already in DB)`);
                        continue;
                    }
                    
                    const tokenContract = new web3.eth.Contract(minimalErc721Abi as any, contractAddress);
                     try {
                          const name = await tokenContract.methods.name().call();
                          const symbol = await tokenContract.methods.symbol().call();
                          const decimals = 0;
                          const totalSupply = 0;

                          // Ensure DB connection before database operations
                          if (mongoose.connection.readyState !== 1) {
                            console.log('🔌 Reconnecting to database for VRC-721 token...');
                            await connectDB();
                          }

                          // Add new token to the database
                          const newToken = new Token({
                              name,
                              symbol,
                              address: contractAddress.toLowerCase(),
                              decimals,
                              totalSupply: totalSupply.toString(),
                              type: 'VRC-721',
                              holders: 0,
                              supply: totalSupply.toString(),
                          });
                          await newToken.save();
                          
                          // Also add to Contract collection for consistency
                          try {
                            const existingContract = await Contract.findOne({ address: contractAddress.toLowerCase() });
                            if (!existingContract) {
                              const newContract = new Contract({
                                address: contractAddress.toLowerCase(),
                                contractName: name,
                                tokenName: name,
                                symbol: symbol,
                                decimals: 0,
                                totalSupply: 0,
                                ERC: 3, // VRC-721 = 3 (similar to ERC721)
                                verified: false,
                                blockNumber: block.number
                              });
                              await newContract.save();
                              console.log(`📝 Added VRC-721 contract ${contractAddress} to Contract collection`);
                            }
                          } catch (contractError) {
                            console.warn(`⚠️ Failed to add VRC-721 contract ${contractAddress} to Contract collection:`, contractError);
                          }
                          
                          newTokensFound++;
                          existingTokenAddresses.add(contractAddress.toLowerCase());
                    } catch (e) {
                        console.error(`❌ Error fetching details for VRC-721 token ${contractAddress}:`, e);
                        continue;
                    }
                  }
                }
              }
            }
          }
        }
        
        // Memory check and delay between chunks (enhanced for CPU optimization)
        if (!checkMemory()) {
          console.log('🧹 Memory limit reached, forcing cleanup...');
          if (global.gc) {
            global.gc();
          }
          // Longer delay when memory is high
          await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
          // Regular CPU relief delay
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // 5000ブロック単位でログ出力
      if (fromBlock % 5000 === 0) {
        console.log(`📊 Block range ${fromBlock}-${toBlock}: Found ${newTokensFound} new tokens, skipped ${existingTokensSkipped} existing tokens`);
        console.log(`📈 Processed ${fromBlock} blocks for token scanning`);
      }
      
      fromBlock = toBlock + 1;
      
      // Update scan progress periodically
      await ScanProgress.updateOne(
        { scanType: 'tokens' },
        { 
          lastScannedBlock: toBlock,
          lastUpdateTime: new Date()
        },
        { upsert: true }
      );
      
      // Add delay between batches to reduce CPU usage
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
    
    // Final update of scan progress
    await ScanProgress.updateOne(
      { scanType: 'tokens' },
      { 
        lastScannedBlock: latestBlockNumber,
        lastUpdateTime: new Date()
      },
      { upsert: true }
    );
    
  } catch (error) {
    console.error('❌ An error occurred during token scanning:', error);
    // Save progress even on error
    try {
      // Get current scan progress to save partial work
      const currentProgress = await ScanProgress.findOne({ scanType: 'tokens' });
      if (currentProgress && currentProgress.lastScannedBlock > START_BLOCK) {
        console.log(`💾 Saving progress up to block ${currentProgress.lastScannedBlock}`);
      }
    } catch (progressError) {
      console.error('❌ Failed to save scan progress:', progressError);
    }
  }

  console.log(`✅ Incremental token scan finished. Next scan in ${SCAN_INTERVAL_MS / 1000} seconds.`);
}

// 全VRC-721トークンを一括で更新する関数（バッチ処理で最適化）
async function updateAllVrc721Tokens() {
  try {
    // Ensure DB connection
    if (mongoose.connection.readyState !== 1) {
          console.log('🔌 Reconnecting to database for VRC-721 update...');
    await connectDB();
  }
  
  const tokens = await Token.find({ type: { $in: ['VRC-721', 'ERC721', 'VRC721'] } });
  console.log(`🎨 Found ${tokens.length} VRC-721 tokens to update`);
    
    // Process tokens in batches
    const batchSize = 10;
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      
      const promises = batch.map(async (token) => {
        try {
          await updateTokenWithRealData(token.address);
        } catch (error) {
          console.error(`❌ Error updating token ${token.address}:`, error);
        }
      });
      
      await Promise.all(promises);
      
      // Memory check and delay between batches
      if (!checkMemory()) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      // Add delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error('❌ Error in updateAllVrc721Tokens:', error);
  }
}

// Export for use by other scripts
export { updateTokenWithRealData };

async function main() {
  try {
    // Initialize database connection first
    await initDB();
    
    // Check command line arguments
    const args = process.argv.slice(2);
    
    if (args.includes('--update-all-vrc721')) {
      await updateAllVrc721Tokens();
      await disconnect();
      return;
    }
    
    // Ensure initial DB connection
    await connectDB();
    
    // Default: 通常のトークンスキャン＋VRC-721トークンの定期自動更新
    await scanForTokens(); // Run once on start
    setInterval(async () => {
      try {
        await scanForTokens();
              } catch (error) {
          console.error('❌ Error in scanForTokens interval:', error);
        }
    }, SCAN_INTERVAL_MS);

    // VRC-721トークンの自動更新（scanForTokensと同じ間隔で10分ごと）
    setInterval(async () => {
      try {
        await updateAllVrc721Tokens();
              } catch (error) {
          console.error('❌ Error in updateAllVrc721Tokens interval:', error);
        }
    }, SCAN_INTERVAL_MS);

    // Graceful shutdown
    process.on('SIGINT', async () => {
          console.log('🛑 Caught interrupt signal. Shutting down gracefully.');
    await disconnect();
    console.log('🔌 Database disconnected.');
      process.exit(0);
    });
  } catch (error) {
    console.error('💥 Error in main function:', error);
    process.exit(1);
  }
}

export { main };

if (require.main === module) {
  main();
}
