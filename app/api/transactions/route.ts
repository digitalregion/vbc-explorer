import { NextResponse } from 'next/server';
import { connectDB, Transaction } from '../../../models/index';
import { weiToVBC } from '../../../lib/bigint-utils';

export async function GET() {
  try {
    await connectDB();

    // Get latest 15 transactions
    const latestTransactions = await Transaction.find()
      .sort({ blockNumber: -1, transactionIndex: -1 })
      .limit(15)
      .lean();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transactions = latestTransactions.map((tx: any) => ({
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
