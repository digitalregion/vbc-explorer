#!/usr/bin/env node
/*
Tool for calculating VirBiCoin block statistics
*/

import Web3 from 'web3';
import { Block as Web3Block } from 'web3-eth';
import { connectDB, Block, BlockStat, IBlock, IBlockStat } from '../models/index';

// Initialize database connection
connectDB().catch(console.error);

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
  bulkSize: 100,
  quiet: false
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

if (config.quiet) {
  console.log('Quiet mode enabled');
}

/**
 * Update statistics for a range of blocks
 */
const updateStats = async (range: number, interval: number, rescan: boolean): Promise<void> => {
  let latestBlock = await web3.eth.getBlockNumber();

  interval = Math.abs(parseInt(interval.toString()));
  if (!range) {
    range = 1000;
  }
  range *= interval;
  if (interval >= 10) {
    latestBlock -= latestBlock % interval;
  }
  getStats(latestBlock, null, latestBlock - range, interval, rescan);
};

/**
 * Get statistics for blocks
 */
const getStats = async function (
  blockNumber: number,
  nextBlock: Web3Block | null,
  endNumber: number,
  interval: number,
  rescan: boolean
): Promise<void> {
  if (endNumber < 0) endNumber = 0;

  if (blockNumber <= endNumber) {
    if (rescan) {
      process.exit(9);
    }
    return;
  }

  try {
    const isListening = await web3.eth.net.isListening();
    if (!isListening) {
      console.log(`Error: Aborted due to web3 not connected when trying to get block ${blockNumber}`);
      process.exit(9);
      return;
    }

    const blockData = await web3.eth.getBlock(blockNumber, true);

    if (!blockData) {
      console.log(`Warning: null block data received from block number: ${blockNumber}`);
      return;
    }

    if (nextBlock) {
      checkBlockDBExistsThenWrite(blockData, nextBlock, endNumber, interval, rescan);
    } else {
      checkBlockDBExistsThenWrite(blockData, null, endNumber, interval, rescan);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`Warning: error on getting block with number: ${blockNumber}: ${errorMessage}`);
  }
};

/**
 * Check if block statistics exist and write if not
 */
const checkBlockDBExistsThenWrite = async function (
  blockData: Web3Block,
  nextBlock: Web3Block | null,
  endNumber: number,
  interval: number,
  rescan: boolean
): Promise<void> {
  try {
    const existingStat = await BlockStat.findOne({ number: blockData.number });

    if (!existingStat && nextBlock) {
      // Calculate hashrate, txCount, blocktime, uncleCount
      const stat: BlockStatData = {
        number: blockData.number,
        timestamp: blockData.timestamp as number,
        difficulty: String(blockData.difficulty),
        txCount: blockData.transactions.length,
        gasUsed: blockData.gasUsed,
        gasLimit: blockData.gasLimit,
        miner: blockData.miner,
        blockTime: ((nextBlock.timestamp as number) - (blockData.timestamp as number)) / (nextBlock.number - blockData.number),
        uncleCount: blockData.uncles.length,
      };

      const blockStat = new BlockStat(stat);
      await blockStat.save();

      if (!config.quiet) {
        console.log(`DB successfully written for block number ${blockData.number}`);
      }

      getStats(blockData.number - interval, blockData, endNumber, interval, rescan);

    } else {
      if (rescan || !nextBlock) {
        getStats(blockData.number - interval, blockData, endNumber, interval, rescan);
        if (nextBlock) {
          if (!config.quiet) {
            console.log(`WARN: block number: ${blockData.number} already exists in DB.`);
          }
        }
      } else {
        if (!config.quiet) {
          console.error(`Aborting because block number: ${blockData.number} already exists in DB.`);
        }
      }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`Error: Aborted due to error on block number ${blockData.number}: ${errorMessage}`);
    process.exit(9);
  }
};

// Configuration for statistics calculation
const minutes = 1;
const statInterval = minutes * 60 * 1000;

let rescan = false; /* rescan: true - rescan range */
let range = 1000;
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
  console.log(`Selected interval = ${interval}`);

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

    console.log('Connected to VirBiCoin node successfully');
    console.log('Starting statistics calculation...');

    // Run statistics update
    await updateStats(range, interval, rescan);

    // Set up interval for continuous updates if not rescanning
    if (!rescan) {
      setInterval(async () => {
        try {
          await updateStats(range, interval, false);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.log(`Error in interval update: ${errorMessage}`);
        }
      }, statInterval);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`Fatal error: ${errorMessage}`);
    process.exit(1);
  }
};

// Start the stats calculator
main();
