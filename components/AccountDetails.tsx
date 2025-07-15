'use client';

import Header from '../app/components/Header';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ClipboardDocumentIcon, ClockIcon } from '@heroicons/react/24/outline';

// Dynamic config loading
const config: Record<string, unknown> = {
  miners: {
    "0x950302976387b43E042aeA242AE8DAB8e5C204D1": "digitalregion.jp",
    "0x6C0DB3Ea9EEd7ED145f36da461D84A8d02596B08": "coolpool.top"
  }
};

interface AccountData {
  account: {
    address: string;
    balance: string;
    balanceRaw: string;
    percentage: string;
    rank: number | null;
    transactionCount: number;
    blocksMined: number;
    firstSeen: string;
    lastActivity: string;
  };
  transactions: Array<{
    hash: string;
    from: string;
    to: string;
    value: string;
    timestamp: Date;
    timeAgo: string;
    blockNumber: number;
    type?: 'native' | 'token' | 'mining_reward';
    tokenAddress?: string;
    details?: {
      blockReward?: number;
      gasFees?: string;
      totalReward?: string;
    };
  }>;
}

interface AccountDetailsProps {
  address: string;
}

// 省略表示用関数
const ellipsis = (str: string, start: number, end: number) =>
  str && str.length > start + end ? `${str.slice(0, start)}...${str.slice(-end)}` : str;

// ローカルタイムスタンプ表示関数
const formatLocalTime = (timestamp: string | Date | number) => {
  if (!timestamp) return '';
  const ts = typeof timestamp === 'number'
    ? timestamp
    : typeof timestamp === 'string'
      ? Number(timestamp)
      : timestamp instanceof Date
        ? Math.floor(timestamp.getTime() / 1000)
        : 0;
  return new Date(ts * 1000).toLocaleString(undefined, { timeZoneName: 'short' });
};

// プール名を取得する関数
const getPoolName = (address: string) => {
  if (!address || !config.miners) return null;
  
  const minerKey = Object.keys(config.miners).find(
    key => key.toLowerCase() === address.toLowerCase()
  );
  
  return minerKey ? (config.miners as Record<string, string>)[minerKey] : null;
};

export default function AccountDetails({ address }: AccountDetailsProps) {
  const [accountData, setAccountData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

  useEffect(() => {
    async function fetchAccountData() {
      try {
        setLoading(true);
        const response = await fetch(`/api/address/${address}`);

        if (!response.ok) {
          throw new Error('Failed to fetch account data');
        }

        const data = await response.json();
        setAccountData(data);
      } catch (err) {
        console.error('Error fetching account data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchAccountData();
  }, [address]);

  const copyAddressToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(address);
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

  if (!accountData) {
    return (
      <>
        <Header />
        <div className='container mx-auto px-4 py-8'>
          <div className='text-gray-400'>No account data found</div>
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
          <h1 className='text-3xl font-bold mb-2 text-gray-100'>Account Detail</h1>
          <p className='text-gray-400'>Account information and transaction history.</p>
        </div>
      </div>

      <main className='container mx-auto px-4 py-8'>
        {/* Account Info Card */}
        <div className='bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            <div className='md:col-span-2'>
              <h3 className='text-lg font-semibold text-gray-100 mb-4'>Account Information</h3>
              <div className='space-y-3'>
                <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
                  <span className='text-gray-400 font-medium min-w-[80px]'>Address:</span>
                  <div className='flex items-center gap-2'>
                    <span className='font-mono text-blue-400 break-all'>{accountData.account.address}</span>
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
                {(() => {
                  const poolName = getPoolName(accountData.account.address);
                  return poolName ? (
                    <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
                      <span className='text-gray-400 font-medium min-w-[80px]'>Pool Name:</span>
                      <span className='text-green-400 font-medium'>{poolName}</span>
                    </div>
                  ) : null;
                })()}
                <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
                  <span className='text-gray-400 font-medium min-w-[80px]'>Balance:</span>
                  <span className='text-green-400 font-bold'>{accountData.account.balance} VBC</span>
                </div>
                <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
                  <span className='text-gray-400 font-medium min-w-[80px]'>Percent:</span>
                  <span className='text-yellow-400'>{accountData.account.percentage}%</span>
                </div>
                {accountData.account.rank && (
                  <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
                    <span className='text-gray-400 font-medium min-w-[80px]'>Rank:</span>
                    <span className='text-purple-400'>#{accountData.account.rank}</span>
                  </div>
                )}
              </div>
            </div>
            <div className='bg-gray-700/50 rounded-lg p-4 border border-gray-600/50'>
              <h4 className='text-sm font-medium text-gray-300 mb-2'>Quick Stats</h4>
              <div className='space-y-2 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-gray-400'>Transactions:</span>
                  <span className='text-gray-200'>{accountData.account.transactionCount.toLocaleString()}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-400'>Blocks Mined:</span>
                  <span className='text-gray-200'>{accountData.account.blocksMined.toLocaleString()}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-400'>First Seen:</span>
                  <span className='text-gray-200'>{accountData.account.firstSeen}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-400'>Last Activity:</span>
                  <span className='text-gray-200'>{accountData.account.lastActivity}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className='bg-gray-800 rounded-lg border border-gray-700 p-6'>
          <div className='flex items-center justify-between mb-4'>
            <h3 className='text-xl font-semibold text-gray-100'>Transactions</h3>
            <span className='text-sm text-gray-400'>Latest {accountData.transactions.length} transactions</span>
          </div>
          {accountData.transactions.length > 0 ? (
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b border-gray-700'>
                    <th className='text-left py-3 px-2 text-sm font-medium text-gray-300 w-1/4'>TxHash</th>
                    <th className='text-left py-3 px-2 text-sm font-medium text-gray-300 w-1/4'>From</th>
                    <th className='text-left py-3 px-2 text-sm font-medium text-gray-300 w-1/4'>To</th>
                    <th className='text-left py-3 px-2 text-sm font-medium text-gray-300 w-1/6'>Value</th>
                    <th className='text-left py-3 px-2 text-sm font-medium text-gray-300 w-[260px] min-w-[220px]'>Time</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-700'>
                  {accountData.transactions.map((tx) => (
                    <tr key={tx.hash} className='hover:bg-gray-700/50 transition-colors'>
                      <td className='py-3 px-2'>
                        {tx.type === 'mining_reward' ? (
                          <span className='font-mono text-yellow-400 text-sm'>
                            Mining Reward
                          </span>
                        ) : (
                          <Link
                            href={`/tx/${tx.hash}`}
                            className='font-mono text-blue-400 hover:text-blue-300 transition-colors text-sm'
                          >
                            {ellipsis(tx.hash, 8,8)}
                          </Link>
                        )}
                      </td>
                      <td className='py-3 px-2'>
                        {tx.type === 'mining_reward' ? (
                          <span className='font-mono text-gray-500 text-sm'>
                            System
                          </span>
                        ) : (
                          <Link
                            href={`/address/${tx.from}`}
                            className='font-mono text-gray-300 hover:text-blue-400 transition-colors text-sm'
                          >
                            {ellipsis(tx.from, 6, 6)}
                          </Link>
                        )}
                      </td>
                      <td className='py-3 px-2'>
                        <Link
                          href={`/address/${tx.to}`}
                          className='font-mono text-gray-300 hover:text-blue-400 transition-colors text-sm'
                        >
                          {ellipsis(tx.to, 6, 6)}
                        </Link>
                      </td>
                      <td className='py-3 px-2'>
                        <span className={`font-medium text-sm ${
                          tx.type === 'mining_reward' ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                          {tx.value} {tx.type === 'token' ? 'Tokens' : 'VBC'}
                        </span>
                        {tx.type === 'mining_reward' && tx.details && (
                          <div className='text-xs text-gray-500 mt-1'>
                            <div>Block: {tx.details.blockReward} VBC</div>
                            <div>Gas: {tx.details.gasFees} VBC</div>
                          </div>
                        )}
                      </td>
                      <td className='py-3 px-2 text-gray-400 text-sm w-[260px] min-w-[220px]'>
                        <div className='flex items-center'>
                          <ClockIcon className='w-4 h-4 text-gray-400 mr-2' />
                          <div>
                            <div className='text-sm text-gray-300'>{tx.timeAgo}</div>
                            <div className='text-xs text-gray-500'>{formatLocalTime(tx.timestamp)}</div>
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
              <div className='text-gray-400'>No transactions found for this account</div>
            </div>
          )}
        </div>
      </main>
    </>
  );
} 