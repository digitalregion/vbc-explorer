import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Contract } from '../../../models/index';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { addr, action } = body;

    if (action === 'find') {
      // Find contract in database
      const contract = await Contract.findOne({ 
        address: addr.toLowerCase() 
      }).lean();

      if (!contract) {
        return NextResponse.json({
          valid: false,
          message: 'Contract not found'
        });
      }

      // Format compiler version for display
      let displayCompilerVersion = contract.compilerVersion;
      if (displayCompilerVersion) {
        // Remove 'v' prefix if present
        if (displayCompilerVersion.startsWith('v')) {
          displayCompilerVersion = displayCompilerVersion.substring(1);
        }
        // If it's 'latest', show a more descriptive version
        if (displayCompilerVersion === 'latest') {
          displayCompilerVersion = 'Latest (0.8.30)';
        }
      } else {
        displayCompilerVersion = 'Unknown';
      }

      return NextResponse.json({
        valid: contract.verified || false,
        contractName: contract.contractName || 'Unknown',
        compilerVersion: displayCompilerVersion,
        optimization: contract.optimization || false,
        sourceCode: contract.sourceCode || '',
        abi: contract.abi || '',
        address: contract.address
      });
    }

    if (action === 'compile') {
      // This would handle contract compilation
      // For now, return a basic response
      return NextResponse.json({
        valid: false,
        message: 'Compilation endpoint not fully implemented'
      });
    }

    return NextResponse.json({
      error: 'Invalid action',
      valid: false
    });

  } catch (error) {
    console.error('Compile endpoint error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        valid: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 