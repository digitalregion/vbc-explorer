'use client';

import Header from './components/Header';
import Link from 'next/link';
import {
  CubeIcon,
  ClockIcon,
  ChartBarIcon,
  GlobeAltIcon,
  ArrowPathIcon,
  UserGroupIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';

interface StatsData {
  latestBlock: number;
  avgBlockTime: string;
  networkHashrate: string;
  networkDifficulty: string;
  isConnected: boolean;
  totalTransactions: number;
  avgGasPrice: string;
  activeMiners: number;
  blockReward: string;
  lastBlockTimestamp?: number;
}

const SummaryCard = ({ title, value, sub, icon, isLive, trend }: {
  title: string;
  value: string;
  sub: string;
  icon?: React.ReactNode;
  isLive?: boolean;
  trend?: 'up' | 'down' | 'stable';
}) => (
  <div className='bg-gray-800 rounded-lg border border-gray-700 p-6 flex items-center gap-4 min-h-[140px] h-full transition-all duration-300 hover:shadow-lg hover:bg-gray-700/80 hover:border-gray-600'>
    {icon && (
      <div className='flex-shrink-0'>
        {icon}
      </div>
    )}
    <div className='space-y-2'>
      <h3 className='text-lg font-semibold text-gray-300 mb-1'>{title}</h3>
      <p className='text-2xl font-bold text-blue-500'>{value}</p>
      {sub && (
        <div className='flex items-center gap-2'>
          {isLive !== undefined && (
            <div className='flex items-center gap-1'>
              <div className={`w-2 h-2 rounded-full ${
                isLive ?
                  'bg-green-400 animate-pulse' :
                  'bg-red-400'
              }`}></div>
              <span className={`text-xs font-medium ${
                isLive ?
                  'text-green-400 animate-pulse' :
                  'text-red-400'
              }`}>
                {isLive ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>
          )}
          {trend && (
            <div className={`text-xs font-medium ${
              trend === 'up' ? 'text-green-400' :
                trend === 'down' ? 'text-red-400' :
                  'text-gray-400'
            }`}>
              {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
            </div>
          )}
          <p className='text-sm text-gray-400'>{sub}</p>
        </div>
      )}
    </div>
  </div>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BlockList = ({ blocks, newBlockNumbers }: { blocks: any[], newBlockNumbers: Set<number> }) => (
  <div className='bg-gray-800 rounded-lg border border-gray-700 p-6'>
    <div className='flex items-center justify-between mb-4'>
      <div className='flex items-center gap-2'>
        <CubeIcon className='w-6 h-6 text-blue-400' />
        <h3 className='text-xl font-semibold text-gray-100'>Latest Blocks</h3>
      </div>
      <Link href='/blocks' className='text-blue-400 hover:text-blue-300 text-sm transition-colors'>
        View all →
      </Link>
    </div>
    <div className='space-y-3'>
      {blocks.map((block) => (
        <div
          key={block.number}
          className={`flex justify-between items-center p-3 bg-gray-700/50 rounded border border-gray-600/50 hover:bg-gray-700 transition-all duration-500 ${
            newBlockNumbers.has(block.number) ?
              'new-block-animation !bg-green-500/20 !border-green-400/50 !shadow-lg !shadow-green-400/25' :
              ''
          }`}
        >
          <div className='flex items-center gap-3'>
            <span className={`font-mono font-bold ${
              newBlockNumbers.has(block.number) ? 'text-green-400' : 'text-blue-400'
            }`}>
              #{block.number}
            </span>
          </div>
          <div className='flex flex-col items-end gap-1'>
            <Link
              href={`/block/${block.hash}`}
              className={`hover:text-blue-300 font-mono text-xs transition-colors ${
                newBlockNumbers.has(block.number) ? 'text-green-400' : 'text-blue-400'
              }`}
              title={block.hash}
            >
              {block.hash}
            </Link>
            <div className='text-xs text-gray-400'>
              <span>Mined by </span>
              <span className='font-mono'>
                {(() => {
                  if (!block.miner) return 'Unknown';
                  if (block.miner === '0x950302976387b43e042aea242ae8dab8e5c204d1') return 'digitalregion.jp';
                  if (block.miner === '0x6c0db3ea9eed7ed145f36da461d84a8d02596b08') return 'CoolPool.top';
                  return block.miner;
                })()}
              </span>
              <span className='ml-2'>
                {block.timestamp ? (() => {
                  const secondsAgo = Math.floor(Date.now() / 1000 - block.timestamp);
                  if (secondsAgo < 60) return `${secondsAgo}s ago`;
                  if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
                  if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
                  return `${Math.floor(secondsAgo / 86400)}d ago`;
                })() : 'Unknown'}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TransactionList = ({ transactions }: { transactions: any[] }) => (
  <div className='bg-gray-800 rounded-lg border border-gray-700 p-6'>
    <div className='flex items-center justify-between mb-4'>
      <div className='flex items-center gap-2'>
        <ArrowPathIcon className='w-6 h-6 text-green-400' />
        <h3 className='text-xl font-semibold text-gray-100'>Latest Transactions</h3>
      </div>
      <Link href='/transactions' className='text-blue-400 hover:text-blue-300 text-sm transition-colors'>
        View all →
      </Link>
    </div>
    <div className='space-y-3'>
      {transactions.map((tx) => (
        <div key={tx.hash} className='p-3 bg-gray-700/50 rounded border border-gray-600/50 hover:bg-gray-700 transition-colors'>
          <div className='mb-2'>
            <Link
              href={`/tx/${tx.hash}`}
              className='text-blue-400 hover:text-blue-300 font-mono text-sm transition-colors break-all'
              title={tx.hash}
            >
              {tx.hash}
            </Link>
          </div>
          <div className='text-xs text-gray-400 mb-1'>
            From: {tx.from ? `${tx.from.slice(0, 20)}...` : 'Unknown'} → To: {tx.to ? `${tx.to.slice(0, 20)}...` : 'Unknown'}
          </div>
          <div className='flex justify-between items-center'>
            <span className='text-sm text-green-400 font-bold'>
              {tx.value ? `${(parseInt(tx.value, 10) / 1e18).toFixed(4)} VBC` : '0 VBC'}
            </span>
            <span className='text-xs text-gray-500'>
              {tx.timestamp ? (() => {
                const secondsAgo = Math.floor(Date.now() / 1000 - tx.timestamp);
                if (secondsAgo < 60) return `${secondsAgo}s ago`;
                if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
                if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
                return `${Math.floor(secondsAgo / 86400)}d ago`;
              })() : 'Unknown'}
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default function Page() {
  const [stats, setStats] = useState<StatsData>({
    latestBlock: 0,
    avgBlockTime: '0',
    networkHashrate: '0',
    networkDifficulty: '0',
    isConnected: false,
    totalTransactions: 0,
    avgGasPrice: '0',
    activeMiners: 0,
    blockReward: '0',
    lastBlockTimestamp: 0
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [blocks, setBlocks] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [transactions, setTransactions] = useState<any[]>([]);
  const [newBlockNumbers, setNewBlockNumbers] = useState<Set<number>>(new Set());
  const [lastTopBlock, setLastTopBlock] = useState<number>(0);
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch enhanced stats
        const statsResponse = await fetch('/api/stats-enhanced');
        const statsData = await statsResponse.json();
        setStats(statsData);

        // Fetch blocks
        const blocksResponse = await fetch('/api/blocks');
        const blocksData = await blocksResponse.json();

        // Check for new blocks to animate (only after initial load)
        const newTopBlock = blocksData[0]?.number;

        if (isInitialLoad) {
          // On initial load, just set the lastTopBlock without animation
          if (newTopBlock) {
            setLastTopBlock(newTopBlock);
          }
          setIsInitialLoad(false);
        } else {
          // Only animate blocks discovered after page load
          if (newTopBlock && lastTopBlock > 0 && newTopBlock > lastTopBlock) {
            // Clear any existing animations first
            setNewBlockNumbers(new Set());

            // Find all new blocks discovered in this update
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newBlocks = blocksData.filter((block: any) => block.number > lastTopBlock);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newBlockNums = new Set<number>(newBlocks.map((block: any) => block.number));

            console.log('New blocks detected during live update:', Array.from(newBlockNums));

            // Start animation for new blocks
            setTimeout(() => {
              setNewBlockNumbers(newBlockNums);
            }, 100);

            // Remove animation after 3 seconds
            setTimeout(() => {
              setNewBlockNumbers(new Set());
            }, 3100);

            setLastTopBlock(newTopBlock);
          }
        }

        setBlocks(blocksData);

        // Fetch transactions
        const transactionsResponse = await fetch('/api/transactions');
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();

    // Set up polling for real-time updates
    const interval = setInterval(fetchData, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [isInitialLoad, lastTopBlock]); // Add dependencies to ensure proper updates

  return (
    <>
      <Header />
      {/* Page Header */}
      <div className='page-header-container'>
        <div className='container mx-auto px-4 py-8'>
          <h1 className='text-3xl font-bold mb-2 text-gray-100'>VirBiCoin Explorer</h1>
          <p className='text-gray-400'>Real-time blockchain explorer - search blocks, transactions, and addresses</p>
        </div>
      </div>

      <main className='container mx-auto px-4 py-8'>
        {/* Summary Cards */}
        <section className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
          <SummaryCard
            title='Latest Block'
            value={stats.latestBlock.toLocaleString()}
            sub='Live updates'
            icon={<CubeIcon className='w-8 h-8 text-blue-400' />}
            isLive={stats.isConnected}
          />
          <SummaryCard
            title='Average Block Time'
            value={`${stats.avgBlockTime}s`}
            sub='Last 100 blocks'
            icon={<ClockIcon className='w-8 h-8 text-green-400' />}
          />
          <SummaryCard
            title='Network Hashrate'
            value={stats.networkHashrate || 'N/A'}
            sub='Current mining power'
            icon={<GlobeAltIcon className='w-8 h-8 text-yellow-400' />}
          />
          <SummaryCard
            title='Last Block Found'
            value={stats.lastBlockTimestamp ? (() => {
              const secondsAgo = Math.floor(Date.now() / 1000 - stats.lastBlockTimestamp);
              if (secondsAgo < 60) return `${secondsAgo}s ago`;
              if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
              if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
              return `${Math.floor(secondsAgo / 86400)}d ago`;
            })() : 'Unknown'}
            sub='Time since last block'
            icon={<CalendarIcon className='w-8 h-8 text-emerald-400' />}
          />
        </section>

        {/* Additional Stats Row */}
        <section className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
          <SummaryCard
            title='Total Transactions'
            value={stats.totalTransactions.toLocaleString()}
            sub='All time'
            icon={<ArrowPathIcon className='w-8 h-8 text-purple-400' />}
          />
          <SummaryCard
            title='Network Difficulty'
            value={stats.networkDifficulty || 'N/A'}
            sub='Current difficulty'
            icon={<ChartBarIcon className='w-8 h-8 text-orange-400' />}
          />
          <SummaryCard
            title='Active Miners'
            value={stats.activeMiners.toString()}
            sub='Last 100 blocks'
            icon={<UserGroupIcon className='w-8 h-8 text-cyan-400' />}
          />
          <SummaryCard
            title='Avg Transaction Fee'
            value={stats.avgGasPrice}
            sub='Gas price (Gwei)'
            icon={<ChartBarIcon className='w-8 h-8 text-rose-400' />}
          />
        </section>

        {/* Latest Blocks & Transactions */}
        <section className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <BlockList blocks={blocks} newBlockNumbers={newBlockNumbers} />
          <TransactionList transactions={transactions} />
        </section>

        {/* Search Section */}
        <section className='mt-12 text-center'>
          <div className='bg-gray-800 rounded-lg border border-gray-700 p-8'>
            <h2 className='text-2xl font-bold text-gray-100 mb-4'>Blockchain Search</h2>
            <p className='text-gray-400 mb-6'>Search for blocks, transactions, or wallet addresses on the VirBiCoin network</p>
            <div className='flex gap-4 max-w-md mx-auto'>
              <input
                type='text'
                placeholder='Search blocks, transactions, addresses...'
                className='flex-1 bg-gray-700 border border-gray-600 text-gray-200 rounded px-4 py-2 focus:border-blue-500 focus:outline-none'
              />
              <button className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded transition-colors'>
                Search
              </button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
