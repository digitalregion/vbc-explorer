// Enhanced stats API for VirBiCoin Explorer
import { NextResponse } from 'next/server';
import { connectDB, Block, BlockStat, Transaction } from '../../../models/index';

export async function GET() {
  try {
    // Ensure database connection
    await connectDB();
  } catch (connectionError) {
    console.error('Database connection error:', connectionError);
    return NextResponse.json({
      latestBlock: 0,
      avgBlockTime: '0',
      networkHashrate: '0',
      networkDifficulty: '0',
      isConnected: false,
      totalTransactions: 0,
      avgGasPrice: '0',
      activeMiners: 0,
      error: 'Database connection failed'
    }, { status: 500 });
  }

  try {
    // Get latest block
    const latestBlock = await Block.findOne({}, { number: 1, timestamp: 1, difficulty: 1, miner: 1 })
      .sort({ number: -1 });

    if (!latestBlock) {
      return NextResponse.json({
        latestBlock: 0,
        avgBlockTime: '0',
        networkHashrate: '0',
        networkDifficulty: '0',
        isConnected: false,
        totalTransactions: 0,
        avgGasPrice: '0',
        activeMiners: 0
      });
    }

    // Calculate average block time from last 100 blocks
    const last100Blocks = await BlockStat.find({})
      .sort({ number: -1 })
      .limit(100)
      .select('blockTime');

    let avgBlockTime = 15.00; // default
    if (last100Blocks.length > 0) {
      const totalTime = last100Blocks.reduce((sum, block) => sum + (block.blockTime || 15), 0);
      avgBlockTime = Math.round((totalTime / last100Blocks.length) * 100) / 100; // Round to 2 decimal places
    }

    // Calculate network hashrate (simplified estimation)
    const recentBlocks = await Block.find({})
      .sort({ number: -1 })
      .limit(10)
      .select('difficulty timestamp');

    let networkHashrate = 'N/A';
    if (recentBlocks.length >= 2) {
      const avgDifficulty = recentBlocks.reduce((sum, block) => {
        return sum + parseInt(block.difficulty || '0', 10);
      }, 0) / recentBlocks.length;

      // Simplified hashrate calculation: difficulty / block_time
      const hashrateEstimate = avgDifficulty / avgBlockTime;
      networkHashrate = formatHashrate(hashrateEstimate);
    }

    // Get current difficulty
    const networkDifficulty = formatDifficulty(latestBlock.difficulty);

    // Get total transactions count
    const totalTransactions = await Transaction.countDocuments({});

    // Calculate average gas price from recent transactions
    const recentTxs = await Transaction.find({})
      .sort({ blockNumber: -1 })
      .limit(100)
      .select('gasPrice');

    let avgGasPrice = '0';
    if (recentTxs.length > 0) {
      const totalGasPrice = recentTxs.reduce((sum, tx) => {
        return sum + parseInt(tx.gasPrice || '0', 10);
      }, 0);
      avgGasPrice = Math.round(totalGasPrice / recentTxs.length / 1e9).toString(); // Convert to Gwei
    }

    // Count active miners in last 100 blocks
    const activeMinersResult = await Block.aggregate([
      { $sort: { number: -1 } },
      { $limit: 100 },
      { $group: { _id: '$miner' } },
      { $count: 'total' }
    ]);

    const activeMiners = activeMinersResult.length > 0 ? activeMinersResult[0].total : 0;

    // Calculate current block reward (VirBiCoin standard reward)
    // This is typically a fixed value but can be calculated based on block height
    const currentBlockHeight = latestBlock.number;
    let blockReward = '6.25'; // Default VBC block reward

    // VBC halving logic (if applicable)
    if (currentBlockHeight >= 420000) {
      blockReward = '3.125';
    } else if (currentBlockHeight >= 210000) {
      blockReward = '6.25';
    } else {
      blockReward = '12.5';
    }

    return NextResponse.json({
      latestBlock: latestBlock.number,
      avgBlockTime: avgBlockTime.toFixed(2),
      networkHashrate,
      networkDifficulty,
      isConnected: true,
      totalTransactions,
      avgGasPrice: `${avgGasPrice} Gwei`,
      activeMiners,
      blockReward,
      lastBlockTimestamp: latestBlock.timestamp,
      lastBlockMiner: latestBlock.miner
    });

  } catch (error) {
    console.error('Error in enhanced stats API:', error);
    return NextResponse.json({
      latestBlock: 0,
      avgBlockTime: '0.00',
      networkHashrate: '0',
      networkDifficulty: '0',
      isConnected: false,
      totalTransactions: 0,
      avgGasPrice: '0',
      activeMiners: 0,
      blockReward: '6.25',
      error: 'Failed to fetch enhanced statistics'
    });
  }
}

// Helper function to format hashrate
function formatHashrate(hashrate: number): string {
  if (hashrate > 1e12) {
    return `${(hashrate / 1e12).toFixed(2)} TH/s`;
  } else if (hashrate > 1e9) {
    return `${(hashrate / 1e9).toFixed(2)} GH/s`;
  } else if (hashrate > 1e6) {
    return `${(hashrate / 1e6).toFixed(2)} MH/s`;
  } else if (hashrate > 1e3) {
    return `${(hashrate / 1e3).toFixed(2)} KH/s`;
  }
  return `${hashrate.toFixed(2)} H/s`;

}

// Helper function to format difficulty
function formatDifficulty(difficulty: string | undefined): string {
  if (!difficulty) return 'N/A';

  const diff = parseInt(difficulty, 10);
  if (diff > 1e12) {
    return `${(diff / 1e12).toFixed(2)} T`;
  } else if (diff > 1e9) {
    return `${(diff / 1e9).toFixed(2)} G`;
  } else if (diff > 1e6) {
    return `${(diff / 1e6).toFixed(2)} M`;
  } else if (diff > 1e3) {
    return `${(diff / 1e3).toFixed(2)} K`;
  }
  return diff.toLocaleString();

}
