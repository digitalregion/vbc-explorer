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

    // Get total count for pagination
    const totalCount = await db?.collection('Transaction').countDocuments({});
    const totalPages = Math.ceil((totalCount || 0) / limit);

    // Get transactions for current page
    const transactions = await db?.collection('Transaction').find()
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
        status: 1
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

    // 後方互換性のため: pageまたはlimitパラメータが明示的に指定された場合のみページネーション形式
    const hasPageParams = searchParams.has('page') || searchParams.has('limit');
    
    if (hasPageParams) {
      return NextResponse.json({
        transactions: formattedTransactions,
        pagination: {
          page,
          limit,
          total: totalCount || 0,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } else {
      // 従来の配列形式（デフォルトで15件）
      return NextResponse.json(formattedTransactions);
    }
  } catch (error) {
    console.error('Transactions API error:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}