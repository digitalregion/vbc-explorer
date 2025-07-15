'use client';

import Header from '../components/Header';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ArrowPathIcon, ClockIcon, CheckCircleIcon, XCircleIcon, HashtagIcon } from '@heroicons/react/24/outline';

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  blockNumber: number;
  gasUsed?: number;
  status?: number;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch('/api/transactions');
        if (!response.ok) {
          throw new Error('Failed to fetch transactions');
        }
        const data = await response.json();
        setTransactions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchTransactions, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatValue = (value: string) => {
    try {
      const numValue = parseFloat(value);
      if (numValue === 0) return '0 VBC';
      if (numValue < 0.000001) return '<0.000001 VBC';
      if (numValue < 1) return `${numValue.toFixed(6)} VBC`;
      if (numValue < 1000) return `${numValue.toFixed(4)} VBC`;
      return `${numValue.toLocaleString(undefined, { maximumFractionDigits: 4 })} VBC`;
    } catch {
      return `${value} VBC`;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString(undefined, { timeZoneName: 'short' });
  };

  const getTimeAgo = (timestamp: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const formatAddress = (address: string) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-900 text-white'>
        <Header />
        <div className='container mx-auto px-4 py-8'>
          <div className='flex justify-center items-center h-64'>
            <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500'></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='min-h-screen bg-gray-900 text-white'>
        <Header />
        <div className='container mx-auto px-4 py-8'>
          <div className='bg-red-800 border border-red-600 text-red-100 px-4 py-3 rounded mb-4'>
            <strong className='font-bold'>Error:</strong>
            <span className='block sm:inline'> {error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-900 text-white'>
      <Header />

      {/* Page Header */}
      <div className='bg-gray-800 border-b border-gray-700'>
        <div className='container mx-auto px-4 py-8'>
          <div className='flex items-center gap-3 mb-4'>
            <ArrowPathIcon className='w-8 h-8 text-green-400' />
            <h1 className='text-3xl font-bold text-gray-100'>Latest Transactions</h1>
          </div>
          <p className='text-gray-400'>
            Most recent transactions on the Virbicoin network
          </p>
        </div>
      </div>

      <main className='container mx-auto px-4 py-8'>
        <div className='bg-gray-800 rounded-lg border border-gray-700 overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead className='bg-gray-700 border-b border-gray-600'>
                <tr>
                  <th className='px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider'>
                    Transaction Hash
                  </th>
                  <th className='px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider'>
                    Block
                  </th>
                  <th className='px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider'>
                    Age
                  </th>
                  <th className='px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider'>
                    From
                  </th>
                  <th className='px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider'>
                    To
                  </th>
                  <th className='px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider'>
                    Value
                  </th>
                  <th className='px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider'>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-700'>
                {transactions.map((tx) => (
                  <tr key={tx.hash} className='hover:bg-gray-700/50 transition-colors'>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <Link
                        href={`/tx/${tx.hash}`}
                        className='text-blue-400 hover:text-blue-300 font-mono text-sm transition-colors'
                        title={tx.hash}
                      >
                        {formatAddress(tx.hash)}
                      </Link>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center'>
                        <HashtagIcon className='w-4 h-4 text-blue-400 mr-2' />
                        <Link
                          href={`/block/${tx.blockNumber}`}
                          className='text-blue-400 hover:text-blue-300 font-medium transition-colors'
                        >
                          {tx.blockNumber.toLocaleString()}
                        </Link>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center'>
                        <ClockIcon className='w-4 h-4 text-gray-400 mr-2' />
                        <div>
                          <div className='text-sm text-gray-300'>{getTimeAgo(tx.timestamp)}</div>
                          <div className='text-xs text-gray-500'>{formatTimestamp(tx.timestamp)}</div>
                        </div>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <Link
                        href={`/address/${tx.from}`}
                        className='text-green-400 hover:text-green-300 font-mono text-sm transition-colors'
                        title={tx.from}
                      >
                        {formatAddress(tx.from)}
                      </Link>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      {tx.to ? (
                        <Link
                          href={`/address/${tx.to}`}
                          className='text-purple-400 hover:text-purple-300 font-mono text-sm transition-colors'
                          title={tx.to}
                        >
                          {formatAddress(tx.to)}
                        </Link>
                      ) : (
                        <span className='text-gray-500 text-sm'>Contract Creation</span>
                      )}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span className='text-green-400 font-medium'>
                        {formatValue(tx.value)}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center'>
                        {tx.status === 1 ? (
                          <>
                            <CheckCircleIcon className='w-4 h-4 text-green-400 mr-2' />
                            <span className='text-green-400 text-sm'>Success</span>
                          </>
                        ) : tx.status === 0 ? (
                          <>
                            <XCircleIcon className='w-4 h-4 text-red-400 mr-2' />
                            <span className='text-red-400 text-sm'>Failed</span>
                          </>
                        ) : (
                          <span className='text-gray-400 text-sm'>Unknown</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {transactions.length === 0 && !loading && (
          <div className='text-center py-12'>
            <ArrowPathIcon className='w-16 h-16 text-gray-600 mx-auto mb-4' />
            <p className='text-gray-400 text-lg'>No transactions found</p>
          </div>
        )}
      </main>
    </div>
  );
}
