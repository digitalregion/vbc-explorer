import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getChainStats } from '../../../../lib/stats'; // Import the new stats library function
import { Contract } from '../../../../models/index';

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

// Define a strict type for our token data to be used in this API route
interface ApiToken {
  address: string;
  name: string;
  symbol: string;
  type: string;
  decimals: number;
  supply: string;
  totalSupply?: string;
  holders: number;
  createdAt: Date;
  updatedAt: Date;
}


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    await connectDB();
    const { address } = await params;

    let token: ApiToken | null = null;
    let chainStats: { totalSupply?: string; activeAddresses?: number } | null = null; // Declare chainStats outside the if block

    // Handle the native VBC token as a special case
    if (address.toLowerCase() === '0x0000000000000000000000000000000000000000') {
      // Directly call the library function instead of using fetch
      chainStats = await getChainStats();

      token = {
        address: '0x0000000000000000000000000000000000000000',
        name: 'VirBiCoin',
        symbol: 'VBC',
        type: 'Native',
        decimals: 18,
        supply: chainStats.totalSupply || 'N/A',
        holders: chainStats.activeAddresses || 0,
        createdAt: new Date('1970-01-01T00:00:00Z'), // Set a more realistic genesis date
        updatedAt: new Date(),
      };
    } else {
      // Get token info from DB for other tokens
          const foundToken = await Token.findOne({
      address: { $regex: new RegExp(`^${address}$`, 'i') }
    }).lean() as Record<string, unknown> | null;
      
      if (foundToken) {
        token = foundToken as unknown as ApiToken;
      }
    }

    // If token still not found, create dummy data for the requested address
    if (!token) {
      token = {
        address: address,
        name: 'Unknown Token',
        symbol: 'UNKNOWN',
        decimals: 18,
        supply: '1000000000000000000000000', // 1M tokens with 18 decimals
        holders: 0,
        type: 'Unknown',
        createdAt: new Date('2023-01-01T00:00:00Z'), // Set a more realistic creation date
        updatedAt: new Date()
      };
    }

    // If token has current date as createdAt, try to find actual creation date from transfers
    if (token.createdAt && Math.abs(Date.now() - new Date(token.createdAt).getTime()) < 24 * 60 * 60 * 1000) {
      console.log(`Token ${address} has current date as createdAt, looking for actual creation date`);
      
      // Try to find the earliest transfer or mint transaction
      const firstTransfer = await TokenTransfer.findOne({
        tokenAddress: { $regex: new RegExp(`^${address}$`, 'i') }
      }).sort({ timestamp: 1 });
      
      // Also try to find mint transactions (from zero address)
      const firstMint = await TokenTransfer.findOne({
        tokenAddress: { $regex: new RegExp(`^${address}$`, 'i') },
        from: '0x0000000000000000000000000000000000000000'
      }).sort({ timestamp: 1 });
      
      // Use the earliest of the two
      let earliestTimestamp = null;
      if (firstTransfer && firstTransfer.timestamp) {
        earliestTimestamp = new Date(firstTransfer.timestamp);
      }
      if (firstMint && firstMint.timestamp) {
        const mintTimestamp = new Date(firstMint.timestamp);
        if (!earliestTimestamp || mintTimestamp < earliestTimestamp) {
          earliestTimestamp = mintTimestamp;
        }
      }
      
      if (earliestTimestamp) {
        token.createdAt = earliestTimestamp;
        console.log(`Token ${address} updated createdAt to:`, token.createdAt);
      }
    }

    // Normalize token type for non-native tokens
    if (token.type === 'ERC20') {
      token.type = 'VRC-20';
    } else if (token.type === 'ERC721') {
      token.type = 'VRC-721';
    } else if (token.type === 'VRC721') {
      token.type = 'VRC-721';
    } else if (token.type === 'ERC1155') {
      token.type = 'VRC-1155';
    } else if (token.type === 'VRC1155') {
      token.type = 'VRC-1155';
    }

    // Get token holders - use case-insensitive match with direct database access
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    const holders = await db.collection('tokenholders').find({
      tokenAddress: { $regex: new RegExp(`^${address}$`, 'i') }
    })
      .sort({ rank: 1 })
      .limit(50)
      .toArray();
    


    // Get recent transfers - use case-insensitive match
    const transfers = await TokenTransfer.find({
      tokenAddress: { $regex: new RegExp(`^${address}$`, 'i') }
    })
      .sort({ timestamp: -1 })
      .limit(50);

    // Calculate real statistics from database for non-native tokens
    let realHolders = 0;
    let realTransfers = 0;
    let realSupply = token.supply || '0';
    let mintCount = 0;
    
    if (token.type !== 'Native') {
      // Get actual holder count
      realHolders = await TokenHolder.countDocuments({
        tokenAddress: { $regex: new RegExp(`^${address}$`, 'i') }
      });
      
      // Get actual transfer count
      realTransfers = await TokenTransfer.countDocuments({
        tokenAddress: { $regex: new RegExp(`^${address}$`, 'i') }
      });

      // For VRC-721 tokens, update the supply with actual mint count
      if (token.type === 'VRC-721') {
        try {
          mintCount = await TokenTransfer.countDocuments({
            tokenAddress: { $regex: new RegExp(`^${address}$`, 'i') },
            from: '0x0000000000000000000000000000000000000000'
          });
          
          // Use database totalSupply if available and greater than 0, otherwise use mintCount
          if (token.totalSupply && token.totalSupply !== '0') {
            realSupply = token.totalSupply;
          } else if (token.supply && token.supply !== '0') {
            realSupply = token.supply;
          } else {
            realSupply = mintCount.toString();
          }
          
          // Update token object
          token.supply = realSupply;
          token.totalSupply = realSupply;
              } catch {
        console.error('Error counting mints');
      }
      }
      // Update token object with real values
      token.holders = realHolders;
    }

    // Calculate age in days with improved accuracy
    let ageInDays = 0;
    if (token.type === 'Native') {
      // For native VBC, we don't show age
      ageInDays = -1; // Special value to indicate N/A
    } else {
      // Get all transfers to find the earliest activity
      const allTransfers = await TokenTransfer.find({
        tokenAddress: { $regex: new RegExp(`^${address}$`, 'i') }
      }).sort({ timestamp: 1 }).limit(500); // Get first 500 transfers for better accuracy
      
      console.log(`Token ${address} found ${allTransfers.length} transfers for age calculation`);
      
      if (allTransfers.length > 0) {
        // Find the earliest transfer timestamp
        const earliestTransfer = allTransfers[0];
        const latestTransfer = allTransfers[allTransfers.length - 1];
        
        console.log(`Token ${address} earliest transfer:`, earliestTransfer);
        console.log(`Token ${address} latest transfer:`, latestTransfer);
        
        if (earliestTransfer && earliestTransfer.timestamp) {
          const earliestTime = new Date(earliestTransfer.timestamp).getTime();
          const now = Date.now();
          const diffMs = now - earliestTime;
          ageInDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          
          // Additional validation: if the calculated age seems too low but we have recent transfers,
          // use the latest transfer as a reference point
          if (ageInDays < 30 && allTransfers.length > 1) {
            const latestTime = new Date(latestTransfer.timestamp).getTime();
            const latestDiffMs = now - latestTime;
            const latestAgeInDays = Math.floor(latestDiffMs / (1000 * 60 * 60 * 24));
            
            console.log(`Token ${address} age validation:`, {
              calculatedAge: ageInDays,
              latestTransferAge: latestAgeInDays,
              totalTransfers: allTransfers.length
            });
            
            // If latest transfer shows older age, use that as minimum
            if (latestAgeInDays > ageInDays) {
              ageInDays = Math.max(ageInDays, latestAgeInDays);
              console.log(`Token ${address} adjusted age to:`, ageInDays);
            }
          }
          
          console.log(`Token ${address} final age calculation:`, {
            earliestTime: new Date(earliestTime),
            now: new Date(now),
            diffMs,
            ageInDays,
            totalTransfersAnalyzed: allTransfers.length,
            earliestTransferHash: earliestTransfer.transactionHash,
            latestTransferHash: latestTransfer.transactionHash
          });
        } else {
          // Fallback to token.createdAt if no valid transfers found
          ageInDays = token.createdAt ? Math.floor((Date.now() - new Date(token.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;
          console.log(`Token ${address} using fallback age calculation:`, {
            createdAt: token.createdAt,
            ageInDays
          });
        }
      } else {
        // Fallback to token.createdAt if no transfers found
        ageInDays = token.createdAt ? Math.floor((Date.now() - new Date(token.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;
        console.log(`Token ${address} using fallback age calculation:`, {
          createdAt: token.createdAt,
          ageInDays
        });
      }
    }

    // Format total supply
    const formatTokenAmount = (amount: string, decimals: number = 18) => {
      if (!amount || amount === 'N/A') return amount;

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
        }
        // For smaller numbers, direct parsing
        const numValue = parseFloat(cleanAmount);
        return numValue.toLocaleString();

      } catch {
        // Fallback to direct parsing
        const numValue = parseFloat(amount.replace(/,/g, ''));
        return numValue.toLocaleString();
      }
    };

    // Get verification status for the contract
    let verified = false;
    if (token.type !== 'Native') {
      try {
        const contract = await Contract.findOne({ address: address.toLowerCase() }).lean();
        const contractDoc = Array.isArray(contract) ? contract[0] : contract;
        verified = contractDoc?.verified || false;
      } catch {
        console.error('Error fetching contract verification status');
      }
    }

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
        totalSupply: realSupply ? formatTokenAmount(realSupply, token.decimals || (isNFT ? 0 : 18)) : '0',
        totalSupplyRaw: realSupply || '0',
        verified: verified
      },
      statistics: {
        holders: token.type === 'Native' ? token.holders : realHolders,
        transfers: token.type === 'Native'
          ? (typeof chainStats === 'object' && chainStats !== null && 'totalTransactions' in chainStats
              ? (chainStats as { totalTransactions: number }).totalTransactions
              : 0)
          : realTransfers,
        age: ageInDays === -1 ? 'N/A' : ageInDays,
        marketCap: 'N/A' // Will need external API for price data
      },
      holders: token.type === 'Native' ? [] : holders.map((holder: Record<string, unknown>) => ({
        rank: holder.rank as number,
        address: holder.holderAddress as string,
        balance: formatTokenAmount(holder.balance as string, token.decimals || (isNFT ? 0 : 18)),
        balanceRaw: holder.balance as string,
        percentage: typeof holder.percentage === 'number' ? holder.percentage.toFixed(2) : '0.00'
      })),
      transfers: token.type === 'Native' ? [] : transfers.map((transfer: Record<string, unknown>) => ({
        hash: transfer.transactionHash as string,
        from: transfer.from as string,
        to: transfer.to as string,
        value: formatTokenAmount(transfer.value as string, token.decimals || (isNFT ? 0 : 18)),
        valueRaw: transfer.value as string,
        timestamp: transfer.timestamp as Date,
        timeAgo: getTimeAgo(transfer.timestamp as Date)
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
  }
  const minutes = Math.floor(diff / (1000 * 60));
  return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;

}
