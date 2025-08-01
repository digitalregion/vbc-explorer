'use client';

import Header from '../../components/Header';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  CheckCircleIcon, 
  ClipboardDocumentIcon,
  UsersIcon,
  ArrowPathIcon,
  CodeBracketIcon,
  ClockIcon,
  PlayIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';

interface TokenData {
  token: {
    address: string;
    name: string;
    symbol: string;
    type: string;
    isNFT: boolean;
    decimals: number;
    totalSupply: string;
    totalSupplyRaw: string;
    verified?: boolean;
    description?: string;
    floorPrice?: string;
    volume24h?: string;
    creator?: string;
  };
  contract?: {
    verified: boolean;
    compiler: string | null;
    language: string | null;
    name: string;
    sourceCode: string | null;
    bytecode: string | null;
    compilerVersion?: string;
    metadataVersion?: string;
  };
  statistics?: {
    holders: number;
    transfers: number;
    age: number;
    marketCap: string;
    totalTransfers?: number;
    transfers24h?: number;
  };
  holders?: Array<{
    rank: number;
    address: string;
    balance: string;
    balanceRaw: string;
    percentage: string;
    tokenIds?: number[];
  }>;
  transfers?: Array<{
    hash: string;
    from: string;
    to: string;
    value: string;
    valueRaw: string;
    timestamp: string;
    timeAgo: string;
    tokenId?: string;
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
  createdAt?: string;
}

interface ImageLoadState {
  [tokenId: number]: 'loading' | 'loaded' | 'error' | 'initial';
}

// アドレス省略表示関数（SystemやMining Rewardはそのまま表示）
const formatAddress = (address: string) => {
  if (!address) return 'N/A';
  if (address === 'System' || address === 'Mining Reward') return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
};

export default function TokenDetailPage({ params }: { params: Promise<{ address: string }> }) {
  const [address, setAddress] = useState<string>('');
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('holders');
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

  // getTransactionForTokenId function removed (unused)


  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setAddress(resolvedParams.address);
    };
    getParams();
  }, [params]);

  useEffect(() => {
    if (!address) return;

    const fetchTokenData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use the unified tokens API
        const response = await fetch(`/api/tokens/${address}`);
        
          if (!response.ok) {
            throw new Error('Failed to fetch token/NFT data');
        }
        
        const data = await response.json();
        setTokenData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchTokenData();
  }, [address]);

  // Copy address to clipboard handler
  const copyAddressToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(tokenData?.token?.address || '');
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const fetchTokenMetadata = useCallback(async (tokenId: number) => {
    if (tokenMetadata[tokenId] || metadataLoading[tokenId]) return;

    setMetadataLoading(prev => ({ ...prev, [tokenId]: true }));
    
    try {
      // Use the unified tokens API with tokenId parameter
      const response = await fetch(`/api/tokens/${address}?tokenId=${tokenId}`);
      
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
    if (!balanceAddress || !tokenData) return;

    setBalanceLoading(true);
    try {
      // Find balance for the address in holders data
      const holder = tokenData.holders?.find(h =>
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

  // Load metadata when tokenids tab is active and we have token data
  useEffect(() => {
    if (activeTab === 'tokenids' && tokenData && tokenData.holders) {
      const allTokenIds = tokenData.holders.flatMap(holder => holder.tokenIds || []);
      allTokenIds.forEach(tokenId => {
        if (!tokenMetadata[tokenId] && !metadataLoading[tokenId]) {
          fetchTokenMetadata(tokenId);
        }
      });
    }
  }, [activeTab, tokenData, address, fetchTokenMetadata, metadataLoading, tokenMetadata]);

  // スクロール用useEffect
  useEffect(() => {
    if (activeTab === 'tokenids') {
      // タブ切り替え後に少し遅延してからスクロール
      const timer = setTimeout(() => {
        const tokenIdsSection = document.querySelector('[data-tab-content="tokenids"]');
        if (tokenIdsSection) {
          const element = tokenIdsSection as HTMLElement;
          const rect = element.getBoundingClientRect();
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const targetY = scrollTop + rect.top - 120; // ヘッダー分のオフセット
          
          window.scrollTo({
            top: targetY,
            behavior: 'smooth'
          });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  // NFT固有の情報を表示するかどうかを判定
  const isNFT = tokenData?.token?.isNFT || tokenData?.token?.type === 'VRC-721';

  const tabs = [
    { id: 'holders', label: 'Token Holders', icon: UsersIcon },
    { id: 'transfers', label: 'Recent Transfers', icon: ArrowPathIcon },
    { id: 'balance', label: 'Get Balance', icon: UsersIcon },
    { id: 'source', label: 'Contract Source', icon: CodeBracketIcon },
    ...(isNFT ? [{ id: 'tokenids', label: 'NFT Collections', icon: PhotoIcon }] : [])
  ];

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
                    <span className='text-gray-400'>Token Balance:</span>
                    <span className='text-green-400 font-bold'>{balanceResult.balance} {tokenData?.token?.symbol || ''}</span>
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
            {tokenData?.transfers && tokenData.transfers.length > 0 ? (
              <div className='overflow-x-auto'>
                <table className='w-full'>
                  <thead>
                    <tr className='border-b border-gray-600'>
                      <th className='text-left py-2 text-gray-400'>Tx Hash</th>
                      <th className='text-left py-2 text-gray-400'>From</th>
                      <th className='text-left py-2 text-gray-400'>To</th>
                      <th className='text-left py-2 text-gray-400'>Value</th>
                      {isNFT && (
                        <th className='text-left py-2 text-gray-400'>Token ID</th>
                      )}
                      <th className='text-left py-2 text-gray-400'>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokenData.transfers
                      .filter(tx => tx.tokenId !== undefined)
                      .sort((a, b) => Number(b.tokenId) - Number(a.tokenId))
                      .map((transfer, index) => (
                      <tr key={index} className='border-b border-gray-700/50'>
                        <td className='py-2'>
                          <Link href={`/tx/${transfer.hash}`} className='text-blue-400 hover:text-blue-300 font-mono text-sm'>
                            {transfer.hash.slice(0, 8)}...{transfer.hash.slice(-8)}
                          </Link>
                        </td>
                        <td className='py-2'>
                          {transfer.from === 'System' ? (
                            <span className="text-gray-400 font-mono text-sm">System</span>
                          ) : (
                            <Link
                              href={`/address/${transfer.from}`}
                              className="text-blue-400 hover:text-blue-300 font-mono text-sm"
                            >
                              {formatAddress(transfer.from)}
                            </Link>
                          )}
                        </td>
                        <td className='py-2'>
                          {transfer.to === 'System' ? (
                            <span className="text-gray-400 font-mono text-sm">System</span>
                          ) : (
                            <Link
                              href={`/address/${transfer.to}`}
                              className="text-blue-400 hover:text-blue-300 font-mono text-sm"
                            >
                              {formatAddress(transfer.to)}
                            </Link>
                          )}
                        </td>
                        <td className='py-2 text-green-400 font-bold'>{transfer.value}</td>
                        {isNFT && (
                          <td className='py-2 text-gray-300'>
                            <Link href={`/tx/${transfer.hash}`} className='text-blue-400 hover:text-blue-300 font-mono text-sm'>
                              {transfer.tokenId === undefined || transfer.tokenId === null ? '0' : transfer.tokenId}
                            </Link>
                          </td>
                        )}
                        <td className='py-2 text-gray-400 text-sm'>
                          <div className='flex items-center'>
                            <ClockIcon className='w-4 h-4 text-yellow-400 mr-2' />
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

      case 'source':
        return (
          <div className='space-y-4'>
            <div className='bg-gray-900 rounded-lg p-4 border border-gray-600'>
              <div className='flex items-center justify-between mb-4'>
                <span className='text-gray-400'>Contract Address:</span>
                <span className='font-mono text-blue-400'>{address}</span>
              </div>

              {tokenData?.contract?.verified ? (
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
                      <div className='text-gray-200 font-medium'>{tokenData.contract.name}</div>
                    </div>
                    <div className='bg-gray-800 rounded p-3'>
                      <div className='text-gray-400 text-sm'>Compiler</div>
                      <div className='text-gray-200 font-medium'>
                        {(() => {
                          const compiler = tokenData.contract.compiler;
                          if (!compiler || compiler.toLowerCase() === 'latest' || compiler.toLowerCase() === 'unknown') {
                            if (tokenData.contract.compilerVersion && tokenData.contract.compilerVersion !== 'latest' && tokenData.contract.compilerVersion !== 'unknown') {
                              return tokenData.contract.compilerVersion;
                            }
                            return '-';
                          }
                          return compiler;
                        })()}
                      </div>
                    </div>
                    <div className='bg-gray-800 rounded p-3'>
                      <div className='text-gray-400 text-sm'>Language</div>
                      <div className='text-gray-200 font-medium'>{tokenData.contract.language}</div>
                    </div>
                  </div>

                  {/* Contract Source Code */}
                  {tokenData.contract.sourceCode && (
                    <div className='bg-gray-950 rounded border border-gray-700 overflow-hidden'>
                      <div className='bg-gray-800 px-4 py-2 border-b border-gray-700'>
                        <span className='text-sm font-medium text-gray-300'>Contract Source Code</span>
                      </div>
                      <pre className='p-4 overflow-x-auto text-sm text-gray-300 max-h-96 overflow-y-auto'>
                        <code className='whitespace-pre-wrap break-all'>
                          {tokenData.contract.sourceCode}
                        </code>
                      </pre>
                    </div>
                  )}

                  {/* Contract Bytecode */}
                  <div className='bg-gray-950 rounded border border-gray-700 overflow-hidden'>
                    <div className='bg-gray-800 px-4 py-2 border-b border-gray-700'>
                      <span className='text-sm font-medium text-gray-300'>Contract Bytecode</span>
                    </div>
                    <pre className='p-4 overflow-x-auto text-sm text-gray-300 max-h-96 overflow-y-auto'>
                      <code className='whitespace-pre-wrap break-all'>
                        {tokenData.contract.bytecode}
                      </code>
                    </pre>
                  </div>

                  {/* Compiled Code */}
                  {tokenData.contract.sourceCode && (
                    <div className='bg-gray-950 rounded border border-gray-700 overflow-hidden'>
                      <div className='bg-gray-800 px-4 py-2 border-b border-gray-700'>
                        <span className='text-sm font-medium text-gray-300'>Compiled Code</span>
                      </div>
                      <pre className='p-4 overflow-x-auto text-sm text-gray-300 max-h-96 overflow-y-auto'>
                        <code className='whitespace-pre-wrap break-all'>
                          {tokenData.contract.bytecode}
                        </code>
                      </pre>
                    </div>
                  )}
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
                        <span className='text-xs text-gray-400'>Token: {tokenData?.token?.name || 'Unknown'}</span>
                      </div>
                    </div>
                    <pre className='p-4 overflow-x-auto text-sm text-gray-300 max-h-96 overflow-y-auto'>
                      <code className='whitespace-pre-wrap break-all'>
                        {tokenData?.contract?.bytecode || '0x'}
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
                          href={`/contract/verify?address=${address}&contractName=${tokenData?.contract?.name || tokenData?.token?.name?.replace(/\s+/g, '') || 'TokenContract'}`}
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
          <div 
            data-tab-content="tokenids"
            className='space-y-4 animate-fadeIn' 
            style={{
              animation: 'fadeIn 0.6s ease-out'
            }}
          >
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
              {tokenData?.holders && tokenData.holders.length > 0 ? (
                // Collect all token IDs and sort by token ID 降順
                tokenData.holders.flatMap((holder) =>
                  (holder.tokenIds || []).map(tokenId => ({ tokenId, holder }))
                )
                .sort((a, b) => Number(b.tokenId) - Number(a.tokenId)) // tokenId降順
                .map(({ tokenId, holder }) => {
                  const metadata = tokenMetadata[tokenId];
                  const isLoading = metadataLoading[tokenId];
                  
                  return (
                    <div key={`${holder.address}-${tokenId}`} className='bg-gray-700/50 rounded-lg p-4 border border-gray-600 hover:border-gray-500 transition-colors'>
                      <div className='flex items-center justify-between mb-3'>
                        <span className='text-gray-400'>Token ID:</span>
                        <Link href={`/token/${address}/${tokenId}`} className='text-blue-400 font-bold hover:underline'>#{tokenId}</Link>
                      </div>
                      <div className='flex items-center justify-between mb-3'>
                        <span className='text-gray-400'>Owner:</span>
                        <Link href={`/address/${holder.address}`} className='text-blue-400 hover:text-blue-300 font-mono text-sm break-all'>
                          {formatAddress(holder.address)}
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
                              <Link href={`/token/${address}/${tokenId}`} className='block w-full h-48 rounded-t-lg overflow-hidden shadow hover:opacity-90 transition-opacity cursor-pointer' title='View NFT detail page'>
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
                                      <span className='text-xs text-red-400'>Load failed</span>
                                      <div className='text-xs text-gray-500 mt-1 px-2 break-all'>
                                        {metadata.image}
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Main image with link */}
                                <Image
                                  src={metadata.image}
                                  alt={metadata.name || `Token #${tokenId}`}
                                  width={320}
                                  height={192}
                                  style={{ objectFit: 'cover', width: '100%', height: '192px' }}
                                  className={`w-full h-48 object-cover z-10 ${
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
                                  unoptimized
                                />
                              </Link>
                            ) : (
                              <div className='h-48 flex items-center justify-center bg-gray-800'>
                                <span className='text-gray-500 text-sm'>No image</span>
                              </div>
                            )}
                            
                            {/* Metadata info */}
                            <div className='p-3'>
                              <div className='flex items-center justify-between mb-2'>
                                <h5 className='font-semibold text-gray-200 flex items-center gap-2'>
                                  {(() => {
                                    // const txHash = getTransactionForTokenId(tokenId);
                                    const title = metadata.name || `Token #${tokenId}`;
                                    const tokenDetailUrl = `/token/${address}/${tokenId}`;
                                    return (
                                      <Link
                                        href={tokenDetailUrl}
                                        className='text-blue-400 hover:text-blue-300 transition-colors'
                                        title='NFT詳細ページへ'
                                      >
                                        {title}
                                      </Link>
                                    );
                                  })()}
                                </h5>
                                {/* createdAtを右側に表示 */}
                                {metadata.createdAt && (
                                  <span className='text-xs text-gray-500 ml-2 whitespace-nowrap'>Created: {new Date(metadata.createdAt).toLocaleString()}</span>
                                )}
                              </div>
                              {/* descriptionを必ず表示 */}
                              <p className='text-sm text-gray-400 mb-2'>{metadata.description || '-'}</p>
                              {/* Attributes */}
                              {metadata.attributes && metadata.attributes.length > 0 && (
                                <div className='space-y-1'>
                                  <span className='text-xs text-gray-500 font-medium'>Attributes:</span>
                                  <div className='flex flex-wrap gap-1'>
                                    {metadata.attributes.map((attr, idx) => (
                                      <span key={idx} className='text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded'>
                                        {attr.trait_type}: {attr.value}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className='h-48 flex items-center justify-center bg-gray-800'>
                            <span className='text-gray-500 text-sm'>No metadata</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className='col-span-full text-center py-8'>
                  <p className='text-gray-400'>No token IDs found</p>
                </div>
              )}
            </div>
            
            {tokenData?.holders && tokenData.holders.flatMap(h => h.tokenIds || []).length > 0 && (
              <div className='text-center mt-4'>
                <p className='text-sm text-gray-400'>
                  Showing all {tokenData.holders.flatMap(h => h.tokenIds || []).length} token IDs
                </p>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className='space-y-4'>
            {tokenData?.holders && tokenData.holders.length > 0 ? (
              <div className='overflow-x-auto'>
                <table className='w-full'>
                  <thead>
                    <tr className='border-b border-gray-700'>
                      <th className='text-left py-3 px-4 text-sm font-medium text-gray-300'>Rank</th>
                      <th className='text-left py-3 px-4 text-sm font-medium text-gray-300'>Address</th>
                      <th className='text-left py-3 px-4 text-sm font-medium text-gray-300'>Balance</th>
                      <th className='text-left py-3 px-4 text-sm font-medium text-gray-300'>Percentage</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-700'>
                    {tokenData.holders.map((holder) => (
                      <tr key={`${holder.address}-${holder.rank}`} className='hover:bg-gray-700/50 transition-colors'>
                        <td className='py-3 px-4 text-yellow-400 font-bold'>#{holder.rank}</td>
                        <td className='py-3 px-4'>
                          <Link
                            href={`/address/${holder.address}`}
                            className='font-mono text-blue-400 hover:text-blue-300 transition-colors break-all'
                          >
                            {formatAddress(holder.address)}
                          </Link>
                        </td>
                        <td className='py-3 px-4 text-green-400 font-bold'>{holder.balance}</td>
                        <td className='py-3 px-4 text-yellow-400 font-medium'>{holder.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className='text-center py-8'>
                <p className='text-gray-400'>No holders data available</p>
              </div>
            )}
          </div>
        );
    }
  };

  if (loading) {
    return (
      <>
        <div className='page-header-container'>
          <div className='container mx-auto px-4 py-8'>
            <h1 className='text-3xl font-bold mb-2 text-gray-100'>Token Details</h1>
            <p className='text-gray-400'>Loading token information...</p>
          </div>
        </div>
        <main className='container mx-auto px-4 py-8'>
          <div className='bg-gray-800 rounded-lg border border-gray-700 p-6'>
            <div className='text-center py-8'>
              <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400'></div>
              <p className='text-gray-400 mt-2'>Loading token data...</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className='page-header-container'>
          <div className='container mx-auto px-4 py-8'>
            <h1 className='text-3xl font-bold mb-2 text-gray-100'>Token Details</h1>
            <p className='text-gray-400'>Error loading token information</p>
          </div>
        </div>
        <main className='container mx-auto px-4 py-8'>
          <div className='bg-gray-800 rounded-lg border border-gray-700 p-6'>
            <div className='text-center py-8'>
              <p className='text-red-400'>Error: {error}</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!tokenData) {
    return null;
  }

  return (
    <>
      {/* Page Header */}
      <div className='page-header-container'>
        <div className='container mx-auto px-4 py-8'>
          <h1 className='text-3xl font-bold mb-2 text-gray-100'>Token Details</h1>
          <p className='text-gray-400'>
            Token information and holder statistics for {tokenData?.token?.name || 'N/A'} ({tokenData?.token?.symbol || 'N/A'})
          </p>
        </div>
      </div>

      <main className='container mx-auto px-4 py-8'>
        {/* Stats Cards */}
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-8'>
          <div className='bg-gray-700/50 rounded-lg p-4 border border-gray-600/50'>
            <h3 className='text-sm font-medium text-gray-300 mb-2'>Unique Holders</h3>
            <p className='text-2xl font-bold text-blue-400'>{(tokenData?.statistics?.holders || 0).toLocaleString()}</p>
            <p className='text-xs text-gray-400'>Collection owners</p>
          </div>

          <div className='bg-gray-700/50 rounded-lg p-4 border border-gray-600/50'>
            <h3 className='text-sm font-medium text-gray-300 mb-2'>Total Transfers</h3>
            <p className='text-2xl font-bold text-purple-400'>{(tokenData?.statistics?.transfers || tokenData?.transfers?.length || 0).toLocaleString()}</p>
            <p className='text-xs text-gray-400'>All time transfers</p>
          </div>

          <div className='bg-gray-700/50 rounded-lg p-4 border border-gray-600/50'>
            <h3 className='text-sm font-medium text-gray-300 mb-2'>24h Transfers</h3>
            <p className='text-2xl font-bold text-orange-400'>{(tokenData?.statistics?.transfers24h || 0).toLocaleString()}</p>
            <p className='text-xs text-gray-400'>Token movements</p>
          </div>

          <div className='bg-gray-700/50 rounded-lg p-4 border border-gray-600/50'>
            <h3 className='text-sm font-medium text-gray-300 mb-2'>Age</h3>
            <p className='text-2xl font-bold text-yellow-400'>{tokenData?.statistics?.age || 0} days</p>
            <p className='text-xs text-gray-400'>Since creation</p>
          </div>
        </div>

        {/* Token Info Card */}
        <div className='bg-gray-800 rounded-lg border border-gray-700 p-6 mb-8'>
          <div className='flex items-center justify-between mb-6'>
            <h2 className='text-xl font-semibold text-gray-100'>Token Information</h2>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
            <div className='md:col-span-2'>
              <div className='text-sm font-medium text-gray-300 mb-2'>Token Address</div>
              <div className='flex items-center gap-2 font-mono text-blue-400 text-sm break-all bg-white/10 rounded px-3 py-2'>
                <Link
                  href={`/address/${tokenData?.token?.address}`}
                  className='hover:text-blue-300 transition-colors'
                  title='View contract details'
                >
                  {tokenData?.token?.address}
                </Link>
                {/* Copy icon */}
                <button
                  onClick={copyAddressToClipboard}
                  className='p-1 text-gray-400 hover:text-blue-400 transition-colors'
                  title='Copy address to clipboard'
                >
                  <ClipboardDocumentIcon className='w-4 h-4' />
                </button>
                {copiedAddress && (
                  <span className='text-green-400 text-xs'>Copied!</span>
                )}
              </div>
            </div>
            <div>
              <div className='text-sm font-medium text-gray-300 mb-2'>Token Name</div>
              <div className='text-orange-400 text-lg font-semibold'>{tokenData?.token?.name}</div>
            </div>
            <div>
              <div className='text-sm font-medium text-gray-300 mb-2'>Symbol</div>
              <div className='text-green-400 text-lg font-bold'>{tokenData?.token?.symbol || 'N/A'}</div>
            </div>
            <div>
              <div className='text-sm font-medium text-gray-300 mb-2'>Type</div>
              <span className={`px-3 py-1 rounded text-sm font-medium ${
                tokenData?.token?.type === 'Native' ? 'bg-cyan-500/20 text-cyan-400' :
                  tokenData?.token?.type === 'VRC-721' ? 'bg-purple-500/20 text-purple-400' :
                    tokenData?.token?.type === 'VRC-1155' ? 'bg-orange-500/20 text-orange-400' :
                      tokenData?.token?.type === 'VRC-20' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-500/20 text-gray-400'
              }`}>
                {tokenData?.token?.type}
              </span>
            </div>
            {tokenData?.token?.creator && (
              <div>
                <div className='text-sm font-medium text-gray-300 mb-2'>Creator</div>
                <Link
                  href={`/address/${tokenData.token.creator}`}
                  className='font-mono text-blue-400 hover:text-blue-300 transition-colors break-all text-sm'
                >
                  {formatAddress(tokenData.token.creator)}
                </Link>
              </div>
            )}
            <div>
              <div className='text-sm font-medium text-gray-300 mb-2'>Holders</div>
              <div className='text-yellow-400 text-lg font-bold'>{(tokenData?.statistics?.holders || 0).toLocaleString()}</div>
            </div>
            <div>
              <div className='text-sm font-medium text-gray-300 mb-2'>Total Supply</div>
              <div className='text-green-400 text-lg font-bold'>{tokenData?.token?.totalSupply || '0'} {tokenData?.token?.symbol || ''}</div>
            </div>
            <div>
              <div className='text-sm font-medium text-gray-300 mb-2'>Transfers</div>
              <div className='text-green-400 text-lg font-bold'>{(tokenData?.statistics?.transfers || tokenData?.transfers?.length || 0).toLocaleString()}</div>
            </div>
            <div>
              <div className='text-sm font-medium text-gray-300 mb-2'>24h Transfers</div>
              <div className='text-orange-400 text-lg font-bold'>{(tokenData?.statistics?.transfers24h || 0).toLocaleString()}</div>
            </div>
            {tokenData?.token?.floorPrice && (
              <div>
                <div className='text-sm font-medium text-gray-300 mb-2'>Floor Price</div>
                <div className='text-green-400 text-lg font-bold'>{tokenData?.token?.floorPrice} VBC</div>
              </div>
            )}
            {tokenData?.token?.volume24h && (
              <div>
                <div className='text-sm font-medium text-gray-300 mb-2'>24h Volume</div>
                <div className='text-purple-400 text-lg font-bold'>{tokenData?.token?.volume24h} VBC</div>
              </div>
            )}
            {tokenData?.contract?.verified && (
              <div>
                <div className='text-sm font-medium text-gray-300 mb-2'>Verification</div>
                <div className='flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 rounded text-sm font-medium w-fit'>
                  <CheckCircleIcon className='w-4 h-4' />
                  <span>Verified</span>
                </div>
              </div>
            )}
            <div>
              <div className='text-sm font-medium text-gray-300 mb-2'>Market Cap</div>
              <div className='text-gray-400 text-lg font-bold'>{tokenData?.statistics?.marketCap || 'N/A'}</div>
            </div>
            <div>
              <div className='text-sm font-medium text-gray-300 mb-2'>Age</div>
              <div className='text-yellow-400 text-lg font-bold'>{tokenData?.statistics?.age || 0} days</div>
            </div>
            {isNFT && (
              <div>
                <div className='text-sm font-medium text-gray-300 mb-2'>NFT Collection</div>
                <button
                  onClick={() => {
                    setActiveTab('tokenids');
                    
                    // タブ切り替え後にスクロール
                    setTimeout(() => {
                      const tokenIdsSection = document.querySelector('[data-tab-content="tokenids"]');
                      if (tokenIdsSection) {
                        const element = tokenIdsSection as HTMLElement;
                        const rect = element.getBoundingClientRect();
                        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                        const targetY = scrollTop + rect.top - 120; // ヘッダー分のオフセット
                        
                        window.scrollTo({
                          top: targetY,
                          behavior: 'smooth'
                        });
                      }
                    }, 300);
                  }}
                  className='px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-base font-bold rounded-lg shadow-lg flex items-center gap-2 transition-all duration-300 transform hover:scale-105 hover:shadow-xl active:scale-95'
                >
                  <svg className='w-5 h-5' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' d='M9 17v-2a4 4 0 014-4h2m4 0V7a2 2 0 00-2-2h-7a2 2 0 00-2 2v10a2 2 0 002 2h7a2 2 0 002-2v-4a2 2 0 00-2-2h-2a4 4 0 00-4 4v2'></path></svg>
                  View NFTs
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs Section */}
        <div className='bg-gray-800 rounded-lg border border-gray-700 p-6'>
          {isNFT && (
            <div className='mb-6'>
              <div className='flex items-center gap-2 mb-4'>
                <UsersIcon className='w-5 h-5 text-cyan-400' />
                <h3 className='text-lg font-semibold text-gray-100'>NFT Collection Tools</h3>
              </div>
              
              <p className='text-gray-400'>Explore and interact with this NFT collection using the tools below</p>
            </div>
          )}

          <div className='flex flex-wrap gap-4 border-b border-gray-700 mb-6'>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 pb-3 px-4 py-2 transition-colors rounded-lg ${
                    activeTab === tab.id ?
                      (tab.id === 'tokenids' ? 
                        'text-white bg-gradient-to-r from-purple-600 to-blue-600' :
                        'text-white bg-blue-600'
                      ) :
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
      </main>
    </>
  );
}
