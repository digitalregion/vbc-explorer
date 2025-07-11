import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/db';
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

const BlockStatSchema = new mongoose.Schema({
  number: { type: Number, index: { unique: true } },
  timestamp: Number,
  difficulty: String,
  hashrate: String,
  txCount: Number,
  gasUsed: Number,
  gasLimit: Number,
  miner: String,
  blockTime: Number,
  uncleCount: Number,
}, { collection: 'BlockStat' });

// Models
const Block = mongoose.models.Block || mongoose.model('Block', BlockSchema);
const BlockStat = mongoose.models.BlockStat || mongoose.model('BlockStat', BlockStatSchema);

export async function GET() {
  try {
    await connectToDatabase();

    // Get latest block
    const latestBlock = await Block.findOne().sort({ number: -1 }).lean();

    // Get recent blocks for block time calculation
    const recentBlocks = await Block.find()
      .sort({ number: -1 })
      .limit(100)
      .lean();

    // Calculate average block time
    let avgBlockTime = 0;
    if (recentBlocks.length > 1) {
      let totalTime = 0;
      for (let i = 0; i < recentBlocks.length - 1; i++) {
        const timeDiff = recentBlocks[i].timestamp - recentBlocks[i + 1].timestamp;
        totalTime += timeDiff;
      }
      avgBlockTime = totalTime / (recentBlocks.length - 1);
    }

    // Get latest block stat for hashrate and difficulty
    const latestBlockStat = await BlockStat.findOne().sort({ number: -1 }).lean();

    // Calculate hashrate from difficulty if not available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let hashrate = (latestBlockStat as any)?.hashrate || '0';
    let formattedDifficulty = '0';

    if (latestBlock) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const difficulty = parseFloat((latestBlock as any)?.difficulty || '0');

      if (hashrate === '0' && avgBlockTime > 0 && difficulty > 0) {
        // Hashrate = Difficulty / Block Time
        const calculatedHashrate = difficulty / avgBlockTime;
        hashrate = (calculatedHashrate / 1e9).toFixed(2) + ' GH/s'; // Convert to GH/s
      }

      // Format difficulty in a human-readable format
      if (difficulty >= 1e12) {
        formattedDifficulty = (difficulty / 1e12).toFixed(2) + ' T';
      } else if (difficulty >= 1e9) {
        formattedDifficulty = (difficulty / 1e9).toFixed(2) + ' G';
      } else if (difficulty >= 1e6) {
        formattedDifficulty = (difficulty / 1e6).toFixed(2) + ' M';
      } else {
        formattedDifficulty = difficulty.toString();
      }
    }

    const stats = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      latestBlock: (latestBlock as any)?.number || 0,
      avgBlockTime: avgBlockTime.toFixed(2),
      networkHashrate: hashrate,
      networkDifficulty: formattedDifficulty,
      isConnected: !!latestBlock
    };

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
