import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Contract } from '../../../../../models/index';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    await connectDB();
    const { address } = await params;

    if (!address) {
      return NextResponse.json(
        { error: 'Contract address is required' },
        { status: 400 }
      );
    }

    // Find contract in database
    const contract = await Contract.findOne({ 
      address: address.toLowerCase() 
    }).lean();

    if (!contract) {
      return NextResponse.json({
        verified: false,
        message: 'Contract not found in database',
        address: address
      });
    }

    return NextResponse.json({
      verified: contract.verified || false,
      contractName: contract.contractName,
      compilerVersion: contract.compilerVersion,
      optimization: contract.optimization,
      verifiedAt: contract.verifiedAt,
      hasSourceCode: !!contract.sourceCode,
      hasABI: !!contract.abi,
      address: contract.address,
      message: contract.verified ? 'Contract is verified' : 'Contract is not verified'
    });

  } catch (error) {
    console.error('Contract status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 