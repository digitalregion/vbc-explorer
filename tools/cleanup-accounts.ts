#!/usr/bin/env node
/*
Tool for cleaning up duplicate account records in VirBiCoin Explorer database
*/

import mongoose from 'mongoose';
import { connectDB, Account } from '../models/index.js';

/**
 * Clean up duplicate account records, keeping only the latest one
 */
const cleanupDuplicateAccounts = async (): Promise<void> => {
  try {
    console.log('🧹 Starting cleanup of duplicate account records...');
    
    // Find all duplicate addresses
    const duplicates = await Account.aggregate([
      {
        $group: {
          _id: "$address",
          count: { $sum: 1 },
          docs: { $push: "$$ROOT" }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    console.log(`📊 Found ${duplicates.length} addresses with duplicate records`);

    let totalRemoved = 0;

    // Process each duplicate group
    for (const duplicate of duplicates) {
      const docs = duplicate.docs;
      
      // Sort by blockNumber descending to keep the latest record
      docs.sort((a: any, b: any) => b.blockNumber - a.blockNumber);
      
      // Keep the first (latest) record, remove the rest
      const toKeep = docs[0];
      const toRemove = docs.slice(1);
      
      console.log(`🔄 Processing address ${duplicate._id}: keeping 1, removing ${toRemove.length} duplicates`);
      
      // Remove duplicate records
      for (const record of toRemove) {
        await Account.deleteOne({ _id: record._id });
        totalRemoved++;
      }
      
      // Update the kept record to ensure it has the latest data
      await Account.updateOne(
        { _id: toKeep._id },
        {
          $set: {
            balance: toKeep.balance,
            blockNumber: toKeep.blockNumber,
            type: toKeep.type
          }
        }
      );
    }

    console.log(`✅ Cleanup completed! Removed ${totalRemoved} duplicate records`);
    
    // Verify cleanup
    const remainingDuplicates = await Account.aggregate([
      {
        $group: {
          _id: "$address",
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      },
      {
        $count: "duplicateAddresses"
      }
    ]);

    const duplicateCount = remainingDuplicates[0]?.duplicateAddresses || 0;
    console.log(`📈 Verification: ${duplicateCount} duplicate addresses remaining`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error during cleanup: ${errorMessage}`);
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

    // Run cleanup
    await cleanupDuplicateAccounts();

    console.log('🎉 All cleanup operations completed successfully!');
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