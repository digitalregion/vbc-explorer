import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Contract } from '../../../../models/index';
import Web3 from 'web3';
import solc from 'solc';

const WEB3_PROVIDER_URL = process.env.WEB3_PROVIDER_URL || 'http://127.0.0.1:8329';
const web3 = new Web3(new Web3.providers.HttpProvider(WEB3_PROVIDER_URL));

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Debug Web3 connection
    console.log('Web3 Provider URL:', WEB3_PROVIDER_URL);
    
    const body = await request.json();
    const { address, sourceCode, compilerVersion, contractName, optimization } = body;

    if (!address || !sourceCode || !compilerVersion || !contractName) {
      return NextResponse.json(
        { error: 'Missing required fields: address, sourceCode, compilerVersion, contractName' },
        { status: 400 }
      );
    }

    // Get bytecode from blockchain
    let onchainBytecode;
    try {
      onchainBytecode = await web3.eth.getCode(address);
    } catch (web3Error) {
      console.error('Web3 connection error:', web3Error);
      return NextResponse.json(
        { 
          error: 'Failed to connect to blockchain node',
          details: 'Please check the WEB3_PROVIDER_URL configuration',
          web3Error: web3Error instanceof Error ? web3Error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
    
    if (onchainBytecode === '0x' || onchainBytecode === '0x0') {
      return NextResponse.json(
        { error: 'No contract found at this address' },
        { status: 404 }
      );
    }

    // Clean up source code - remove any trailing garbage
    let cleanedSourceCode = sourceCode.trim();
    
    // Remove any trailing lines that don't belong to the contract
    const lines = cleanedSourceCode.split('\n');
    const cleanedLines = [];
    let inContract = false;
    let braceCount = 0;
    let inCommentBlock = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Handle comment blocks
      if (trimmedLine.startsWith('/**') || trimmedLine.startsWith('/*')) {
        inCommentBlock = true;
      }
      if (inCommentBlock && trimmedLine.includes('*/')) {
        inCommentBlock = false;
        continue; // Skip the comment block entirely
      }
      if (inCommentBlock) {
        continue; // Skip lines within comment blocks
      }
      
      // Start of contract
      if (trimmedLine.startsWith('contract ') || 
          trimmedLine.startsWith('interface ') || 
          trimmedLine.startsWith('library ') ||
          trimmedLine.startsWith('abstract contract ')) {
        inContract = true;
      }
      
      if (inContract) {
        // Count braces to track contract structure
        braceCount += (trimmedLine.match(/{/g) || []).length;
        braceCount -= (trimmedLine.match(/}/g) || []).length;
        
        cleanedLines.push(line);
        
        // End of contract when brace count reaches 0
        if (braceCount === 0 && inContract) {
          inContract = false;
          break;
        }
      } else if (trimmedLine.startsWith('pragma ') || 
                 trimmedLine.startsWith('import ') || 
                 trimmedLine.startsWith('//') || 
                 trimmedLine === '') {
        cleanedLines.push(line);
      }
    }
    
    cleanedSourceCode = cleanedLines.join('\n');
    
    // Additional cleanup: remove any remaining problematic content
    cleanedSourceCode = cleanedSourceCode.replace(/\n\s*\n\s*\n/g, '\n\n'); // Remove excessive newlines
    cleanedSourceCode = cleanedSourceCode.replace(/[^\x00-\x7F]/g, ''); // Remove non-ASCII characters
    
    console.log('Original source code length:', sourceCode.length);
    console.log('Cleaned source code length:', cleanedSourceCode.length);

    // Compile source code
    const input = {
      language: 'Solidity',
      sources: {
        [contractName]: {
          content: cleanedSourceCode
        }
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['*']
          }
        },
        optimizer: {
          enabled: optimization || false,
          runs: 200
        }
      }
    };

    let compiledOutput;
    try {
      if (compilerVersion === 'latest') {
        compiledOutput = JSON.parse(solc.compile(JSON.stringify(input)));
      } else {
        // Load specific compiler version
        const solcVersion = await new Promise<unknown>((resolve, reject) => {
          solc.loadRemoteVersion(compilerVersion, (err: Error | null, solcV: unknown) => {
            if (err) reject(err);
            else resolve(solcV);
          });
        });
        
        // 型ガードでsolcVersionがcompileメソッドを持つかチェック
        if (typeof solcVersion === 'object' && solcVersion !== null && 'compile' in solcVersion && typeof (solcVersion as { compile: unknown }).compile === 'function') {
          compiledOutput = JSON.parse((solcVersion as { compile: (input: string) => string }).compile(JSON.stringify(input)));
        } else {
          throw new Error('Invalid solc version loaded');
        }
      }
    } catch (compileError) {
      return NextResponse.json(
        { error: 'Compilation failed', details: compileError },
        { status: 400 }
      );
    }

    // Check for compilation errors
    if (compiledOutput.errors) {
      const errors = compiledOutput.errors.filter((error: { severity: string }) => error.severity === 'error');
      const warnings = compiledOutput.errors.filter((error: { severity: string }) => error.severity === 'warning');
      
      console.log('Compilation warnings:', warnings);
      
      if (errors.length > 0) {
        return NextResponse.json(
          { error: 'Compilation errors', details: errors },
          { status: 400 }
        );
      }
    }

    // Find the compiled contract
    console.log('Available contracts:', Object.keys(compiledOutput.contracts || {}));
    
    let compiledContract = null;
    let actualContractName = contractName; // ユーザー指定名を優先
    
    // Try exact match first
    if (compiledOutput.contracts[contractName] && compiledOutput.contracts[contractName][contractName]) {
      compiledContract = compiledOutput.contracts[contractName][contractName];
    } else {
      // Try to find any contract in the output
      for (const sourceName in compiledOutput.contracts) {
        const contracts = compiledOutput.contracts[sourceName];
        for (const contractNameInOutput in contracts) {
          console.log('Found contract:', contractNameInOutput, 'in source:', sourceName);
          if (!compiledContract) {
            compiledContract = contracts[contractNameInOutput];
            // actualContractName = contractNameInOutput; // ← ここをコメントアウト
          }
        }
      }
    }
    
    if (!compiledContract) {
      return NextResponse.json(
        { 
          error: 'Contract not found in compilation output',
          debug: {
            requestedContractName: contractName,
            availableContracts: Object.keys(compiledOutput.contracts || {}),
            compilationOutput: compiledOutput
          }
        },
        { status: 400 }
      );
    }

    // Compare bytecodes
    const compiledBytecode = compiledContract.evm.bytecode.object;
    
    // Normalize bytecodes - remove 0x prefix and metadata
    let cleanOnchainBytecode = onchainBytecode;
    if (cleanOnchainBytecode.startsWith('0x')) {
      cleanOnchainBytecode = cleanOnchainBytecode.substring(2);
    }
    
    let cleanCompiledBytecode = compiledBytecode;
    if (cleanCompiledBytecode.startsWith('0x')) {
      cleanCompiledBytecode = cleanCompiledBytecode.substring(2);
    }
    
    // Remove metadata (IPFS hash, etc.)
    cleanOnchainBytecode = cleanOnchainBytecode.replace(/a165627a7a72305820.{64}0029$/gi, '');
    cleanCompiledBytecode = cleanCompiledBytecode.replace(/a165627a7a72305820.{64}0029$/gi, '');
    
    // Remove constructor arguments if present
    // Look for the pattern where constructor args are appended to the bytecode
    const constructorArgsPattern = /(.{2,})([0-9a-f]{40})/;
    const onchainMatch = cleanOnchainBytecode.match(constructorArgsPattern);
    const compiledMatch = cleanCompiledBytecode.match(constructorArgsPattern);
    
    if (onchainMatch && compiledMatch) {
      // If both have constructor args, compare only the contract bytecode part
      cleanOnchainBytecode = onchainMatch[1];
      cleanCompiledBytecode = compiledMatch[1];
    }
    
    // Additional normalization: remove any trailing zeros that might be padding
    cleanOnchainBytecode = cleanOnchainBytecode.replace(/0+$/, '');
    cleanCompiledBytecode = cleanCompiledBytecode.replace(/0+$/, '');
    
    // If the compiled bytecode is longer, it might contain additional metadata
    // Try to find the contract bytecode within the compiled bytecode
    if (cleanCompiledBytecode.length > cleanOnchainBytecode.length) {
      const onchainStart = cleanOnchainBytecode.substring(0, Math.min(100, cleanOnchainBytecode.length));
      const index = cleanCompiledBytecode.indexOf(onchainStart);
      if (index !== -1) {
        cleanCompiledBytecode = cleanCompiledBytecode.substring(index);
      }
    }

    // Debug information
    console.log('Debug bytecode comparison:');
    console.log('Original onchain bytecode length:', onchainBytecode.length);
    console.log('Original compiled bytecode length:', compiledBytecode.length);
    console.log('Clean onchain bytecode length:', cleanOnchainBytecode.length);
    console.log('Clean compiled bytecode length:', cleanCompiledBytecode.length);
    console.log('Clean onchain bytecode (first 100 chars):', cleanOnchainBytecode.substring(0, 100));
    console.log('Clean compiled bytecode (first 100 chars):', cleanCompiledBytecode.substring(0, 100));

    // Try different comparison methods
    const isVerified1 = cleanCompiledBytecode.includes(cleanOnchainBytecode);
    const isVerified2 = cleanOnchainBytecode.includes(cleanCompiledBytecode);
    const isVerified3 = cleanCompiledBytecode === cleanOnchainBytecode;
    
    // Additional check: compare the first part of both bytecodes
    const minLength = Math.min(cleanOnchainBytecode.length, cleanCompiledBytecode.length);
    const onchainStart = cleanOnchainBytecode.substring(0, minLength);
    const compiledStart = cleanCompiledBytecode.substring(0, minLength);
    const isVerified4 = onchainStart === compiledStart;
    
    const isVerified = isVerified1 || isVerified2 || isVerified3 || isVerified4;

    console.log('Verification results:', { isVerified1, isVerified2, isVerified3, isVerified4, isVerified });

    if (isVerified) {
      // Save to database
      const contractData = {
        address: address.toLowerCase(),
        contractName: actualContractName,
        compilerVersion,
        optimization: optimization || false,
        sourceCode: cleanedSourceCode,
        abi: JSON.stringify(compiledContract.abi),
        byteCode: onchainBytecode,
        verified: true,
        verifiedAt: new Date()
      };

      await Contract.findOneAndUpdate(
        { address: address.toLowerCase() },
        contractData,
        { upsert: true, new: true }
      );

      return NextResponse.json({
        verified: true,
        contract: contractData,
        message: 'Contract successfully verified'
      });
    } else {
      return NextResponse.json({
        verified: false,
        message: 'Bytecode mismatch - verification failed',
        debug: {
          originalOnchainBytecodeLength: onchainBytecode.length,
          originalCompiledBytecodeLength: compiledBytecode.length,
          cleanOnchainBytecodeLength: cleanOnchainBytecode.length,
          cleanCompiledBytecodeLength: cleanCompiledBytecode.length,
          onchainBytecodeStart: cleanOnchainBytecode.substring(0, 100),
          compiledBytecodeStart: cleanCompiledBytecode.substring(0, 100),
          comparisonResults: { isVerified1, isVerified2, isVerified3, isVerified4 }
        },
        onchainBytecode: cleanOnchainBytecode.substring(0, 100) + '...',
        compiledBytecode: cleanCompiledBytecode.substring(0, 100) + '...'
      });
    }

  } catch (error) {
    console.error('Contract verification error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined
      },
      { status: 500 }
    );
  }
} 