import { NextResponse } from 'next/server';
import { loadConfig } from '../../../lib/config';
import Web3 from 'web3';

export async function GET() {
  try {
    const config = loadConfig();
    const web3 = new Web3(config.web3Provider.url);
    
    const blockNumber = await web3.eth.getBlockNumber();
    
    return NextResponse.json({
      blockHeight: blockNumber.toString(),
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error fetching block height:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch block height',
      blockHeight: '0',
      timestamp: Date.now()
    }, { status: 500 });
  }
}