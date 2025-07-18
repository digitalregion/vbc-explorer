'use client';

import Header from '../components/Header';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { TrophyIcon } from '@heroicons/react/24/outline';

interface RichlistAccount {
  rank: number;
  address: string;
  balance: number;
  balanceFormatted: string;
  type: string;
  percentage: string;
  lastUpdated: number;
}

interface RichlistData {
  richlist: RichlistAccount[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  statistics: {
    totalSupply: number;
    totalAccounts: number;
    contractAccounts: number;
    walletAccounts: number;
  };
}

export default function RichlistPage() {
  const [richlistData, setRichlistData] = useState<RichlistData>({
    richlist: [],
    pagination: {
      page: 1,
      limit: 50,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false
    },
    statistics: {
      totalSupply: 0,
      totalAccounts: 0,
      contractAccounts: 0,
      walletAccounts: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchRichlist = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/richlist?page=${currentPage}&limit=50`);
        const data = await response.json();
        setRichlistData(data);
      } catch (error) {
        console.error('Error fetching richlist:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRichlist();
  }, [currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= richlistData.pagination.totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className='min-h-screen bg-gray-900 text-white'>
      <Header />

      {/* Page Header */}
      <div className='bg-gray-800 border-b border-gray-700'>
        <div className='container mx-auto px-4 py-8'>
          <div className='flex items-center gap-3 mb-4'>
            <TrophyIcon className='w-8 h-8 text-yellow-400' />
            <h1 className='text-3xl font-bold text-gray-100'>Rich List</h1>
          </div>
          <p className='text-gray-400'>
            Top VBC holders by balance. Total supply: {
              // Convert Wei to VBC for display
              (richlistData.statistics.totalSupply / 1e18).toLocaleString()
            } VBC
          </p>
        </div>
      </div>

      <main className='container mx-auto px-4 py-8'>
        <div className='bg-gray-800 rounded-lg border border-gray-700 p-6'>
          <div className='flex items-center justify-between mb-6'>
            <h2 className='text-xl font-semibold text-gray-100'>Top VBC Holders</h2>
            <div className='text-sm text-gray-400'>
              Showing {richlistData.richlist.length} of {richlistData.statistics.totalAccounts} accounts
            </div>
          </div>

          {loading ? (
            <div className='text-center py-8'>
              <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400'></div>
              <p className='text-gray-400 mt-2'>Loading richlist...</p>
            </div>
          ) : (
            <>
              <div className='overflow-x-auto'>
                <table className='w-full'>
                  <thead>
                    <tr className='border-b border-gray-700'>
                      <th className='text-left py-3 px-4 text-sm font-medium text-gray-300'>Rank</th>
                      <th className='text-left py-3 px-4 text-sm font-medium text-gray-300'>Address</th>
                      <th className='text-left py-3 px-4 text-sm font-medium text-gray-300'>Type</th>
                      <th className='text-left py-3 px-4 text-sm font-medium text-gray-300'>Balance</th>
                      <th className='text-left py-3 px-4 text-sm font-medium text-gray-300'>Percentage</th>
                      <th className='text-left py-3 px-4 text-sm font-medium text-gray-300'>Share</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-700'>
                    {richlistData.richlist.map((acc) => (
                      <tr key={acc.rank} className='hover:bg-gray-700/50 transition-colors'>
                        <td className='py-3 px-4'>
                          <div className='flex items-center gap-2'>
                            <span className='text-gray-200 font-bold'>#{acc.rank}</span>
                            {acc.rank <= 3 && (
                              <span className='text-lg'>
                                {acc.rank === 1 ? '🥇' : acc.rank === 2 ? '🥈' : '🥉'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className='py-3 px-4'>
                          <Link
                            href={`/address/${acc.address}`}
                            className='font-mono text-blue-400 hover:text-blue-300 transition-colors break-all'
                          >
                            {acc.address}
                          </Link>
                        </td>
                        <td className='py-3 px-4'>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            acc.type === 'Contract' ?
                              'bg-purple-500/20 text-purple-400' :
                              'bg-cyan-500/20 text-cyan-400'
                          }`}>
                            {acc.type}
                          </span>
                        </td>
                        <td className='py-3 px-4'>
                          <div className='flex flex-col'>
                            <span className='text-green-400 font-bold'>{acc.balanceFormatted}</span>
                          </div>
                        </td>
                        <td className='py-3 px-4'>
                          <span className='text-yellow-400 font-medium'>{acc.percentage}%</span>
                        </td>
                        <td className='py-3 px-4'>
                          <div className='flex items-center gap-2'>
                            <div className='flex-1 bg-gray-700 rounded-full h-3 max-w-[120px]'>
                              <div
                                className={`h-3 rounded-full ${
                                  acc.rank === 1 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                                    acc.rank === 2 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                                      acc.rank === 3 ? 'bg-gradient-to-r from-orange-400 to-yellow-600' :
                                        'bg-gradient-to-r from-blue-500 to-purple-500'
                                }`}
                                style={{ width: `${Math.min(parseFloat(acc.percentage) * 6, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {richlistData.pagination.totalPages > 1 && (
                <div className='flex justify-center items-center gap-4 mt-6'>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!richlistData.pagination.hasPrev}
                    className='px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    Previous
                  </button>
                  <span className='text-gray-400'>
                    Page {richlistData.pagination.page} of {richlistData.pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!richlistData.pagination.hasNext}
                    className='px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}

          {/* Summary Stats */}
          <div className='mt-8 grid grid-cols-1 md:grid-cols-4 gap-4'>
            <div className='bg-gray-700/50 rounded-lg p-4 border border-gray-600/50'>
              <h3 className='text-sm font-medium text-gray-300 mb-2'>Total Addresses</h3>
              <p className='text-2xl font-bold text-blue-400'>{richlistData.statistics.totalAccounts.toLocaleString()}</p>
              <p className='text-xs text-gray-400'>Active holders</p>
            </div>
            <div className='bg-gray-700/50 rounded-lg p-4 border border-gray-600/50'>
              <h3 className='text-sm font-medium text-gray-300 mb-2'>Contract Addresses</h3>
              <p className='text-2xl font-bold text-purple-400'>{richlistData.statistics.contractAccounts.toLocaleString()}</p>
              <p className='text-xs text-gray-400'>Smart contracts</p>
            </div>
            <div className='bg-gray-700/50 rounded-lg p-4 border border-gray-600/50'>
              <h3 className='text-sm font-medium text-gray-300 mb-2'>Wallet Addresses</h3>
              <p className='text-2xl font-bold text-green-400'>{richlistData.statistics.walletAccounts.toLocaleString()}</p>
              <p className='text-xs text-gray-400'>User wallets</p>
            </div>
            <div className='bg-gray-700/50 rounded-lg p-4 border border-gray-600/50'>
              <h3 className='text-sm font-medium text-gray-300 mb-2'>Top 10 Holdings</h3>
              <p className='text-2xl font-bold text-yellow-400'>
                {richlistData.richlist.length > 0 ?
                  richlistData.richlist.slice(0, Math.min(10, richlistData.richlist.length))
                    .reduce((sum: number, acc: RichlistAccount) => sum + parseFloat(acc.percentage), 0)
                    .toFixed(2) :
                  '0.00'
                }%
              </p>
              <p className='text-xs text-gray-400'>Of total supply</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
