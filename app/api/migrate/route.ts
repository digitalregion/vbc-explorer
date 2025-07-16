import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

interface ContractDocument extends mongoose.Document {
  address: string;
  verified?: boolean;
  contractName?: string;
  compilerVersion?: string;
  sourceCode?: string;
  abi?: string;
  byteCode?: string;
  [key: string]: any;
}

export async function POST() {
  try {
    console.log('Starting data migration...');
    
    // ソースデータベースに接続
    const sourceUri = 'mongodb://root:Haruk%4083@localhost:27017/vbc-explorer?authSource=admin';
    const targetUri = 'mongodb://root:Haruk%4083@localhost:27017/explorerDB?authSource=admin';
    
    const sourceConnection = mongoose.createConnection(sourceUri);
    const sourceContract = sourceConnection.model<ContractDocument>('Contract', new mongoose.Schema({}, { strict: false }));
    
    const targetConnection = mongoose.createConnection(targetUri);
    const targetContract = targetConnection.model<ContractDocument>('Contract', new mongoose.Schema({}, { strict: false }));
    
    console.log('Connected to both databases');
    
    // ソースからContractデータを取得
    const contracts = await sourceContract.find({});
    console.log(`Found ${contracts.length} contracts in source database`);
    
    let migratedCount = 0;
    let errorCount = 0;
    
    // ターゲットにデータを移行
    for (const contract of contracts) {
      try {
        await targetContract.findOneAndUpdate(
          { address: contract.address },
          contract.toObject(),
          { upsert: true, new: true }
        );
        migratedCount++;
        console.log(`Migrated contract: ${contract.address}`);
      } catch (error) {
        errorCount++;
        console.error(`Error migrating contract ${contract.address}:`, error);
      }
    }
    
    // 接続を閉じる
    await sourceConnection.close();
    await targetConnection.close();
    
    console.log(`Migration completed: ${migratedCount} migrated, ${errorCount} errors`);
    
    return NextResponse.json({
      success: true,
      message: 'Data migration completed',
      migrated: migratedCount,
      errors: errorCount,
      total: contracts.length
    });
    
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 