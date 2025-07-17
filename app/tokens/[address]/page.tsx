'use client';

import Header from '../../components/Header';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircleIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';

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
  };
  statistics: {
    holders: number;
    transfers: number;
    age: number;
    marketCap: string;
  };
  holders: Array<{
    rank: number;
    address: string;
    balance: string;
    balanceRaw: string;
    percentage: string;
  }>;
  transfers: Array<{
    hash: string;
    from: string;
    to: string;
    value: string;
    valueRaw: string;
    timestamp: string;
    timeAgo: string;
  }>;
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
        const response = await fetch(`/api/tokens/${address}`);

        if (!response.ok) {
          throw new Error('Failed to fetch token data');
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
      await navigator.clipboard.writeText(tokenData?.token.address || '');
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
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
        <Header />
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
      <Header />

      {/* Page Header - Same as richlist */}
      <div className='page-header-container'>
        <div className='container mx-auto px-4 py-8'>
          <h1 className='text-3xl font-bold mb-2 text-gray-100'>Token Details</h1>
          <p className='text-gray-400'>
            Token information and holder statistics for {tokenData.token.name} ({tokenData.token.symbol})
          </p>
        </div>
      </div>

      <main className='container mx-auto px-4 py-8'>
        {/* Token Info Card - Same style as richlist */}
        <div className='bg-gray-800 rounded-lg border border-gray-700 p-6 mb-8'>
          <div className='flex items-center justify-between mb-6'>
            <h2 className='text-xl font-semibold text-gray-100'>Token Information</h2>
            {(tokenData.token.type === 'VRC-721' || tokenData.token.type === 'VRC-1155') && (
              <Link
                href={`/nft/${tokenData.token.address}`}
                className='px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-base font-bold rounded-lg shadow flex items-center gap-2 transition-all duration-200 min-h-[40px]'
                style={{ minWidth: 'auto' }}
              >
                <svg className='w-5 h-5' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' d='M9 17v-2a4 4 0 014-4h2m4 0V7a2 2 0 00-2-2h-7a2 2 0 00-2 2v10a2 2 0 002 2h7a2 2 0 002-2v-4a2 2 0 00-2-2h-2a4 4 0 00-4 4v2'></path></svg>
                View NFTs
              </Link>
            )}
          </div>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            <div>
              <div className='text-sm font-medium text-gray-300 mb-2'>Token Address</div>
              <div className='flex items-center gap-2 font-mono text-blue-400 text-sm break-all'>
                <Link
                  href={`/tokens/${tokenData.token.address}`}
                  className='hover:text-blue-300 transition-colors'
                >
                  {tokenData.token.address}
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
              <div className='text-gray-100 text-lg font-semibold'>{tokenData.token.name}</div>
            </div>
            <div>
              <div className='text-sm font-medium text-gray-300 mb-2'>Symbol</div>
              <div className='text-blue-400 text-lg font-bold'>{tokenData.token.symbol}</div>
            </div>
            <div>
              <div className='text-sm font-medium text-gray-300 mb-2'>Type</div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                tokenData.token.type === 'Native' ? 'bg-green-500/20 text-green-400' :
                  tokenData.token.type === 'VRC-721' ? 'bg-purple-500/20 text-purple-400' :
                    tokenData.token.type === 'VRC-1155' ? 'bg-orange-500/20 text-orange-400' :
                      tokenData.token.type === 'VRC-20' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-500/20 text-gray-400'
              }`}>
                {tokenData.token.type}
              </span>
            </div>
            <div>
              <div className='text-sm font-medium text-gray-300 mb-2'>Total Supply</div>
              <div className='text-gray-100 text-lg font-semibold'>{tokenData.token.totalSupply}</div>
            </div>
            <div>
              <div className='text-sm font-medium text-gray-300 mb-2'>Verify</div>
              {tokenData.token.verified ? (
                <div className='flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm font-medium w-fit'>
                  <CheckCircleIcon className='w-5 h-5' />
                  <span>Verified</span>
                </div>
              ) : (
                <span className='text-gray-400 text-xs'>-</span>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards - Same style as richlist */}
        <div className='mt-8 grid grid-cols-1 md:grid-cols-4 gap-4 mb-8'>
          <div className='bg-gray-700/50 rounded-lg p-4 border border-gray-600/50'>
            <h3 className='text-sm font-medium text-gray-300 mb-2'>Holders</h3>
            <p className='text-2xl font-bold text-blue-400'>{tokenData.statistics.holders.toLocaleString()}</p>
            <p className='text-xs text-gray-400'>Unique addresses</p>
          </div>

          <div className='bg-gray-700/50 rounded-lg p-4 border border-gray-600/50'>
            <h3 className='text-sm font-medium text-gray-300 mb-2'>Transfers</h3>
            <p className='text-2xl font-bold text-green-400'>{tokenData.statistics.transfers.toLocaleString()}</p>
            <p className='text-xs text-gray-400'>Total transactions</p>
          </div>

          <div className='bg-gray-700/50 rounded-lg p-4 border border-gray-600/50'>
            <h3 className='text-sm font-medium text-gray-300 mb-2'>Market Cap</h3>
            <p className='text-2xl font-bold text-yellow-400'>{tokenData.statistics.marketCap}</p>
            <p className='text-xs text-gray-400'>Current valuation</p>
          </div>

          <div className='bg-gray-700/50 rounded-lg p-4 border border-gray-600/50'>
            <h3 className='text-sm font-medium text-gray-300 mb-2'>Age</h3>
            <p className='text-2xl font-bold text-purple-400'>{tokenData.statistics.age} days</p>
            <p className='text-xs text-gray-400'>Since creation</p>
          </div>
        </div>

        {/* Holders Table - Same style as richlist */}
        <div className='bg-gray-800 rounded-lg border border-gray-700 p-6 mb-8'>
          <div className='flex items-center justify-between mb-6'>
            <h2 className='text-xl font-semibold text-gray-100'>Token Holders</h2>
            <div className='text-sm text-gray-400'>
              Top holders by balance
            </div>
          </div>
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead>
                <tr className='border-b border-gray-700'>
                  <th className='text-left py-3 px-4 text-sm font-medium text-gray-300'>#</th>
                  <th className='text-left py-3 px-4 text-sm font-medium text-gray-300'>Address</th>
                  <th className='text-left py-3 px-4 text-sm font-medium text-gray-300'>Balance</th>
                  <th className='text-left py-3 px-4 text-sm font-medium text-gray-300'>Percentage</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-700'>
                {tokenData.holders.length > 0 ? (
                  tokenData.holders.map((holder) => (
                    <tr key={holder.rank} className='hover:bg-gray-700/50 transition-colors'>
                      <td className='py-3 px-4 text-gray-200 font-bold'>#{holder.rank}</td>
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
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className='py-8 px-4 text-center text-gray-400'>
                      No holders data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Transfers - Same style as richlist */}
        <div className='bg-gray-800 rounded-lg border border-gray-700 p-6'>
          <div className='flex items-center justify-between mb-6'>
            <h2 className='text-xl font-semibold text-gray-100'>Recent Transfers</h2>
            <div className='text-sm text-gray-400'>
              Latest token transactions
            </div>
          </div>
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead>
                <tr className='border-b border-gray-700'>
                  <th className='text-left py-3 px-4 text-sm font-medium text-gray-300'>Transaction Hash</th>
                  <th className='text-left py-3 px-4 text-sm font-medium text-gray-300'>From</th>
                  <th className='text-left py-3 px-4 text-sm font-medium text-gray-300'>To</th>
                  <th className='text-left py-3 px-4 text-sm font-medium text-gray-300'>Value</th>
                  <th className='text-left py-3 px-4 text-sm font-medium text-gray-300'>Time</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-700'>
                {tokenData.transfers.length > 0 ? (
                  tokenData.transfers.map((transfer, index) => (
                    <tr key={`${transfer.hash}-${index}`} className='hover:bg-gray-700/50 transition-colors'>
                      <td className='py-3 px-4'>
                        <Link
                          href={`/tx/${transfer.hash}`}
                          className='font-mono text-blue-400 hover:text-blue-300 transition-colors'
                        >
                          {transfer.hash?.substring(0, 10)}...{transfer.hash?.substring(transfer.hash.length - 6)}
                        </Link>
                      </td>
                      <td className='py-3 px-4'>
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
                      <td className='py-3 px-4'>
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
                      <td className='py-3 px-4 text-green-400 font-bold'>{transfer.value}</td>
                      <td className='py-3 px-4 text-gray-400 text-sm'>{transfer.timeAgo}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className='py-8 px-4 text-center text-gray-400'>
                      No transfer data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
