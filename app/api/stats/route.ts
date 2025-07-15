import { NextResponse } from 'next/server';
import { getChainStats } from '../../../lib/stats';

export async function GET() {
  try {
    const stats = await getChainStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch stats',
      latestBlock: 0,
      avgBlockTime: '0',
      networkHashrate: '0',
      networkDifficulty: '0',
      isConnected: false
    }, { status: 500 });
  }
}
