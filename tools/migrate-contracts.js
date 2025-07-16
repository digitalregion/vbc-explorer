const mongoose = require('mongoose');

async function migrateContracts() {
  try {
    console.log('Starting contract migration...');
    
    // ソースデータベース（vbc-explorer）に接続
    const sourceUri = 'mongodb://root:Haruk%4083@localhost:27017/vbc-explorer?authSource=admin';
    const targetUri = 'mongodb://root:Haruk%4083@localhost:27017/explorerDB?authSource=admin';
    
    console.log('Connecting to source database...');
    const sourceConnection = mongoose.createConnection(sourceUri);
    const sourceContract = sourceConnection.model('Contract', new mongoose.Schema({}, { strict: false }));
    
    console.log('Connecting to target database...');
    const targetConnection = mongoose.createConnection(targetUri);
    const targetContract = targetConnection.model('Contract', new mongoose.Schema({}, { strict: false }));
    
    // ソースからContractデータを取得
    console.log('Fetching contracts from source...');
    const contracts = await sourceContract.find({});
    console.log(`Found ${contracts.length} contracts in source database`);
    
    let migratedCount = 0;
    let errorCount = 0;
    
    // ターゲットにデータを移行
    console.log('Migrating contracts to target...');
    for (const contract of contracts) {
      try {
        await targetContract.findOneAndUpdate(
          { address: contract.address },
          contract.toObject(),
          { upsert: true, new: true }
        );
        migratedCount++;
        console.log(`✓ Migrated: ${contract.address} (verified: ${contract.verified})`);
      } catch (error) {
        errorCount++;
        console.error(`✗ Error migrating ${contract.address}:`, error.message);
      }
    }
    
    // 接続を閉じる
    await sourceConnection.close();
    await targetConnection.close();
    
    console.log('\nMigration Summary:');
    console.log(`- Total contracts: ${contracts.length}`);
    console.log(`- Successfully migrated: ${migratedCount}`);
    console.log(`- Errors: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('✅ Migration completed successfully!');
    } else {
      console.log('⚠️  Migration completed with errors');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// スクリプトを実行
migrateContracts(); 