'use client';

import Header from '../../components/Header';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import {
  UsersIcon,
  CubeIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  CodeBracketIcon,
  HashtagIcon
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

export default function NFTDetailPage({ params }: { params: Promise<{ address: string }> }) {
  const [nftData, setNftData] = useState<NFTData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('balance');
  const [balanceAddress, setBalanceAddress] = useState<string>('');
  const [balanceResult, setBalanceResult] = useState<any>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [contractView, setContractView] = useState<'source' | 'bytecode'>('source');

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

  const tabs = [
    { id: 'balance', label: 'Get Balance', icon: UsersIcon },
    { id: 'transfers', label: 'Token Transfers', icon: ArrowPathIcon },
    { id: 'transactions', label: 'Contract Transactions', icon: DocumentTextIcon },
    { id: 'source', label: 'Contract Source', icon: CodeBracketIcon },
    { id: 'tokenids', label: 'ERC721 TokenIDs', icon: HashtagIcon }
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
                            {transfer.hash.slice(0, 10)}...
                          </Link>
                        </td>
                        <td className='py-2'>
                          <Link href={`/accounts/${transfer.from}`} className='text-blue-400 hover:text-blue-300 font-mono text-sm'>
                            {transfer.from.slice(0, 8)}...
                          </Link>
                        </td>
                        <td className='py-2'>
                          <Link href={`/accounts/${transfer.to}`} className='text-blue-400 hover:text-blue-300 font-mono text-sm'>
                            {transfer.to.slice(0, 8)}...
                          </Link>
                        </td>
                        <td className='py-2 text-gray-300'>{transfer.tokenId}</td>
                        <td className='py-2 text-gray-400 text-sm'>{transfer.timeAgo}</td>
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
                  <div className='flex items-center gap-2 mb-4'>
                    <div className='w-2 h-2 bg-green-400 rounded-full'></div>
                    <span className='text-green-400 font-medium'>Contract Verified</span>
                  </div>
                  
                  <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'>
                    <div className='bg-gray-800 rounded p-3'>
                      <div className='text-gray-400 text-sm'>Contract Name</div>
                      <div className='text-gray-200 font-medium'>{nftData.contract.name}</div>
                    </div>
                    <div className='bg-gray-800 rounded p-3'>
                      <div className='text-gray-400 text-sm'>Compiler</div>
                      <div className='text-gray-200 font-medium'>{nftData.contract.compiler}</div>
                    </div>
                    <div className='bg-gray-800 rounded p-3'>
                      <div className='text-gray-400 text-sm'>Language</div>
                      <div className='text-gray-200 font-medium'>{nftData.contract.language}</div>
                    </div>
                  </div>
                  
                  <div className='bg-gray-950 rounded border border-gray-700 overflow-hidden'>
                    <div className='bg-gray-800 px-4 py-2 border-b border-gray-700 flex gap-4'>
                      <button
                        onClick={() => setContractView('source')}
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          contractView === 'source' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        Source Code
                      </button>
                      <button
                        onClick={() => setContractView('bytecode')}
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          contractView === 'bytecode' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        Bytecode
                      </button>
                    </div>
                    <pre className='p-4 overflow-x-auto text-sm text-gray-300 max-h-96 overflow-y-auto'>
                      <code>
                        {contractView === 'bytecode' 
                          ? nftData.contract.bytecode 
                          : nftData.contract.sourceCode
                        }
                      </code>
                    </pre>
                  </div>
                </div>
              ) : (
                <div className='text-center py-8'>
                  <CodeBracketIcon className='w-12 h-12 text-gray-500 mx-auto mb-4' />
                  <p className='text-gray-400'>Contract source code not verified</p>
                  <p className='text-gray-500 text-sm mt-2'>Source code verification is pending</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'tokenids':
        return (
          <div className='space-y-4'>
            <h4 className='text-lg font-semibold text-gray-100'>ERC721 Token IDs</h4>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
              {nftData?.holders && nftData.holders.length > 0 ? (
                nftData.holders.flatMap((holder) =>
                  (holder.tokenIds || []).map(tokenId => (
                    <div key={`${holder.address}-${tokenId}`} className='bg-gray-700/50 rounded-lg p-4 border border-gray-600'>
                      <div className='flex items-center justify-between mb-2'>
                        <span className='text-gray-400'>Token ID:</span>
                        <span className='text-green-400 font-bold'>#{tokenId}</span>
                      </div>
                      <div className='flex items-center justify-between mb-2'>
                        <span className='text-gray-400'>Owner:</span>
                        <Link href={`/accounts/${holder.address}`} className='text-blue-400 hover:text-blue-300 font-mono text-sm'>
                          {holder.address.slice(0, 8)}...
                        </Link>
                      </div>
                      <div className='flex items-center justify-between mb-3'>
                        <span className='text-gray-400'>Rank:</span>
                        <span className='text-yellow-400'>#{holder.rank}</span>
                      </div>
                      <div className='w-full h-24 bg-gray-800 rounded flex items-center justify-center border border-gray-600'>
                        <div className='text-center'>
                          <HashtagIcon className='w-8 h-8 text-gray-500 mx-auto mb-1' />
                          <span className='text-xs text-gray-500'>NFT #{tokenId}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )
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
              <h1 className='text-3xl font-bold mb-2 text-gray-100'>{nftData.nft.name} ({nftData.nft.symbol})</h1>
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
                  <span className='font-mono text-blue-400 break-all'>{address}</span>
                </div>
                <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
                  <span className='text-gray-400 font-medium min-w-[120px]'>Creator:</span>
                  <Link
                    href={`/accounts/${nftData.nft.creator}`}
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
                  <span className='text-purple-400 font-bold'>{nftData.nft.totalSupply}</span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-gray-400'>Holders:</span>
                  <span className='text-green-400 font-bold'>{nftData.statistics.holders}</span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-gray-400'>Floor Price:</span>
                  <span className='text-yellow-400 font-bold'>{nftData.nft.floorPrice} VBC</span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-gray-400'>24h Volume:</span>
                  <span className='text-blue-400 font-bold'>{nftData.nft.volume24h} VBC</span>
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
                    activeTab === tab.id
                      ? 'text-cyan-400 border-b-2 border-cyan-400'
                      : 'text-gray-400 hover:text-gray-300'
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
            <p className='text-2xl font-bold text-green-400'>{nftData.statistics.transfers24h}</p>
            <p className='text-xs text-gray-400'>Token movements</p>
          </div>
          <div className='bg-gray-800 rounded-lg border border-gray-700 p-4'>
            <h3 className='text-sm font-medium text-gray-300 mb-2'>24h Volume</h3>
            <p className='text-2xl font-bold text-blue-400'>{nftData.nft.volume24h} VBC</p>
            <p className='text-xs text-gray-400'>Trading volume</p>
          </div>
          <div className='bg-gray-800 rounded-lg border border-gray-700 p-4'>
            <h3 className='text-sm font-medium text-gray-300 mb-2'>Unique Holders</h3>
            <p className='text-2xl font-bold text-purple-400'>{nftData.statistics.holders}</p>
            <p className='text-xs text-gray-400'>Collection owners</p>
          </div>
        </div>
      </main>
    </>
  );
}
