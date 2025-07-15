import { NextRequest, NextResponse } from 'next/server';
import Web3 from 'web3';

const WEB3_PROVIDER_URL = 'http://localhost:8329';
const web3 = new Web3(new Web3.providers.HttpProvider(WEB3_PROVIDER_URL));

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      contractAddress, 
      abi, 
      method, 
      params = [], 
      fromAddress, 
      value = '0',
      gasLimit = 3000000,
      gasPrice = '20000000000' // 20 gwei
    } = body;

    if (!contractAddress || !abi || !method) {
      return NextResponse.json(
        { error: 'Missing required fields: contractAddress, abi, method' },
        { status: 400 }
      );
    }

    // Create contract instance
    const contract = new web3.eth.Contract(abi, contractAddress);

    // Check if method exists in ABI
    const methodAbi = abi.find((item: { name: string }) => item.name === method);
    if (!methodAbi) {
      return NextResponse.json(
        { error: `Method '${method}' not found in contract ABI` },
        { status: 400 }
      );
    }

    // Determine if it's a read or write operation
    const isReadOperation = methodAbi.stateMutability === 'view' || methodAbi.stateMutability === 'pure';

    if (isReadOperation) {
      // Read operation (call)
      try {
        const result = await contract.methods[method](...params).call();
        return NextResponse.json({
          success: true,
          type: 'read',
          method,
          result,
          gasUsed: null
        });
      } catch {
        return NextResponse.json({
          success: false,
          type: 'read',
          error: 'Read operation failed'
        }, { status: 400 });
      }
    } else {
      // Write operation (send transaction)
      if (!fromAddress) {
        return NextResponse.json(
          { error: 'fromAddress is required for write operations' },
          { status: 400 }
        );
      }

      try {
        // Get nonce
        const nonce = await web3.eth.getTransactionCount(fromAddress, 'pending');
        
        // Estimate gas
        let estimatedGas;
        try {
          estimatedGas = await contract.methods[method](...params).estimateGas({
            from: fromAddress,
            value: value
          });
        } catch {
          estimatedGas = gasLimit; // Use provided gas limit if estimation fails
        }

        // Build transaction
        const tx = {
          from: fromAddress,
          to: contractAddress,
          value: value,
          gas: Math.min(estimatedGas, gasLimit),
          gasPrice: gasPrice,
          nonce: nonce,
          data: contract.methods[method](...params).encodeABI()
        };

        return NextResponse.json({
          success: true,
          type: 'write',
          method,
          transaction: tx,
          estimatedGas: estimatedGas.toString(),
          message: 'Transaction prepared successfully. Use a wallet to sign and send this transaction.'
        });

      } catch {
        return NextResponse.json({
          success: false,
          type: 'write',
          error: 'Write operation failed'
        }, { status: 400 });
      }
    }

  } catch (error) {
    console.error('Contract interaction error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to get contract ABI and available methods
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contractAddress = searchParams.get('address');
    const abiParam = searchParams.get('abi');

    if (!contractAddress) {
      return NextResponse.json(
        { error: 'Contract address is required' },
        { status: 400 }
      );
    }

    // Check if contract exists
    const code = await web3.eth.getCode(contractAddress);
    if (code === '0x' || code === '0x0') {
      return NextResponse.json(
        { error: 'No contract found at this address' },
        { status: 404 }
      );
    }

    let abi;
    if (abiParam) {
      try {
        abi = JSON.parse(abiParam);
      } catch {
        return NextResponse.json(
          { error: 'Invalid ABI format' },
          { status: 400 }
        );
      }
    } else {
      // Return basic contract info without ABI
      return NextResponse.json({
        address: contractAddress,
        hasCode: true,
        message: 'Contract found. Provide ABI to get available methods.'
      });
    }

    // Parse ABI and categorize methods
    const methods = abi
      .filter((item: { type: string }) => item.type === 'function')
      .map((item: { name: string; stateMutability: string; inputs?: Array<{ name: string; type: string }>; outputs?: Array<{ name: string; type: string }> }) => ({
        name: item.name,
        type: item.stateMutability === 'view' || item.stateMutability === 'pure' ? 'read' : 'write',
        inputs: item.inputs || [],
        outputs: item.outputs || [],
        stateMutability: item.stateMutability
      }));

    const readMethods = methods.filter((m: { type: string }) => m.type === 'read');
    const writeMethods = methods.filter((m: { type: string }) => m.type === 'write');

    return NextResponse.json({
      address: contractAddress,
      hasCode: true,
      abi,
      methods: {
        read: readMethods,
        write: writeMethods,
        all: methods
      }
    });

  } catch (error) {
    console.error('Contract info error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 