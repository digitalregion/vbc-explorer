// Enhanced stats API for VirBiCoin Explorer
import { NextResponse } from 'next/server';
import { getChainStats } from '../../../lib/stats';

export async function GET() {
  try {
    const stats = await getChainStats();
    
    // Transform basic stats to enhanced stats format
    const enhancedStats = {
      latestBlock: stats.latestBlock,
      avgBlockTime: stats.avgBlockTime,
      networkHashrate: stats.networkHashrate,
      networkDifficulty: stats.networkDifficulty,
      isConnected: stats.isConnected,
      totalTransactions: stats.totalTransactions,
      avgGasPrice: stats.avgTransactionFee, // Convert fee to gas price
      activeMiners: 1, // Default for now
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
