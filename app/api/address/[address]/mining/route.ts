import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Web3 from 'web3';
import { connectDB } from '../../../../../models/index';
import fs from 'fs';
import path from 'path';

// Function to read config
const readConfig = () => {
  try {
    const configPath = path.join(process.cwd(), 'config.json');
    const exampleConfigPath = path.join(process.cwd(), 'config.example.json');
    
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } else if (fs.existsSync(exampleConfigPath)) {
      return JSON.parse(fs.readFileSync(exampleConfigPath, 'utf8'));
    }
  } catch (error) {
    console.error('Error reading config:', error);
  }
  
  // Default configuration
  return {
    nodeAddr: 'localhost',
    port: 8329
  };
};

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

const Block = mongoose.models.Block || mongoose.model('Block', blockSchema);

const config = readConfig();
const web3 = new Web3(new Web3.providers.HttpProvider(`http://${config.nodeAddr}:${config.port}`));

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    await connectDB();
  } catch (dbError) {
    console.error('Database connection error:', dbError);
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }
  
  const { address } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

  try {
    // マイニング報酬のブロックを取得
    const minedBlocks = await Block.find({
      miner: { $regex: new RegExp(`^${address}$`, 'i') }
    })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    // 総件数を取得
    const totalBlocks = await Block.countDocuments({
      miner: { $regex: new RegExp(`^${address}$`, 'i') }
    });

    const totalPages = Math.ceil(totalBlocks / limit);

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
            // 型ガード: txがオブジェクトでgasPriceとgasUsedプロパティを持つかチェック
            if (typeof tx === 'object' && tx !== null && 'gasPrice' in tx && 'gasUsed' in tx) {
              const txObj = tx as { gasPrice?: bigint; gasUsed?: bigint };
              if (typeof txObj.gasPrice === 'bigint' && typeof txObj.gasUsed === 'bigint') {
                const gasFee = Number(txObj.gasUsed) * Number(txObj.gasPrice) / 1e18;
                totalGasFees += gasFee;
              }
            }
          }
        }
        
        // 3. 実際のバランス変化を取得
        try {
          if (block.number > 0) {
            const balanceBefore = await web3.eth.getBalance(address, block.number - 1);
            const balanceAfter = await web3.eth.getBalance(address, block.number);
            const balanceChange = (Number(balanceAfter) - Number(balanceBefore)) / 1e18;
            
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
          hash: block.hash,
          from: '0x0000000000000000000000000000000000000000',
          to: address,
          value: actualReward.toFixed(8),
          timestamp: block.timestamp,
          blockNumber: block.number,
          type: 'mining_reward',
          status: 'success',
          details: {
            blockReward: blockReward,
            gasFees: totalGasFees.toFixed(8),
            totalReward: actualReward.toFixed(8)
          }
        };
      } catch {
        // フォールバック: 固定報酬を使用
        return {
          hash: block.hash,
          from: '0x0000000000000000000000000000000000000000',
          to: address,
          value: '8.00000000', // 固定報酬
          timestamp: block.timestamp,
      blockNumber: block.number,
          type: 'mining_reward',
          status: 'success',
          details: {
            blockReward: 8,
            gasFees: '0.00000000',
            totalReward: '8.00000000'
          }
        };
      }
    }));

    return NextResponse.json({
      transactions: miningRewards,
      totalTransactions: totalBlocks,
        totalPages,
      currentPage: page,
      itemsPerPage: limit
    });

  } catch (error) {
    console.error('Error fetching mining rewards:', error);
    return NextResponse.json({ error: 'Failed to fetch mining rewards' }, { status: 500 });
  }
}
