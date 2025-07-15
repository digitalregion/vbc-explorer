'use client';

import Header from '../../components/Header';
import Link from 'next/link';
import {
  CubeIcon,
  ArrowLeftIcon,
  FireIcon,
  HashtagIcon,
  UserIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { weiToVBC, formatVBC } from '../../../lib/bigint-utils';

// Dynamic config loading
const config: Record<string, unknown> = {
  miners: {
    "0x950302976387b43E042aeA242AE8DAB8e5C204D1": "digitalregion.jp",
    "0x6C0DB3Ea9EEd7ED145f36da461D84A8d02596B08": "coolpool.top"
  }
};

interface BlockData {
  number: number;
  hash: string;
  parentHash: string;
  timestamp: number;
  miner: string;
  difficulty: string;
  totalDifficulty: string;
  size: number;
  gasLimit: number;
  gasUsed: number;
  nonce: string;
  transactionCount: number;
  transactions: Array<{
    hash: string;
    from: string;
    to: string;
    value: string;
    gasUsed: number;
    gasPrice: string;
    status: number;
    transactionIndex: number;
  }>;
  blockReward?: string;
}

export default function BlockDetailsPage() {
  const params = useParams();
  const blockIdentifier = params?.number as string;
  const [block, setBlock] = useState<BlockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlockDetails = async () => {
      if (!blockIdentifier) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/blocks/${blockIdentifier}`);

        if (!response.ok) {
          throw new Error('Block not found');
        }

        const blockData = await response.json();
        setBlock(blockData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch block details');
      } finally {
        setLoading(false);
      }
    };

    fetchBlockDetails();
  }, [blockIdentifier]);

  if (loading) {
    return (
      <>
        <Header />
        <div className='bg-gray-800 border-b border-gray-700'>
          <div className='container mx-auto px-4 py-8'>
            <div className='flex items-center gap-3 mb-4'>
              <CubeIcon className='w-8 h-8 text-blue-400' />
              <h1 className='text-3xl font-bold text-gray-100'>Block Details</h1>
            </div>
            <p className='text-gray-400'>Loading block information...</p>
          </div>
        </div>
        <main className='container mx-auto px-4 py-8'>
          <div className='bg-gray-800 rounded-lg border border-gray-700 p-8 text-center'>
            <div className='animate-spin w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full mx-auto mb-4'></div>
            <p className='text-gray-400'>Loading block details...</p>
          </div>
        </main>
      </>
    );
  }

  if (error || !block) {
    return (
      <>
        <Header />
        <div className='bg-gray-800 border-b border-gray-700'>
          <div className='container mx-auto px-4 py-8'>
            <div className='flex items-center gap-3 mb-4'>
              <CubeIcon className='w-8 h-8 text-red-400' />
              <h1 className='text-3xl font-bold text-gray-100'>Block Not Found</h1>
            </div>
            <p className='text-gray-400'>The requested block could not be found.</p>
          </div>
        </div>
        <main className='container mx-auto px-4 py-8'>
          <div className='bg-gray-800 rounded-lg border border-gray-700 p-8 text-center'>
            <p className='text-red-400 mb-4'>{error || 'Block not found'}</p>
            <Link
              href='/'
              className='inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors'
            >
              <ArrowLeftIcon className='w-4 h-4' />
              Back to Explorer
            </Link>
          </div>
        </main>
      </>
    );
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString(undefined, { timeZoneName: 'short' });
  };

  const getTimeAgo = (timestamp: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const formatDifficulty = (difficulty: string | number) => {
    if (!difficulty) return 'N/A';

    const num = typeof difficulty === 'string' ? parseFloat(difficulty) : difficulty;
    if (isNaN(num)) return difficulty.toString();

    if (num >= 1e12) {
      return `${(num / 1e12).toFixed(2)} TH`;
    } else if (num >= 1e9) {
      return `${(num / 1e9).toFixed(2)} GH`;
    } else if (num >= 1e6) {
      return `${(num / 1e6).toFixed(2)} MH`;
    } else if (num >= 1e3) {
      return `${(num / 1e3).toFixed(2)} KH`;
    }
    return `${num.toFixed(2)} H`;

  };

  const getMinerDisplayInfo = (miner: string) => {
    if (!miner) return { name: 'Unknown', isPool: false, address: null };

    if ((config as { miners?: Record<string, string> }).miners) {
      const minerKey = Object.keys((config as { miners?: Record<string, string> }).miners || {}).find(
        key => key.toLowerCase() === miner.toLowerCase()
      );
      if (minerKey) {
        return {
          name: (config as { miners?: Record<string, string> }).miners![minerKey],
          isPool: true,
          address: miner
        };
      }
    }

    return {
      name: miner,
      isPool: false,
      address: miner
    };
  };

  return (
    <>
      <Header />
      {/* Page Header */}
      <div className='bg-gray-800 border-b border-gray-700'>
        <div className='container mx-auto px-4 py-8'>
          <div className='flex items-center gap-3 mb-4'>
            <CubeIcon className='w-8 h-8 text-blue-400' />
            <h1 className='text-3xl font-bold text-gray-100'>Block Details</h1>
          </div>
          <div className='flex items-center gap-4'>
            <Link
              href='/'
              className='inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors'
            >
              <ArrowLeftIcon className='w-4 h-4' />
              Back to Explorer
            </Link>
            <span className='text-gray-400'>
              Block #{block.number.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <main className='container mx-auto px-4 py-8'>
        {/* Block Overview */}
        <section className='bg-gray-800 rounded-lg border border-gray-700 p-6 mb-8'>
          <h2 className='text-xl font-bold text-gray-100 mb-6 flex items-center gap-2'>
            <HashtagIcon className='w-6 h-6 text-blue-400' />
            Block Overview
          </h2>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            <div className='space-y-2'>
              <p className='text-sm text-gray-400'>Block Number</p>
              <Link
                href={`/block/${block.number}`}
                className='text-lg font-mono text-blue-400 hover:text-blue-300 hover:underline transition-colors'
                title={`Block #${block.number}`}
              >
                #{block.number.toLocaleString()}
              </Link>
            </div>

            <div className='space-y-2'>
              <p className='text-sm text-gray-400'>Timestamp</p>
              {block.number === 0 ? (
                <span className='bg-yellow-600/20 text-yellow-400 text-xs font-bold px-2 py-1 rounded border border-yellow-600/50 inline-block'>
                  GENESIS
                </span>
              ) : (
                <div className='flex items-center'>
                  <ClockIcon className='w-4 h-4 text-gray-400 mr-2' />
                  <div>
                    <div className='text-sm text-gray-300'>{getTimeAgo(block.timestamp)}</div>
                    <div className='text-xs text-gray-500'>{formatTimestamp(block.timestamp)}</div>
                  </div>
                </div>
              )}
            </div>

            <div className='space-y-2'>
              <p className='text-sm text-gray-400'>Transactions</p>
              <p className='text-lg font-mono text-green-400'>{block.transactionCount || block.transactions?.length || 0}</p>
            </div>

            <div className='space-y-2'>
              <p className='text-sm text-gray-400'>Mined by</p>
              <div className='text-sm text-gray-200 flex items-center gap-2'>
                <UserIcon className='w-4 h-4 text-gray-400' />
                {(() => {
                  const minerInfo = getMinerDisplayInfo(block.miner);
                  return (
                    <Link
                      href={`/address/${block.miner}`}
                      className='text-green-400 hover:text-green-300 transition-colors hover:underline'
                      title={`View account details for ${minerInfo.name} (${block.miner})`}
                    >
                      {minerInfo.name}
                    </Link>
                  );
                })()}
              </div>
            </div>

            <div className='space-y-2'>
              <p className='text-sm text-gray-400'>Gas Used / Limit</p>
              <p className='text-sm text-gray-200 flex items-center gap-2'>
                <FireIcon className='w-4 h-4 text-orange-400' />
                {block.gasUsed?.toLocaleString()} / {block.gasLimit?.toLocaleString()}
                <span className='text-xs text-gray-400'>
                  ({((block.gasUsed / block.gasLimit) * 100).toFixed(1)}%)
                </span>
              </p>
            </div>

            <div className='space-y-2'>
              <p className='text-sm text-gray-400'>Block Size</p>
              <p className='text-lg font-mono text-yellow-400'>{block.size?.toLocaleString()} bytes</p>
            </div>
          </div>
        </section>

        {/* Block Hash Information */}
        <section className='bg-gray-800 rounded-lg border border-gray-700 p-6 mb-8'>
          <h2 className='text-xl font-bold text-gray-100 mb-6'>Hash Information</h2>

          <div className='space-y-4'>
            <div>
              <p className='text-sm text-gray-400 mb-2'>Block Hash</p>
              <Link
                href={`/block/${block.hash}`}
                className='font-mono text-sm text-blue-400 hover:text-blue-300 break-all bg-gray-700/50 p-3 rounded border border-gray-600 block transition-colors hover:bg-gray-700'
                title={`Block hash: ${block.hash}`}
              >
                {block.hash}
              </Link>
            </div>

            <div>
              <p className='text-sm text-gray-400 mb-2'>Parent Hash</p>
              <Link
                href={`/block/${block.parentHash}`}
                className='font-mono text-sm text-blue-400 hover:text-blue-300 break-all bg-gray-700/50 p-3 rounded border border-gray-600 block transition-colors hover:bg-gray-700'
                title={`Go to parent block: ${block.parentHash}`}
              >
                {block.parentHash}
              </Link>
            </div>

            {block.nonce && (
              <div>
                <p className='text-sm text-gray-400 mb-2'>Nonce</p>
                <p className='font-mono text-sm text-green-400 bg-gray-700/50 p-3 rounded border border-gray-600'>
                  {block.nonce}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Difficulty Information */}
        {(block.difficulty || block.totalDifficulty) && (
          <section className='bg-gray-800 rounded-lg border border-gray-700 p-6 mb-8'>
            <h2 className='text-xl font-bold text-gray-100 mb-6'>Mining Information</h2>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              {block.difficulty && (
                <div className='space-y-2'>
                  <p className='text-sm text-gray-400'>Difficulty</p>
                  <p className='font-mono text-sm text-orange-400'>{formatDifficulty(block.difficulty)}</p>
                </div>
              )}

              {block.totalDifficulty && (
                <div className='space-y-2'>
                  <p className='text-sm text-gray-400'>Total Difficulty</p>
                  <p className='font-mono text-sm text-orange-400'>{formatDifficulty(block.totalDifficulty)}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Transactions */}
        {block.transactions && block.transactions.length > 0 && (
          <section className='bg-gray-800 rounded-lg border border-gray-700 p-6'>
            <h2 className='text-xl font-bold text-gray-100 mb-6'>
              Transactions ({block.transactions.length})
            </h2>

            <div className='space-y-3'>
              {block.transactions.slice(0, 10).map((tx: {
                hash: string;
                from: string;
                to: string;
                value: string;
                gasUsed: number;
                gasPrice: string;
                status: number;
                transactionIndex: number;
              }, index: number) => (
                <div
                  key={tx.hash || index}
                  className='flex justify-between items-center p-3 bg-gray-700/50 rounded border border-gray-600/50 hover:bg-gray-700 transition-colors'
                >
                  <div className='flex flex-col gap-1'>
                    <Link
                      href={`/tx/${tx.hash}`}
                      className='text-blue-400 hover:text-blue-300 font-mono text-sm transition-colors break-all'
                      title={tx.hash}
                    >
                      {tx.hash.slice(0, 16)}...{tx.hash.slice(-16)}
                    </Link>
                    <div className='text-xs text-gray-400'>
                      From: {tx.from ? `${tx.from.slice(0, 8)}...${tx.from.slice(-4)}` : 'Unknown'} →
                      To: {tx.to ? `${tx.to.slice(0, 8)}...${tx.to.slice(-4)}` : 'Unknown'}
                    </div>
                  </div>
                  <div className='text-right'>
                    <p className='text-sm text-green-400 font-bold'>
                      {tx.value ? (() => {
                        try {
                          const vbcValue = weiToVBC(tx.value);
                          return formatVBC(vbcValue);
                        } catch {
                          return '0 VBC';
                        }
                      })() : '0 VBC'}
                    </p>
                  </div>
                </div>
              ))}

              {block.transactions.length > 10 && (
                <div className='text-center pt-4'>
                  <p className='text-gray-400 text-sm'>
                    Showing 10 of {block.transactions.length} transactions
                  </p>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
