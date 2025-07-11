const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/explorerDB';

// Token holders schema
const TokenHolderSchema = new mongoose.Schema({
  tokenAddress: String,
  holderAddress: String,
  balance: String,
  percentage: Number,
  rank: Number
});

// Token transfers schema
const TokenTransferSchema = new mongoose.Schema({
  transactionHash: String,
  blockNumber: Number,
  from: String,
  to: String,
  value: String,
  tokenAddress: String,
  timestamp: Date
});

const TokenHolder = mongoose.model('TokenHolder', TokenHolderSchema);
const TokenTransfer = mongoose.model('TokenTransfer', TokenTransferSchema);

async function main() {
  await mongoose.connect(uri);
  
  const tokenAddress = "0xD26488eA7e2b4e8Ba8eB9E6d7C8bF2a3C5d4E6F8"; // OSATO token
  
  // Clear existing data
  await TokenHolder.deleteMany({ tokenAddress: tokenAddress.toLowerCase() });
  await TokenTransfer.deleteMany({ tokenAddress: tokenAddress.toLowerCase() });
  
  // Add token holders
  const holders = [
    { tokenAddress: tokenAddress.toLowerCase(), holderAddress: "0x742a4c8eF4be2b4e8a8eB9E6d7C8bF2a3C5d4E6F8", balance: "25000000000000000000000", percentage: 25.0, rank: 1 },
    { tokenAddress: tokenAddress.toLowerCase(), holderAddress: "0x8b3d1a5c7e9f2a4b6c8d0e2f4a6b8c0d2e4f6a8b", balance: "20000000000000000000000", percentage: 20.0, rank: 2 },
    { tokenAddress: tokenAddress.toLowerCase(), holderAddress: "0x9c4e2b6d8f0a3c5e7a9b1d3f5a7c9e1f3a5c7e9f", balance: "15000000000000000000000", percentage: 15.0, rank: 3 },
    { tokenAddress: tokenAddress.toLowerCase(), holderAddress: "0xa5d3f7b9e1c4f6a8c0e2f4a6b8c0d2e4f6a8b0c2", balance: "12000000000000000000000", percentage: 12.0, rank: 4 },
    { tokenAddress: tokenAddress.toLowerCase(), holderAddress: "0xb6e4a8c0f2d5a7c9e1f3a5c7e9f1b3d5f7a9c1e3", balance: "10000000000000000000000", percentage: 10.0, rank: 5 },
    { tokenAddress: tokenAddress.toLowerCase(), holderAddress: "0xc7f5b9d1e3f6b8d0f2e4f6a8c0e2f4a6b8c0d2e4", balance: "8000000000000000000000", percentage: 8.0, rank: 6 },
    { tokenAddress: tokenAddress.toLowerCase(), holderAddress: "0xd8a6c0e2f4a7c9e1f3a5c7e9f1b3d5f7a9c1e3f5", balance: "6000000000000000000000", percentage: 6.0, rank: 7 },
    { tokenAddress: tokenAddress.toLowerCase(), holderAddress: "0xe9b7d1f3a5b8d0f2e4f6a8c0e2f4a6b8c0d2e4f6", balance: "4000000000000000000000", percentage: 4.0, rank: 8 }
  ];
  
  await TokenHolder.insertMany(holders);
  
  // Add recent transfers
  const now = new Date();
  const transfers = [
    { 
      transactionHash: "0xa1b2c3d4e5f6789abcdef0123456789abcdef0123456789abcdef0123456789",
      blockNumber: 1234567,
      from: "0x742a4c8eF4be2b4e8a8eB9E6d7C8bF2a3C5d4E6F8",
      to: "0x8b3d1a5c7e9f2a4b6c8d0e2f4a6b8c0d2e4f6a8b",
      value: "1000000000000000000000",
      tokenAddress: tokenAddress.toLowerCase(),
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2 hours ago
    },
    { 
      transactionHash: "0xb2c3d4e5f6789abcdef0123456789abcdef0123456789abcdef0123456789a",
      blockNumber: 1234566,
      from: "0x9c4e2b6d8f0a3c5e7a9b1d3f5a7c9e1f3a5c7e9f",
      to: "0xa5d3f7b9e1c4f6a8c0e2f4a6b8c0d2e4f6a8b0c2",
      value: "500000000000000000000",
      tokenAddress: tokenAddress.toLowerCase(),
      timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000) // 4 hours ago
    },
    { 
      transactionHash: "0xc3d4e5f6789abcdef0123456789abcdef0123456789abcdef0123456789ab",
      blockNumber: 1234565,
      from: "0xb6e4a8c0f2d5a7c9e1f3a5c7e9f1b3d5f7a9c1e3",
      to: "0xc7f5b9d1e3f6b8d0f2e4f6a8c0e2f4a6b8c0d2e4",
      value: "750000000000000000000",
      tokenAddress: tokenAddress.toLowerCase(),
      timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000) // 6 hours ago
    },
    { 
      transactionHash: "0xd4e5f6789abcdef0123456789abcdef0123456789abcdef0123456789abc",
      blockNumber: 1234564,
      from: "0xd8a6c0e2f4a7c9e1f3a5c7e9f1b3d5f7a9c1e3f5",
      to: "0xe9b7d1f3a5b8d0f2e4f6a8c0e2f4a6b8c0d2e4f6",
      value: "250000000000000000000",
      tokenAddress: tokenAddress.toLowerCase(),
      timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000) // 12 hours ago
    },
    { 
      transactionHash: "0xe5f6789abcdef0123456789abcdef0123456789abcdef0123456789abcd",
      blockNumber: 1234563,
      from: "0xe9b7d1f3a5b8d0f2e4f6a8c0e2f4a6b8c0d2e4f6",
      to: "0x742a4c8eF4be2b4e8a8eB9E6d7C8bF2a3C5d4E6F8",
      value: "100000000000000000000",
      tokenAddress: tokenAddress.toLowerCase(),
      timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000) // 1 day ago
    }
  ];
  
  await TokenTransfer.insertMany(transfers);
  
  console.log('Token holders and transfers added!');
  console.log(`Added ${holders.length} holders and ${transfers.length} transfers for token ${tokenAddress}`);
  
  await mongoose.disconnect();
}

main().catch(console.error);
