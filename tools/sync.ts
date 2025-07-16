#!/usr/bin/env node
/*
Name: VirBiCoin Blockchain syncer
Version: 1.0.0
This file will start syncing the blockchain from the VirBiCoin node
*/

import Web3 from 'web3';
import type { Transaction as Web3Transaction, Block as Web3Block, TransactionReceipt } from 'web3-types';
import { connectDB, Block, Transaction, IBlock, ITransaction } from '../models/index';

// Initialize database connection
const initDB = async () => {
  try {
    await connectDB();
    console.log('Database connection initialized successfully');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }
};

// Utility functions for web3 v4 type conversions
const toNumber = (value: any): number => {
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') return parseInt(value, 10);
  return Number(value) || 0;
};

const toString = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Uint8Array) return Web3.utils.bytesToHex(value);
  return String(value);
};

const toBoolean = (value: any): boolean | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'bigint') return value > 0n;
  if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true';
  return Boolean(value);
};

// Interface definitions
interface Config {
  nodeAddr: string;
  port: number;
  wsPort: number;
  bulkSize: number;
  syncAll: boolean;
  patch: boolean;
  quiet: boolean;
  useRichList: boolean;
  startBlock: number;
  endBlock: number | null;
}

interface NormalizedTransaction {
  blockHash: string | null;
  blockNumber: number | null;
  from: string | null;
  hash: string;
  value: string;
  nonce: number;
  gas: number;
  gasUsed: number;
  gasPrice: string;
  input: string;
  transactionIndex: number | null;
  timestamp: number;
  status: boolean | null;
  to?: string;
}

interface BlockDocument {
  number: number;
  hash: string;
  parentHash: string;
  nonce: string;
  sha3Uncles: string;
  logsBloom: string;
  transactionsRoot: string;
  stateRoot: string;
  receiptsRoot: string;
  miner: string | null;
  difficulty: string;
  totalDifficulty: string;
  extraData: string;
  size: number;
  gasLimit: number;
  gasUsed: number;
  timestamp: number;
  transactions: string[];
  uncles: string[];
}

// VirBiCoin Configuration
const config: Config = {
  nodeAddr: 'localhost',
  port: 8329,
  wsPort: 8330,
  bulkSize: 100,
  syncAll: false,
  patch: false,
  quiet: false,
  useRichList: true,
  startBlock: 0,
  endBlock: null
};

// Try to load config.json
try {
  const local = require('../config.json');
  Object.assign(config, local);
  console.log('config.json found.');
  
  // Set MongoDB URI from config if available
  if (local.database && local.database.uri) {
    process.env.MONGODB_URI = local.database.uri;
    console.log('MongoDB URI set from config.json');
  }
} catch (error) {
  console.log('No config file found. Using default configuration...');
}

// Initialize database connection after config is loaded
initDB();

// Parse command line arguments
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--start':
      if (i + 1 < args.length) {
        config.startBlock = parseInt(args[++i]) || 0;
      }
      break;
    case '--end':
      if (i + 1 < args.length) {
        config.endBlock = parseInt(args[++i]) || null;
      }
      break;
    case '--sync-all':
      config.syncAll = true;
      break;
    case '--quiet':
      config.quiet = true;
      break;
    case '--help':
      console.log(`
Usage: npm run sync [options]

Options:
  --start <block>     Start block number (default: 0)
  --end <block>       End block number (default: latest)
  --sync-all          Force full sync from start block
  --quiet             Reduce console output
  --help              Show this help message

Examples:
  npm run sync                    # Sync from config.json settings
  npm run sync --start 0 --end 1000  # Sync blocks 0-1000
  npm run sync --sync-all        # Force full sync from block 0
      `);
      process.exit(0);
  }
}

// Override config with command line arguments if provided
if (args.length >= 2 && !isNaN(parseInt(args[0])) && !isNaN(parseInt(args[1]))) {
  config.startBlock = parseInt(args[0]);
  config.endBlock = parseInt(args[1]);
  config.syncAll = true;
  console.log(`Command line override: syncing blocks ${config.startBlock} to ${config.endBlock}`);
}

console.log(`Connecting to VirBiCoin node ${config.nodeAddr}:${config.port}...`);

// Web3 connection
const web3 = new Web3(new Web3.providers.HttpProvider(`http://${config.nodeAddr}:${config.port}`));

/**
 * Normalize transaction data
 */
const normalizeTX = async (
  txData: any, // Using any due to web3 v4 type complexity
  receipt: any | null,
  blockData: any
): Promise<NormalizedTransaction> => {
  const tx: NormalizedTransaction = {
    blockHash: toString(txData.blockHash || blockData.hash),
    blockNumber: toNumber(txData.blockNumber || blockData.number),
    from: txData.from ? toString(txData.from).toLowerCase() : null,
    hash: toString(txData.hash).toLowerCase(),
    value: toString(txData.value || '0'),
    nonce: toNumber(txData.nonce),
    gas: toNumber(txData.gas),
    gasUsed: receipt ? toNumber(receipt.gasUsed) : 0,
    gasPrice: toString(txData.gasPrice || '0'),
    input: toString(txData.input || txData.data || '0x'),
    transactionIndex: toNumber(txData.transactionIndex),
    timestamp: toNumber(blockData.timestamp),
    status: receipt ? toBoolean(receipt.status) : null
  };

  if (txData.to) {
    tx.to = toString(txData.to).toLowerCase();
  }

  return tx;
};

/**
 * Write block to database
 */
interface WriteBlockToDB {
  (blockData: any | null, flush?: boolean): Promise<void>;
  bulkOps?: BlockDocument[];
}

const writeBlockToDB: WriteBlockToDB = async function (blockData: any | null, flush = false): Promise<void> {
  const self = writeBlockToDB;
  if (!self.bulkOps) {
    self.bulkOps = [];
  }

  if (blockData && toNumber(blockData.number) >= 0) {
    const blockDoc: BlockDocument = {
      number: toNumber(blockData.number),
      hash: toString(blockData.hash),
      parentHash: toString(blockData.parentHash),
      nonce: toString(blockData.nonce),
      sha3Uncles: toString(blockData.sha3Uncles),
      logsBloom: toString(blockData.logsBloom),
      transactionsRoot: toString(blockData.transactionsRoot),
      stateRoot: toString(blockData.stateRoot),
      receiptsRoot: toString(blockData.receiptsRoot),
      miner: blockData.miner ? toString(blockData.miner).toLowerCase() : null,
      difficulty: toString(blockData.difficulty),
      totalDifficulty: toString(blockData.totalDifficulty),
      extraData: toString(blockData.extraData),
      size: toNumber(blockData.size),
      gasLimit: toNumber(blockData.gasLimit),
      gasUsed: toNumber(blockData.gasUsed),
      timestamp: toNumber(blockData.timestamp),
      transactions: blockData.transactions.map((tx: any) => 
        typeof tx === 'string' ? tx : toString(tx.hash)
      ),
      uncles: blockData.uncles || []
    };

    self.bulkOps.push(blockDoc);

    if (!config.quiet) {
      console.log(`\t- block #${blockData.number} prepared for insertion.`);
    }
  }

  if (flush && self.bulkOps.length > 0 || self.bulkOps.length >= config.bulkSize) {
    const bulk = self.bulkOps;
    self.bulkOps = [];

    if (bulk.length === 0) return;

    // Use upsert to avoid duplicates
    for (const block of bulk) {
      try {
        await Block.updateOne({ number: block.number }, { $set: block }, { upsert: true });
      } catch (err) {
        console.log(`Error: Failed to upsert block #${block.number}: ${err}`);
      }
    }
    if (!config.quiet) {
      console.log(`* ${bulk.length} blocks upserted.`);
    }
  }
};

/**
 * Write transactions to database
 */
interface WriteTransactionsToDB {
  (blockData: any | null, flush?: boolean): Promise<void>;
  bulkOps?: NormalizedTransaction[];
  blocks?: number;
}

const writeTransactionsToDB: WriteTransactionsToDB = async function (
  blockData: any | null,
  flush = false
): Promise<void> {
  const self = writeTransactionsToDB;
  if (!self.bulkOps) {
    self.bulkOps = [];
    self.blocks = 0;
  }

  if (blockData && blockData.transactions.length > 0) {
    for (const txData of blockData.transactions) {
      if (typeof txData === 'string') continue; // Skip if only hash

      try {
        const receipt = await web3.eth.getTransactionReceipt(toString(txData.hash));
        const tx = await normalizeTX(txData, receipt, blockData);
        self.bulkOps.push(tx);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`Warning: Failed to get receipt for tx ${toString(txData.hash)}: ${errorMessage}`);
      }
    }

    if (!config.quiet) {
      console.log(`\t- block #${blockData.number}: ${blockData.transactions.length} transactions recorded.`);
    }
  }

  self.blocks = (self.blocks || 0) + 1;

  if (flush && (self.blocks || 0) > 0 || (self.bulkOps?.length || 0) >= config.bulkSize) {
    const bulk = self.bulkOps || [];
    self.bulkOps = [];
    self.blocks = 0;

    if (bulk.length === 0) return;

    // Insert transactions
    try {
      const docs = await Transaction.insertMany(bulk, { ordered: false });
      if (!config.quiet) {
        console.log(`* ${docs.length} transactions successfully recorded.`);
      }
    } catch (err: any) {
      if (err.code === 11000) {
        if (!config.quiet) {
          console.log('Skip: Duplicate transaction keys detected');
        }
      } else {
        console.log(`Error: Failed to insert transactions: ${err}`);
        process.exit(9);
      }
    }
  }
};

/**
 * Listen for new blocks (real-time sync)
 */
const listenBlocks = function (): void {
  console.log('Starting real-time block listener...');

  const pollInterval = 5000; // Poll every 5 seconds
  let lastProcessedBlock = 0;

  const poll = async (): Promise<void> => {
    try {
      const currentBlockBigInt = await web3.eth.getBlockNumber();
      const currentBlock = toNumber(currentBlockBigInt);

      if (currentBlock > lastProcessedBlock) {
        console.log(`New block detected: ${currentBlock}`);

        // Process new blocks
        for (let blockNum = lastProcessedBlock + 1; blockNum <= currentBlock; blockNum++) {
          const blockData = await web3.eth.getBlock(blockNum, true);

          if (blockData) {
            await writeBlockToDB(blockData, true);
            await writeTransactionsToDB(blockData, true);
          }
        }

        lastProcessedBlock = currentBlock;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`Error polling for blocks: ${errorMessage}`);
    }
  };

  // Get initial block number
  web3.eth.getBlockNumber()
    .then(blockNumberBigInt => {
      lastProcessedBlock = toNumber(blockNumberBigInt);
      console.log(`Starting from block: ${lastProcessedBlock}`);

      // Start polling
      setInterval(poll, pollInterval);
    })
    .catch(err => {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.log(`Error getting initial block number: ${errorMessage}`);
    });
};

/**
 * Sync chain from specific block range
 */
const syncChain = async function (startBlock?: number, endBlock?: number): Promise<void> {
  // Use config values if not provided
  if (!startBlock) {
    startBlock = config.startBlock;
  }
  if (!endBlock) {
    const latestBlockBigInt = await web3.eth.getBlockNumber();
    endBlock = config.endBlock ? Math.min(config.endBlock, toNumber(latestBlockBigInt)) : toNumber(latestBlockBigInt);
  }

  console.log(`Syncing blocks from ${startBlock} to ${endBlock}...`);

  // Check which blocks already exist in database
  const existingBlocks = await Block.find({ 
    number: { $gte: startBlock, $lte: endBlock } 
  }).select('number').lean();
  
  const existingBlockNumbers = new Set(existingBlocks.map(b => b.number));
  console.log(`Found ${existingBlocks.length} existing blocks in range ${startBlock}-${endBlock}`);

  let processedCount = 0;
  let skippedCount = 0;

  for (let blockNum = startBlock; blockNum <= endBlock; blockNum++) {
    try {
      // Check if block already exists in DB
      const existingBlock = await Block.findOne({ number: blockNum }).lean();
      
      if (existingBlock) {
        if (!config.quiet) {
          console.log(`Skipping existing block #${blockNum} (already in DB)`);
        }
        skippedCount++;
        continue;
      }

      const blockData = await web3.eth.getBlock(blockNum, true);

      if (blockData) {
        // Process new block
        await writeBlockToDB(blockData);
        await writeTransactionsToDB(blockData);
        processedCount++;
      }

      // Flush every bulkSize blocks
      if ((blockNum - startBlock) % config.bulkSize === 0) {
        await writeBlockToDB(null, true);
        await writeTransactionsToDB(null, true);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`Error syncing block ${blockNum}: ${errorMessage}`);
    }
  }

  // Final flush
  await writeBlockToDB(null, true);
  await writeTransactionsToDB(null, true);

  console.log(`*** Sync Completed ***`);
  console.log(`Processed: ${processedCount} blocks`);
  console.log(`Skipped: ${skippedCount} existing blocks`);
};

/**
 * Check database and prepare sync
 */
const prepareSync = async (): Promise<void> => {
  try {
    // Find the latest block in database
    const latestBlockDoc = await Block.findOne({}, { number: 1 }).sort({ number: -1 });

    if (latestBlockDoc) {
      const dbLatestBlock = latestBlockDoc.number;
      const nodeLatestBlockBigInt = await web3.eth.getBlockNumber();
      const nodeLatestBlock = toNumber(nodeLatestBlockBigInt);

      console.log(`Database latest block: ${dbLatestBlock}`);
      console.log(`Node latest block: ${nodeLatestBlock}`);

      if (nodeLatestBlock > dbLatestBlock) {
        console.log(`Syncing missing blocks: ${dbLatestBlock + 1} to ${nodeLatestBlock}`);
        await syncChain(dbLatestBlock + 1, nodeLatestBlock);
      } else {
        console.log('Database is up to date');
      }
    } else {
      console.log('No blocks found in database, starting initial sync...');
      // Use config values for initial sync
      await syncChain(config.startBlock, config.endBlock || undefined);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`Error in prepareSync: ${errorMessage}`);
  }
};



/**
 * Main execution
 */
const main = async (): Promise<void> => {
  try {
    // Test connection
    const isListening = await web3.eth.net.isListening();
    if (!isListening) {
      console.log('Error: Cannot connect to VirBiCoin node');
      process.exit(1);
    }

    console.log('Connected to VirBiCoin node successfully');

    // Run initial sync if requested
    if (config.syncAll) {
      console.log('Starting full sync as requested...');
      await syncChain(config.startBlock, config.endBlock || undefined);
    } else {
      await prepareSync();
    }

    // Start real-time listener
    listenBlocks();

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`Fatal error: ${errorMessage}`);
    process.exit(1);
  }
};

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  // Flush any remaining data
  await writeBlockToDB(null, true);
  await writeTransactionsToDB(null, true);
  process.exit(0);
});

// Start the syncer
main();
