'use client';

import Header from '../components/Header';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { CubeIcon, ClockIcon, UserIcon, HashtagIcon, FireIcon } from '@heroicons/react/24/outline';
import config from '../../config.json';

interface Block {
  number: number;
  hash: string;
  miner: string;
  timestamp: number;
  transactions?: number;
  gasUsed?: number;
  gasLimit?: number;
}

export default function BlocksPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlocks = async () => {
      try {
        const response = await fetch('/api/blocks');
        if (!response.ok) {
          throw new Error('Failed to fetch blocks');
        }
        const data = await response.json();
        setBlocks(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchBlocks();
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchBlocks, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString(undefined, { timeZoneName: 'short' }) || 'N/A';
  };

  const getTimeAgo = (timestamp: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const getMinerDisplayInfo = (miner: string) => {
    if (!miner) return { name: 'Unknown', isPool: false, address: null };

    if (config.miners) {
      const minerKey = Object.keys(config.miners).find(
        key => key.toLowerCase() === miner.toLowerCase()
      );
      if (minerKey) {
        return {
          name: config.miners[minerKey],
          isPool: true,
          address: miner
        };
      }
    }

    return {
      name: `${miner.slice(0, 12)}...${miner.slice(-12)}`,
      isPool: false,
      address: miner
    };
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
            <CubeIcon className='w-8 h-8 text-blue-400' />
            <h1 className='text-3xl font-bold text-gray-100'>Latest Blocks</h1>
          </div>
          <p className='text-gray-400'>
            Most recent blocks on the Virbicoin network
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
                    Block
                  </th>
                  <th className='px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider'>
                    Age
                  </th>
                  <th className='px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider'>
                    Miner
                  </th>
                  <th className='px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider'>
                    Transactions
                  </th>
                  <th className='px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider'>
                    Gas Used
                  </th>
                  <th className='px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider'>
                    Hash
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-700'>
                {blocks.map((block) => (
                  <tr key={block.number} className='hover:bg-gray-700/50 transition-colors'>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center gap-2'>
                        <HashtagIcon className='w-4 h-4 text-blue-400 mr-2' />
                        <Link
                          href={`/block/${block.number}`}
                          className='text-blue-400 hover:text-blue-300 font-medium transition-colors'
                        >
                          {block.number.toLocaleString()}
                        </Link>
                        {block.number === 0 && (
                          <span className='bg-yellow-600/20 text-yellow-400 text-xs font-bold px-2 py-1 rounded border border-yellow-600/50'>
                            GENESIS
                          </span>
                        )}
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center'>
                        <ClockIcon className='w-4 h-4 text-gray-400 mr-2' />
                        <div>
                          <div className='text-sm text-gray-300'>{getTimeAgo(block.timestamp)}</div>
                          <div className='text-xs text-gray-500'>{formatTimestamp(block.timestamp)}</div>
                        </div>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center'>
                        <UserIcon className='w-4 h-4 text-green-400 mr-2' />
                        {(() => {
                          const minerInfo = getMinerDisplayInfo(block.miner);
                          if (minerInfo.isPool) {
                            return (
                              <Link
                                href={`/address/${block.miner}`}
                                className='text-green-400 hover:text-green-300 font-mono text-sm transition-colors hover:underline'
                                title={`View account details for ${minerInfo.name} (${block.miner})`}
                              >
                                {minerInfo.name}
                              </Link>
                            );
                          }
                          return (
                            <Link
                              href={`/address/${block.miner}`}
                              className='text-green-400 hover:text-green-300 font-mono text-sm transition-colors hover:underline'
                              title={`View account details for ${block.miner}`}
                            >
                              {minerInfo.name}
                            </Link>
                          );

                        })()}
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span className='text-gray-300 font-medium'>
                        {block.transactions || 0}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center'>
                        <FireIcon className='w-4 h-4 text-orange-400 mr-2' />
                        <div>
                          <div className='text-sm text-gray-300'>
                            {block.gasUsed ? block.gasUsed.toLocaleString() : 'N/A'}
                          </div>
                          {block.gasLimit && (
                            <div className='text-xs text-gray-500'>
                              / {block.gasLimit.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <Link
                        href={`/block/${block.hash}`}
                        className='text-gray-400 hover:text-gray-300 font-mono text-sm transition-colors'
                        title={block.hash}
                      >
                        {`${block.hash.slice(0, 10)}...${block.hash.slice(-8)}`}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {blocks.length === 0 && !loading && (
          <div className='text-center py-12'>
            <CubeIcon className='w-16 h-16 text-gray-600 mx-auto mb-4' />
            <p className='text-gray-400 text-lg'>No blocks found</p>
          </div>
        )}
      </main>
    </div>
  );
}
