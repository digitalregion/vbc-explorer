const mongoose = require('mongoose');

// データベース接続設定
const sourceUri = 'mongodb://root:Haruk%4083@localhost:27017/vbc-explorer?authSource=admin';
const targetUri = 'mongodb://root:Haruk%4083@localhost:27017/explorerDB?authSource=admin';

async function migrateContractData() {
  try {
    console.log('Starting data migration...');
    
    // ソースデータベースに接続
    const sourceConnection = mongoose.createConnection(sourceUri);
    const sourceContract = sourceConnection.model('Contract', new mongoose.Schema({}, { strict: false }));
    
    // ターゲットデータベースに接続
    const targetConnection = mongoose.createConnection(targetUri);
    const targetContract = targetConnection.model('Contract', new mongoose.Schema({}, { strict: false }));
    
    console.log('Connected to both databases');
    
    // ソースからContractデータを取得
    const contracts = await sourceContract.find({});
    console.log(`Found ${contracts.length} contracts in source database`);
    
    // ターゲットにデータを移行
    for (const contract of contracts) {
      try {
        await targetContract.findOneAndUpdate(
          { address: contract.address },
          contract.toObject(),
          { upsert: true, new: true }
        );
        console.log(`Migrated contract: ${contract.address}`);
      } catch (error) {
        console.error(`Error migrating contract ${contract.address}:`, error.message);
      }
    }
    
    console.log('Data migration completed successfully');
    
    // 接続を閉じる
    await sourceConnection.close();
    await targetConnection.close();
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// スクリプトを実行
migrateContractData(); 