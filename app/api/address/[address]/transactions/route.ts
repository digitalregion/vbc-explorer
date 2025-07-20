import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '../../../../../models/index';

// Transaction schema
const transactionSchema = new mongoose.Schema({
  hash: String,
  from: String,
  to: String,
  value: String,
  timestamp: Date,
  blockNumber: Number
}, { collection: 'transactions' });

const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    await connectDB();
  } catch (dbError) {
    console.error('Database connection error:', dbError);
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }
  
  const { address } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

  try {
    // 通常のトランザクションのみを取得（マイニング報酬を除外）
    const transactions = await Transaction.find({
          $or: [
            { from: { $regex: new RegExp(`^${address}$`, 'i') } },
            { to: { $regex: new RegExp(`^${address}$`, 'i') } }
      ],
      $and: [
        { from: { $ne: '0x0000000000000000000000000000000000000000' } },
        { to: { $ne: '0x0000000000000000000000000000000000000000' } }
      ]
    })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    // 総件数を取得
    const totalTransactions = await Transaction.countDocuments({
      $or: [
        { from: { $regex: new RegExp(`^${address}$`, 'i') } },
        { to: { $regex: new RegExp(`^${address}$`, 'i') } }
      ],
      $and: [
        { from: { $ne: '0x0000000000000000000000000000000000000000' } },
        { to: { $ne: '0x0000000000000000000000000000000000000000' } }
      ]
    });

    const totalPages = Math.ceil(totalTransactions / limit);

    // トランザクションデータをフォーマット
    const formattedTransactions = transactions.map(tx => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      timestamp: tx.timestamp,
      blockNumber: tx.blockNumber,
      status: 1 // 通常のトランザクションは成功として扱う
    }));

    return NextResponse.json({
      transactions: formattedTransactions,
      totalTransactions,
        totalPages,
      currentPage: page,
      itemsPerPage: limit
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
