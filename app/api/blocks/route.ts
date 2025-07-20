import { NextRequest, NextResponse } from 'next/server';
import Web3 from 'web3';
import { loadConfig } from '../../../lib/config';

interface Block {
  number: string;
  hash: string;
  miner: string;
  timestamp: string;
  transactions: string;
  gasUsed: string;
  gasLimit: string;
  difficulty: string;
  totalDifficulty: string;
  size: string;
  nonce: string;
  extraData: string;
  parentHash: string;
  stateRoot: string;
  receiptsRoot: string;
  transactionsRoot: string;
  logsBloom: string;
  sha3Uncles: string;
  uncles: string[];
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
}

interface BlocksResponse {
  blocks: Block[];
  pagination: PaginationInfo;
}

// Utility function to convert all BigInt values to string using JSON replacer
function bigIntReplacer(key: string, value: unknown) {
  return typeof value === 'bigint' ? value.toString() : value;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get config using existing loader
    const config = loadConfig();

    // Web3 connection using config
    const web3 = new Web3(config.web3Provider.url);
    
    // Configure Web3 to handle BigInt properly
    web3.eth.handleRevert = true;

    // Test connection
    const latestBlockNumber = await web3.eth.getBlockNumber();
    const blockNumber = typeof latestBlockNumber === 'bigint' ? Number(latestBlockNumber) : Number(latestBlockNumber);

    // Calculate start and end block numbers for pagination
    const startBlock = Math.max(0, blockNumber - (page - 1) * limit);
    const endBlock = Math.max(0, startBlock - limit + 1);
    
    // Fetch blocks
    const blocks: Block[] = [];
    for (let i = startBlock; i >= endBlock && i >= 0; i--) {
      try {
        const block = await web3.eth.getBlock(i, false); // Don't fetch full transaction details
        if (block) {
          const txCount = await web3.eth.getBlockTransactionCount(i);
          // Convert all BigInt values to string using JSON replacer
          const convertedBlock = JSON.parse(JSON.stringify(block, bigIntReplacer));
          const txCountString = typeof txCount === 'bigint' ? txCount.toString() : String(txCount);
          blocks.push({
            number: String(convertedBlock.number ?? '0'),
            hash: String(convertedBlock.hash ?? ''),
            miner: String(convertedBlock.miner ?? ''),
            timestamp: String(convertedBlock.timestamp ?? '0'),
            transactions: txCountString,
            gasUsed: String(convertedBlock.gasUsed ?? '0'),
            gasLimit: String(convertedBlock.gasLimit ?? '0'),
            difficulty: String(convertedBlock.difficulty ?? '0'),
            totalDifficulty: String(convertedBlock.totalDifficulty ?? '0'),
            size: String(convertedBlock.size ?? '0'),
            nonce: String(convertedBlock.nonce ?? ''),
            extraData: String(convertedBlock.extraData ?? ''),
            parentHash: String(convertedBlock.parentHash ?? ''),
            stateRoot: String(convertedBlock.stateRoot ?? ''),
            receiptsRoot: String(convertedBlock.receiptsRoot ?? ''),
            transactionsRoot: String(convertedBlock.transactionsRoot ?? ''),
            logsBloom: String(convertedBlock.logsBloom ?? ''),
            sha3Uncles: String(convertedBlock.sha3Uncles ?? ''),
            uncles: Array.isArray(convertedBlock.uncles) ? convertedBlock.uncles.map((u: unknown) => String(u ?? '')) : []
          });
        }
      } catch (err) {
        console.error(`Error fetching block ${i}:`, err);
        // Continue with next block
      }
    }



    // Calculate pagination info
    const totalPages = Math.ceil((blockNumber + 1) / limit);
    const pagination: PaginationInfo = {
      currentPage: page,
      totalPages,
      total: blockNumber + 1,
      limit
    };

    const response: BlocksResponse = {
      blocks,
      pagination
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching blocks:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch blocks',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 