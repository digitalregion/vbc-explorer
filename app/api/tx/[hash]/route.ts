import { NextRequest, NextResponse } from 'next/server';
import { Transaction, Block, connectDB } from '../../../../models/index';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  try {
    const { hash } = await params;

    if (!hash) {
      return NextResponse.json({ error: 'Transaction hash is required' }, { status: 400 });
    }

    // Connect to database with better error handling
    try {
      await connectDB();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Find the transaction by hash
    const transaction = await Transaction.findOne({ hash: hash }).lean();

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Get the actual transaction object (handle both array and single object cases)
    const actualTransaction = Array.isArray(transaction) ? transaction[0] : transaction;
    
    // Find the block that contains this transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const block = await Block.findOne({ number: (actualTransaction as any).blockNumber }).lean();

    // Add block information to the transaction data
    const transactionWithBlock = {
      ...actualTransaction,
      block: block ? {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        number: (block as any).number,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hash: (block as any).hash,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        timestamp: (block as any).timestamp,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        miner: (block as any).miner
      } : null
    };

    return NextResponse.json(transactionWithBlock);
  } catch (error) {
    console.error('Error fetching transaction details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}