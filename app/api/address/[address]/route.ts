import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Web3 from 'web3';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/explorerDB';

// Connect to MongoDB
async function connectDB() {
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  try {
    await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// Account schema
const accountSchema = new mongoose.Schema({
  address: String,
  balance: String,
  percentage: Number,
  rank: Number,
  type: Number,
  blockNumber: Number
}, { collection: 'Account' });

// Transaction schema
const transactionSchema = new mongoose.Schema({
  hash: String,
  from: String,
  to: String,
  value: String,
  timestamp: Date,
  blockNumber: Number
}, { collection: 'transactions' });

// TokenTransferスキーマも定義
const tokenTransferSchema = new mongoose.Schema({
  transactionHash: String,
  from: String,
  to: String,
  value: String,
  tokenAddress: String,
  timestamp: Date,
  blockNumber: Number
}, { collection: 'tokentransfers' });

// Block schema
const blockSchema = new mongoose.Schema({
  number: Number,
  hash: String,
  miner: String,
  timestamp: Date,
  transactions: Number,
  gasUsed: Number,
  gasLimit: Number
}, { collection: 'blocks' });

const Account = mongoose.models.Account || mongoose.model('Account', accountSchema);
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
const TokenTransfer = mongoose.models.TokenTransfer || mongoose.model('TokenTransfer', tokenTransferSchema);
const Block = mongoose.models.Block || mongoose.model('Block', blockSchema);

const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8329'));



export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  await connectDB();
  const { address } = await params;

  // DBからアカウント取得
  const account = await Account.findOne({ address: { $regex: new RegExp(`^${address}$`, 'i') } }).lean();

  // Web3からリアルタイムバランス取得（表示用のみ）
  let realBalance = '0';
  try {
    const balanceWei = await web3.eth.getBalance(address);
    // BigIntを文字列に変換
    realBalance = balanceWei.toString();
  } catch {
    // ignore
  }

  // 全アカウントのリアルタイムバランス合計を取得
  const allAccounts = await Account.find({});
  const totalBalance = allAccounts.reduce((sum, acc) => {
    let b = acc.balance || '0';
    if (typeof b !== 'string') b = b.toString();
    return sum + parseFloat(b);
  }, 0);

  // percentageを動的に計算
  let percent = 0;
  if (totalBalance > 0) {
    percent = (parseFloat(realBalance) / totalBalance) * 100;
  }

  // percentage/rankはDBの値をそのまま使う（nullの場合は0を返す）
  let rank = null;
  if (Array.isArray(account)) {
    rank = account[0]?.rank ?? null;
  } else {
    rank = account?.rank ?? null;
  }

  // トランザクション情報を取得
  const transactions = await Transaction.find({
    $or: [
      { from: { $regex: new RegExp(`^${address}$`, 'i') } },
      { to: { $regex: new RegExp(`^${address}$`, 'i') } }
    ]
  })
    .sort({ timestamp: -1 })
    .limit(10);

  // トランザクション数を取得
  const transactionCount = await Transaction.countDocuments({
    $or: [
      { from: { $regex: new RegExp(`^${address}$`, 'i') } },
      { to: { $regex: new RegExp(`^${address}$`, 'i') } }
    ]
  });

  // 採掘したブロック数を取得
  const blocksMined = await Block.countDocuments({
    miner: { $regex: new RegExp(`^${address}$`, 'i') }
  });

  // 時間フォーマット関数（Unix timestamp対応）
  const getTimeAgo = (timestamp: Date | number | null): string => {
    if (!timestamp) return 'Unknown';
    
    let targetTime: Date;
    if (typeof timestamp === 'number') {
      // Unix timestampの場合（秒単位）
      targetTime = new Date(timestamp * 1000);
    } else if (timestamp instanceof Date) {
      targetTime = timestamp;
    } else {
      targetTime = new Date(timestamp);
    }
    
    const now = new Date();
    const diff = now.getTime() - targetTime.getTime();
    
    // 負の値の場合（未来の日付）は0として扱う
    if (diff < 0) return 'just now';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'just now';
  };

  // マイニング報酬を計算（ブロック報酬 + ガス料金）
  const minedBlocks = await Block.find({
    miner: { $regex: new RegExp(`^${address}$`, 'i') }
  }).sort({ timestamp: -1 }).limit(10);

  // マイニング報酬トランザクションを生成
  const miningRewards = await Promise.all(minedBlocks.map(async (block) => {
    try {
      // Web3からブロック情報を取得
      const blockInfo = await web3.eth.getBlock(block.number, true);
      
      // 実際の報酬を計算
      let actualReward = 0;
      
      // 1. ブロック報酬（8 VBC固定）
      const blockReward = 8;
      
      // 2. ガス料金の計算（ブロック内の全トランザクションから）
      let totalGasFees = 0;
      if (blockInfo.transactions && blockInfo.transactions.length > 0) {
        for (const tx of blockInfo.transactions) {
          if (tx.gasPrice && tx.gasUsed) {
            const gasFee = (parseInt(tx.gasUsed) * parseInt(tx.gasPrice)) / 1e18;
            totalGasFees += gasFee;
          }
        }
      }
      
      // 3. 実際のバランス変化を取得
      try {
        if (block.number > 0) {
          const balanceBefore = await web3.eth.getBalance(address, block.number - 1);
          const balanceAfter = await web3.eth.getBalance(address, block.number);
          const balanceChange = (parseInt(balanceAfter) - parseInt(balanceBefore)) / 1e18;
          
          // バランス変化が正の値の場合、それを実際の報酬として使用
          if (balanceChange > 0) {
            actualReward = balanceChange;
          } else {
            // バランス変化が0以下の場合、ブロック報酬とガス料金の合計を使用
            actualReward = blockReward + totalGasFees;
          }
        } else {
          // ジェネシスブロックの場合
          actualReward = blockReward + totalGasFees;
        }
              } catch {
          // バランス取得に失敗した場合は計算値を使用
          actualReward = blockReward + totalGasFees;
        }
      
      return {
        hash: `mining-${block.hash}`,
        from: '0x0000000000000000000000000000000000000000',
        to: address,
        value: actualReward.toFixed(8),
        timestamp: block.timestamp,
        timeAgo: getTimeAgo(block.timestamp),
        blockNumber: block.number,
        type: 'mining_reward',
        details: {
          blockReward: blockReward,
          gasFees: totalGasFees.toFixed(8),
          totalReward: actualReward.toFixed(8)
        }
      };
    } catch {
      // フォールバック: 固定報酬を使用
      return {
        hash: `mining-${block.hash}`,
        from: '0x0000000000000000000000000000000000000000',
        to: address,
        value: '8.00000000', // 固定報酬
        timestamp: block.timestamp,
        timeAgo: getTimeAgo(block.timestamp),
        blockNumber: block.number,
        type: 'mining_reward',
        details: {
          blockReward: 8,
          gasFees: '0.00000000',
          totalReward: '8.00000000'
        }
      };
    }
  }));

  // 最初と最後のトランザクションを取得（通常のトランザクション）
  const firstTx = await Transaction.findOne({
    $or: [
      { from: { $regex: new RegExp(`^${address}$`, 'i') } },
      { to: { $regex: new RegExp(`^${address}$`, 'i') } }
    ]
  }).sort({ timestamp: 1 });

  const lastTx = await Transaction.findOne({
    $or: [
      { from: { $regex: new RegExp(`^${address}$`, 'i') } },
      { to: { $regex: new RegExp(`^${address}$`, 'i') } }
    ]
  }).sort({ timestamp: -1 });

  // マイニング報酬の最初と最後を取得
  const firstMiningBlock = await Block.findOne({
    miner: { $regex: new RegExp(`^${address}$`, 'i') }
  }).sort({ timestamp: 1 });

  const lastMiningBlock = await Block.findOne({
    miner: { $regex: new RegExp(`^${address}$`, 'i') }
  }).sort({ timestamp: -1 });

  // 最初の活動日時を決定（通常のトランザクションとマイニングの早い方）
  let firstActivity = firstTx?.timestamp;
  if (firstMiningBlock?.timestamp) {
    if (!firstActivity || firstMiningBlock.timestamp < firstActivity) {
      firstActivity = firstMiningBlock.timestamp;
    }
  }

  // 最後の活動日時を決定（通常のトランザクションとマイニングの遅い方）
  let lastActivity = lastTx?.timestamp;
  if (lastMiningBlock?.timestamp) {
    if (!lastActivity || lastMiningBlock.timestamp > lastActivity) {
      lastActivity = lastMiningBlock.timestamp;
    }
  }

  // TokenTransferも取得
  const tokenTransfers = await TokenTransfer.find({
    $or: [
      { from: { $regex: new RegExp(`^${address}$`, 'i') } },
      { to: { $regex: new RegExp(`^${address}$`, 'i') } }
    ]
  }).sort({ timestamp: -1 }).limit(10);

  // バランスフォーマット関数（WeiからVBCに変換）
  const formatBalance = (balance: string) => {
    try {
      const numValue = parseFloat(balance);
      // WeiからVBCに変換（18桁）
      if (numValue > 1000000000000000000) {
        return (numValue / 1000000000000000000).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 8
        });
      }
      return numValue.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8
      });
    } catch {
      return balance;
    }
  };

  // トランザクション値フォーマット関数
  const formatTransactionValue = (value: string) => {
    try {
      const numValue = parseFloat(value);
      // WeiからVBCに変換
      const vbcValue = numValue / 1000000000000000000;
      return vbcValue.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8
      });
    } catch {
      return value;
    }
  };

  // Transaction、TokenTransfer、MiningRewardsをマージ
  const allTxs = [
    ...transactions.map(tx => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: formatTransactionValue(tx.value),
      timestamp: tx.timestamp,
      timeAgo: getTimeAgo(tx.timestamp),
      blockNumber: tx.blockNumber,
      type: 'native'
    })),
    ...tokenTransfers.map(tx => ({
      hash: tx.transactionHash,
      from: tx.from,
      to: tx.to,
      value: tx.value, // トークンの場合はそのまま
      timestamp: tx.timestamp,
      timeAgo: getTimeAgo(tx.timestamp),
      blockNumber: tx.blockNumber,
      type: 'token',
      tokenAddress: tx.tokenAddress
    })),
    ...miningRewards.map(tx => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      timestamp: tx.timestamp,
      timeAgo: tx.timeAgo,
      blockNumber: tx.blockNumber,
      type: 'mining_reward'
    }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

  return NextResponse.json({
    account: {
      address,
      balance: formatBalance(realBalance), // 表示用（フォーマット済み）
      balanceRaw: realBalance, // 生の値
      percentage: percent.toFixed(4), // 動的計算値
      rank,       // DB値そのまま
      transactionCount: transactionCount || 0,
      blocksMined: blocksMined || 0,
      firstSeen: getTimeAgo(firstActivity),
      lastActivity: getTimeAgo(lastActivity)
    },
    transactions: allTxs
  });
} 