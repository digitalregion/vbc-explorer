import { NextResponse } from 'next/server';
import { connectDB, Block, Transaction } from '../../../../models/index';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    await connectDB();

    const { number } = await params;
    const identifier = number;
    let block;

    // Check if identifier is a number (block number) or a hash
    if (/^\d+$/.test(identifier)) {
      // It's a block number
      const blockNumber = parseInt(identifier);
      if (isNaN(blockNumber)) {
        return NextResponse.json({ error: 'Invalid block number' }, { status: 400 });
      }
      block = await Block.findOne({ number: blockNumber }).lean();
    } else {
      // It's likely a block hash
      block = await Block.findOne({ hash: identifier }).lean();
    }

    if (!block) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }

    // Get transactions for this block
    const transactions = await Transaction.find({ blockNumber: (block as { number: number }).number })
      .sort({ transactionIndex: 1 })
      .lean();

    // Format the response
    interface BlockData {
      number: number;
      hash: string;
      parentHash: string;
      timestamp: number;
      miner: string;
      difficulty: string;
      totalDifficulty: string;
      size: number;
      gasLimit: number;
      gasUsed: number;
      nonce: string;
      transactionCount: number;
      transactions: Array<{
        hash: string;
        from: string;
        to: string;
        value: string;
        gasUsed: number;
        gasPrice: string;
        status: number;
        transactionIndex: number;
      }>;
    }

    const blockData: BlockData = {
      number: (block as { number: number }).number,
      hash: (block as { hash: string }).hash,
      parentHash: (block as { parentHash: string }).parentHash,
      timestamp: (block as { timestamp: number }).timestamp,
      miner: (block as { miner: string }).miner,
      difficulty: (block as { difficulty: string }).difficulty,
      totalDifficulty: (block as { totalDifficulty: string }).totalDifficulty,
      size: (block as { size: number }).size,
      gasLimit: (block as { gasLimit: number }).gasLimit,
      gasUsed: (block as { gasUsed: number }).gasUsed,
      nonce: (block as { nonce: string }).nonce,
      transactionCount: transactions.length,
      transactions: transactions.map((tx) => ({
        hash: (tx as { hash: string }).hash,
        from: (tx as { from: string }).from,
        to: (tx as { to: string }).to,
        value: (tx as { value: string }).value,
        gasUsed: (tx as { gasUsed: number }).gasUsed,
        gasPrice: (tx as { gasPrice: string }).gasPrice,
        status: (tx as { status: number }).status,
        transactionIndex: (tx as { transactionIndex: number }).transactionIndex
      }))
    };

    return NextResponse.json(blockData);
  } catch (error) {
    console.error('Block details API error:', error);
    return NextResponse.json({ error: 'Failed to fetch block details' }, { status: 500 });
  }
}
