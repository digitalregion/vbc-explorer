import { NextResponse } from 'next/server';
import Web3 from 'web3';

export async function GET() {
  const web3 = new Web3('http://localhost:8329');
  const height = await web3.eth.getBlockNumber();
  // Convert BigInt to Number for JSON serialization
  return NextResponse.json({ height: height.toString() });
}