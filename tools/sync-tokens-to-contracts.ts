#!/usr/bin/env node
/*
Tool for syncing existing tokens collection data to Contract collection
*/

import mongoose from 'mongoose';
import { connectDB, Contract } from '../models/index';

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

/**
 * Sync tokens collection data to Contract collection
 */
const syncTokensToContracts = async (): Promise<void> => {
  try {
    console.log('🔄 Starting sync of tokens to contracts...');
    
    // Get all tokens from the tokens collection
    const tokens = await Token.find({}).lean();
    console.log(`📊 Found ${tokens.length} tokens in tokens collection`);

    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const token of tokens) {
      try {
        // Skip native tokens
        if (token.type === 'Native' || !token.address) {
          skippedCount++;
          continue;
        }

        // Check if contract already exists
        const existingContract = await Contract.findOne({ 
          address: token.address.toLowerCase() 
        });

        if (existingContract) {
          console.log(`⏭️ Contract ${token.address} already exists, skipping`);
          skippedCount++;
          continue;
        }

        // Determine ERC type
        let ercType = 0; // Default: normal contract
        if (token.type === 'ERC20' || token.type === 'VRC-20') {
          ercType = 2; // ERC20
        } else if (token.type === 'ERC721' || token.type === 'VRC-721') {
          ercType = 3; // ERC721
        } else if (token.type === 'ERC1155' || token.type === 'VRC-1155') {
          ercType = 4; // ERC1155 (assuming 4 for future use)
        }

        // Create new contract entry
        const newContract = new Contract({
          address: token.address.toLowerCase(),
          contractName: token.name || 'Unknown Contract',
          tokenName: token.name || '',
          symbol: token.symbol || '',
          decimals: token.decimals || (ercType === 3 ? 0 : 18),
          totalSupply: token.totalSupply ? Number(token.totalSupply) : 0,
          ERC: ercType,
          verified: token.verified || false,
          blockNumber: 0 // Will be updated if block info is available
        });

        await newContract.save();
        console.log(`✅ Synced token ${token.symbol} (${token.address}) to Contract collection`);
        syncedCount++;

      } catch (error) {
        console.error(`❌ Error syncing token ${token.address}:`, error);
        errorCount++;
      }
    }

    console.log('\n📈 Sync Summary:');
    console.log(`✅ Synced: ${syncedCount} tokens`);
    console.log(`⏭️ Skipped: ${skippedCount} tokens`);
    console.log(`❌ Errors: ${errorCount} tokens`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`💥 Error during sync: ${errorMessage}`);
    throw error;
  }
};

/**
 * Main execution
 */
const main = async (): Promise<void> => {
  try {
    // Initialize database connection
    await connectDB();
    console.log('🔗 Connected to database');

    // Run sync
    await syncTokensToContracts();

    console.log('🎉 Token sync completed successfully!');
    process.exit(0);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`💥 Fatal error: ${errorMessage}`);
    process.exit(1);
  }
};

export { main };

if (require.main === module) {
  main();
}