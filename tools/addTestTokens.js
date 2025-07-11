const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/explorerDB';

const TokenSchema = new mongoose.Schema({
  symbol: String,
  name: String,
  address: String,
  holders: Number,
  supply: String,
  type: String,
});

const Token = mongoose.model('Token', TokenSchema);

async function main() {
  await mongoose.connect(uri);
  await Token.deleteMany({}); // 既存データ削除（不要ならコメントアウト）
  await Token.insertMany([
    { symbol: "OSATO", name: "SugarNFT", address: "0xD26488eA7e2b4e8Ba8eB9E6d7C8bF2a3C5d4E6F8", holders: 123, supply: "100,000", type: "VRC-721" },
    { symbol: "VBC", name: "VirBiCoin", address: "0x7d4cbf1632c0e68fd3b6a61ea8e3f95ae1e7c3de", holders: 128, supply: "1,318,073.98", type: "Native" },
    { symbol: "SUGAR", name: "Sugar Token", address: "0x3A5b4c9e7F8d1a2e6B3c4d5e6f7a8b9c0d1e2f3g", holders: 89, supply: "500,000", type: "VRC-20" },
    { symbol: "GAME", name: "GameItems", address: "0x4B6c5d8f9a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d", holders: 67, supply: "10,000", type: "VRC-1155" }
  ]);
  console.log('Test tokens added!');
  await mongoose.disconnect();
}

main();
