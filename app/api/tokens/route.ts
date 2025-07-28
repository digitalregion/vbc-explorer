import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getChainStats } from '../../../lib/stats'; // Import the stats function
import { Contract, connectDB } from '../../../models/index';

// Define Token schema inline since it's not exported from models/index
const tokenSchema = new mongoose.Schema({
  address: String,
  name: String,
  symbol: String,
  decimals: { type: Number, default: 18 },
  totalSupply: String,
  holders: { type: Number, default: 0 },
  type: String,
  supply: String,
  verified: { type: Boolean, default: false }
}, { collection: 'tokens' });

const Token = mongoose.models.Token || mongoose.model('Token', tokenSchema);

// Define the structure of a token, including the optional fields
interface IToken {
  address: string;
  name: string;
  symbol: string;
  decimals?: number;
  totalSupply?: string;
  holders?: number;
  type: 'Native' | 'VRC-20' | 'VRC-721' | 'VRC-1155';
  supply?: string;
  verified?: boolean;
}

export async function GET() {
  await connectDB();
  
  // Get verification status for all contracts
  const contracts = await Contract.find({}).lean();
  const verificationMap = new Map();
  contracts.forEach(contract => {
    verificationMap.set(contract.address.toLowerCase(), contract.verified || false);
  });


  // Fetch all tokens from the database
  const dbTokens = await Token.find({}).lean() as Record<string, unknown>[];

  // Get actual chain statistics for VBC
  const chainStats = await getChainStats();

  // Manually create and add the native VBC token with real stats
  const vbcToken: IToken = {
    address: 'N/A', // Native token has no contract address
    name: 'VirBiCoin',
    symbol: 'VBC',
    type: 'Native',
    holders: chainStats.activeAddresses || 0, // Real wallet count
    supply: chainStats.totalSupply || 'unlimited', // Real total supply
  };

  // Normalize token types and update with real statistics
  const normalizedTokens = await Promise.all(dbTokens.map(async (token: Record<string, unknown>) => {
    let type = token.type;
    if (type === 'ERC20') {
      type = 'VRC-20';
    } else if (type === 'ERC721') {
      type = 'VRC-721';
    } else if (type === 'VRC721') {
      type = 'VRC-721';
    } else if (type === 'ERC1155') {
      type = 'VRC-1155';
    } else if (type === 'VRC1155') {
      type = 'VRC-1155';
    }

    // Get actual holder count and supply for each token
    let actualHolders = token.holders || 0;
    let actualSupply = token.supply || token.totalSupply || '0';

    try {
      // For VRC-721 token, get actual statistics
      if (type === 'VRC-721') {
        // Get holder count from tokenholders collection
        const TokenHolder = mongoose.models.TokenHolder || mongoose.model('TokenHolder', new mongoose.Schema({
          tokenAddress: String,
          holderAddress: String,
          balance: String,
        }, { collection: 'tokenholders' }));

        actualHolders = await TokenHolder.countDocuments({
          tokenAddress: { $regex: new RegExp(`^${token.address}$`, 'i') }
        });

        // Use database totalSupply if available, otherwise calculate from transfers
        if (!token.totalSupply || token.totalSupply === '0') {
          // For NFTs, total supply is the total number of minted tokens
          const TokenTransfer = mongoose.models.TokenTransfer || mongoose.model('TokenTransfer', new mongoose.Schema({
            tokenAddress: String,
            from: String,
            to: String,
          }, { collection: 'tokentransfers' }));

          // Count minting transactions (from address 0x0000...)
          const mintCount = await TokenTransfer.countDocuments({
            tokenAddress: { $regex: new RegExp(`^${token.address}$`, 'i') },
            from: '0x0000000000000000000000000000000000000000'
          });

          actualSupply = mintCount.toString();
        } else {
          actualSupply = token.totalSupply;
        }
      }
    } catch (error) {
      console.error(`Error getting stats for token ${token.address}:`, error);
    }

    const verificationStatus = typeof token.address === 'string' ? verificationMap.get(token.address.toLowerCase()) : null;
    
    return { 
      ...token, 
      type,
      holders: actualHolders,
      supply: actualSupply,
      verified: verificationStatus !== null ? verificationStatus : false
    };
  }));

  // Filter only addresses existing in Contract collection map
  const filteredTokens = (normalizedTokens as (IToken | Record<string, unknown>)[]).filter((t): t is IToken => {
    if (!('address' in t) || typeof t.address !== 'string') return false;
    const addr = t.address.toLowerCase();
    if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) return false; // invalid address
    // Keep only if address exists in Contract collection (verificationMap)
    return verificationMap.has(addr);
  });

  // Combine the native token with the database tokens
  const allTokens = [vbcToken, ...filteredTokens];

  return NextResponse.json({ tokens: allTokens });
}
