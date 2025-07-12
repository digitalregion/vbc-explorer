import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

// MongoDB connection
const connectDB = async () => {
  if (mongoose.connections[0].readyState) {
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/explorerDB', {});
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
};

// Define schemas
const TransactionSchema = new mongoose.Schema({
  hash: { type: String, index: { unique: true }, lowercase: true },
  nonce: Number,
  blockHash: String,
  blockNumber: Number,
  transactionIndex: Number,
  status: Number,
  from: { type: String, lowercase: true },
  to: { type: String, lowercase: true },
  creates: { type: String, lowercase: true },
  value: String,
  gas: Number,
  gasUsed: Number,
  gasPrice: String,
  timestamp: Number,
  input: String,
}, { collection: 'Transaction' });

// Models
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);

export async function GET() {
  try {
    await connectDB();

    // Get latest 10 transactions
    const latestTransactions = await Transaction.find()
      .sort({ blockNumber: -1 })
      .limit(10)
      .lean();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transactions = latestTransactions.map((tx: any) => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      timestamp: tx.timestamp,
      blockNumber: tx.blockNumber
    }));

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Transactions API error:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
