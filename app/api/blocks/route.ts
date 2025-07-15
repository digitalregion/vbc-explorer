import { NextResponse } from 'next/server';
import { connectDB, Block } from '../../../models/index';

export async function GET() {
  await connectDB();

  try {
    // Get latest 15 blocks
    const latestBlocks = await Block.find()
      .sort({ number: -1 })
      .limit(15)
      .lean();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blocks = latestBlocks.map((block: any) => ({
      number: block.number,
      miner: block.miner,
      timestamp: block.timestamp,
      hash: block.hash,
      gasUsed: block.gasUsed,
      gasLimit: block.gasLimit,
      difficulty: block.difficulty
    }));

    return NextResponse.json(blocks);
  } catch (error) {
    console.error('Error fetching blocks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blocks' },
      { status: 500 }
    );
  }
}
