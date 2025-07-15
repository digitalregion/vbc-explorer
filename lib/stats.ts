import mongoose from 'mongoose';

// Define basic schemas for querying
const transactionSchema = new mongoose.Schema({
  from: String,
  to: String,
  blockNumber: Number,
}, { collection: 'transactions' });

const accountSchema = new mongoose.Schema({
  address: String,
  balance: String,
}, { collection: 'accounts' });

const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
const Account = mongoose.models.Account || mongoose.model('Account', accountSchema);

// This is a simplified connection function for the library.
// Assumes connection is handled by the calling API route.
async function connectDB() {
  if (mongoose.connection.readyState < 1) {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/explorerDB');
  }
}

export async function getChainStats() {
  await connectDB();

  // Get actual wallet count by counting unique addresses
  let activeAddresses = 0;
  try {
    // First try to get from accounts collection
    activeAddresses = await Account.countDocuments();
    
    // If accounts collection is empty, calculate from transactions
    if (activeAddresses === 0) {
      const transactions = await Transaction.find({}, 'from to').lean();
      const uniqueAddresses = new Set();
      
      transactions.forEach((tx: Record<string, unknown>) => {
        if (tx.from) uniqueAddresses.add((tx.from as string).toLowerCase());
        if (tx.to) uniqueAddresses.add((tx.to as string).toLowerCase());
      });
      
      activeAddresses = uniqueAddresses.size;
    }
  } catch (error) {
    console.error('Error calculating active addresses:', error);
    activeAddresses = 0; // Fallback to 0 if calculation fails
  }

  const totalSupply = "unlimited"; // VBC has unlimited supply
  const totalTransactions = await Transaction.countDocuments() || 0;
  
  return {
    latestBlock: 0,
    avgBlockTime: '13.00',
    networkHashrate: '0',
    networkDifficulty: '0',
    totalTransactions,
    activeAddresses,
    totalSupply,
    isConnected: true,
  };
}
