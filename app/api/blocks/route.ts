import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

// Database connection function
async function connectDB() {
  if (mongoose.connection.readyState < 1) {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost/explorerDB';
    try {
      await mongoose.connect(uri);
    } catch (error) {
      console.error('[Blocks API] Connection failed:', error);
      throw error;
    }
  }
}

export async function GET() {
  await connectDB();

  try {
    const db = mongoose.connection.db;
    
    // Get latest 15 blocks
    const latestBlocks = await db?.collection('Block').find()
      .sort({ number: -1 })
      .limit(15)
      .project({
        number: 1,
        miner: 1,
        timestamp: 1,
        hash: 1,
        gasUsed: 1,
        gasLimit: 1,
        difficulty: 1
      })
      .toArray();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blocks = (latestBlocks || []).map((block: any) => ({
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
