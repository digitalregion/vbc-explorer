import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { weiToVBC } from '../../../lib/bigint-utils';
import { connectDB } from '../../../models/index';

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '15');
    const skip = (page - 1) * limit;

    const db = mongoose.connection.db;

    // Only get total count when explicitly requested for pagination
    let totalCount = 0;
    let totalPages = 0;
    
    const hasPageParams = searchParams.has('page') || searchParams.has('limit');
    if (hasPageParams) {
      // Use estimated count for better performance with large collections
      const stats = await db?.collection('Transaction').estimatedDocumentCount();
      totalCount = stats || 0;
      totalPages = Math.ceil(totalCount / limit);
    }

    // Ensure basic indexes exist for performance (only create if not exists)
    try {
      const indexes = await db?.collection('Transaction').indexes();
      const hasBlockNumberIndex = indexes?.some((idx: any) => 
        idx.key.blockNumber === -1 || (idx.key.blockNumber === -1 && idx.key.transactionIndex === -1)
      );
      
      if (!hasBlockNumberIndex) {
        console.log('Creating missing Transaction indexes...');
        await db?.collection('Transaction').createIndex({ blockNumber: -1 }, { background: true });
        await db?.collection('Transaction').createIndex({ blockNumber: -1, transactionIndex: -1 }, { background: true });
        console.log('Transaction indexes created successfully');
      }
    } catch (indexError: any) {
      // Indexes may already exist or creation failed, continue anyway
      console.log('Index setup info:', indexError?.message || indexError);
    }

    // Optimized query - let MongoDB choose the best index automatically
    const transactions = await db?.collection('Transaction')
      .find({})
      .sort({ blockNumber: -1, transactionIndex: -1 })
      .skip(skip)
      .limit(limit)
      .project({
        hash: 1,
        from: 1,
        to: 1,
        value: 1,
        timestamp: 1,
        blockNumber: 1,
        gasUsed: 1,
        gasPrice: 1,
        status: 1,
        _id: 0 // Exclude _id for smaller payload
      })
      .toArray();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedTransactions = (transactions || []).map((tx: any) => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value ? weiToVBC(tx.value) : '0',
      timestamp: tx.timestamp,
      blockNumber: tx.blockNumber,
      gasUsed: tx.gasUsed,
      gasPrice: tx.gasPrice,
      status: tx.status
    }));

    if (hasPageParams) {
      return NextResponse.json({
        transactions: formattedTransactions,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } else {
      // For homepage requests (without pagination), return optimized array format
      return NextResponse.json(formattedTransactions);
    }
  } catch (error) {
    console.error('Transactions API error:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}