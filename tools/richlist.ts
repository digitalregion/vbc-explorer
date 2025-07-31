#!/usr/bin/env node
/*
Tool for calculating VirBiCoin richlist
*/

import mongoose from 'mongoose';
import Web3 from 'web3';
import fs from 'fs';
import path from 'path';
import { connectDB, Block, Transaction, Account, IBlock, ITransaction, IAccount } from '../models/index';

// Function to read config
const readConfig = () => {
  try {
    const configPath = path.join(process.cwd(), 'config.json');
    const exampleConfigPath = path.join(process.cwd(), 'config.example.json');
    
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } else if (fs.existsSync(exampleConfigPath)) {
      return JSON.parse(fs.readFileSync(exampleConfigPath, 'utf8'));
    }
  } catch (error) {
    console.error('Error reading config:', error);
  }
  
  // Default configuration
  return {
    nodeAddr: 'localhost',
    port: 8329,
    quiet: false
  };
};

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

// Memory monitoring function
const checkMemory = () => {
  const usage = process.memoryUsage();
  const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
  const limitMB = parseInt(process.env.MEMORY_LIMIT_MB || '512'); // Reduced from 1024MB to 512MB
  
  if (usedMB > limitMB) {
    console.log(`⚠️ Memory usage: ${usedMB}MB (limit: ${limitMB}MB)`);
    if (global.gc) {
      global.gc();
      console.log('🧹 Garbage collection executed');
    }
    return false;
  }
  return true;
};

// Interface definitions
interface Config {
  nodeAddr: string;
  port: number;
  quiet: boolean;
}

interface AccountData {
  address: string;
  type?: number;
  balance?: string; // Wei文字列
  blockNumber?: number;
}

interface CachedAccounts {
  [address: string]: number;
}

interface MakeRichListFunction {
  (toBlock: number, blocks: number, updateCallback: UpdateCallback): void;
  cached?: CachedAccounts;
  index?: number;
  accounts?: { [address: string]: AccountData };
}

type UpdateCallback = (accounts: { [address: string]: AccountData }, blockNumber: number) => void;

// Configuration
const config: Config = readConfig();

console.log(`🔌 Connecting to VirBiCoin node ${config.nodeAddr}:${config.port}...`);

// Web3 connection
const web3 = new Web3(new Web3.providers.HttpProvider(`http://${config.nodeAddr}:${config.port}`));

const ADDRESS_CACHE_MAX = 5000; // Reduced from 10000 to 5000 for better performance
const BATCH_SIZE = 100; // Reduced batch size for better memory management
const BATCH_DELAY_MS = 500; // 500ms delay between batches

// Set MongoDB URI from config if available
try {
  const local = require('../config.json');
  if (local.database && local.database.uri) {
    process.env.MONGODB_URI = local.database.uri;
    console.log('📄 MongoDB URI set from config.json');
  }
} catch (error) {
  try {
    const local = require('../config.example.json');
    if (local.database && local.database.uri) {
      process.env.MONGODB_URI = local.database.uri;
      console.log('📄 MongoDB URI set from config.example.json');
    }
  } catch (fallbackError) {
  process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost/explorerDB';
  }
}

// Initialize database connection after config is loaded
initDB();

/**
 * Make richlist for VirBiCoin with improved performance
 */
const makeRichList: MakeRichListFunction = function (
  toBlock: number,
  blocks: number,
  updateCallback: UpdateCallback
): void {
  // Ensure database is connected before proceeding
  if (mongoose.connection.readyState !== 1) {
    console.log('⌛ Waiting for database connection...');
    connectDB().then(() => {
      // Retry the operation after connection
      makeRichList(toBlock, blocks, updateCallback);
    });
    return;
  }

  const self = makeRichList;
  if (!self.cached) {
    self.cached = {};
    self.index = 0;
  }
  if (!self.accounts) {
    self.accounts = {};
  }

  let fromBlock = toBlock - blocks;
  if (fromBlock < 0) {
    fromBlock = 0;
  }

  if (!config.quiet && (toBlock - fromBlock) >= 100) {
    console.log(`🔍 Scan accounts from ${fromBlock} to ${toBlock} ...`);
  }

  let ended = false;
  if (fromBlock == toBlock) {
    ended = true;
  }

  const processTransactionsFrom = async (): Promise<void> => {
    try {
      const docs = await Transaction.aggregate([
        { $match: { blockNumber: { $lte: toBlock, $gt: fromBlock } } },
        { $group: { _id: '$from' } },
        { $project: { '_id': 1 } },
      ]);

      docs.forEach((doc) => {
        // check address cache
        if (!self.cached![doc._id]) {
          self.accounts![doc._id] = { address: doc._id, type: 0 };
          // increase cache counter
          self.cached![doc._id] = 1;
        } else {
          self.cached![doc._id]++;
        }
      });
    } catch (error) {
      throw error;
    }
  };

  const processTransactionsTo = async (): Promise<void> => {
    try {
      const docs = await Transaction.aggregate([
        { $match: { blockNumber: { $lte: toBlock, $gt: fromBlock } } },
        { $group: { _id: '$to' } },
        { $project: { '_id': 1 } },
      ]);

      docs.forEach((doc) => {
        // to == null case
        if (!doc._id) {
          return;
        }
        if (!self.cached![doc._id]) {
          self.accounts![doc._id] = { address: doc._id, type: 0 };
          self.cached![doc._id] = 1;
        } else {
          self.cached![doc._id]++;
        }
      });
    } catch (error) {
      throw error;
    }
  };

  const processMiners = async (): Promise<void> => {
    try {
      const docs = await Block.aggregate([
        { $match: { number: { $lte: toBlock, $gt: fromBlock } } },
        { $group: { _id: '$miner' } },
        { $project: { '_id': 1 } },
      ]);

      docs.forEach((doc) => {
        if (!self.cached![doc._id]) {
          self.accounts![doc._id] = { address: doc._id, type: 0 };
          self.cached![doc._id] = 1;
        } else {
          self.cached![doc._id]++;
        }
      });
    } catch (error) {
      throw error;
    }
  };

  const updateAccountBalances = async (): Promise<void> => {
    const len = Object.keys(self.accounts!).length;
    if (len >= 100 || ended) {
      console.info(`📈 ${len} / ${self.index! + len} total accounts.`);
    }

    if (updateCallback && (len >= 100 || ended)) {
      self.index = self.index! + len;
      if (!config.quiet) {
        console.log(`🔄 update ${len} accounts ...`);
      }

      // split accounts into chunks to make proper sized json-rpc batch job.
      const accounts = Object.keys(self.accounts!);
      const chunks: string[][] = [];

      // about ~500 `eth_getBalance` json rpc calls are possible in one json-rpc batchjob.
      while (accounts.length > 100) {
        const chunk = accounts.splice(0, 50); // Reduced from 100 to 50
        chunks.push(chunk);
      }
      if (accounts.length > 0) {
        chunks.push(accounts);
      }

      // Process chunks sequentially with delays
      for (const chunk of chunks) {
        const data: { [address: string]: AccountData } = {};

        for (const account of chunk) {
          try {
            // Get contract code to determine if it's a contract
            const code = await web3.eth.getCode(account);
            data[account] = { address: account, type: 0 };

            if (code.length > 2) {
              data[account].type = 1; // contract type
            } else if (self.accounts![account]) {
              data[account].type = self.accounts![account].type;
            }

            // Get balance
            const balance = await web3.eth.getBalance(account);
            data[account].balance = balance.toString(); // Weiのまま文字列で保存

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.log(`WARN: fail to get balance/code for ${account}: ${errorMessage}`);
          }
        }

        if (Object.keys(data).length > 0 && updateCallback) {
          updateCallback(data, toBlock);
        }
        
        // Add delay between chunks to reduce CPU usage
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }

      // reset accounts
      self.accounts = {};

      // check the size of the cached accounts
      if (Object.keys(self.cached!).length > ADDRESS_CACHE_MAX) {
        console.info('** reduce cached accounts ...');
        const sorted = Object.keys(self.cached!).sort((a, b) => self.cached![b] - self.cached![a]);
        const newcached: CachedAccounts = {};
        const reduce = parseInt((ADDRESS_CACHE_MAX * 0.6).toString());
        for (let j = 0; j < reduce; j++) {
          newcached[sorted[j]] = self.cached![sorted[j]];
        }
        self.cached = newcached;
      }
    }
  };

  // Execute pipeline
  Promise.all([
    processTransactionsFrom(),
    processTransactionsTo(),
    processMiners()
  ])
    .then(async () => {
      await updateAccountBalances();

      if (ended) {
        console.log('✅ Completed Richlist Calculation.');
      } else {
        setTimeout(() => {
          makeRichList(fromBlock, blocks, updateCallback);
        }, 500); // Increased from 300ms to 500ms
      }
    })
    .catch(error => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`Error in makeRichList: ${errorMessage}`);
    });
};

/**
 * Write accounts to DB with improved batching
 */
const updateAccounts: UpdateCallback = function (
  accounts: { [address: string]: AccountData },
  blockNumber: number
): void {
  // prepare
  const bulk: AccountData[] = Object.keys(accounts).map((address) => {
    const account = accounts[address];
    account.blockNumber = blockNumber;
    return account;
  });

  bulkInsert(bulk);
};

/**
 * Bulk insert accounts with improved performance
 */
const bulkInsert = function (bulk: AccountData[]): void {
  if (!bulk.length) {
    return;
  }

  let localbulk: AccountData[];
  if (bulk.length > 150) { // Reduced from 300 to 150
    localbulk = bulk.splice(0, 100); // Reduced from 200 to 100
  } else {
    localbulk = bulk.splice(0, 150); // Reduced from 300 to 150
  }

  Account.insertMany(localbulk, { ordered: false })
    .then((data: any) => {
      if (!config.quiet) {
        console.log(`✅ * ${data.length} accounts successfully inserted.`);
      }
      if (bulk.length > 0) {
        setTimeout(() => {
          bulkInsert(bulk);
        }, 300); // Increased from 200ms to 300ms
      }
    })
    .catch((error: any) => {
      if (error.code == 11000) {
        // For already exists case, try upsert method.
        const updatePromises = localbulk.map(item => {
          // remove _id field
          delete (item as any)._id;

          if (item.type == 0) {
            // do not update for normal address cases
            item.type = undefined;
          }

          return Account.updateOne(
            { address: item.address },
            { $set: item },
            { upsert: true }
          );
        });

        Promise.all(updatePromises)
          .then(() => {
            if (!config.quiet) {
              console.log(`💾 ${localbulk.length} accounts successfully updated.`);
            }
            if (bulk.length > 0) {
              setTimeout(() => {
                bulkInsert(bulk);
              }, 300); // Increased from 200ms to 300ms
            }
          })
          .catch(err => {
            const errorMessage = err instanceof Error ? err.message : String(err);
            console.log(`❌ ERROR: Fail to update accounts: ${errorMessage}`);
          });

      } else {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`💥 Error: Aborted due to error on DB: ${errorMessage}`);
        process.exit(9);
      }
    });
};

/**
 * Start synchronization with improved performance
 */
async function startSync(): Promise<void> {
  try {
    // Ensure database is connected before proceeding
    if (mongoose.connection.readyState !== 1) {
      console.log('⌛ Waiting for database connection...');
      await connectDB();
    }

    const latestBlock = await web3.eth.getBlockNumber();
    console.log(`📊 latestBlock = ${latestBlock}`);

    if (config.quiet) {
      console.log('🔇 Quiet mode enabled');
    }

    makeRichList(Number(latestBlock), 5000, updateAccounts); // Reduced from 10000 to 5000

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`❌ Error starting sync: ${errorMessage}`);
    process.exit(1);
  }
}

// percentage計算・保存ロジック with improved performance
async function updatePercentages() {
  // Ensure database is connected before proceeding
  if (mongoose.connection.readyState !== 1) {
    console.log('⌛ Waiting for database connection...');
    await connectDB();
  }

  const accounts = await Account.find({});
  
  // Ether小数値で合計（floatのまま扱う）
  const total = accounts.reduce((sum, acc) => {
    let balanceStr = acc.balance || '0';
    
    // balanceの型チェックと変換
    if (typeof balanceStr === 'number') {
      // number型の場合は文字列に変換
      balanceStr = balanceStr.toString();
    } else if (typeof balanceStr === 'string') {
      // 文字列の場合、科学記数法や小数点を含む場合はBigIntで整数に変換
      if (balanceStr.includes('.') || balanceStr.includes('e') || balanceStr.includes('E')) {
        try {
          balanceStr = BigInt(Math.floor(Number(balanceStr))).toString();
        } catch (e) {
          balanceStr = '0';
        }
      }
    } else {
      // その他の型の場合は'0'に設定
      balanceStr = '0';
    }
    
    // fromWeiでEtherに変換（小数値になる）
    const etherValue = parseFloat(Web3.utils.fromWei(balanceStr, 'ether'));
    return sum + etherValue;
  }, 0);

  // Process accounts in batches to reduce memory usage
  const batchSize = 1000;
  for (let i = 0; i < accounts.length; i += batchSize) {
    const batch = accounts.slice(i, i + batchSize);
    
    const updatePromises = batch.map(async (acc) => {
      let percent = 0;
      let balanceStr = acc.balance || '0';
      
      // balanceの型チェックと変換
      if (typeof balanceStr === 'number') {
        balanceStr = balanceStr.toString();
      } else if (typeof balanceStr === 'string') {
        if (balanceStr.includes('.') || balanceStr.includes('e') || balanceStr.includes('E')) {
          try {
            balanceStr = BigInt(Math.floor(Number(balanceStr))).toString();
          } catch (e) {
            balanceStr = '0';
          }
        }
      } else {
        balanceStr = '0';
      }
      
      const ether = parseFloat(Web3.utils.fromWei(balanceStr, 'ether'));
      
      if (total > 0) {
        percent = Math.round((ether / total) * 1000000) / 10000; // 小数点4桁
      }
      
      // percentageはfloatで保存（BigInt変換は絶対にしない）
      return Account.updateOne(
        { address: acc.address },
        { $set: { percentage: percent } }
      );
    });
    
    await Promise.all(updatePromises);
    
    // Memory check between batches
    if (!checkMemory()) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  console.log('📈 Account percentages updated');
}

/**
 * Main execution with improved performance
 */
const main = async (): Promise<void> => {
  try {
    // Initialize database connection first
    await initDB();
    
    // Test connection by getting latest block number
    try {
      await web3.eth.getBlockNumber();
    } catch (connectionError) {
      console.log('❌ Error: Cannot connect to VirBiCoin node');
      process.exit(1);
    }

    console.log('🔗 Connected to VirBiCoin node successfully');
    console.log('🏆 Starting richlist calculation...');

    // Initial calculation
    await startSync();
    await updatePercentages(); // percentage計算・保存を追加

    // Set up periodic updates (every 60 minutes instead of 30)
    const RICHLIST_UPDATE_INTERVAL = 60 * 60 * 1000; // 60 minutes (30分→60分に延長)
    console.log(`⏰ Richlist will update every ${RICHLIST_UPDATE_INTERVAL / 1000 / 60} minutes`);

    setInterval(async () => {
      try {
        console.log('🔄 Starting periodic richlist update...');
        await startSync();
        await updatePercentages();
        console.log('✅ Periodic richlist update completed');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`❌ Error in periodic richlist update: ${errorMessage}`);
      }
    }, RICHLIST_UPDATE_INTERVAL);

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
