#!/usr/bin/env node
/*
Name: VirBiCoin Blockchain syncer
Version: 1.0.0
This file will start syncing the blockchain from the VirBiCoin node
*/

import Web3 from 'web3';
import { TransactionReceipt, Transaction as Web3Transaction, Block as Web3Block } from 'web3-eth';
import { connectDB, Block, Transaction, IBlock, ITransaction } from '../models/index';

// Initialize database connection
connectDB().catch(console.error);

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
} catch (error) {
  console.log('No config file found. Using default configuration...');
}

console.log(`Connecting to VirBiCoin node ${config.nodeAddr}:${config.port}...`);

// Web3 connection
const web3 = new Web3(new Web3.providers.HttpProvider(`http://${config.nodeAddr}:${config.port}`));

/**
 * Normalize transaction data
 */
const normalizeTX = async (
  txData: Web3Transaction,
  receipt: TransactionReceipt | null,
  blockData: Web3Block
): Promise<NormalizedTransaction> => {
  const tx: NormalizedTransaction = {
    blockHash: txData.blockHash,
    blockNumber: txData.blockNumber,
    from: txData.from ? txData.from.toLowerCase() : null,
    hash: txData.hash.toLowerCase(),
    value: txData.value,
    nonce: txData.nonce,
    gas: txData.gas,
    gasUsed: receipt ? receipt.gasUsed : 0,
    gasPrice: txData.gasPrice,
    input: txData.input,
    transactionIndex: txData.transactionIndex,
    timestamp: blockData.timestamp as number,
    status: receipt ? receipt.status : null
  };

  if (txData.to) {
    tx.to = txData.to.toLowerCase();
  }

  return tx;
};

/**
 * Write block to database
 */
interface WriteBlockToDB {
  (blockData: Web3Block | null, flush?: boolean): Promise<void>;
  bulkOps?: BlockDocument[];
}

const writeBlockToDB: WriteBlockToDB = async function (blockData: Web3Block | null, flush = false): Promise<void> {
  const self = writeBlockToDB;
  if (!self.bulkOps) {
    self.bulkOps = [];
  }

  if (blockData && blockData.number >= 0) {
    const blockDoc: BlockDocument = {
      number: blockData.number,
      hash: blockData.hash,
      parentHash: blockData.parentHash,
      nonce: blockData.nonce,
      sha3Uncles: blockData.sha3Uncles,
      logsBloom: blockData.logsBloom,
      transactionsRoot: blockData.transactionsRoot,
      stateRoot: blockData.stateRoot,
      receiptsRoot: blockData.receiptsRoot,
      miner: blockData.miner ? blockData.miner.toLowerCase() : null,
      difficulty: String(blockData.difficulty),
      totalDifficulty: String(blockData.totalDifficulty),
      extraData: blockData.extraData,
      size: blockData.size,
      gasLimit: blockData.gasLimit,
      gasUsed: blockData.gasUsed,
      timestamp: blockData.timestamp as number,
      transactions: blockData.transactions.map(tx => typeof tx === 'string' ? tx : tx.hash),
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

    // Use MongoDB insertMany with ordered: false to handle duplicates
    try {
      const docs = await Block.insertMany(bulk, { ordered: false });
      if (!config.quiet) {
        console.log(`* ${docs.length} blocks successfully written.`);
      }
    } catch (err: any) {
      // Handle duplicate key errors
      if (err.code === 11000) {
        if (!config.quiet) {
          console.log('Skip: Duplicate block keys detected');
        }
      } else {
        console.log(`Error: Failed to insert blocks: ${err}`);
        process.exit(9);
      }
    }
  }
};

/**
 * Write transactions to database
 */
interface WriteTransactionsToDB {
  (blockData: Web3Block | null, flush?: boolean): Promise<void>;
  bulkOps?: NormalizedTransaction[];
  blocks?: number;
}

const writeTransactionsToDB: WriteTransactionsToDB = async function (
  blockData: Web3Block | null,
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
        const receipt = await web3.eth.getTransactionReceipt(txData.hash);
        const tx = await normalizeTX(txData as Web3Transaction, receipt, blockData);
        self.bulkOps.push(tx);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`Warning: Failed to get receipt for tx ${(txData as Web3Transaction).hash}: ${errorMessage}`);
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
      const currentBlock = await web3.eth.getBlockNumber();

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
    .then(blockNumber => {
      lastProcessedBlock = blockNumber;
      console.log(`Starting from block: ${blockNumber}`);

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
  if (!startBlock) {
    startBlock = (await web3.eth.getBlockNumber()) - 100; // Last 100 blocks by default
  }
  if (!endBlock) {
    endBlock = await web3.eth.getBlockNumber();
  }

  console.log(`Syncing blocks from ${startBlock} to ${endBlock}...`);

  for (let blockNum = startBlock; blockNum <= endBlock; blockNum++) {
    try {
      const blockData = await web3.eth.getBlock(blockNum, true);

      if (blockData) {
        await writeBlockToDB(blockData);
        await writeTransactionsToDB(blockData);
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

  console.log('*** Sync Completed ***');
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
      const nodeLatestBlock = await web3.eth.getBlockNumber();

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
