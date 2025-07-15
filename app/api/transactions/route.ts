import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { weiToVBC } from '../../../lib/bigint-utils';

// Database connection function
async function connectDB() {
  if (mongoose.connection.readyState < 1) {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost/explorerDB';
    try {
      await mongoose.connect(uri);
    } catch (error) {
      console.error('[Transactions API] Connection failed:', error);
      throw error;
    }
  }
}

export async function GET() {
  try {
    await connectDB();

    const db = mongoose.connection.db;

    // Get latest 15 transactions
    const latestTransactions = await db?.collection('Transaction').find()
      .sort({ blockNumber: -1, transactionIndex: -1 })
      .limit(15)
      .project({
        hash: 1,
        from: 1,
        to: 1,
        value: 1,
        timestamp: 1,
        blockNumber: 1,
        gasUsed: 1,
        status: 1
      })
      .toArray();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transactions = (latestTransactions || []).map((tx: any) => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value ? weiToVBC(tx.value) : '0',
      timestamp: tx.timestamp,
      blockNumber: tx.blockNumber,
      gasUsed: tx.gasUsed,
      status: tx.status
    }));

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Transactions API error:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
