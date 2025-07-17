'use client';

import Header from '../../components/Header';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  UsersIcon,
  CubeIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  CodeBracketIcon,
  HashtagIcon,
  ClipboardDocumentIcon,
  ClockIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

interface NFTData {
  nft: {
    address: string;
    name: string;
    symbol: string;
    type: string;
    decimals: number;
    totalSupply: string;
    totalSupplyRaw: string;
    description: string;
    floorPrice: string;
    volume24h: string;
    creator: string;
  };
  contract: {
    verified: boolean;
    compiler: string | null;
    language: string | null;
    name: string;
    sourceCode: string | null;
    bytecode: string | null;
    compilerVersion?: string; // 追加
    metadataVersion?: string; // 追加
  };
  statistics: {
    holders: number;
    totalTransfers: number;
    transfers24h: number;
    age: number;
    marketCap: string;
  };
  holders: Array<{
    rank: number;
    address: string;
    balance: string;
    balanceRaw: string;
    percentage: string;
    tokenIds?: number[];
  }>;
  transfers: Array<{
    hash: string;
    from: string;
    to: string;
    tokenId: string;
    timestamp: Date;
    timeAgo: string;
  }>;
}

interface TokenMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  tokenURI: string;
  createdAt?: string; // NFT creation timestamp from metadata
}

interface ImageLoadState {
  [tokenId: number]: 'loading' | 'loaded' | 'error' | 'initial';
}

export default function NFTDetailPage({ params }: { params: Promise<{ address: string }> }) {
  const [nftData, setNftData] = useState<NFTData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('balance');
  const [balanceAddress, setBalanceAddress] = useState<string>('');
  const [balanceResult, setBalanceResult] = useState<{
    address: string;
    balance: string;
    percentage: string;
    rank: number | null;
  } | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [tokenMetadata, setTokenMetadata] = useState<Record<number, TokenMetadata>>({});
  const [metadataLoading, setMetadataLoading] = useState<Record<number, boolean>>({});
  const [imageLoadState, setImageLoadState] = useState<ImageLoadState>({});
  const [copiedAddress, setCopiedAddress] = useState(false);
  const tokenIdsSectionRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    async function getAddress() {
      const resolvedParams = await params;
      setAddress(resolvedParams.address);
    }
    getAddress();
  }, [params]);

  useEffect(() => {
    if (!address) return;

    async function fetchNFTData() {
      try {
        setLoading(true);
        const response = await fetch(`/api/nft/${address}`);

        if (!response.ok) {
          throw new Error('Failed to fetch NFT data');
        }

        const data = await response.json();
        setNftData(data);
      } catch (err) {
        console.error('Error fetching NFT data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchNFTData();
  }, [address]);

  const fetchTokenMetadata = useCallback(async (tokenId: number) => {
    if (tokenMetadata[tokenId] || metadataLoading[tokenId]) return;

    setMetadataLoading(prev => ({ ...prev, [tokenId]: true }));
    
    try {
      const response = await fetch(`/api/nft/${address}/metadata/${tokenId}`);
      
      if (!response.ok) {
        console.warn(`❌ Metadata fetch failed - Token ${tokenId}: HTTP ${response.status}`);
        return;
      }

      const data = await response.json();
      setTokenMetadata(prev => ({ 
        ...prev, 
        [tokenId]: data.metadata 
      }));
      
      // Initialize image state when metadata is loaded
      setImageLoadState(prev => ({ ...prev, [tokenId]: 'initial' }));
      
    } catch (error) {
      console.error(`❌ Metadata fetch error - Token ${tokenId}:`, error);
    } finally {
      setMetadataLoading(prev => ({ ...prev, [tokenId]: false }));
    }
  }, [address, tokenMetadata, metadataLoading]);

  const checkBalance = async () => {
    if (!balanceAddress || !nftData) return;

    setBalanceLoading(true);
    try {
      // Find balance for the address in holders data
      const holder = nftData.holders.find(h =>
        h.address.toLowerCase() === balanceAddress.toLowerCase()
      );

      if (holder) {
        setBalanceResult({
          address: balanceAddress,
          balance: holder.balance,
          percentage: holder.percentage,
          rank: holder.rank
        });
      } else {
        setBalanceResult({
          address: balanceAddress,
          balance: '0',
          percentage: '0.00',
          rank: null
        });
      }
    } catch (err) {
      console.error('Error checking balance:', err);
      setBalanceResult(null);
    } finally {
      setBalanceLoading(false);
    }
  };

  const copyAddressToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const tabs = [
    { id: 'balance', label: 'Get Balance', icon: UsersIcon },
    { id: 'transfers', label: 'Token Transfers', icon: ArrowPathIcon },
    { id: 'transactions', label: 'Contract Transactions', icon: DocumentTextIcon },
    { id: 'source', label: 'Contract Source', icon: CodeBracketIcon },
    { id: 'tokenids', label: 'VRC-721 TokenIDs', icon: HashtagIcon }
  ];

  // Load metadata when tokenids tab is active and we have NFT data
  useEffect(() => {
    if (activeTab === 'tokenids' && nftData && nftData.holders) {
      const allTokenIds = nftData.holders.flatMap(holder => holder.tokenIds || []);
      allTokenIds.forEach(tokenId => {
        if (!tokenMetadata[tokenId] && !metadataLoading[tokenId]) {
          fetchTokenMetadata(tokenId);
        }
      });
    }
  }, [activeTab, nftData, address, fetchTokenMetadata, metadataLoading, tokenMetadata]);



  // スクロール用useEffect
  useEffect(() => {
    if (activeTab === 'tokenids' && tokenIdsSectionRef.current) {
      // 100ms遅延してからスクロール（よりふわっと感を出す）
      const timer = setTimeout(() => {
        tokenIdsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'balance':
        return (
          <div className='space-y-4'>
            <div className='flex flex-col sm:flex-row gap-4'>
              <input
                type='text'
                placeholder='Enter wallet address to check balance'
                className='flex-1 bg-gray-700 border border-gray-600 text-gray-200 rounded px-4 py-2 focus:border-blue-500 focus:outline-none'
                value={balanceAddress}
                onChange={(e) => setBalanceAddress(e.target.value)}
              />
              <button
                onClick={checkBalance}
                disabled={balanceLoading || !balanceAddress}
                className='px-6 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white rounded transition-colors'
              >
                {balanceLoading ? 'Checking...' : 'Check Balance'}
              </button>
            </div>

            {balanceResult && (
              <div className='bg-gray-700/50 rounded-lg p-4 border border-gray-600'>
                <h4 className='text-lg font-semibold text-gray-100 mb-3'>Balance Result</h4>
                <div className='space-y-2'>
                  <div className='flex justify-between'>
                    <span className='text-gray-400'>Address:</span>
                    <span className='text-blue-400 font-mono text-sm'>{balanceResult.address}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-gray-400'>NFT Balance:</span>
                    <span className='text-green-400 font-bold'>{balanceResult.balance} {nftData?.nft.symbol}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-gray-400'>Percentage of Supply:</span>
                    <span className='text-purple-400'>{balanceResult.percentage}%</span>
                  </div>
                  {balanceResult.rank && (
                    <div className='flex justify-between'>
                      <span className='text-gray-400'>Holder Rank:</span>
                      <span className='text-yellow-400'>#{balanceResult.rank}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case 'transfers':
        return (
          <div className='space-y-4'>
            <h4 className='text-lg font-semibold text-gray-100'>Recent Transfers</h4>
            {nftData?.transfers && nftData.transfers.length > 0 ? (
              <div className='overflow-x-auto'>
                <table className='w-full'>
                  <thead>
                    <tr className='border-b border-gray-600'>
                      <th className='text-left py-2 text-gray-400'>Tx Hash</th>
                      <th className='text-left py-2 text-gray-400'>From</th>
                      <th className='text-left py-2 text-gray-400'>To</th>
                      <th className='text-left py-2 text-gray-400'>Token ID</th>
                      <th className='text-left py-2 text-gray-400'>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nftData.transfers.map((transfer, index) => (
                      <tr key={index} className='border-b border-gray-700/50'>
                        <td className='py-2'>
                          <Link href={`/tx/${transfer.hash}`} className='text-blue-400 hover:text-blue-300 font-mono text-sm'>
                            {transfer.hash.slice(0, 8)}...{transfer.hash.slice(-8)}
                          </Link>
                        </td>
                        <td className='py-2'>
                          <Link href={`/address/${transfer.from}`} className='text-blue-400 hover:text-blue-300 font-mono text-sm'>
                            {transfer.from.slice(0, 8)}...{transfer.from.slice(-8)}
                          </Link>
                        </td>
                        <td className='py-2'>
                          <Link href={`/address/${transfer.to}`} className='text-blue-400 hover:text-blue-300 font-mono text-sm'>
                            {transfer.to.slice(0, 8)}...{transfer.to.slice(-8)}
                          </Link>
                        </td>
                        <td className='py-2 text-gray-300'>{transfer.tokenId}</td>
                        <td className='py-2 text-gray-400 text-sm'>
                          <div className='flex items-center'>
                            <ClockIcon className='w-4 h-4 text-gray-400 mr-2' />
                            <div>
                              <div className='text-sm text-gray-300'>{transfer.timeAgo}</div>
                              <div className='text-xs text-gray-500'>{new Date(transfer.timestamp).toLocaleString()}</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className='text-center py-8'>
                <ArrowPathIcon className='w-12 h-12 text-gray-500 mx-auto mb-4' />
                <p className='text-gray-400'>No transfers found</p>
              </div>
            )}
          </div>
        );

      case 'transactions':
        return (
          <div className='space-y-4'>
            <h4 className='text-lg font-semibold text-gray-100'>Contract Transactions</h4>
            <div className='text-center py-8'>
              <DocumentTextIcon className='w-12 h-12 text-gray-500 mx-auto mb-4' />
              <p className='text-gray-400'>Contract transactions will be displayed here</p>
              <p className='text-gray-500 text-sm mt-2'>Feature coming soon</p>
            </div>
          </div>
        );

      case 'source':
        return (
          <div className='space-y-4'>
            <h4 className='text-lg font-semibold text-gray-100'>Contract Source Code</h4>
            <div className='bg-gray-900 rounded-lg p-4 border border-gray-600'>
              <div className='flex items-center justify-between mb-4'>
                <span className='text-gray-400'>Contract Address:</span>
                <span className='font-mono text-blue-400'>{address}</span>
              </div>

              {nftData?.contract?.verified ? (
                <div className='space-y-4'>
                  <div className='flex items-center justify-between mb-4'>
                    <div className='flex items-center gap-2'>
                      <div className='w-2 h-2 bg-green-400 rounded-full'></div>
                      <span className='text-green-400 font-medium'>Contract Verified</span>
                    </div>
                    <Link 
                      href={`/contract/status/${address}`}
                      className='text-xs text-blue-400 hover:text-blue-300 underline'
                    >
                      View Verification Details
                    </Link>
                  </div>

                  <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'>
                    <div className='bg-gray-800 rounded p-3'>
                      <div className='text-gray-400 text-sm'>Contract Name</div>
                      <div className='text-gray-200 font-medium'>{nftData.contract.name}</div>
                    </div>
                    <div className='bg-gray-800 rounded p-3'>
                      <div className='text-gray-400 text-sm'>Compiler</div>
                      <div className='text-gray-200 font-medium'>
                        {/* latestやUnknownの場合でも、実際のバージョン番号が取得できれば表示 */}
                        {(() => {
                          const compiler = nftData.contract.compiler;
                          // latestやunknownなら空文字扱い
                          if (!compiler || compiler.toLowerCase() === 'latest' || compiler.toLowerCase() === 'unknown') {
                            // contract.nameや他の情報からバージョンが取得できる場合はここで表示（例: contract.compilerVersionやcontract.metadataVersionなど）
                            // ここではcompiler以外のバージョン情報があれば優先表示する例
                            if (nftData.contract.compilerVersion && nftData.contract.compilerVersion !== 'latest' && nftData.contract.compilerVersion !== 'unknown') {
                              return nftData.contract.compilerVersion;
                            }
                            // それもなければ"-"
                            return '-';
                          }
                          return compiler;
                        })()}
                      </div>
                    </div>
                    <div className='bg-gray-800 rounded p-3'>
                      <div className='text-gray-400 text-sm'>Language</div>
                      <div className='text-gray-200 font-medium'>{nftData.contract.language}</div>
                    </div>
                  </div>

                  <div className='bg-gray-950 rounded border border-gray-700 overflow-hidden'>
                    <div className='bg-gray-800 px-4 py-2 border-b border-gray-700'>
                      <span className='text-sm font-medium text-gray-300'>Contract Bytecode</span>
                    </div>
                    <pre className='p-4 overflow-x-auto text-sm text-gray-300 max-h-96 overflow-y-auto'>
                      <code className='whitespace-pre-wrap break-all'>
                        {nftData.contract.bytecode}
                      </code>
                    </pre>
                  </div>
                </div>
              ) : (
                <div className='space-y-4'>
                  <div className='flex items-center gap-2 mb-4'>
                    <div className='w-2 h-2 bg-red-400 rounded-full'></div>
                    <span className='text-red-400 font-medium'>Contract Not Verified</span>
                  </div>

                  {/* Always show bytecode */}
                  <div className='bg-gray-950 rounded border border-gray-700 overflow-hidden'>
                    <div className='bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center justify-between'>
                      <span className='text-sm font-medium text-gray-300'>Contract Bytecode</span>
                      <div className='flex items-center gap-2'>
                        <span className='text-xs text-gray-400'>Contract Address: {address}</span>
                        <span className='text-xs text-gray-400'>Token: {nftData?.nft?.name || 'Unknown'}</span>
                      </div>
                    </div>
                    <pre className='p-4 overflow-x-auto text-sm text-gray-300 max-h-96 overflow-y-auto'>
                      <code className='whitespace-pre-wrap break-all'>
                        {nftData?.contract?.bytecode || '0x'}
                      </code>
                    </pre>
                  </div>

                  {/* Verify & Push Button */}
                  <div className='bg-gray-800 rounded-lg p-6 border border-gray-600'>
                    <div className='text-center'>
                      <CodeBracketIcon className='w-12 h-12 text-gray-500 mx-auto mb-4' />
                      <h3 className='text-lg font-semibold text-gray-100 mb-2'>Verify Contract Source Code</h3>
                      <p className='text-gray-400 text-sm mb-6'>
                        Verify and publish the source code for this contract to make it readable and auditable.
                      </p>
                      
                      <div className='flex flex-col sm:flex-row gap-3 justify-center'>
                        <Link 
                          href={`/contract/verify?address=${address}&contractName=${nftData?.nft?.name?.replace(/\s+/g, '') || 'NFTContract'}`}
                          className='inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors'
                        >
                          <CodeBracketIcon className='w-5 h-5' />
                          Verify & Push
                        </Link>
                        
                        <Link 
                          href={`/contract/interact?address=${address}`}
                          className='inline-flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors'
                        >
                          <PlayIcon className='w-5 h-5' />
                          Interact
                        </Link>
                      </div>
                      
                      <div className='mt-4 text-xs text-gray-500'>
                        <p>• Verify the source code to make it readable</p>
                        <p>• Interact with the contract functions</p>
                        <p>• View contract bytecode and metadata</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'tokenids':
        return (
          <div className='space-y-4'>
            <h4 ref={tokenIdsSectionRef} className='text-lg font-semibold text-gray-100'>VRC-721 Token IDs</h4>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
              {nftData?.holders && nftData.holders.length > 0 ? (
                // Collect all token IDs and sort by token ID in descending order (newest first)
                nftData.holders.flatMap((holder) =>
                  (holder.tokenIds || []).map(tokenId => ({ tokenId, holder }))
                )
                .sort((a, b) => b.tokenId - a.tokenId) // Sort by token ID descending
                .map(({ tokenId, holder }) => {
                  const metadata = tokenMetadata[tokenId];
                  const isLoading = metadataLoading[tokenId];
                  
                  return (
                    <div key={`${holder.address}-${tokenId}`} className='bg-gray-700/50 rounded-lg p-4 border border-gray-600 hover:border-gray-500 transition-colors'>
                      <div className='flex items-center justify-between mb-3'>
                        <span className='text-gray-400'>Token ID:</span>
                        <span className='text-green-400 font-bold'>#{tokenId}</span>
                      </div>
                      <div className='flex items-center justify-between mb-3'>
                        <span className='text-gray-400'>Owner:</span>
                        <Link href={`/address/${holder.address}`} className='text-blue-400 hover:text-blue-300 font-mono text-sm break-all'>
                          {holder.address}
                        </Link>
                      </div>
                      <div className='flex items-center justify-between mb-3'>
                        <span className='text-gray-400'>Rank:</span>
                        <span className='text-yellow-400'>#{holder.rank}</span>
                      </div>
                      
                      {/* NFT Image and Metadata */}
                      <div className='w-full bg-gray-800 rounded border border-gray-600 overflow-hidden'>
                        {isLoading ? (
                          <div className='h-48 flex items-center justify-center'>
                            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500'></div>
                          </div>
                        ) : metadata ? (
                          <div>
                            {metadata.image ? (
                              <div className='relative h-48 w-full overflow-hidden'>
                                {/* Loading state */}
                                {imageLoadState[tokenId] === 'loading' && (
                                  <div className='absolute inset-0 flex items-center justify-center bg-gray-800 z-15'>
                                    <div className='text-center'>
                                      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2'></div>
                                      <span className='text-xs text-gray-400'>Loading image...</span>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Error state */}
                                {imageLoadState[tokenId] === 'error' && (
                                  <div className='absolute inset-0 flex items-center justify-center bg-red-900/20 z-15'>
                                    <div className='text-center'>
                                      <HashtagIcon className='w-8 h-8 text-red-400 mx-auto mb-1' />
                                      <span className='text-xs text-red-400'>Load failed</span>
                                      <div className='text-xs text-gray-500 mt-1 px-2 break-all'>
                                        {metadata.image}
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Main image with link */}
                                <a 
                                  href={metadata.image} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className='block w-full h-full hover:opacity-90 transition-opacity cursor-pointer'
                                  title='Click to view original image'
                                >
                                  <Image
                                    src={metadata.image}
                                    alt={metadata.name || `Token #${tokenId}`}
                                    layout='fill'
                                    objectFit='cover'
                                    className={`w-full h-full object-cover z-10 ${
                                      imageLoadState[tokenId] === 'loaded' ? 'opacity-100' : 'opacity-0'
                                    }`}
                                                                      onLoadStart={() => {
                                    setImageLoadState(prev => ({ ...prev, [tokenId]: 'loading' }));
                                  }}
                                  onLoad={() => {
                                    setImageLoadState(prev => ({ ...prev, [tokenId]: 'loaded' }));
                                  }}
                                  onError={() => {
                                    setImageLoadState(prev => ({ ...prev, [tokenId]: 'error' }));
                                  }}
                                  />
                                </a>
                                
                                {/* Default fallback when no specific state */}
                                {(!imageLoadState[tokenId] || imageLoadState[tokenId] === 'initial') && (
                                  <div className='absolute inset-0 flex items-center justify-center bg-gray-800 z-5'>
                                    <div className='text-center'>
                                      <HashtagIcon className='w-8 h-8 text-gray-500 mx-auto mb-1' />
                                      <span className='text-xs text-gray-500'>NFT #{tokenId}</span>
                                      <span className='text-xs text-yellow-400 block mt-1'>Waiting...</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className='h-48 flex items-center justify-center'>
                                <div className='text-center'>
                                  <HashtagIcon className='w-8 h-8 text-gray-500 mx-auto mb-1' />
                                  <span className='text-xs text-gray-500'>NFT #{tokenId}</span>
                                </div>
                              </div>
                            )}
                            
                            {/* Metadata Info */}
                            <div className='p-3 bg-gray-800/50'>
                              <h5 className='font-semibold text-gray-100 text-sm mb-1'>
                                {metadata.name || `Token #${tokenId}`}
                              </h5>
                              {metadata.description && (
                                <p className='text-xs text-gray-400 line-clamp-2 mb-2'>
                                  {metadata.description}
                                </p>
                              )}
                              
                              {/* Metadata info */}
                              <div className='text-xs text-gray-500 mb-2 space-y-1'>
                                {metadata.createdAt && (
                                  <div className='flex items-center gap-1'>
                                    <ClockIcon className='w-3 h-3' />
                                    <span>Created: {new Date(metadata.createdAt).toLocaleString()}</span>
                                  </div>
                                )}
                                <div className='break-all'>
                                  Metadata: <a 
                                    href={metadata.tokenURI} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className='text-blue-400 hover:text-blue-300'
                                  >
                                    {metadata.tokenURI}
                                  </a>
                                </div>
                              </div>
                              
                              {metadata.attributes && metadata.attributes.length > 0 && (
                                <div className='flex flex-wrap gap-1'>
                                  {metadata.attributes.slice(0, 2).map((attr, index) => (
                                    <span 
                                      key={index}
                                      className='text-xs bg-blue-600/20 text-blue-300 px-2 py-1 rounded'
                                    >
                                      {attr.trait_type}: {attr.value}
                                    </span>
                                  ))}
                                  {metadata.attributes.length > 2 && (
                                    <span className='text-xs text-gray-500'>
                                      +{metadata.attributes.length - 2} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className='h-48 flex items-center justify-center'>
                            <div className='text-center'>
                              <HashtagIcon className='w-8 h-8 text-gray-500 mx-auto mb-1' />
                              <span className='text-xs text-gray-500'>NFT #{tokenId}</span>
                              <p className='text-xs text-red-400 mt-1'>Metadata unavailable</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className='col-span-full text-center py-8'>
                  <HashtagIcon className='w-12 h-12 text-gray-500 mx-auto mb-4' />
                  <p className='text-gray-400'>No token IDs found</p>
                </div>
              )}
            </div>
            <div className='text-center mt-4'>
              <p className='text-gray-500 text-sm'>
                Total NFTs in collection: {nftData?.nft.totalSupply || '0'}
              </p>
              <p className='text-gray-500 text-sm'>
                Showing all {nftData?.holders?.flatMap(h => h.tokenIds || []).length || 0} token IDs
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className='container mx-auto px-4 py-8'>
          <div className='animate-pulse'>
            <div className='h-8 bg-gray-700 rounded mb-4'></div>
            <div className='h-64 bg-gray-700 rounded'></div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <div className='container mx-auto px-4 py-8'>
          <div className='text-red-400'>Error: {error}</div>
        </div>
      </>
    );
  }

  if (!nftData) {
    return (
      <>
        <Header />
        <div className='container mx-auto px-4 py-8'>
          <div className='text-gray-400'>No NFT data found</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />

      {/* Page Header */}
      <div className='page-header-container'>
        <div className='container mx-auto px-4 py-8'>
          <div className='flex items-center gap-4 mb-4'>
            <div className='w-20 h-20 bg-gray-700 border border-gray-600 rounded-lg flex items-center justify-center'>
              <Image
                src={`/img/tokens/${nftData.nft.symbol}.svg`}
                alt={`${nftData.nft.symbol} logo`}
                width={56}
                height={56}
                className='rounded'
                unoptimized
              />
            </div>
            <div>
              <div className='flex items-center gap-3 mb-2'>
                <h1 className='text-3xl font-bold text-gray-100'>{nftData.nft.name} ({nftData.nft.symbol})</h1>
                {nftData.nft.type === 'VRC-721' && (
                  <span className='px-3 py-1 bg-purple-500/20 text-purple-400 text-sm font-medium rounded-full border border-purple-500/30'>
                    VRC-721
                  </span>
                )}
              </div>
              <p className='text-gray-400'>NFT Collection on VirBiCoin Network</p>
            </div>
          </div>
        </div>
      </div>

      <main className='container mx-auto px-4 py-8'>
        {/* Collection Info Card */}
        <div className='bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6'>
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
            <div className='lg:col-span-2'>
              <h3 className='text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2'>
                <DocumentTextIcon className='w-5 h-5 text-blue-400' />
                Collection Information
              </h3>
              <div className='space-y-4'>
                <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
                  <span className='text-gray-400 font-medium min-w-[120px]'>Contract:</span>
                  <div className='flex items-center gap-2'>
                    <span className='font-mono text-blue-400 break-all'>{address}</span>
                    <button
                      onClick={copyAddressToClipboard}
                      className='p-1 text-gray-400 hover:text-blue-400 transition-colors'
                      title='Copy address to clipboard'
                    >
                      <ClipboardDocumentIcon className='w-4 h-4' />
                    </button>
                    {copiedAddress && (
                      <span className='text-green-400 text-sm'>Copied!</span>
                    )}
                  </div>
                </div>
                <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
                  <span className='text-gray-400 font-medium min-w-[120px]'>Creator:</span>
                  <Link
                    href={`/address/${nftData.nft.creator}`}
                    className='font-mono text-blue-400 hover:text-blue-300 transition-colors break-all'
                  >
                    {nftData.nft.creator}
                  </Link>
                </div>
                <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
                  <span className='text-gray-400 font-medium min-w-[120px]'>Description:</span>
                  <span className='text-gray-200'>{nftData.nft.description}</span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className='bg-gray-700/50 rounded-lg p-4 border border-gray-600/50'>
              <h4 className='text-sm font-medium text-gray-300 mb-4'>Collection Stats</h4>
              <div className='space-y-3'>
                <div className='flex justify-between items-center'>
                  <span className='text-gray-400'>Total Supply:</span>
                  <span className='text-purple-400 font-bold'>{nftData.nft.totalSupply || '0'}</span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-gray-400'>Holders:</span>
                  <span className='text-green-400 font-bold'>{nftData.statistics.holders}</span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-gray-400'>Total Transfers:</span>
                  <span className='text-blue-400 font-bold'>{nftData.statistics.totalTransfers}</span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-gray-400'>Floor Price:</span>
                  <span className='text-yellow-400 font-bold'>{nftData.nft.floorPrice} VBC</span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-gray-400'>24h Volume:</span>
                  <span className='text-blue-400 font-bold'>{nftData.nft.volume24h} VBC</span>
                </div>
                {/* View NFT Button */}
                <div className='pt-2'>
                  <button
                    onClick={() => setActiveTab('tokenids')}
                    className='w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2'
                  >
                    <CubeIcon className='w-4 h-4' />
                    View NFT Arts
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Balance Checker */}
        <div className='bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6'>
          <div className='flex items-center gap-2 mb-4'>
            <UsersIcon className='w-5 h-5 text-cyan-400' />
            <h3 className='text-lg font-semibold text-gray-100'>NFT Collection Tools</h3>
          </div>
          <p className='text-gray-400 mb-4'>Explore and interact with this NFT collection using the tools below</p>
        </div>

        {/* Tabs Section */}
        <div className='bg-gray-800 rounded-lg border border-gray-700 p-6'>
          <div className='flex flex-wrap gap-4 border-b border-gray-700 mb-6'>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 pb-3 px-2 transition-colors ${
                    activeTab === tab.id ?
                      'text-cyan-400 border-b-2 border-cyan-400' :
                      'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <Icon className='w-4 h-4' />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className='bg-gray-700/30 rounded-lg p-4 min-h-[300px]'>
            {renderTabContent()}
          </div>
        </div>

        {/* Activity Stats */}
        <div className='mt-8 grid grid-cols-1 md:grid-cols-3 gap-4'>
          <div className='bg-gray-800 rounded-lg border border-gray-700 p-4'>
            <h3 className='text-sm font-medium text-gray-300 mb-2'>24h Transfers</h3>
            <p className='text-2xl font-bold text-green-400'>{nftData.statistics.transfers24h || 0}</p>
            <p className='text-xs text-gray-400'>Token movements</p>
          </div>
          <div className='bg-gray-800 rounded-lg border border-gray-700 p-4'>
            <h3 className='text-sm font-medium text-gray-300 mb-2'>Total Transfers</h3>
            <p className='text-2xl font-bold text-blue-400'>{nftData.statistics.totalTransfers || 0}</p>
            <p className='text-xs text-gray-400'>All time transfers</p>
          </div>
          <div className='bg-gray-800 rounded-lg border border-gray-700 p-4'>
            <h3 className='text-sm font-medium text-gray-300 mb-2'>Unique Holders</h3>
            <p className='text-2xl font-bold text-purple-400'>{nftData.statistics.holders || 0}</p>
            <p className='text-xs text-gray-400'>Collection owners</p>
          </div>
        </div>
      </main>
    </>
  );
}
