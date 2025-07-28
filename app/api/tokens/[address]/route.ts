/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getChainStats } from '../../../../lib/stats';
import { loadConfig } from '../../../../lib/config';
import { connectDB } from '../../../../models/index';
import Web3 from 'web3';

// ZERO_ADDR moved inside GET function to avoid export issue

// Load configuration
const config = loadConfig();
const GVBC_RPC_URL = config.web3Provider?.url || 'http://localhost:8545';

// Web3 instance for blockchain interaction
const web3 = new Web3(GVBC_RPC_URL);

// Standard ERC721 ABI for tokenURI function
const ERC721_ABI = [
  {
    "inputs": [{"name": "tokenId", "type": "uint256"}],
    "name": "tokenURI", 
    "outputs": [{"name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Function to fetch NFT metadata from tokenURI
async function fetchNFTMetadata(tokenAddress: string, tokenId: number) {
  try {
    // Check if web3 is properly initialized
    if (!web3 || !web3.eth) {
      console.error('Web3 not properly initialized');
      return null;
    }

    // First try to get tokenURI from blockchain
    const contract = new web3.eth.Contract(ERC721_ABI, tokenAddress);
    const tokenURI = await contract.methods.tokenURI(tokenId).call();
    
    if (tokenURI && tokenURI !== '') {
      // If it's an HTTP URL, fetch the metadata
      if (tokenURI.startsWith('http://') || tokenURI.startsWith('https://')) {
        try {
        const response = await fetch(tokenURI, {
          headers: {
            'User-Agent': 'VBC-Explorer/1.0'
            },
            // Add timeout to prevent hanging requests
            signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        if (response.ok) {
          const metadata = await response.json();
          return metadata;
          }
        } catch (fetchError) {
          console.error('Error fetching metadata from URL:', fetchError);
          // Don't throw error, just return null to use fallback
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching NFT metadata:', error);
    return null;
  }
}



// Format token amount with proper decimal handling
const formatTokenAmount = (amount: string, decimals: number = 18, isNFT: boolean = false) => {
  if (!amount || amount === 'N/A') return amount;

  // Handle unlimited supply
  if (amount.toLowerCase() === 'unlimited') {
    return 'Unlimited';
  }

  try {
    // Remove commas and parse
    const cleanAmount = amount.replace(/,/g, '');

    // For NFTs, don't apply decimals formatting
    if (isNFT) {
      return cleanAmount;
    }

    // Try BigInt conversion for large numbers
    if (cleanAmount.length > 15) {
      const value = BigInt(cleanAmount);
      const divisor = BigInt(10 ** decimals);
      const formatted = Number(value) / Number(divisor);
      return formatted.toLocaleString();
    }
    // For smaller numbers, direct parsing
    const numValue = parseFloat(cleanAmount);
    return numValue.toLocaleString();

  } catch {
    // Fallback to direct parsing
    const numValue = parseFloat(amount.replace(/,/g, ''));
    return numValue.toLocaleString();
  }
};

// Token schema - use existing schema from tools/addTestTokens.js
const tokenSchema = new mongoose.Schema({
  symbol: String,
  name: String,
  address: String,
  holders: Number,
  supply: String,
  type: String,
  decimals: { type: Number, default: 18 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'tokens' });

// Token transfer schema
const tokenTransferSchema = new mongoose.Schema({
  transactionHash: String,
  blockNumber: Number,
  from: String,
  to: String,
  value: String,
  tokenAddress: String,
  timestamp: Date,
  tokenId: Number // Add tokenId field for NFT tokens
}, { collection: 'tokentransfers' });

const Token = mongoose.models.Token || mongoose.model('Token', tokenSchema);
const TokenTransfer = mongoose.models.TokenTransfer || mongoose.model('TokenTransfer', tokenTransferSchema);

// Define a strict type for our token data to be used in this API route
interface ApiToken {
  address: string;
  name: string;
  symbol: string;
  type: string;
  decimals: number;
  supply: string;
  totalSupply?: string;
  holders: number;
  createdAt: Date;
  updatedAt: Date;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const ZERO_ADDR = '0x0000000000000000000000000000000000000000' as const;
  try {
    await connectDB();
    const { address } = await params;
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get('tokenId');

    // If tokenId is provided, return NFT metadata
    if (tokenId) {
      const tokenIdNum = parseInt(tokenId);
      if (isNaN(tokenIdNum)) {
        return NextResponse.json(
          { error: 'Invalid tokenId format' },
          { status: 400 }
        );
      }

      // contractSource with flexible types
      const contractSource: { verified?: boolean; compiler?: any; language?: string | null; name?: any; sourceCode?: any; bytecode?: any } | null = null;
      try {
        let metadata = await fetchNFTMetadata(address, tokenIdNum);
        if (!metadata) {
          // 失敗時も最低限のダミーmetadataを返す
          metadata = {
            name: `Token #${tokenIdNum}`,
            description: '',
            image: '',
            attributes: [],
            tokenURI: null,
            createdAt: null
          };
        }
        // コントラクト作成Tx
        const db = mongoose.connection.db;
        if (!db) { throw new Error('Database connection not established'); }
        const contractCreateTx = await db.collection('tokentransfers').findOne({
          to: { $regex: new RegExp(`^${address}$`, 'i') },
          value: { $in: [0, '0', '0x0', '0x00'] },
          $or: [
            { tokenId: { $exists: false } },
            { tokenId: null },
            { tokenId: '' }
          ]
        }, { sort: { timestamp: 1 } });

        // Transfer履歴（tokenId一致のみ）
        const tokenTransfers = await db.collection('tokentransfers').find({
          tokenAddress: { $regex: new RegExp(`^${address}$`, 'i') },
          tokenId: tokenIdNum
        }).sort({ timestamp: 1 }).toArray();
        // 各Txの詳細情報も取得
        const txHashes = tokenTransfers.map(tx => tx.transactionHash);
        const txDetails = await db.collection('transactions').find({ hash: { $in: txHashes } }).toArray();
        const txDetailMap = Object.fromEntries(txDetails.map(tx => [tx.hash, tx]));
        // transfers生成
        let transfers = await Promise.all(tokenTransfers.map(async tx => {
          const detail = txDetailMap[tx.transactionHash] || {};
          // blockNumberを多段で取得
          const blockNumber = detail.blockNumber ?? tx.blockNumber ?? tx.block_number ?? tx.block ?? null;
          let blockDetail = null;
          if (detail.block) {
            blockDetail = {
              number: detail.block.number,
              hash: detail.block.hash,
              timestamp: detail.block.timestamp,
              miner: detail.block.miner,
              size: detail.block.size,
              difficulty: detail.block.difficulty
            };
          } else if (blockNumber !== null && blockNumber !== undefined) {
            // blockがnullの場合はblockNumberからblocksコレクションを参照
            const block = await db.collection('blocks').findOne({ number: blockNumber });
            if (block) {
              blockDetail = {
                number: block.number,
                hash: block.hash,
                timestamp: block.timestamp,
                miner: block.miner,
                size: block.size,
                difficulty: block.difficulty
              };
            }
          }
          return {
            hash: tx.transactionHash,
            from: tx.from,
            to: tx.to,
            value: tx.value,
            timestamp: tx.timestamp,
            blockNumber: blockNumber,
            blockHash: detail.blockHash,
            status: detail.status,
            gas: detail.gas,
            gasUsed: detail.gasUsed,
            gasPrice: detail.gasPrice,
            input: detail.input,
            logs: detail.logs,
            isContractCreation: detail.isContractCreation,
            internalTransactions: detail.internalTransactions,
            contractAddress: detail.contractAddress,
            tokenId: tx.tokenId,
            block: blockDetail
          };
        }));
        // Createイベントを履歴の先頭に
        if (contractCreateTx) {
          const detail = txDetailMap[contractCreateTx.transactionHash] || {};
          let blockDetail = null;
          if (detail.block) {
            blockDetail = {
              number: detail.block.number,
              hash: detail.block.hash,
              timestamp: detail.block.timestamp,
              miner: detail.block.miner,
              size: detail.block.size,
              difficulty: detail.block.difficulty
            };
          }
          transfers = [{
            hash: contractCreateTx.transactionHash,
            from: contractCreateTx.from,
            to: contractCreateTx.to,
            value: contractCreateTx.value,
            timestamp: contractCreateTx.timestamp,
            blockNumber: detail.blockNumber,
            blockHash: detail.blockHash,
            status: detail.status,
            gas: detail.gas,
            gasUsed: detail.gasUsed,
            gasPrice: detail.gasPrice,
            input: detail.input,
            logs: detail.logs,
            isContractCreation: detail.isContractCreation,
            internalTransactions: detail.internalTransactions,
            contractAddress: detail.contractAddress,
            tokenId: '',
            block: blockDetail
          }, ...transfers];
        }
        // owner/creator/createdAtのセット
        let owner = null;
        let creator = null;
        let createdAt = null;
        if (transfers.length > 0) {
          const firstTx = transfers[0];
          const txDetail = await db.collection('transactions').findOne({ hash: firstTx.hash });
          if (txDetail) {
            owner = txDetail.to;
            if (!creator || creator === ZERO_ADDR) {
              if (txDetail.from && txDetail.from !== ZERO_ADDR) {
                creator = txDetail.from; // ZERO_ADDR 以外なら採用
              }
            }
            createdAt = txDetail.timestamp ? new Date(Number(txDetail.timestamp) * 1000).toISOString() : null;
            transfers[0].from = txDetail.from;
            transfers[0].to = txDetail.to;
          } else {
            owner = firstTx.to;
            if (!creator || creator === ZERO_ADDR) {
              if (firstTx.from && firstTx.from !== ZERO_ADDR) {
                creator = firstTx.from;
              }
            }
            createdAt = firstTx.timestamp || null;
          }
        }

        /* ---------- 推測ロジックでcreatorを補完 ---------- */
        if (!creator) {
          // ContractコレクションからbyteCode取得
          const contractDoc = await db.collection('Contract').findOne({ address: { $regex: new RegExp(`^${address}$`, 'i') } });
          if (contractDoc && contractDoc.byteCode) {
            // to:null のトランザクションを取得
            const txs = await db.collection('transactions').find({ to: null, input: { $exists: true } }).toArray();
            const normalize = (hex: string) => (hex || '').toLowerCase().replace(/^0x/, '');
            const codeNorm = normalize(contractDoc.byteCode as string);
            const matchTx = txs.find(tx => {
              const inp = normalize(tx.input as string);
              const len = Math.min(codeNorm.length, inp.length, 300);
              return codeNorm.slice(0, len) === inp.slice(0, len);
            });
            if (matchTx && matchTx.from && matchTx.from !== ZERO_ADDR) {
              creator = matchTx.from;
            }
          }
          // Fallback: コントラクト作成Txのfrom
          if (( !creator || creator === ZERO_ADDR ) && contractCreateTx && contractCreateTx.from && contractCreateTx.from !== ZERO_ADDR) {
            creator = contractCreateTx.from;
          }
        }
        // console.log removed (debug)

        // ======================= 追加 fallback =======================
        if (!creator) {
          // 1) 最古の to=contract アドレス Tx の from
          const colNames2 = ['Transaction', 'transactions'];
          for (const col of colNames2) {
            const firstNonZeroTx = await db.collection(col).findOne(
              {
                to: { $regex: new RegExp(`^${address}$`, 'i') },
                from: { $ne: ZERO_ADDR }
              },
              { sort: { blockNumber: 1 } }
            );
            if (firstNonZeroTx?.from) {
              creator = firstNonZeroTx.from as string;
              break;
            }
          }

          // 2) isContractCreation フラグ付き Tx
          if (!creator) {
            const deployTxByFlag = await db.collection('Transaction').findOne(
              {
                isContractCreation: true,
                input: { $exists: true },
                from: { $ne: ZERO_ADDR }
              },
              { sort: { blockNumber: 1 } }
            );
            if (deployTxByFlag?.from) {
              creator = deployTxByFlag.from as string;
            }
          }
          // console.log removed (debug)
        }
        // ============================================================
        /* ---------- 推測ロジック終了 ---------- */

        // Token情報も取得
        const foundTokenArr = await Token.find({ address: { $regex: new RegExp(`^${address}$`, 'i') } }).lean();
        const foundToken = Array.isArray(foundTokenArr) && foundTokenArr.length > 0 ? foundTokenArr[0] : null;
        // console.log removed (debug)
        return NextResponse.json({
          tokenId: tokenIdNum,
          address: address,
          metadata: {
            ...metadata,
            type: foundToken?.type ?? null,
            symbol: foundToken?.symbol ?? null,
            totalSupply: foundToken?.totalSupply ?? foundToken?.supply ?? null,
             
            verified: (contractSource as any)?.verified ?? null,
            contractAddress: foundToken?.address || address || null
          },
          owner: owner,
          creator: creator,
          createdAt: createdAt,
          transfers: transfers
        });
      } catch (e) {
        console.error('Error fetching metadata:', e);
        return NextResponse.json({
          tokenId: tokenIdNum,
          address: address,
          metadata: {
            name: `Token #${tokenIdNum}`,
            description: '',
            image: '',
            attributes: [],
            tokenURI: null,
            createdAt: null
          },
          owner: null,
          creator: null,
          createdAt: null,
          transfers: []
        });
      }
    }

    let token: ApiToken | Record<string, unknown> | null = null;
    // Holds chain statistics for native token
    let chainStats: any = null;
    // contractSource with flexible types
    interface ContractSource {
      verified?: boolean;
      compiler?: string | null;
      language?: string | null;
      name?: string | null;
      sourceCode?: string | null;
      bytecode?: string | null;
    }
    let contractSource: ContractSource | null = null;

    // Handle the native VBC token as a special case
    if (address.toLowerCase() === '0x0000000000000000000000000000000000000000') {
      // Directly call the library function instead of using fetch
      chainStats = await getChainStats();
      token = {
        address: '0x0000000000000000000000000000000000000000',
        name: 'VirBiCoin',
        symbol: 'VBC',
        type: 'Native',
        decimals: 18,
        supply: chainStats.totalSupply || 'N/A',
        holders: chainStats.activeAddresses || 0,
        createdAt: new Date('1970-01-01T00:00:00Z'), // Set a more realistic genesis date
        updatedAt: new Date(),
      };
    } else {
      // Get token info from DB for other tokens
          const foundToken = await Token.findOne({
      address: { $regex: new RegExp(`^${address}$`, 'i') }
    }).lean() as Record<string, unknown> | null;
      
      if (foundToken) {
        token = foundToken as unknown as ApiToken;
      }
    }

    // If token still not found, create dummy data for the requested address
    if (!token) {
      token = {
        address: address,
        name: 'Unknown Token',
        symbol: 'UNKNOWN',
        decimals: 18,
        supply: '1000000000000000000000000', // 1M tokens with 18 decimals
        holders: 0,
        type: 'Unknown',
        createdAt: new Date('2023-01-01T00:00:00Z'), // Set a more realistic creation date
        updatedAt: new Date()
      };
    }

    // If token has current date as createdAt, try to find actual creation date from transfers
    if (token.createdAt && Math.abs(Date.now() - new Date(token.createdAt as string | number | Date).getTime()) < 24 * 60 * 60 * 1000) {
      // Try to find the earliest transfer or mint transaction
      const firstTransfer = await TokenTransfer.findOne({
        tokenAddress: { $regex: new RegExp(`^${address}$`, 'i') }
      }).sort({ timestamp: 1 });
      
      // Also try to find mint transactions (from zero address)
      const firstMint = await TokenTransfer.findOne({
        tokenAddress: { $regex: new RegExp(`^${address}$`, 'i') },
        from: '0x0000000000000000000000000000000000000000'
      }).sort({ timestamp: 1 });
      
      // Use the earliest of the two
      let earliestTimestamp = null;
      if (firstTransfer && firstTransfer.timestamp) {
        earliestTimestamp = new Date(firstTransfer.timestamp);
      }
      if (firstMint && firstMint.timestamp) {
        const mintTimestamp = new Date(firstMint.timestamp);
        if (!earliestTimestamp || mintTimestamp < earliestTimestamp) {
          earliestTimestamp = mintTimestamp;
        }
      }
      
      if (earliestTimestamp) {
        token.createdAt = earliestTimestamp;
      }
    }

    // Normalize token type for non-native tokens
    if (token.type === 'ERC20') {
      token.type = 'VRC-20';
    } else if (token.type === 'ERC721') {
      token.type = 'VRC-721';
    } else if (token.type === 'VRC721') {
      token.type = 'VRC-721';
    } else if (token.type === 'ERC1155') {
      token.type = 'VRC-1155';
    } else if (token.type === 'VRC1155') {
      token.type = 'VRC-1155';
    }

    // Get token holders - use case-insensitive match with direct database access
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    const holders = await db.collection('tokenholders').find({
      tokenAddress: { $regex: new RegExp(`^${address}$`, 'i') }
    })
      .sort({ rank: 1 })
      .limit(50)
      .toArray();

    // 各holderの所有tokenId配列をtokentransfersから集計してセット
    for (const holder of holders) {
      const tokens = await db.collection('tokentransfers').find({
        tokenAddress: { $regex: new RegExp(`^${address}$`, 'i') },
        to: holder.holderAddress
      }).toArray();
      holder.tokenIds = tokens.map(t => t.tokenId).filter((v, i, a) => v !== undefined && a.indexOf(v) === i);
    }

    // Get recent transfers - use case-insensitive match with alternative field names
    let transfers = await db.collection('tokentransfers').find({
      tokenAddress: { $regex: new RegExp(`^${address}$`, 'i') }
    })
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();

    // If no transfers found, try alternative field names
    if (transfers.length === 0) {
      transfers = await db.collection('tokentransfers').find({
        $or: [
          { token: { $regex: new RegExp(`^${address}$`, 'i') } },
          { contractAddress: { $regex: new RegExp(`^${address}$`, 'i') } }
        ]
      })
        .sort({ timestamp: -1 })
        .limit(50)
        .toArray();
    }

    // If still no transfers found, try a broader search
    if (transfers.length === 0) {
      // Try searching with the address in any field
      transfers = await db.collection('tokentransfers').find({
        $or: [
          { tokenAddress: { $regex: new RegExp(address, 'i') } },
          { token: { $regex: new RegExp(address, 'i') } },
          { contractAddress: { $regex: new RegExp(address, 'i') } },
          { address: { $regex: new RegExp(address, 'i') } }
        ]
      })
        .sort({ timestamp: -1 })
        .limit(50)
        .toArray();
    }

    // Calculate real statistics from database for non-native tokens
    let realHolders = 0;
    let realTransfers = 0;
    let realSupply = token.supply || '0';
    let mintCount = 0;

    if (token.type !== 'Native') {
      // Get actual holder count
      realHolders = await db.collection('tokenholders').countDocuments({
        tokenAddress: { $regex: new RegExp(`^${address}$`, 'i') }
      });
      // Get actual transfer count with alternative field names
      realTransfers = await db.collection('tokentransfers').countDocuments({
        $or: [
          { tokenAddress: { $regex: new RegExp(`^${address}$`, 'i') } },
          { token: { $regex: new RegExp(`^${address}$`, 'i') } },
          { contractAddress: { $regex: new RegExp(`^${address}$`, 'i') } },
          { address: { $regex: new RegExp(`^${address}$`, 'i') } }
        ]
      });



      // For VRC-721 tokens, update the supply with actual mint count
      if (token.type === 'VRC-721') {
        try {
          mintCount = await db.collection('tokentransfers').countDocuments({
            tokenAddress: { $regex: new RegExp(`^${address}$`, 'i') },
            from: '0x0000000000000000000000000000000000000000'
          });
          if (token.totalSupply && token.totalSupply !== '0') {
            realSupply = token.totalSupply;
          } else if (token.supply && token.supply !== '0') {
            realSupply = token.supply;
          } else {
            realSupply = mintCount.toString();
          }
          token.supply = realSupply;
          token.totalSupply = realSupply;
        } catch {
          console.error('Error counting mints');
        }
      }

      // Update the token with real holder count
      token.holders = realHolders;
    }

    // Calculate age in days using the timestamp of the first TokenTransfer only
    let ageInDays: string | number = 'N/A';
    if (token.type !== 'Native') {
      // For VRC-721 tokens, use the earliest transfer timestamp for age calculation
      if (token.type === 'VRC-721') {
        // Get the earliest transfer (usually Token ID 0 mint)
        const earliestTransfer = await db.collection('tokentransfers').findOne({
          tokenAddress: { $regex: new RegExp(`^${address}$`, 'i') }
        }, { sort: { timestamp: 1 } });

        if (earliestTransfer && earliestTransfer.timestamp) {
          const earliestTime = new Date(earliestTransfer.timestamp).getTime();
          const now = Date.now();
          ageInDays = Math.floor((now - earliestTime) / (1000 * 60 * 60 * 24));
        }
      } else {
        // For other tokens, use the earliest TokenTransfer timestamp
        const earliestTransfer = await TokenTransfer.findOne({
          tokenAddress: { $regex: new RegExp(`^${address}$`, 'i') }
        }).sort({ timestamp: 1 });

        if (earliestTransfer && earliestTransfer.timestamp) {
          const earliestTime = new Date(earliestTransfer.timestamp).getTime();
          const now = Date.now();
          ageInDays = Math.floor((now - earliestTime) / (1000 * 60 * 60 * 24));
        }
      }
    }

    // Get transfers in the last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const transfers24h = await db.collection('tokentransfers').countDocuments({
      $or: [
        { tokenAddress: { $regex: new RegExp(`^${address}$`, 'i') } },
        { token: { $regex: new RegExp(`^${address}$`, 'i') } },
        { contractAddress: { $regex: new RegExp(`^${address}$`, 'i') } },
        { address: { $regex: new RegExp(`^${address}$`, 'i') } }
      ],
      timestamp: { $gte: yesterday }
    });

    // Calculate floor price and volume (mock data for now)
    const floorPrice = token.type === 'VRC-721' ? '0.05' : '0.02';
    const volume24h = (Math.random() * 50 + 10).toFixed(1);

    // Get contract source information from database
    const dbContractInfo = await db.collection('Contract').findOne({
      address: { $regex: new RegExp(`^${address}$`, 'i') }
    });
    contractSource = dbContractInfo ? {
      verified: dbContractInfo.verified || false,
      compiler: dbContractInfo.compilerVersion || 'Unknown',
      language: 'Solidity',
      name: dbContractInfo.contractName || 'Contract',
      sourceCode: dbContractInfo.sourceCode || null,
      bytecode: dbContractInfo.byteCode || null
    } : {
      verified: false,
      compiler: null,
      language: null,
      name: 'Contract',
      sourceCode: null,
      bytecode: null
    };

    // コントラクト作成トランザクションを取得
    const contractCreateTx = await db.collection('tokentransfers').findOne({
      to: { $regex: new RegExp(`^${address}$`, 'i') },
      value: { $in: [0, '0', '0x0', '0x00'] },
      $or: [
        { tokenId: { $exists: false } },
        { tokenId: null },
        { tokenId: '' }
      ]
    }, { sort: { timestamp: 1 } });

    // 推測的にコントラクト作成Txを特定しCreatorを取得
    let creator = null;
    // --- ここからバイトコード推測ロジック ---
    // まずContract（大文字）を優先
    const contractDoc = await db.collection('Contract').findOne({ address: { $regex: new RegExp(`^${address}$`, 'i') } });
    // console.log('contractDoc:', contractDoc); // ここでbyteCodeが必ず入る
    if (contractDoc && contractDoc.byteCode) {
      let txs = await db.collection('transactions').find({
        $or: [
          { to: null },
          { to: { $exists: false } },
          { to: '' }
        ],
        input: { $exists: true }
      }).toArray();
      if (!txs || txs.length === 0) {
        txs = await db.collection('Transaction').find({
          $or: [
            { to: null },
            { to: { $exists: false } },
            { to: '' }
          ],
          input: { $exists: true }
        }).toArray();
      }
      const normalizeHex = (hex: string): string => (hex || '').toLowerCase().replace(/^0x/, '');
      const contractCode = normalizeHex(contractDoc.byteCode as string);
      let matchTx = txs.find(tx => {
        const txInput = normalizeHex(tx.input as string);
        // 比較長さを短くして柔軟にマッチ
        const minLen = 40; // 20 bytes * 2 hex chars
        return contractCode.slice(0, minLen) === txInput.slice(0, minLen) ||
               txInput.slice(0, minLen) === contractCode.slice(0, minLen);
      });
      if (!matchTx) {
        matchTx = txs.find(tx => {
          const txInput = normalizeHex(tx.input);
          return contractCode.includes(txInput) || txInput.includes(contractCode);
        });
      }
      if (matchTx && matchTx.from && matchTx.from !== ZERO_ADDR) {
        // console.log('推測マッチTx:', matchTx);
        creator = matchTx.from; // ←ここで必ず上書き
      } else {
        const nonZeroFromTx = txs.find(tx => tx.from && tx.from !== ZERO_ADDR);
        if (nonZeroFromTx) {
          creator = nonZeroFromTx.from;
        }
      }
      // console.log('推測creator:', creator);
      // 追加のfallback: to:null かつ from != ZERO_ADDR の最古Tx
      if (!creator) {
        const deployTx = await db.collection('transactions').findOne({
          to: null,
          from: { $ne: ZERO_ADDR }
        }, { sort: { blockNumber: 1 } });
        if (deployTx && deployTx.from) {
          creator = deployTx.from as string;
        }
      }
    }
    // --- ここまでバイトコード推測ロジック ---

    // contractCreateTxのfromをCreatorとして採用（まだ設定されていない場合）
    if (( !creator || creator === ZERO_ADDR ) && contractCreateTx && contractCreateTx.from && contractCreateTx.from !== ZERO_ADDR) {
      creator = contractCreateTx.from;
    }
    // console.log('推測creator最終:', creator);

    // fallback: コントラクトアドレス宛のトランザクションのうち
    // from がゼロアドレス以外で最も古いものを Creator に採用
    if (!creator) {
      const colNames = ['Transaction', 'transactions'];
      for (const col of colNames) {
        const firstNonZeroTx = await db.collection(col).findOne(
          {
            to: { $regex: new RegExp(`^${address}$`, 'i') },
            from: { $ne: ZERO_ADDR }
          },
          { sort: { blockNumber: 1 } }
        );
        if (firstNonZeroTx?.from) {
          creator = firstNonZeroTx.from as string;
          break;
        }
      }

      // さらに creates フィールドを持つデプロイTx を検索
      if (!creator) {
        const deployTx = await db.collection('Transaction').findOne({
          creates: { $regex: new RegExp(`^${address}$`, 'i') },
          from: { $ne: ZERO_ADDR }
        });
        if (deployTx?.from) {
          creator = deployTx.from as string;
        }
      }
    }
    // console.log('NFT 最終 creator (fallback):', creator);

    // tokenId指定時のOwner決定ロジック
    let tokenIdParam = null;
    if (searchParams && searchParams.get) {
      tokenIdParam = searchParams.get('tokenId');
    }
    let ownerAddress = null;
    if (tokenIdParam) {
      // tokenId一致の全トランスファーを昇順で取得
      const tokenTransfers = await db.collection('tokentransfers').find({
        tokenAddress: { $regex: new RegExp(`^${address}$`, 'i') },
        tokenId: tokenIdParam
      }).sort({ timestamp: 1 }).toArray();
      if (tokenTransfers.length === 1) {
        ownerAddress = tokenTransfers[0].from;
      } else if (tokenTransfers.length > 1) {
        ownerAddress = tokenTransfers[tokenTransfers.length - 1].to;
      }
    }

    // For NFT tokens, add NFT-specific information
    if (token.type === 'VRC-721' || token.type === 'VRC-1155') {
      // Transfer履歴の先頭にコントラクト作成Txを追加
      let nftTransfers = transfers.length > 0 ? transfers.map((transfer: Record<string, unknown>) => {
        return {
          hash: transfer.hash as string,
          from: (transfer.from as string) === ZERO_ADDR ? 'System' : transfer.from as string,
          to: transfer.to as string,
          value: '1',
          valueRaw: '1',
          tokenId: transfer.tokenId,
          timestamp: transfer.timestamp as Date,
          timeAgo: getTimeAgo(transfer.timestamp as Date),
          status: transfer.status as number | string | boolean | undefined,
          gasUsed: transfer.gasUsed,
          blockNumber: transfer.blockNumber,
          blockHash: transfer.blockHash,
          contractAddress: transfer.contractAddress,
          input: transfer.input,
          logs: transfer.logs,
          block: transfer.block
        };
      }) : [];
      if (contractCreateTx) {
        // Tx detail for contract creation
        interface TxLite { status?: string | number | boolean; gasUsed?: string | number; blockNumber?: number; blockHash?: string; }
        let createTxDetail: TxLite | null = null;
        try {
          const txDoc: any = await db.collection('transactions').findOne({ hash: contractCreateTx.transactionHash });
          if (txDoc) {
            createTxDetail = {
              status: (txDoc as any).status,
              gasUsed: (txDoc as any).gasUsed,
              blockNumber: (txDoc as any).blockNumber,
              blockHash: (txDoc as any).blockHash,
            };
          }
        } catch {}
        nftTransfers = [
          {
            hash: contractCreateTx.transactionHash,
            from: contractCreateTx.from,
            to: contractCreateTx.to,
            value: contractCreateTx.value ?? '0',
            valueRaw: contractCreateTx.value ?? '0',
            tokenId: '',
            timestamp: contractCreateTx.timestamp,
            timeAgo: getTimeAgo(contractCreateTx.timestamp),
            status: createTxDetail?.status ?? undefined,
            gasUsed: createTxDetail?.gasUsed ?? undefined,
            blockNumber: createTxDetail?.blockNumber ?? contractCreateTx.blockNumber ?? undefined,
            blockHash: createTxDetail?.blockHash ?? contractCreateTx.blockHash ?? undefined,
            contractAddress: undefined,
            input: undefined,
            logs: undefined,
            block: undefined
          },
          ...nftTransfers
        ];
      }
      const isNFT = token.type === 'VRC-721' || token.type === 'VRC-1155';
      const mappedHolders = holders.map((holder: Record<string, unknown>) => ({
        rank: holder.rank as number,
        address: holder.holderAddress as string,
        balance: formatTokenAmount(
          holder.balance as string,
          Number(token.decimals ?? (isNFT ? 0 : 18)),
          isNFT
        ),
        balanceRaw: holder.balance as string,
        percentage: typeof holder.percentage === 'number' ? holder.percentage.toFixed(2) : '0.00',
        tokenIds: holder.tokenIds as number[] || [] // DB値そのまま返す
      }));
      const nftData = {
        token: {
          address: token.address,
          name: token.name,
          symbol: token.symbol,
          type: token.type,
          decimals: Number(token.decimals ?? 0),
          totalSupply: token.supply && typeof token.supply === 'string' ? formatTokenAmount(token.supply, Number(token.decimals ?? 0), true) : 'Unknown',
          totalSupplyRaw: token.supply && typeof token.supply === 'string' ? token.supply : '0',
          description: `Unique digital collectibles on VirBiCoin network. ${token.type} standard NFT collection with verified smart contract.`,
          floorPrice: floorPrice,
          volume24h: volume24h,
          creator: creator,
          isNFT: true,
          createdAt: contractCreateTx ? new Date(contractCreateTx.timestamp) : null,
          contractCreateTxHash: contractCreateTx ? contractCreateTx.transactionHash : null,
          owner: ownerAddress
        },
        contract: contractSource,
        statistics: {
          holders: realHolders || token.holders || 0,
          totalTransfers: realTransfers || transfers.length || 0,
          transfers24h: transfers24h || 0,
          age: ageInDays,
          marketCap: 'N/A' // Will need external API for price data
        },
        holders: mappedHolders,
        transfers: nftTransfers
      };

      // console.log('API return (NFT) creator3:', creator);
      return NextResponse.json(nftData);
    }

    // For non-NFT tokens, return standard token data
    const isNFT = token.type === 'VRC-721' || token.type === 'VRC-1155';
    
    // Get verification status for the contract
    let verified = false;
    let contractInfo = null;
    if (token.type !== 'Native') {
      try {
        const contract = await db.collection('Contract').findOne({ 
          address: { $regex: new RegExp(`^${address}$`, 'i') }
        });
        verified = contract?.verified || false;
        
        // Add contract information to response
        if (contract) {
          contractInfo = {
            verified: contract.verified || false,
            compiler: contract.compilerVersion || null,
            language: 'Solidity',
            name: contract.contractName || 'Contract',
            sourceCode: contract.sourceCode || null,
            bytecode: contract.byteCode || null,
            compilerVersion: contract.compilerVersion,
            metadataVersion: contract.metadataVersion
          };
        }
      } catch {
        console.error('Error fetching contract verification status');
      }
    }

    const response = {
      token: {
        address: token.address,
        name: token.name,
        symbol: token.symbol,
        type: token.type,
        isNFT: isNFT,
        decimals: Number(token.decimals ?? (isNFT ? 0 : 18)),
        totalSupply: realSupply ? formatTokenAmount(String(realSupply), Number(token.decimals ?? (isNFT ? 0 : 18)), isNFT) : '0',
        totalSupplyRaw: realSupply || '0',
        verified: verified
      },
      contract: contractInfo,
      statistics: {
        holders: token.type === 'Native' ? token.holders : realHolders,
        transfers: token.type === 'Native'
          ? (typeof chainStats === 'object' && chainStats !== null && 'totalTransactions' in chainStats
              ? (chainStats as { totalTransactions: number }).totalTransactions
              : 0)
          : (realTransfers || transfers.length || 0),
        age: ageInDays,
        marketCap: 'N/A' // Will need external API for price data
      },
      holders: token.type === 'Native' ? [] : holders.map((holder: Record<string, unknown>) => ({
        rank: holder.rank as number,
        address: holder.holderAddress as string,
        balance: formatTokenAmount(holder.balance as string, Number(token.decimals) || (isNFT ? 0 : 18), isNFT),
        balanceRaw: holder.balance as string,
        percentage: typeof holder.percentage === 'number' ? holder.percentage.toFixed(2) : '0.00',
        tokenIds: holder.tokenIds as number[] || [] // DB値そのまま返す
      })),
      transfers: token.type === 'Native' ? [] : transfers.map((transfer: Record<string, unknown>) => ({
        hash: transfer.transactionHash as string,
        // If from is zero address, show as 'System' for frontend display
        from: (transfer.from as string) === '0x0000000000000000000000000000000000000000' ? 'System' : transfer.from as string,
        to: transfer.to as string,
        value: formatTokenAmount(transfer.value as string, Number(token.decimals) || (isNFT ? 0 : 18), isNFT),
        valueRaw: transfer.value as string,
        timestamp: transfer.timestamp as Date,
        timeAgo: getTimeAgo(transfer.timestamp as Date),
        tokenId: transfer.tokenId // ← DB値をそのまま返す
      }))
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Token API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token data' },
      { status: 500 }
    );
  }
}

function getTimeAgo(timestamp: Date): string {
  if (!timestamp) return 'Unknown';

  const now = new Date();
  const diff = now.getTime() - new Date(timestamp).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  const minutes = Math.floor(diff / (1000 * 60));
  return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;

}
