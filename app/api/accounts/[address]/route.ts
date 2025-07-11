import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/explorerDB';

// Connect to MongoDB
async function connectDB() {
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  
  try {
    await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// Account schema
const accountSchema = new mongoose.Schema({
  address: String,
  balance: String,
  percentage: Number,
  rank: Number,
  transactionCount: { type: Number, default: 0 },
  firstSeen: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now }
}, { collection: 'Account' });

// Transaction schema  
const transactionSchema = new mongoose.Schema({
  hash: String,
  from: String,
  to: String,
  value: String, // Wei単位での値
  timestamp: Date,
  blockNumber: Number
}, { collection: 'transactions' });

const Account = mongoose.models.Account || mongoose.model('Account', accountSchema);
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    await connectDB();
    const { address } = await params;

    // Get account info - search without case sensitivity
    let account = await Account.findOne({ 
      address: { $regex: new RegExp(`^${address}$`, 'i') }
    });
    
    // If account doesn't exist, create default account data
    if (!account) {
      account = {
        address: address,
        balance: '0',
        percentage: 0,
        rank: null,
        transactionCount: 0,
        firstSeen: new Date(),
        lastActivity: new Date()
      };
    }

    // Get recent transactions for this account
    const transactions = await Transaction.find({
      $or: [
        { from: { $regex: new RegExp(`^${address}$`, 'i') } },
        { to: { $regex: new RegExp(`^${address}$`, 'i') } }
      ]
    })
      .sort({ timestamp: -1 })
      .limit(10);

    // Calculate actual transaction count
    const actualTxCount = await Transaction.countDocuments({
      $or: [
        { from: { $regex: new RegExp(`^${address}$`, 'i') } },
        { to: { $regex: new RegExp(`^${address}$`, 'i') } }
      ]
    });

    // Get first and last transaction timestamps
    const firstTx = await Transaction.findOne({
      $or: [
        { from: { $regex: new RegExp(`^${address}$`, 'i') } },
        { to: { $regex: new RegExp(`^${address}$`, 'i') } }
      ]
    }).sort({ timestamp: 1 });

    const lastTx = await Transaction.findOne({
      $or: [
        { from: { $regex: new RegExp(`^${address}$`, 'i') } },
        { to: { $regex: new RegExp(`^${address}$`, 'i') } }
      ]
    }).sort({ timestamp: -1 });

    // Format balance (convert from Wei to VBC if needed)
    const formatBalance = (balance: string) => {
      try {
        const numValue = parseFloat(balance);
        // If the balance looks like it's in Wei (very large number), convert to VBC
        if (numValue > 1000000000000000000) {
          return (numValue / 1000000000000000000).toLocaleString(undefined, { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 8 
          });
        }
        return numValue.toLocaleString(undefined, { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 8 
        });
      } catch (error) {
        return balance;
      }
    };

    // Convert Wei to VBC
    const weiToVBC = (weiValue: string) => {
      try {
        const wei = parseFloat(weiValue);
        const vbc = wei / 1000000000000000000;
        return vbc.toLocaleString(undefined, { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 8 
        });
      } catch (error) {
        return '0.00';
      }
    };

    const response = {
      account: {
        address: account.address,
        balance: formatBalance(account.balance),
        balanceRaw: account.balance,
        percentage: account.percentage?.toFixed(4) || '0.0000',
        rank: account.rank || null,
        transactionCount: actualTxCount || account.transactionCount || 0,
        firstSeen: getTimeAgo(firstTx?.timestamp || account.firstSeen),
        lastActivity: getTimeAgo(lastTx?.timestamp || account.lastActivity)
      },
      transactions: transactions.map((tx: any) => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: weiToVBC(tx.value),
        timestamp: tx.timestamp,
        timeAgo: getTimeAgo(tx.timestamp),
        blockNumber: tx.blockNumber
      }))
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Account API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account data' },
      { status: 500 }
    );
  }
}

function getTimeAgo(timestamp: number | Date): string {
  if (!timestamp) return 'Unknown';
  
  const now = new Date();
  let targetTime: Date;
  
  if (typeof timestamp === 'number') {
    // Unix timestampの場合
    targetTime = new Date(timestamp * 1000);
  } else if (timestamp instanceof Date) {
    // Date型の場合
    targetTime = timestamp;
  } else {
    // ISO文字列などの場合
    targetTime = new Date(timestamp);
  }
  
  const diff = now.getTime() - targetTime.getTime();
  
  // 負の値の場合（未来の日付）は0として扱う
  if (diff < 0) return 'just now';
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (years > 0) {
    return `${years} year${years > 1 ? 's' : ''} ago`;
  } else if (months > 0) {
    return `${months} month${months > 1 ? 's' : ''} ago`;
  } else if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else {
    return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
  }
}
