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

// Token schema - use existing schema from tools/addTestTokens.js
const tokenSchema = new mongoose.Schema({
  symbol: String,
  name: String,
  address: String,
  holders: Number,
  supply: String,
  type: String,
  decimals: { type: Number, default: 18 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'tokens' });

// Token transfer schema
const tokenTransferSchema = new mongoose.Schema({
  transactionHash: String,
  blockNumber: Number,
  from: String,
  to: String,
  value: String,
  tokenAddress: String,
  timestamp: Date
}, { collection: 'tokentransfers' });

// Token holder schema  
const tokenHolderSchema = new mongoose.Schema({
  tokenAddress: String,
  holderAddress: String,
  balance: String,
  percentage: Number,
  rank: Number
}, { collection: 'tokenholders' });

const Token = mongoose.models.Token || mongoose.model('Token', tokenSchema);
const TokenTransfer = mongoose.models.TokenTransfer || mongoose.model('TokenTransfer', tokenTransferSchema);
const TokenHolder = mongoose.models.TokenHolder || mongoose.model('TokenHolder', tokenHolderSchema);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    await connectDB();
    const { address } = await params;

    // Get token info - search without case sensitivity
    let token = await Token.findOne({ 
      address: { $regex: new RegExp(`^${address}$`, 'i') }
    });
    
    // If token doesn't exist, create dummy data
    if (!token) {
      token = {
        address: address,
        name: 'Unknown Token',
        symbol: 'UNK',
        decimals: 18,
        supply: '1000000000000000000000000', // 1M tokens with 18 decimals
        holders: 0,
        type: 'Unknown',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    // Get token holders - use case-insensitive match
    const holders = await TokenHolder.find({ 
      tokenAddress: { $regex: new RegExp(`^${address}$`, 'i') }
    })
      .sort({ rank: 1 })
      .limit(50);

    // Get recent transfers - use case-insensitive match
    const transfers = await TokenTransfer.find({ 
      tokenAddress: { $regex: new RegExp(`^${address}$`, 'i') }
    })
      .sort({ timestamp: -1 })
      .limit(50);

    // Calculate statistics
    const totalHolders = await TokenHolder.countDocuments({ 
      tokenAddress: { $regex: new RegExp(`^${address}$`, 'i') }
    });
    const totalTransfers = await TokenTransfer.countDocuments({ 
      tokenAddress: { $regex: new RegExp(`^${address}$`, 'i') }
    });

    // Calculate age in days
    const ageInDays = token.createdAt ? Math.floor((Date.now() - new Date(token.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;

    // Format total supply
    const formatTokenAmount = (amount: string, decimals: number = 18) => {
      if (!amount) return '0';
      
      // Handle unlimited supply
      if (amount.toLowerCase() === 'unlimited') {
        return 'Unlimited';
      }
      
      try {
        // Remove commas and parse
        const cleanAmount = amount.replace(/,/g, '');
        
        // For NFTs, don't apply decimals formatting
        if (token.type === 'VRC-721' || token.type === 'VRC-1155') {
          return cleanAmount;
        }
        
        // Try BigInt conversion for large numbers
        if (cleanAmount.length > 15) {
          const value = BigInt(cleanAmount);
          const divisor = BigInt(10 ** decimals);
          const formatted = Number(value) / Number(divisor);
          return formatted.toLocaleString();
        } else {
          // For smaller numbers, direct parsing
          const numValue = parseFloat(cleanAmount);
          return numValue.toLocaleString();
        }
      } catch (error) {
        // Fallback to direct parsing
        const numValue = parseFloat(amount.replace(/,/g, ''));
        return numValue.toLocaleString();
      }
    };

    // Determine if this is an NFT
    const isNFT = token.type === 'VRC-721' || token.type === 'VRC-1155';

    const response = {
      token: {
        address: token.address,
        name: token.name,
        symbol: token.symbol,
        type: token.type,
        isNFT: isNFT,
        decimals: token.decimals || (isNFT ? 0 : 18),
        totalSupply: token.supply ? formatTokenAmount(token.supply, token.decimals || (isNFT ? 0 : 18)) : '0',
        totalSupplyRaw: token.supply || '0'
      },
      statistics: {
        holders: totalHolders || token.holders || 0,
        transfers: totalTransfers || 0,
        age: ageInDays,
        marketCap: 'N/A' // Will need external API for price data
      },
      holders: holders.map((holder: any) => ({
        rank: holder.rank,
        address: holder.holderAddress,
        balance: formatTokenAmount(holder.balance, token.decimals || (isNFT ? 0 : 18)),
        balanceRaw: holder.balance,
        percentage: holder.percentage?.toFixed(2) || '0.00'
      })),
      transfers: transfers.map((transfer: any) => ({
        hash: transfer.transactionHash,
        from: transfer.from,
        to: transfer.to,
        value: formatTokenAmount(transfer.value, token.decimals || (isNFT ? 0 : 18)),
        valueRaw: transfer.value,
        timestamp: transfer.timestamp,
        timeAgo: getTimeAgo(transfer.timestamp)
      }))
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Token API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token data' },
      { status: 500 }
    );
  }
}

function getTimeAgo(timestamp: Date): string {
  if (!timestamp) return 'Unknown';
  
  const now = new Date();
  const diff = now.getTime() - new Date(timestamp).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
}
