// Enhanced stats API for VirBiCoin Explorer
import { NextResponse } from 'next/server';
import { getChainStats } from '../../../lib/stats';
import { connectDB, Block } from '../../../models/index';

export async function GET() {
  try {
    const stats = await getChainStats();
    
    // Calculate active miners from recent blocks
    let activeMiners = 0;
    try {
      await connectDB();
      
      // Get the last 100 blocks and count unique miners
      const recentBlocks = await Block.find({})
        .sort({ number: -1 })
        .limit(100)
        .select('miner')
        .lean();
      
      const uniqueMiners = new Set();
      recentBlocks.forEach(block => {
        if (block.miner) {
          uniqueMiners.add(block.miner.toLowerCase());
        }
      });
      
      activeMiners = uniqueMiners.size;
    } catch (error) {
      console.error('Error calculating active miners:', error);
      activeMiners = 0;
    }
    
    // Transform basic stats to enhanced stats format
    const enhancedStats = {
      latestBlock: stats.latestBlock,
      avgBlockTime: stats.avgBlockTime,
      networkHashrate: stats.networkHashrate,
      networkDifficulty: stats.networkDifficulty,
      isConnected: stats.isConnected,
      totalTransactions: stats.totalTransactions,
      avgGasPrice: stats.avgTransactionFee, // Convert fee to gas price
      activeMiners: activeMiners,
      lastBlockTime: stats.lastBlockTime // Add this field
    };
    
    return NextResponse.json(enhancedStats);
  } catch (error) {
    console.error('[Enhanced Stats] API error:', error);
    return NextResponse.json({
      latestBlock: 0,
      avgBlockTime: '0',
      networkHashrate: '0',
      networkDifficulty: '0',
      isConnected: false,
      totalTransactions: 0,
      avgGasPrice: '0',
      activeMiners: 0,
      error: 'API error'
    }, { status: 500 });
  }
}
