#!/usr/bin/env node
/// <reference path="../types/human-standard-token-abi.d.ts" />

/*
Name: VirBiCoin Token Scanner
Version: 1.0.0
This file will scan the blockchain for new token contracts and update the database.
*/

import Web3 from 'web3';
import mongoose from 'mongoose';
import Token from '../models/Token.js'; // Using .js extension for Node ESM
import humanStandardTokenAbi from 'human-standard-token-abi';
import SyncState from '../models/SyncState'; // Import the SyncState model

// Import additional models for token transfers and holders
import '../models/index'; // Ensure all models are loaded

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

// Database connection function
async function connectDB() {
  try {
    if (mongoose.connection.readyState === 1) {
      return; // Already connected
    }
    await mongoose.connect('mongodb://localhost:27017/explorerDB'); // Changed to explorerDB
    console.log('Connected to MongoDB');
    
    // Wait for connection to be established
    await new Promise(resolve => {
      if (mongoose.connection.readyState === 1) {
        resolve(true);
      } else {
        mongoose.connection.once('connected', resolve);
      }
    });
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

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
const WEB3_PROVIDER_URL = 'http://localhost:8329'; // Gvbc/Geth RPC endpoint
const START_BLOCK = 0; // Default start block if no sync state is found
const BLOCKS_PER_BATCH = 100; // Process blocks in batches
const SCAN_INTERVAL_MS = 60000; // 1 minute

const web3 = new Web3(new Web3.providers.HttpProvider(WEB3_PROVIDER_URL));

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

// Function to get actual token transfers from blockchain
async function getTokenTransfers(tokenAddress: string, fromBlock: number = 0): Promise<any[]> {
  try {
    console.log(`Fetching Transfer events for token ${tokenAddress} from block ${fromBlock}...`);
    
    // Get Transfer events for this token
    const logs = await web3.eth.getPastLogs({
      address: tokenAddress,
      topics: [ERC721_TRANSFER_TOPIC],
      fromBlock: fromBlock,
      toBlock: 'latest'
    });

    console.log(`Found ${logs.length} Transfer events for token ${tokenAddress}`);

    const transfers = [];
    for (const log of logs) {
      try {
        // Type assertion for log object
        const logEvent = log as any;
        const block = await web3.eth.getBlock(logEvent.blockNumber);
        
        // Decode transfer event (from, to, tokenId)
        const from = '0x' + logEvent.topics[1].slice(26); // Remove padding
        const to = '0x' + logEvent.topics[2].slice(26); // Remove padding
        const tokenId = web3.utils.hexToNumber(logEvent.topics[3] || logEvent.data);

        console.log(`Processing transfer: ${from} -> ${to}, tokenId: ${tokenId}`);

        transfers.push({
          transactionHash: logEvent.transactionHash,
          blockNumber: logEvent.blockNumber,
          from: from.toLowerCase(),
          to: to.toLowerCase(),
          value: '1', // NFTs have value of 1
          tokenAddress: tokenAddress.toLowerCase(),
          timestamp: new Date(Number(block.timestamp) * 1000),
          tokenId: tokenId
        });
      } catch (error) {
        console.error(`Error processing transfer log:`, error);
      }
    }

    console.log(`Successfully processed ${transfers.length} transfers for token ${tokenAddress}`);
    return transfers;
  } catch (error) {
    console.error(`Error getting transfers for token ${tokenAddress}:`, error);
    return [];
  }
}

// Function to calculate token holders from transfers
async function calculateTokenHolders(transfers: any[]): Promise<any[]> {
  const holderBalances = new Map<string, number>();
  
  // Process transfers to calculate current balances
  for (const transfer of transfers) {
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
  console.log(`Updating token ${tokenAddress} with real blockchain data...`);
  
  try {
    // Get actual transfers from blockchain
    const transfers = await getTokenTransfers(tokenAddress);
    console.log(`Found ${transfers.length} transfers for token ${tokenAddress}`);
    
    if (transfers.length === 0) {
      console.log(`No transfers found for token ${tokenAddress}`);
      // 既存データを残すため、returnするだけ（削除・上書きしない）
      return;
    }
    
    // Calculate holders from transfers
    const holders = await calculateTokenHolders(transfers);
    console.log(`Calculated ${holders.length} holders for token ${tokenAddress}`);
    
    // Connect to database
    await connectDB();
    
    // Wait a bit for connection to be fully established
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    
    console.log('Database connection confirmed');
    
    // Upsert real transfers
    for (const transfer of transfers) {
      await db.collection('tokentransfers').findOneAndUpdate(
        { transactionHash: transfer.transactionHash },
        { $set: transfer },
        { upsert: true }
      );
    }
    console.log(`Upserted ${transfers.length} real transfers`);
    // Remove old transfers not in the latest set
    const txHashes = transfers.map(t => t.transactionHash);
    await db.collection('tokentransfers').deleteMany({
      tokenAddress: tokenAddress.toLowerCase(),
      transactionHash: { $nin: txHashes }
    });

    // Upsert real holders
    for (const holder of holders) {
      await db.collection('tokenholders').findOneAndUpdate(
        { tokenAddress: holder.tokenAddress, holderAddress: holder.holderAddress },
        { $set: holder },
        { upsert: true }
      );
    }
    console.log(`Upserted ${holders.length} real holders`);
    // Remove old holders not in the latest set
    const holderAddresses = holders.map(h => h.holderAddress);
    await db.collection('tokenholders').deleteMany({
      tokenAddress: tokenAddress.toLowerCase(),
      holderAddress: { $nin: holderAddresses }
    });
    
    // Update token total supply based on mints
    const mints = transfers.filter(t => t.from === '0x0000000000000000000000000000000000000000');
    console.log(`Found ${mints.length} mint transactions for token ${tokenAddress}`);
    
    // Log all mints for debugging
    mints.forEach((mint, index) => {
      console.log(`Mint ${index + 1}: ${mint.from} -> ${mint.to}, tokenId: ${mint.tokenId}`);
    });
    
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
    
    console.log(`Updated token ${tokenAddress}: supply=${mints.length}, holders=${holders.length}, total transfers=${transfers.length}`);
    
  } catch (error) {
    console.error(`Error updating token ${tokenAddress} with real data:`, error);
  }
}

async function scanForTokens() {
  console.log('Starting token scan...');
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }
  } catch (error) {
    console.error('Failed to connect to database:', error);
    return; // Skip this scan if DB connection fails
  }

  try {
    // Ensure DB connection before database operations
    if (mongoose.connection.readyState !== 1) {
      console.log('Reconnecting to database...');
      await connectDB();
    }
    
    // Get the last scanned block from the database
    let syncState = await SyncState.findOne({ scannerName: 'tokenScanner' });
    if (!syncState) {
      console.log('No sync state found, creating a new one.');
      syncState = new SyncState({
        scannerName: 'tokenScanner',
        lastScannedBlock: START_BLOCK,
      });
    } else {
      console.log(`Resuming scan from block ${syncState.lastScannedBlock + 1}`);
    }

    const latestBlockNumber = await web3.eth.getBlockNumber();
    console.log(`Latest block number: ${latestBlockNumber}`);

    let fromBlock = syncState.lastScannedBlock + 1;

    while (fromBlock <= latestBlockNumber) {
      const toBlock = Math.min(fromBlock + BLOCKS_PER_BATCH - 1, Number(latestBlockNumber));
      console.log(`Scanning blocks from ${fromBlock} to ${toBlock}...`);

      // Check which blocks in this range have already been scanned for tokens
      const existingTokens = await Token.find({}).select('address').lean();
      const existingTokenAddresses = new Set(existingTokens.map(t => t.address.toLowerCase()));
      
      let newTokensFound = 0;
      let existingTokensSkipped = 0;

      for (let i = fromBlock; i <= toBlock; i++) {
        const block = await web3.eth.getBlock(i, true);
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

                console.log(`Potential contract found at address: ${contractAddress} in block ${i}`);

                // Check if it's an ERC20 token
                if (await isErc20Token(contractAddress)) {
                    // Check if token already exists in DB
                    const existingToken = await Token.findOne({ address: contractAddress.toLowerCase() }).lean();
                    
                    if (existingToken) {
                        console.log(`Skipping existing ERC20 token: ${contractAddress} (already in DB)`);
                        continue;
                    }
                    
                    const contract = new web3.eth.Contract(humanStandardTokenAbi, contractAddress);
                    const name = await contract.methods.name().call() as string;
                    const symbol = await contract.methods.symbol().call() as string;
                    const decimals = await contract.methods.decimals().call() as bigint;
                    const totalSupply = await contract.methods.totalSupply().call() as bigint;

                    console.log(`Found ERC20 Token: ${name} (${symbol})`);

                    // Ensure DB connection before database operations
                    if (mongoose.connection.readyState !== 1) {
                      console.log('Reconnecting to database for ERC20 token...');
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
                        holders: 0, // This would be updated by another script like richlist
                        supply: totalSupply.toString(),
                    });
                    await newToken.save();
                    
                    newTokensFound++;
                    existingTokenAddresses.add(contractAddress.toLowerCase());
                } else if (await isErc721Token(contractAddress)) {
                  console.log(`Contract ${contractAddress} is a VRC-721 (ERC721 Compatible) token.`);
                  
                  // Check if token already exists in DB
                  const existingToken = await Token.findOne({ address: contractAddress.toLowerCase() }).lean();
                  
                  if (existingToken) {
                      console.log(`Skipping existing VRC-721 token: ${contractAddress} (already in DB)`);
                      continue;
                  }
                  
                  const tokenContract = new web3.eth.Contract(minimalErc721Abi as any, contractAddress);
                   try {
                        const name = await tokenContract.methods.name().call();
                        // VRC-721 doesn't have a standard symbol method, so we can leave it empty or use name
                        const symbol = await tokenContract.methods.symbol().call();
                        const decimals = 0; // NFTs are non-fungible
                        // Total supply for VRC-721 is often tracked differently. Placeholder.
                        const totalSupply = 0;

                        // Ensure DB connection before database operations
                        if (mongoose.connection.readyState !== 1) {
                          console.log('Reconnecting to database for VRC-721 token...');
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
                        
                        newTokensFound++;
                        existingTokenAddresses.add(contractAddress.toLowerCase());
                  } catch (e) {
                      console.error(`Error fetching details for VRC-721 token ${contractAddress}:`, e);
                      continue; // Skip this token if details can't be fetched
                  }
                }
              }
            }
          }
        }
      }

      console.log(`Block range ${fromBlock}-${toBlock}: Found ${newTokensFound} new tokens, skipped ${existingTokensSkipped} existing tokens`);
      fromBlock = toBlock + 1;
    }
  } catch (error) {
    console.error('An error occurred during token scanning:', error);
  }

  console.log(`Token scan finished. Next scan in ${SCAN_INTERVAL_MS / 1000} seconds.`);
}

// Main function to update OSATO token with real data
async function updateOsatoTokenData() {
  const OSATO_TOKEN_ADDRESS = '0xd26488ea362005b023bc9f55157370c63c94d0c7';
  
  console.log('=== Starting OSATO token real data update ===');
  console.log(`Token address: ${OSATO_TOKEN_ADDRESS}`);
  
  try {
    await updateTokenWithRealData(OSATO_TOKEN_ADDRESS);
    console.log('=== OSATO token real data update completed successfully ===');
  } catch (error) {
    console.error('=== Error updating OSATO token data ===', error);
  }
  
  await disconnect();
}

// 全VRC-721トークンを一括で更新する関数
async function updateAllVrc721Tokens() {
  try {
    // Ensure DB connection
    if (mongoose.connection.readyState !== 1) {
      console.log('Reconnecting to database for VRC-721 update...');
      await connectDB();
    }
    
    const tokens = await Token.find({ type: { $in: ['VRC-721', 'ERC721', 'VRC721'] } });
    console.log(`Found ${tokens.length} VRC-721 tokens to update`);
    
    for (const token of tokens) {
      try {
        await updateTokenWithRealData(token.address);
      } catch (error) {
        console.error(`Error updating token ${token.address}:`, error);
        // Continue with next token even if one fails
      }
    }
  } catch (error) {
    console.error('Error in updateAllVrc721Tokens:', error);
  }
}

// Export for use by other scripts
export { updateTokenWithRealData, updateOsatoTokenData };

// If this script is run directly, update OSATO token data
if (require.main === module) {
  updateOsatoTokenData().catch(error => {
    console.error('Error updating OSATO token data:', error);
    process.exit(1);
  });
}

async function main() {
  try {
    // Check command line arguments
    const args = process.argv.slice(2);
    
    if (args.includes('--update-all-vrc721')) {
      await updateAllVrc721Tokens();
      return;
    }
    if (args.includes('--update-osato')) {
      await updateOsatoTokenData();
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
        console.error('Error in scanForTokens interval:', error);
      }
    }, SCAN_INTERVAL_MS);

    // VRC-721トークンの自動更新（scanForTokensと同じ間隔で60秒ごと）
    setInterval(async () => {
      try {
        await updateAllVrc721Tokens();
      } catch (error) {
        console.error('Error in updateAllVrc721Tokens interval:', error);
      }
    }, SCAN_INTERVAL_MS);

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Caught interrupt signal. Shutting down gracefully.');
      await disconnect();
      console.log('Database disconnected.');
      process.exit(0);
    });
  } catch (error) {
    console.error('Error in main function:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error("Unhandled error in main function:", error);
  process.exit(1);
});
