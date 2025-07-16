const mongoose = require('mongoose');

async function checkDatabases() {
  try {
    console.log('Checking databases...');
    
    // explorerDBをチェック
    try {
      const explorerDB = mongoose.createConnection('mongodb://root:Haruk%4083@localhost:27017/explorerDB?authSource=admin');
      const explorerContract = explorerDB.model('Contract', new mongoose.Schema({}, { strict: false }));
      const explorerContracts = await explorerContract.find({});
      console.log(`explorerDB: ${explorerContracts.length} contracts found`);
      
      // 特定のコントラクトをチェック
      const specificContract = await explorerContract.findOne({ address: '0xd26488ea362005b023bc9f55157370c63c94d0c7' });
      if (specificContract) {
        console.log('Specific contract in explorerDB:', {
          address: specificContract.address,
          verified: specificContract.verified,
          contractName: specificContract.contractName
        });
      } else {
        console.log('Specific contract not found in explorerDB');
      }
      
      await explorerDB.close();
    } catch (error) {
      console.log('explorerDB error:', error.message);
    }
    
    // vbc-explorerをチェック
    try {
      const vbcExplorer = mongoose.createConnection('mongodb://root:Haruk%4083@localhost:27017/vbc-explorer?authSource=admin');
      const vbcContract = vbcExplorer.model('Contract', new mongoose.Schema({}, { strict: false }));
      const vbcContracts = await vbcContract.find({});
      console.log(`vbc-explorer: ${vbcContracts.length} contracts found`);
      
      // 特定のコントラクトをチェック
      const specificContract = await vbcContract.findOne({ address: '0xd26488ea362005b023bc9f55157370c63c94d0c7' });
      if (specificContract) {
        console.log('Specific contract in vbc-explorer:', {
          address: specificContract.address,
          verified: specificContract.verified,
          contractName: specificContract.contractName
        });
      } else {
        console.log('Specific contract not found in vbc-explorer');
      }
      
      await vbcExplorer.close();
    } catch (error) {
      console.log('vbc-explorer error:', error.message);
    }
    
  } catch (error) {
    console.error('Check failed:', error);
  }
}

checkDatabases(); 