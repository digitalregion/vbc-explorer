#!/usr/bin/env node
/*
Tool for calculating VirBiCoin block statistics
*/

import Web3 from 'web3';
import type { Block as Web3Block } from 'web3-types';
import mongoose from 'mongoose';
import { connectDB, Block, BlockStat, IBlock, IBlockStat } from '../models/index';

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

// メモリ監視機能を追加
const checkMemory = () => {
  const usage = process.memoryUsage();
  const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
  const limitMB = parseInt(process.env.MEMORY_LIMIT_MB || '1024'); // 環境変数から取得、デフォルト1024MB
  
  if (usedMB > limitMB) {
    console.log(`⚠️  Memory usage: ${usedMB}MB (limit: ${limitMB}MB)`);
    if (global.gc) {
      global.gc();
      console.log('🧹 Garbage collection executed');
    }
    return false;
  }
  return true;
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

// Interface definitions
interface Config {
  nodeAddr: string;
  port: number;
  bulkSize: number;
  quiet: boolean;
}

interface BlockStatData {
  number: number;
  timestamp: number;
  difficulty: string;
  txCount: number;
  gasUsed: number;
  gasLimit: number;
  miner: string;
  blockTime: number;
  uncleCount: number;
}

// Configuration
const config: Config = {
  nodeAddr: 'localhost',
  port: 8329,
  bulkSize: 50, // 100→50に削減
  quiet: false
};

// Try to load config.json
try {
  const local = require('../config.json');
  Object.assign(config, local);
  console.log('📄 config.json found.');
  
  // Set MongoDB URI from config if available
  if (local.database && local.database.uri) {
    process.env.MONGODB_URI = local.database.uri;
    console.log('📄 MongoDB URI set from config.json');
  }
} catch (error) {
  console.log('📄 No config file found. Using default configuration...');
}

// Initialize database connection after config is loaded
initDB();

console.log(`🔌 Connecting to VirBiCoin node ${config.nodeAddr}:${config.port}...`);

// Web3 connection
const web3 = new Web3(new Web3.providers.HttpProvider(`http://${config.nodeAddr}:${config.port}`));

if (config.quiet) {
  console.log('🔇 Quiet mode enabled');
}

/**
 * Update statistics for a range of blocks
 */
const updateStats = async (range: number, interval: number, rescan: boolean): Promise<void> => {
  let latestBlockBigInt = await web3.eth.getBlockNumber();
  let latestBlock = toNumber(latestBlockBigInt);

  interval = Math.abs(parseInt(interval.toString()));
  if (!range) {
    range = 10000;
  }
  range *= interval;
  if (interval >= 10) {
    latestBlock -= latestBlock % interval;
  }
  

  
  // Check which blocks already have statistics
  const existingStats = await BlockStat.find({ 
    number: { $gte: latestBlock - range, $lte: latestBlock } 
  }).select('number').lean();
  
  const existingStatNumbers = new Set(existingStats.map(s => s.number));
  console.log(`📊 Found ${existingStats.length} existing block statistics in range ${latestBlock - range}-${latestBlock}`);
  
  getStats(latestBlock, null, latestBlock - range, interval, rescan, existingStatNumbers);
};

/**
 * Get statistics for blocks
 */
const getStats = async function (
  blockNumber: number,
  nextBlock: any | null,
  endNumber: number,
  interval: number,
  rescan: boolean,
  existingStatNumbers?: Set<number>
): Promise<void> {
  if (endNumber < 0) endNumber = 0;

  if (blockNumber <= endNumber) {
    if (rescan) {
      process.exit(9);
    }
    return;
  }

  // メモリ監視を追加
  if (!checkMemory()) {
    console.log('💾 Memory limit reached, pausing stats processing for 3 seconds');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  try {
    const isListening = await web3.eth.net.isListening();
    if (!isListening) {
      console.log(`❌ Error: Aborted due to web3 not connected when trying to get block ${blockNumber}`);
      process.exit(9);
      return;
    }

    const blockData = await web3.eth.getBlock(blockNumber, true);

    if (!blockData) {
      console.log(`⚠️  Warning: null block data received from block number: ${blockNumber}`);
      return;
    }

    if (nextBlock) {
      checkBlockDBExistsThenWrite(blockData, nextBlock, endNumber, interval, rescan, existingStatNumbers);
    } else {
      checkBlockDBExistsThenWrite(blockData, null, endNumber, interval, rescan, existingStatNumbers);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`⚠️  Warning: error on getting block with number: ${blockNumber}: ${errorMessage}`);
  }
};

/**
 * Check if block statistics exist and write if not
 */
const checkBlockDBExistsThenWrite = async function (
  blockData: any,
  nextBlock: any | null,
  endNumber: number,
  interval: number,
  rescan: boolean,
  existingStatNumbers?: Set<number>
): Promise<void> {
  try {
    const blockNumber = toNumber(blockData.number);
    
    // Check if block statistics already exist in DB
    const existingStat = await BlockStat.findOne({ number: blockNumber });
    
    if (existingStat && !rescan) {
      getStats(blockNumber - interval, blockData, endNumber, interval, rescan, existingStatNumbers);
      return;
    }

    if (nextBlock) {
      // Calculate hashrate, txCount, blocktime, uncleCount
      const stat: BlockStatData = {
        number: blockNumber,
        timestamp: toNumber(blockData.timestamp),
        difficulty: toString(blockData.difficulty),
        txCount: blockData.transactions.length,
        gasUsed: toNumber(blockData.gasUsed),
        gasLimit: toNumber(blockData.gasLimit),
        miner: toString(blockData.miner),
        blockTime: (toNumber(nextBlock.timestamp) - toNumber(blockData.timestamp)) / (toNumber(nextBlock.number) - blockNumber),
        uncleCount: blockData.uncles.length,
      };

      const blockStat = new BlockStat(stat);
      await blockStat.save();

      // 500ブロックごとにログ出力
      if (blockNumber % 500 === 0) {
        console.log(`📦 Processed ${blockNumber} blocks for statistics`);
      }

      getStats(blockNumber - interval, blockData, endNumber, interval, rescan, existingStatNumbers);

    } else {
      // Continue processing for blocks without next block data
      getStats(blockNumber - interval, blockData, endNumber, interval, rescan, existingStatNumbers);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`💥 Error: Aborted due to error on block number ${toNumber(blockData.number)}: ${errorMessage}`);
    process.exit(9);
  }
};

// Configuration for statistics calculation
const minutes = 2; // 1→2分に延長
const statInterval = minutes * 60 * 1000;

let rescan = false; /* rescan: true - rescan range */
let range = 500; // 1000→500に削減
let interval = 100;

/**
 * RESCAN=1000:100000 means interval:range
 * Usage:
 *   RESCAN=1000:100000 node tools/stats.ts
 */
if (process.env.RESCAN) {
  const tmp = process.env.RESCAN.split(/:/);
  if (tmp.length > 1) {
    interval = Math.abs(parseInt(tmp[0]));
    if (tmp[1]) {
      range = Math.abs(parseInt(tmp[1]));
    }
  }
  let i = interval;
  let j = 0;
  for (j = 0; i >= 10; j++) {
    i = parseInt((i / 10).toString());
  }
  interval = Math.pow(10, j);
  console.log(`📊 Selected interval = ${interval}`);

  rescan = true;
}



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

    console.log('🔗 Connected to VirBiCoin node successfully');
    console.log('📊 Starting statistics calculation...');

    // Run statistics update
    await updateStats(range, interval, rescan);

    // Set up interval for continuous updates if not rescanning
    if (!rescan) {
      setInterval(async () => {
        try {
          await updateStats(range, interval, false);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.log(`❌ Error in interval update: ${errorMessage}`);
        }
      }, statInterval);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`💥 Fatal error: ${errorMessage}`);
    process.exit(1);
  }
};

export { main };

if (require.main === module) {
  main();
}
