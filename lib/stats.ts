import mongoose from 'mongoose';
import { connectDB as connectDBFromModels } from '../models/index';

// Use the connectDB function from models/index.ts
async function connectDB() {
  await connectDBFromModels();
}

export async function getChainStats() {
  try {
    await connectDB();
  } catch (error) {
    console.error('Error connecting to database:', error);
    throw new Error('Database connection failed');
  }

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not available');
  }
  
  // Get latest block information
  let latestBlockDoc = null;
  let latestBlock = 0;
  
  try {
    latestBlockDoc = await db.collection('Block').findOne({}, { sort: { number: -1 } });
    latestBlock = latestBlockDoc ? latestBlockDoc.number : 0;
    console.log('[Stats] Latest block found:', latestBlock);
  } catch (error) {
    console.error('[Stats] Error getting latest block:', error);
    latestBlock = 0;
  }
  
  // Calculate average block time from last 100 blocks
  let avgBlockTime = '13.00';
  try {
    const recentBlocks = await db.collection('Block').find({})
      .sort({ number: -1 })
      .limit(100)
      .project({ timestamp: 1, number: 1, blockTime: 1 })
      .toArray();
    
    if (recentBlocks && recentBlocks.length >= 2) {
      // Method 1: Use stored blockTime if available
      const blocksWithTime = recentBlocks.filter(b => b.blockTime && b.blockTime > 0);
      if (blocksWithTime.length > 0) {
        const avgTime = blocksWithTime.reduce((sum, block) => sum + block.blockTime, 0) / blocksWithTime.length;
        avgBlockTime = avgTime.toFixed(2);
      } else {
        // Method 2: Calculate from timestamps
        let totalTimeDiff = 0;
        let validPairs = 0;
        
        for (let i = 0; i < recentBlocks.length - 1; i++) {
          const current = recentBlocks[i];
          const next = recentBlocks[i + 1];
          
          if (current.timestamp && next.timestamp) {
            const timeDiff = current.timestamp - next.timestamp;
            if (timeDiff > 0 && timeDiff < 300) { // Reasonable block time (< 5 minutes)
              totalTimeDiff += timeDiff;
              validPairs++;
            }
          }
        }
        
        if (validPairs > 0) {
          avgBlockTime = (totalTimeDiff / validPairs).toFixed(2);
        }
      }
    }
  } catch (error) {
    console.error('Error calculating average block time:', error);
  }

  // Get network difficulty from latest block
  let networkDifficulty = 'N/A';
  if (latestBlockDoc && latestBlockDoc.difficulty) {
    try {
      const difficultyNum = parseInt(latestBlockDoc.difficulty);
      if (!isNaN(difficultyNum)) {
        // Format difficulty in a readable way
        if (difficultyNum > 1e12) {
          networkDifficulty = (difficultyNum / 1e12).toFixed(2) + ' TH';
        } else if (difficultyNum > 1e9) {
          networkDifficulty = (difficultyNum / 1e9).toFixed(2) + ' GH';
        } else if (difficultyNum > 1e6) {
          networkDifficulty = (difficultyNum / 1e6).toFixed(2) + ' MH';
        } else if (difficultyNum > 1e3) {
          networkDifficulty = (difficultyNum / 1e3).toFixed(2) + ' KH';
        } else {
          networkDifficulty = difficultyNum.toString();
        }
      }
    } catch (error) {
      console.error('Error formatting network difficulty:', error);
    }
  }

  // Calculate network hashrate (approximate)
  let networkHashrate = '0';
  if (latestBlockDoc && latestBlockDoc.difficulty && avgBlockTime) {
    try {
      const difficulty = parseInt(latestBlockDoc.difficulty);
      const blockTimeSeconds = parseFloat(avgBlockTime);
      
      if (!isNaN(difficulty) && !isNaN(blockTimeSeconds) && blockTimeSeconds > 0) {
        // Simplified hashrate calculation: difficulty / block_time
        const hashrate = difficulty / blockTimeSeconds;
        
        if (hashrate > 1e12) {
          networkHashrate = (hashrate / 1e12).toFixed(2) + ' TH/s';
        } else if (hashrate > 1e9) {
          networkHashrate = (hashrate / 1e9).toFixed(2) + ' GH/s';
        } else if (hashrate > 1e6) {
          networkHashrate = (hashrate / 1e6).toFixed(2) + ' MH/s';
        } else if (hashrate > 1e3) {
          networkHashrate = (hashrate / 1e3).toFixed(2) + ' KH/s';
        } else {
          networkHashrate = hashrate.toFixed(2) + ' H/s';
        }
      }
    } catch (error) {
      console.error('Error calculating network hashrate:', error);
    }
  }

  // Calculate average gas price (excluding mining rewards)
  let avgTransactionFee = '0';
  try {
    const recentTxs = await db?.collection('Transaction').find({ 
      gasPrice: { $exists: true, $ne: null },
      from: { $ne: '0x0000000000000000000000000000000000000000' } // Exclude mining rewards
    })
      .sort({ blockNumber: -1 })
      .limit(100)
      .project({ gasPrice: 1 })
      .toArray();
    
    if (recentTxs && recentTxs.length > 0) {
      let totalGasPrice = 0;
      let validTxs = 0;
      
      recentTxs.forEach(tx => {
        if (tx.gasPrice) {
          try {
            const gasPrice = parseInt(tx.gasPrice);
            if (!isNaN(gasPrice) && gasPrice > 0) {
              totalGasPrice += gasPrice;
              validTxs++;
            }
          } catch {
            // Skip invalid transactions
          }
        }
      });
      
      if (validTxs > 0) {
            const avgGasPriceWei = totalGasPrice / validTxs;
    const avgGasPriceGasUnit = avgGasPriceWei / 1e9;
    avgTransactionFee = Math.floor(avgGasPriceGasUnit).toString();
      }
    }
  } catch (error) {
    console.error('Error calculating average gas price:', error);
  }

  // Get actual wallet count by counting unique addresses
  let activeAddresses = 0;
  try {
    // First try to get from accounts collection
    activeAddresses = await db?.collection('Account').countDocuments() || 0;
    
    // If accounts collection is empty, calculate from transactions
    if (activeAddresses === 0) {
      const transactions = await db?.collection('Transaction').find({}, { projection: { from: 1, to: 1 } }).toArray();
      const uniqueAddresses = new Set();
      
      if (transactions) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transactions.forEach((tx: any) => {
          if (tx.from) uniqueAddresses.add(tx.from.toLowerCase());
          if (tx.to) uniqueAddresses.add(tx.to.toLowerCase());
        });
      }
      
      activeAddresses = uniqueAddresses.size;
    }
  } catch (error) {
    console.error('Error calculating active addresses:', error);
    activeAddresses = 0; // Fallback to 0 if calculation fails
  }

  const totalSupply = "unlimited"; // VBC has unlimited supply
  let totalTransactions = 0;
  try {
    totalTransactions = await db.collection('Transaction').countDocuments();
    console.log('[Stats] Total transactions found:', totalTransactions);
  } catch (error) {
    console.error('[Stats] Error getting total transactions:', error);
    totalTransactions = 0;
  }
  
  // Calculate time since last block
  let lastBlockTime = 'Unknown';
  if (latestBlockDoc && latestBlockDoc.timestamp) {
    const blockTimestamp = latestBlockDoc.timestamp * 1000; // Convert to milliseconds
    const now = Date.now();
    const diffMs = now - blockTimestamp;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      lastBlockTime = `${diffDays}d ago`;
    } else if (diffHours > 0) {
      lastBlockTime = `${diffHours}h ago`;
    } else {
      lastBlockTime = `${diffMinutes}m ago`;
    }
  }
  
  return {
    latestBlock,
    avgBlockTime,
    networkHashrate,
    networkDifficulty,
    totalTransactions,
    activeAddresses,
    totalSupply,
    avgTransactionFee,
    lastBlockTime,
    lastBlockTimestamp: latestBlockDoc?.timestamp || 0,
    isConnected: true,
  };
}