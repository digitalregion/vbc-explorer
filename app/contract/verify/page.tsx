'use client';

import Header from '../../components/Header';
import { useState, useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, CodeBracketIcon } from '@heroicons/react/24/outline';

interface VerificationResult {
  verified: boolean;
  contract?: {
    address: string;
    contractName: string;
    compilerVersion: string;
    optimization: boolean;
    sourceCode: string;
    abi: string;
    byteCode: string;
    verified: boolean;
    verifiedAt: string;
  };
  message: string;
  error?: string;
  details?: {
    originalOnchainBytecodeLength: number;
    originalCompiledBytecodeLength: number;
    cleanOnchainBytecodeLength: number;
    cleanCompiledBytecodeLength: number;
    onchainBytecodeStart: string;
    compiledBytecodeStart: string;
    comparisonResults: {
      isVerified1: boolean;
      isVerified2: boolean;
      isVerified3: boolean;
      isVerified4: boolean;
    };
  };
}

export default function ContractVerifyPage() {
  const [formData, setFormData] = useState<{
    address: string;
    contractName: string;
    compilerVersion: string;
    optimization: boolean;
    sourceCode: string;
  }>({
    address: '',
    contractName: '',
    compilerVersion: 'latest',
    optimization: false,
    sourceCode: ''
  });

  // Get URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const address = urlParams.get('address');
    const contractName = urlParams.get('contractName');
    
    if (address) {
      setFormData(prev => ({ ...prev, address }));
    }
    if (contractName) {
      setFormData(prev => ({ ...prev, contractName }));
    }
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/contract/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        verified: false,
        message: 'Verification failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Auto-detect contract name from source code
    if (field === 'sourceCode' && typeof value === 'string') {
      const contractMatches = value.match(/contract\s+([A-Za-z0-9_]+)/g);
      if (contractMatches && contractMatches.length > 0) {
        // For flattened contracts, use the last contract (usually the main contract)
        const lastContractMatch = contractMatches[contractMatches.length - 1];
        const detectedName = lastContractMatch.replace(/contract\s+/, '');
        
        // Only update if no contract name is set or if it's different
        if (!formData.contractName || formData.contractName !== detectedName) {
          setFormData(prev => ({
            ...prev,
            contractName: detectedName
          }));
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      {/* トップの帯は全幅 */}
      <div className="bg-gray-800 border-b border-gray-700 w-full">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <CodeBracketIcon className="w-8 h-8 text-purple-400" />
            <h1 className="text-3xl font-bold text-gray-100">Verify Contract Source Code</h1>
          </div>
          <p className="text-gray-400">Verify and publish your smart contract source code on the VirBiCoin blockchain explorer.</p>
        </div>
      </div>
      {/* カード部分は中央寄せ */}
      <main className="container mx-auto px-4 py-8">
        <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-xl">
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Contract Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Contract Name</label>
                <input
                  type="text"
                  value={formData.contractName}
                  onChange={(e) => handleInputChange('contractName', e.target.value)}
                  placeholder="MyContract"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Compiler Version</label>
                <select
                  value={formData.compilerVersion}
                  onChange={(e) => handleInputChange('compilerVersion', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="latest">Latest (0.8.30)</option>
                  <option value="0.8.30">0.8.30</option>
                  <option value="0.8.29">0.8.29</option>
                  <option value="0.8.28">0.8.28</option>
                  <option value="0.8.27">0.8.27</option>
                  <option value="0.8.26">0.8.26</option>
                  <option value="0.8.25">0.8.25</option>
                  <option value="0.8.24">0.8.24</option>
                  <option value="0.8.23">0.8.23</option>
                  <option value="0.8.22">0.8.22</option>
                  <option value="0.8.21">0.8.21</option>
                  <option value="0.8.20">0.8.20</option>
                  <option value="0.8.19">0.8.19</option>
                  <option value="0.8.18">0.8.18</option>
                  <option value="0.8.17">0.8.17</option>
                  <option value="0.8.16">0.8.16</option>
                  <option value="0.8.15">0.8.15</option>
                </select>
              </div>
              <div className="flex items-center mt-6 md:mt-0">
                <input
                  type="checkbox"
                  id="optimization"
                  checked={formData.optimization}
                  onChange={(e) => handleInputChange('optimization', e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="optimization" className="ml-2 text-sm text-gray-300">Enable Optimization</label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Source Code</label>
              <div className="text-xs text-gray-400 mb-2">
                Paste your complete Solidity source code. The system will automatically clean up any trailing content that doesn&apos;t belong to the contract.
                <br />
                <span className="text-blue-400">💡 Tip: For flattened contracts (Hardhat flattened), the system will automatically extract the main contract.</span>
              </div>
              <textarea
                value={formData.sourceCode}
                onChange={(e) => handleInputChange('sourceCode', e.target.value)}
                placeholder={"// SPDX-License-Identifier: MIT\npragma solidity ^0.8.28;\n\ncontract MyContract {\n  // Your contract code here\n}"}
                rows={15}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                required
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-lg font-bold shadow"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Verifying...
                  </>
                ) : (
                  'Verify Contract'
                )}
              </button>
            </div>
          </form>
          {result && (
            <div className="px-8 pb-8">
              <div className={`mt-6 p-6 rounded-lg border shadow-lg ${
                result.verified 
                  ? 'bg-green-900/20 border-green-600 text-green-400' 
                  : 'bg-red-900/20 border-red-600 text-red-400'
              }`}>
                <div className="flex items-center gap-3 mb-2">
                  {result.verified ? (
                    <CheckCircleIcon className="w-6 h-6 text-green-400" />
                  ) : (
                    <XCircleIcon className="w-6 h-6 text-red-400" />
                  )}
                  <span className="text-lg font-semibold">
                    {result.verified ? 'Verification Successful' : 'Verification Failed'}
                  </span>
                </div>
                <p className="text-base">{result.message}</p>
                {result.contract?.compilerVersion && (
                  <div className="mt-2 text-sm text-gray-300">
                    <span className="font-bold">Compiler Version: </span>
                    <span>{result.contract.compilerVersion}</span>
                  </div>
                )}
                {result.error && (
                  <div className="mt-2 p-2 bg-gray-800 rounded text-xs">
                    <strong>Error:</strong> {result.error}
                    {result.message && (
                      <div className="mt-1 text-gray-300">{result.message}</div>
                    )}
                    {result.details && (
                      <div className="mt-2 p-2 bg-gray-700 rounded">
                        <strong>Compilation Errors:</strong>
                        <div className="mt-2 space-y-2">
                          {Array.isArray(result.details) ? result.details.map((error: {
                            type: string;
                            message: string;
                            sourceLocation?: {
                              file: string;
                              start: number;
                              end: number;
                            };
                            formattedMessage?: string;
                          }, index: number) => (
                            <div key={index} className="p-2 bg-red-900/20 border border-red-600 rounded">
                              <div className="font-medium text-red-400">{error.type}: {error.message}</div>
                              {error.sourceLocation && (
                                <div className="text-xs text-gray-400 mt-1">
                                  File: {error.sourceLocation.file}, Line: {error.sourceLocation.start}-{error.sourceLocation.end}
                                </div>
                              )}
                              {error.formattedMessage && (
                                <div className="text-xs text-gray-400 mt-1">
                                  {error.formattedMessage}
                                </div>
                              )}
                            </div>
                          )) : null}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-100 mb-4">How Contract Verification Works</h2>
          <div className="space-y-4 text-gray-300">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                1
              </div>
              <div>
                <h3 className="font-medium text-gray-200">Compile Source Code</h3>
                <p className="text-sm text-gray-400">Your Solidity source code is compiled using the specified compiler version and optimization settings.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                2
              </div>
              <div>
                <h3 className="font-medium text-gray-200">Compare Bytecode</h3>
                <p className="text-sm text-gray-400">The compiled bytecode is compared with the bytecode stored on the blockchain at the specified address.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                3
              </div>
              <div>
                <h3 className="font-medium text-gray-200">Verify Match</h3>
                <p className="text-sm text-gray-400">If the bytecodes match, the contract is marked as verified and the source code is published on the explorer.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 