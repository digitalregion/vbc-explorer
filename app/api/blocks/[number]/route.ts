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
    let blockNumber: number | undefined = undefined;
    if (Array.isArray(block)) {
      blockNumber = block[0]?.number;
    } else if (block && typeof block === 'object' && 'number' in block) {
      blockNumber = (block as unknown as { number: number }).number;
    }
    if (blockNumber === undefined) {
      return NextResponse.json({ error: 'Block number not found' }, { status: 500 });
    }
    const transactions = await Transaction.find({ blockNumber })
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
      number: (block as unknown as { number: number }).number,
      hash: (block as unknown as { hash: string }).hash,
      parentHash: (block as unknown as { parentHash: string }).parentHash,
      timestamp: (block as unknown as { timestamp: number }).timestamp,
      miner: (block as unknown as { miner: string }).miner,
      difficulty: (block as unknown as { difficulty: string }).difficulty,
      totalDifficulty: (block as unknown as { totalDifficulty: string }).totalDifficulty,
      size: (block as unknown as { size: number }).size,
      gasLimit: (block as unknown as { gasLimit: number }).gasLimit,
      gasUsed: (block as unknown as { gasUsed: number }).gasUsed,
      nonce: (block as unknown as { nonce: string }).nonce,
      transactionCount: transactions.length,
      transactions: transactions.map((tx) => ({
        hash: (tx as unknown as { hash: string }).hash,
        from: (tx as unknown as { from: string }).from,
        to: (tx as unknown as { to: string }).to,
        value: (tx as unknown as { value: string }).value,
        gasUsed: (tx as unknown as { gasUsed: number }).gasUsed,
        gasPrice: (tx as unknown as { gasPrice: string }).gasPrice,
        status: (tx as unknown as { status: number }).status,
        transactionIndex: (tx as unknown as { transactionIndex: number }).transactionIndex
      }))
    };

    return NextResponse.json(blockData);
  } catch (error) {
    console.error('Block details API error:', error);
    return NextResponse.json({ error: 'Failed to fetch block details' }, { status: 500 });
  }
}
