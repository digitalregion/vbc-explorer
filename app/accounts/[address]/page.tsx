'use client';

import Header from '../../components/Header';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface AccountData {
  account: {
    address: string;
    balance: string;
    balanceRaw: string;
    percentage: string;
    rank: number | null;
    transactionCount: number;
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
  }>;
}

export default function AccountDetailPage({ params }: { params: Promise<{ address: string }> }) {
  const [accountData, setAccountData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState<string>('');

  useEffect(() => {
    async function getAddress() {
      const resolvedParams = await params;
      setAddress(resolvedParams.address);
    }
    getAddress();
  }, [params]);

  useEffect(() => {
    if (!address) return;

    async function fetchAccountData() {
      try {
        setLoading(true);
        const response = await fetch(`/api/accounts/${address}`);
        
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

  // Format value for display
  const formatValue = (value: string) => {
    try {
      const numValue = parseFloat(value) / Math.pow(10, 18); // Convert from Wei to VBC
      return numValue.toLocaleString(undefined, { 
        minimumFractionDigits: 2,
        maximumFractionDigits: 6
      });
    } catch (error) {
      return value;
    }
  };

  // Get time ago for dates
  const getTimeAgo = (timestamp: Date) => {
    if (!timestamp) return 'Unknown';
    
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    
    if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''} ago`;
    } else if (months > 0) {
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
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
                  <span className='font-mono text-blue-400 break-all'>{accountData.account.address}</span>
                </div>
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
                    <th className='text-left py-3 px-2 text-sm font-medium text-gray-300'>TxHash</th>
                    <th className='text-left py-3 px-2 text-sm font-medium text-gray-300'>From</th>
                    <th className='text-left py-3 px-2 text-sm font-medium text-gray-300'>To</th>
                    <th className='text-left py-3 px-2 text-sm font-medium text-gray-300'>Value</th>
                    <th className='text-left py-3 px-2 text-sm font-medium text-gray-300'>Time</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-700'>
                  {accountData.transactions.map((tx) => (
                    <tr key={tx.hash} className='hover:bg-gray-700/50 transition-colors'>
                      <td className='py-3 px-2'>
                        <Link 
                          href={`/tx/${tx.hash}`}
                          className='font-mono text-blue-400 hover:text-blue-300 transition-colors text-sm'
                        >
                          {tx.hash.slice(0, 10)}...
                        </Link>
                      </td>
                      <td className='py-3 px-2'>
                        <Link
                          href={`/accounts/${tx.from}`}
                          className='font-mono text-gray-300 hover:text-blue-400 transition-colors text-sm'
                        >
                          {tx.from.slice(0, 8)}...
                        </Link>
                      </td>
                      <td className='py-3 px-2'>
                        <Link
                          href={`/accounts/${tx.to}`}
                          className='font-mono text-gray-300 hover:text-blue-400 transition-colors text-sm'
                        >
                          {tx.to.slice(0, 8)}...
                        </Link>
                      </td>
                      <td className='py-3 px-2 text-green-400 font-medium'>{formatValue(tx.value)} VBC</td>
                      <td className='py-3 px-2 text-gray-400 text-sm'>{tx.timeAgo}</td>
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
