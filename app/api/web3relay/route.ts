import { NextRequest, NextResponse } from 'next/server';
import Web3 from 'web3';
import { Transaction, Market } from '@/lib/models';
import { connectToDatabase } from '@/lib/db';
import { toEther, toGwei } from '@/lib/etherUnits';
import BigNumber from 'bignumber.js';

// Load config
const config = { nodeAddr: 'localhost', wsPort: 8546 };
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const local = require('../../../config.json');
  Object.assign(config, local);
  console.log('config.json found.');
} catch (error: unknown) {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'MODULE_NOT_FOUND') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const local = require('../../../config.example.json');
    Object.assign(config, local);
    console.log('No config file found. Using default configuration... (config.example.json)');
  } else {
    throw error;
  }
}

// Create Web3 connection
const web3 = new Web3(new Web3.providers.WebsocketProvider(`ws://${config.nodeAddr}:${config.wsPort}`));

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    console.log(body);

    if ('tx' in body) {
      const txHash = body.tx.toLowerCase();

      let txResponse: Record<string, unknown>;
      let doc;
      
      try {
        doc = await Transaction.findOne({ hash: txHash }).lean(true).exec();
      } catch (err) {
        console.error(err);
      }
      
      if (!doc) {
        // Try to get from blockchain
        try {
          const tx = await web3.eth.getTransaction(txHash);
          if (!tx) {
            // Try as block hash
            const block = await web3.eth.getBlock(txHash);
            if (!block) {
              return NextResponse.json({ error: true });
            } else {
              return NextResponse.json({ error: true, isBlock: true });
            }
          }
          
          txResponse = tx;
          txResponse.value = toEther(new BigNumber(tx.value), 'wei');
          
          // Get transaction receipt
          const receipt = await web3.eth.getTransactionReceipt(txHash);
          if (receipt) {
            txResponse.gasUsed = receipt.gasUsed;
            if (receipt.status !== undefined) {
              txResponse.status = receipt.status;
            }
            if (!tx.to && !tx.creates && receipt.contractAddress) {
              txResponse.creates = receipt.contractAddress;
            }
          }
          
          // Get timestamp from block
          const block = await web3.eth.getBlock(tx.blockNumber);
          if (block) {
            txResponse.timestamp = block.timestamp;
          }
          
          txResponse.isTrace = (txResponse.input !== '0x');
          
        } catch (err) {
          console.error(`TxWeb3 error: ${err}`);
          return NextResponse.json({ error: true });
        }
      } else {
        txResponse = doc;
      }

      const latestBlock = await web3.eth.getBlockNumber() + 1;
      txResponse.confirmations = latestBlock - txResponse.blockNumber;

      if (txResponse.confirmations === latestBlock) {
        txResponse.confirmation = 0;
      }
      
      txResponse.gasPriceGwei = toGwei(new BigNumber(txResponse.gasPrice), 'wei');
      txResponse.gasPriceEther = toEther(new BigNumber(txResponse.gasPrice), 'wei');
      txResponse.txFee = txResponse.gasPriceEther * txResponse.gasUsed;

      if (config.settings?.useFiat) {
        const latestPrice = await Market.findOne().sort({ timestamp: -1 });
        if (latestPrice) {
          txResponse.txFeeUSD = txResponse.txFee * latestPrice.quoteUSD;
          txResponse.valueUSD = txResponse.value * latestPrice.quoteUSD;
        }
      }

      return NextResponse.json(txResponse);
      
    } else if ('addr' in body) {
      const addr = body.addr.toLowerCase();
      const { options } = body;

      const addrData: Record<string, unknown> = {};

      if (options.indexOf('balance') > -1) {
        try {
          const balance = await web3.eth.getBalance(addr);
          addrData.balance = toEther(balance, 'wei');
        } catch (err) {
          console.error(`AddrWeb3 error: ${err}`);
          return NextResponse.json({ error: true });
        }
      }
      
      if (options.indexOf('count') > -1) {
        try {
          addrData.count = await web3.eth.getTransactionCount(addr);
        } catch (err) {
          console.error(`AddrWeb3 error: ${err}`);
          return NextResponse.json({ error: true });
        }
      }
      
      if (options.indexOf('bytecode') > -1) {
        try {
          const code = await web3.eth.getCode(addr);
          addrData.bytecode = code;
        } catch (err) {
          console.error(`AddrWeb3 error: ${err}`);
          return NextResponse.json({ error: true });
        }
      }

      return NextResponse.json(addrData);
      
    } else if ('block' in body) {
      const blockNumber = body.block;
      
      try {
        const block = await web3.eth.getBlock(blockNumber, true);
        if (!block) {
          return NextResponse.json({ error: true });
        }
        
        return NextResponse.json(block);
      } catch (err) {
        console.error(`BlockWeb3 error: ${err}`);
        return NextResponse.json({ error: true });
      }
    }

    return NextResponse.json({ error: true });
    
  } catch (error) {
    console.error('Web3relay error:', error);
    return NextResponse.json({ error: true }, { status: 500 });
  }
} 