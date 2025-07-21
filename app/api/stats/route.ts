import { NextResponse } from 'next/server';
import { getChainStats } from '../../../lib/stats';
import { connectDB, Block } from '../../../models/index';

import { getGasUnitServer } from '../../../lib/config';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const enhanced = searchParams.get('enhanced') === 'true';
    
    console.log('[Stats] Starting stats calculation...');
    const stats = await getChainStats();
    console.log('[Stats] Stats calculation completed:', { latestBlock: stats.latestBlock, totalTransactions: stats.totalTransactions });
    
    // Return basic stats if enhanced is not requested
    if (!enhanced) {
      return NextResponse.json(stats);
    }
    
    // Calculate active miners from recent blocks for enhanced stats
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
    const gasUnit = getGasUnitServer();
    const enhancedStats = {
      latestBlock: stats.latestBlock,
      avgBlockTime: stats.avgBlockTime,
      networkHashrate: stats.networkHashrate,
      networkDifficulty: stats.networkDifficulty,
      isConnected: stats.isConnected,
      totalTransactions: stats.totalTransactions,
      avgGasPrice: stats.avgTransactionFee, // Convert fee to gas price
      avgTransactionFee: `${stats.avgTransactionFee} ${gasUnit}`, // Add gas unit
      activeMiners: activeMiners,
      lastBlockTime: stats.lastBlockTime, // Add this field
      lastBlockTimestamp: stats.lastBlockTimestamp // Add timestamp for frontend calculation
    };
    
    return NextResponse.json(enhancedStats);
  } catch (error) {
    console.error('[Stats] API error:', error);
    console.error('[Stats] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    const gasUnit = getGasUnitServer();
    return NextResponse.json({
      latestBlock: 0,
      avgBlockTime: '0',
      networkHashrate: '0',
      networkDifficulty: '0',
      isConnected: false,
      totalTransactions: 0,
      avgGasPrice: '0',
      avgTransactionFee: `0 ${gasUnit}`,
      activeMiners: 0,
      error: error instanceof Error ? error.message : 'API error'
    }, { status: 500 });
  }
}