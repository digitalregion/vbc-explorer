import { NextResponse } from 'next/server';
import connectToDatabase from '../../../lib/db';
import mongoose from 'mongoose';

// Define schemas
const BlockSchema = new mongoose.Schema({
  number: { type: Number, index: { unique: true } },
  hash: String,
  parentHash: String,
  nonce: String,
  sha3Uncles: String,
  logsBloom: String,
  transactionsRoot: String,
  stateRoot: String,
  receiptRoot: String,
  miner: { type: String, lowercase: true },
  difficulty: String,
  totalDifficulty: String,
  size: Number,
  extraData: String,
  gasLimit: Number,
  gasUsed: Number,
  timestamp: Number,
  blockTime: Number,
  uncles: [String],
}, { collection: 'Block' });

// Models
const Block = mongoose.models.Block || mongoose.model('Block', BlockSchema);

export async function GET() {
  await connectToDatabase();

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
      hash: block.hash
    }));

    return NextResponse.json(blocks);
  } catch (error) {
    console.error('Blocks API error:', error);
    return NextResponse.json({ error: 'Failed to fetch blocks' }, { status: 500 });
  }
}
