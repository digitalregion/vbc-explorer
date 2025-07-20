import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Contract } from '../../../../models/index';
import Web3 from 'web3';
import solc from 'solc';
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

const config = readConfig();
const WEB3_PROVIDER_URL = process.env.WEB3_PROVIDER_URL || `http://${config.nodeAddr}:${config.port}`;
const web3 = new Web3(new Web3.providers.HttpProvider(WEB3_PROVIDER_URL));



// Helper function to modernize old Solidity syntax
function modernizeSyntax(sourceCode: string): string {
  let modernized = sourceCode;
  
  // Replace := with = (assignment operator)
  modernized = modernized.replace(/:=/g, '=');
  
  // Replace var with appropriate types where possible
  modernized = modernized.replace(/var\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g, 'uint256 $1 =');
  
  // Replace suicide with selfdestruct
  modernized = modernized.replace(/suicide\(/g, 'selfdestruct(');
  
  // Replace throw with revert
  modernized = modernized.replace(/\bthrow\b/g, 'revert()');
  
  return modernized;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    

    
    const body = await request.json();
    const { address, sourceCode, compilerVersion, contractName, optimization } = body;

    if (!address || !sourceCode || !compilerVersion) {
      return NextResponse.json(
        { error: 'Missing required fields: address, sourceCode, compilerVersion' },
        { status: 400 }
      );
    }

    // Auto-detect contract name if not provided
    let detectedContractName = contractName;
    if (!detectedContractName) {
      const contractMatches = sourceCode.match(/contract\s+([A-Za-z0-9_]+)/g);
      if (contractMatches && contractMatches.length > 0) {
        // Extract the last contract name (usually the main contract in flattened code)
        const lastContractMatch = contractMatches[contractMatches.length - 1];
        detectedContractName = lastContractMatch.replace(/contract\s+/, '');
      } else {
        return NextResponse.json(
          { error: 'No contract found in source code. Please provide a contract name.' },
          { status: 400 }
        );
      }
    }

    // Auto-detect compiler version if needed
    let detectedCompilerVersion = compilerVersion;
    if (compilerVersion === 'latest' || !compilerVersion) {
      // Check for pragma statements to determine appropriate compiler version
      const pragmaMatches = sourceCode.match(/pragma\s+solidity\s+([^;]+);/g);
      if (pragmaMatches && pragmaMatches.length > 0) {
        const pragmaMatch = pragmaMatches[0];
        const versionMatch = pragmaMatch.match(/pragma\s+solidity\s+([^;]+);/);
        if (versionMatch && versionMatch[1]) {
          detectedCompilerVersion = versionMatch[1].trim();
        }
      }
    }

    // Check for old syntax that requires older compiler versions
    const hasOldSyntax = sourceCode.includes(':=') || sourceCode.includes('var ') || sourceCode.includes('suicide(') || 
                         sourceCode.includes('throw') || sourceCode.includes('constant ') || sourceCode.includes('public constant');
    if (hasOldSyntax && detectedCompilerVersion === 'latest') {
      // Use an older compiler version for old syntax
      detectedCompilerVersion = '0.8.19';
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
    
    // Check if this is a flattened contract (contains multiple contracts)
    const isFlattened = (cleanedSourceCode.match(/contract\s+[A-Za-z0-9_]+/g) || []).length > 1;
    
    if (isFlattened) {
      // For flattened contracts, we need to extract the main contract and its dependencies
      
      // First, find all contracts in the source code
      const allContracts = [];
      const contractRegex = /(?:abstract\s+)?contract\s+([A-Za-z0-9_]+)\s*\{[\s\S]*?\n\}/g;
      let match;
      
      while ((match = contractRegex.exec(cleanedSourceCode)) !== null) {
        const contractName = match[1];
        const contractCode = match[0];
        allContracts.push({ name: contractName, code: contractCode });
      }
      
      // Find the main contract
      const mainContract = allContracts.find(c => c.name === detectedContractName);
      
      if (mainContract) {
        // Extract all dependencies (pragma, imports, using statements)
        const dependencies = [];
        
        // Extract pragma statements
        const pragmaMatches = cleanedSourceCode.match(/pragma\s+solidity[^;]+;/g) || [];
        dependencies.push(...pragmaMatches);
        
        // Extract import statements
        const importMatches = cleanedSourceCode.match(/import\s+[^;]+;/g) || [];
        dependencies.push(...importMatches);
        
        // Extract using statements
        const usingMatches = cleanedSourceCode.match(/using\s+[^;]+;/g) || [];
        dependencies.push(...usingMatches);
        
        // Extract library declarations
        const libraryMatches = cleanedSourceCode.match(/library\s+[A-Za-z0-9_]+\s*\{[\s\S]*?\n\}/g) || [];
        dependencies.push(...libraryMatches);
        
        // Extract interface declarations
        const interfaceMatches = cleanedSourceCode.match(/interface\s+[A-Za-z0-9_]+\s*\{[\s\S]*?\n\}/g) || [];
        dependencies.push(...interfaceMatches);
        
        // Add all other contracts as dependencies
        const otherContracts = allContracts.filter(c => c.name !== detectedContractName);
        otherContracts.forEach(c => dependencies.push(c.code));
        
        // Combine dependencies and the main contract
        cleanedSourceCode = [
          ...dependencies,
          mainContract.code
        ].join('\n\n');
      } else {
        // Use the last contract if main contract not found
        if (allContracts.length > 0) {
          const lastContract = allContracts[allContracts.length - 1];
          
          // Extract dependencies
          const dependencies = [];
          
          // Extract pragma statements
          const pragmaMatches = cleanedSourceCode.match(/pragma\s+solidity[^;]+;/g) || [];
          dependencies.push(...pragmaMatches);
          
          // Extract import statements
          const importMatches = cleanedSourceCode.match(/import\s+[^;]+;/g) || [];
          dependencies.push(...importMatches);
          
          // Extract using statements
          const usingMatches = cleanedSourceCode.match(/using\s+[^;]+;/g) || [];
          dependencies.push(...usingMatches);
          
          // Extract library declarations
          const libraryMatches = cleanedSourceCode.match(/library\s+[A-Za-z0-9_]+\s*\{[\s\S]*?\n\}/g) || [];
          dependencies.push(...libraryMatches);
          
          // Extract interface declarations
          const interfaceMatches = cleanedSourceCode.match(/interface\s+[A-Za-z0-9_]+\s*\{[\s\S]*?\n\}/g) || [];
          dependencies.push(...interfaceMatches);
          
          // Add all other contracts as dependencies
          const otherContracts = allContracts.filter(c => c.name !== lastContract.name);
          otherContracts.forEach(c => dependencies.push(c.code));
          
          // Combine dependencies and the last contract
          cleanedSourceCode = [
            ...dependencies,
            lastContract.code
          ].join('\n\n');
        }
      }
      
      // If still no contract found, use the original source code
      if (!cleanedSourceCode || cleanedSourceCode.trim().length === 0) {
        cleanedSourceCode = sourceCode;
      }
    } else {
      // Original logic for single contracts
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
    }
    
    // Additional cleanup: remove any remaining problematic content
    cleanedSourceCode = cleanedSourceCode.replace(/\n\s*\n\s*\n/g, '\n\n'); // Remove excessive newlines
    cleanedSourceCode = cleanedSourceCode.replace(/[^\x00-\x7F]/g, ''); // Remove non-ASCII characters
    
    // Modernize old Solidity syntax
    cleanedSourceCode = modernizeSyntax(cleanedSourceCode);
    
    console.log('📏 Original source code length:', sourceCode.length);
    console.log('📏 Cleaned source code length:', cleanedSourceCode.length);

    // Compile source code
    const input = {
      language: 'Solidity',
      sources: {
        [detectedContractName]: {
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
      if (detectedCompilerVersion === 'latest') {
        compiledOutput = JSON.parse(solc.compile(JSON.stringify(input)));
      } else {
        // Try to load specific compiler version, fallback to latest if failed
        try {
        const solcVersion = await new Promise<unknown>((resolve, reject) => {
            solc.loadRemoteVersion(detectedCompilerVersion, (err: Error | null, solcV: unknown) => {
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
        } catch (versionError) {
          console.log('⚠️ Failed to load specific compiler version, falling back to latest:', versionError);
          // Fallback to latest version
          compiledOutput = JSON.parse(solc.compile(JSON.stringify(input)));
        }
      }
    } catch (compileError) {
      console.error('❌ Compilation error:', compileError);
      
      // Format compilation errors for better display
      let errorDetails = compileError;
      if (typeof compileError === 'string') {
        errorDetails = { message: compileError };
      } else if (compileError instanceof Error) {
        errorDetails = { 
          message: compileError.message,
          stack: compileError.stack 
        };
      }
      
      return NextResponse.json(
        { 
          error: 'Compilation failed', 
          details: errorDetails,
          message: 'The source code could not be compiled. Please check the syntax and try again.'
        },
        { status: 400 }
      );
    }

    // Check for compilation errors
    if (compiledOutput.errors) {
      const errors = compiledOutput.errors.filter((error: { severity: string }) => error.severity === 'error');
      const warnings = compiledOutput.errors.filter((error: { severity: string }) => error.severity === 'warning');
      
      console.log('⚠️ Compilation warnings:', warnings.length);
      console.log('❌ Compilation errors:', errors.length);
      
      if (errors.length > 0) {
        // Format errors for better display
        const formattedErrors = errors.map((error: { type?: string; message?: string; sourceLocation?: unknown; formattedMessage?: string; severity?: string }) => ({
          type: error.type || 'CompilationError',
          message: error.message || 'Unknown compilation error',
          sourceLocation: error.sourceLocation,
          formattedMessage: error.formattedMessage,
          severity: error.severity
        }));
        
        return NextResponse.json(
          { 
            error: 'Compilation errors', 
            details: formattedErrors,
            message: `Found ${errors.length} compilation error(s). Please fix the issues and try again.`
          },
          { status: 400 }
        );
      }
    }

    // Find the compiled contract
    console.log('Available contracts:', Object.keys(compiledOutput.contracts || {}));
    
    let compiledContract = null;
    const actualContractName = detectedContractName; // 検出されたコントラクト名を優先
    
    // Check if compiledOutput.contracts exists and has content
    if (!compiledOutput.contracts || Object.keys(compiledOutput.contracts).length === 0) {
      return NextResponse.json(
        { 
          error: 'No contracts found in compilation output',
          message: 'The source code could not be compiled successfully. Please check the syntax and try again.',
          debug: {
            detectedContractName,
            compilationOutput: compiledOutput
          }
        },
        { status: 400 }
      );
    }
    
    // Try exact match first
    if (compiledOutput.contracts[detectedContractName] && compiledOutput.contracts[detectedContractName][detectedContractName]) {
      compiledContract = compiledOutput.contracts[detectedContractName][detectedContractName];
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
          message: `The contract '${detectedContractName}' was not found in the compilation output. Please check the contract name and try again.`,
          debug: {
            requestedContractName: detectedContractName,
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
          onchainBytecodeStart: cleanOnchainBytecode.substring(0, 100) + '...',
          compiledBytecodeStart: cleanCompiledBytecode.substring(0, 100) + '...',
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