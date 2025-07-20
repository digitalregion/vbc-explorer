'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from './components/Header';
import Link from 'next/link';
import {
  CubeIcon,
  ArrowPathIcon, 
  ClockIcon,
  ChartBarIcon,
  GlobeAltIcon,
  HomeIcon,
  CalendarIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { formatVBC, initializeCurrency } from '../lib/bigint-utils';
import { getMinersConfig } from '../lib/config';
import Image from 'next/image';

interface Config {
  miners: Record<string, string>;
}

interface StatsData {
  latestBlock: number;
  avgBlockTime: string;
  networkHashrate: string;
  networkDifficulty: string;
  isConnected: boolean;
  totalTransactions: number;
  avgGasPrice?: string;
  activeMiners?: number;
  blockReward?: string;
  lastBlockTimestamp?: number;
  avgTransactionFee?: string;
  lastBlockTime?: string;
  activeAddresses?: number;
  totalSupply?: string;
}

interface Block {
  number: number;
  hash: string;
  timestamp: number;
  miner: string;
}

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
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

const BlockList = ({ blocks, newBlockNumbers, now, config }: { blocks: Block[], newBlockNumbers: Set<number>, now: number, config: Config | null }) => (
  <div className='bg-gray-800 rounded-lg border border-gray-700 p-6 h-full flex flex-col'>
    <div className='flex items-center justify-between mb-4'>
      <div className='flex items-center gap-2'>
        <CubeIcon className='w-6 h-6 text-green-400' />
        <h3 className='text-xl font-semibold text-gray-100'>Latest Blocks</h3>
      </div>
      <Link href='/blocks' className='text-blue-400 hover:text-blue-300 text-sm transition-colors'>
        View all →
      </Link>
    </div>
    <div className='space-y-2 flex-1'>
        {Array.isArray(blocks) && blocks.length > 0 ? (
        blocks.map((block) => (
        <div
          key={block.number}
          className={`flex justify-between items-center p-2.5 bg-gray-700/50 rounded border border-gray-600/50 hover:bg-gray-700 transition-all duration-500 ${
            newBlockNumbers.has(block.number) ?
              'new-block-animation !bg-green-500/20 !border-green-400/50 !shadow-lg !shadow-green-400/25' :
              ''
          }`}
        >
          <div className='flex items-center gap-3'>
            <Link
              href={`/block/${block.number}`}
              className={`font-mono font-bold text-base hover:underline transition-colors ${
                newBlockNumbers.has(block.number) ? 'text-green-400 hover:text-green-300' : 'text-blue-400 hover:text-blue-300'
              }`}
            >
              #{block.number}
            </Link>
            {block.number === 0 && (
              <span className='bg-yellow-600/20 text-yellow-400 text-xs font-bold px-1.5 py-0.5 rounded border border-yellow-600/50'>
                GENESIS
              </span>
            )}
          </div>
          <div className='flex-1 text-center'>
            <Link
              href={`/block/${block.hash}`}
              className={`hover:text-blue-300 font-mono text-xs transition-colors ${
                newBlockNumbers.has(block.number) ? 'text-green-400' : 'text-blue-400'
              }`}
              title={block.hash}
            >
              {block.hash.slice(0, 16)}...{block.hash.slice(-16)}
            </Link>
            <div className='text-xs text-gray-400'>
              Mined by {(() => {
                if (!block.miner) return 'Unknown';
                if (config?.miners && Object.keys(config.miners).length > 0) {
                  const minerKey = Object.keys(config.miners).find(
                    key => key.toLowerCase() === block.miner.toLowerCase()
                  );
                  if (minerKey) {
                    return (
                      <Link
                        href={`/address/${block.miner}`}
                        className='text-blue-400 hover:text-blue-300 transition-colors hover:underline'
                      >
                        {config.miners[minerKey]}
                      </Link>
                    );
                  }
                }
                return (
                  <Link
                    href={`/address/${block.miner}`}
                    className='text-blue-400 hover:text-blue-300 transition-colors hover:underline'
                  >
                    {`${block.miner.slice(0, 6)}...${block.miner.slice(-4)}`}
                  </Link>
                );
              })()}
            </div>
          </div>
          <div className='flex flex-col items-end gap-1'>
            <div className='text-xs text-gray-400'>
              <span className='flex gap-1 justify-end'>
                {block.timestamp ? (
                  <div className='flex items-center'>
                    <ClockIcon className='w-4 h-4 text-gray-400 mr-1' />
                    <div>
                      <div className='text-xs text-gray-300'>
                        {(() => {
                          const secondsAgo = Math.floor(now / 1000 - block.timestamp);
                          if (secondsAgo < 60) return `${secondsAgo}s ago`;
                          if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
                          if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
                          return `${Math.floor(secondsAgo / 86400)}d ago`;
                        })()}
                      </div>
                      <div className='text-xs text-gray-500'>
                        {new Date(block.timestamp * 1000).toLocaleString(undefined, { timeZoneName: 'short' }) || 'N/A'}
                      </div>
                    </div>
                  </div>
                ) : 'Unknown'}
              </span>
            </div>
          </div>
        </div>
        ))
      ) : (
        <div className='text-center py-8'>
          <p className='text-gray-400'>No blocks available</p>
        </div>
      )}
    </div>
  </div>
);
 
const TransactionList = ({ transactions, newTransactionHashes, now }: { transactions: Transaction[], newTransactionHashes: Set<string>, now: number }) => (
  <div className='bg-gray-800 rounded-lg border border-gray-700 p-6 h-full flex flex-col'>
    <div className='flex items-center justify-between mb-4'>
      <div className='flex items-center gap-2'>
        <ArrowPathIcon className='w-6 h-6 text-blue-400' />
        <h3 className='text-xl font-semibold text-gray-100'>Latest Transactions</h3>
      </div>
      <Link href='/transactions' className='text-blue-400 hover:text-blue-300 text-sm transition-colors'>
        View all →
      </Link>
    </div>
    <div className='space-y-2 flex-1'>
        {Array.isArray(transactions) && transactions.length > 0 ? (
        transactions.map((tx) => (
        <div
          key={tx.hash}
          className={`flex justify-between items-center p-2.5 bg-gray-700/50 rounded border border-gray-600/50 hover:bg-gray-700 transition-all duration-500 ${
            newTransactionHashes.has(tx.hash) ?
              'new-block-animation !bg-green-500/20 !border-green-400/50 !shadow-lg !shadow-green-400/25' :
              ''
          }`}
        >
          <div className='flex items-center gap-3'>
            <Link
              href={`/transactions/${tx.hash}`}
              className='font-mono font-bold text-sm text-blue-400 hover:text-blue-300 hover:underline transition-colors'
              title={tx.hash}
            >
              {tx.hash.slice(0, 16)}...{tx.hash.slice(-16)}
            </Link>
            <span className='text-sm text-green-400 font-bold'>
              {tx.value ? formatVBC(tx.value) : '0 VBC'}
            </span>
          </div>
          <div className='flex-1 text-center'>
            <div className='text-xs text-gray-400'>
              <div>From: {tx.from ? (
                <Link
                  href={`/address/${tx.from}`}
                  className='text-blue-400 hover:text-blue-300 transition-colors hover:underline'
                >
                  {`${tx.from.slice(0, 6)}...${tx.from.slice(-4)}`}
                </Link>
              ) : 'Unknown'}</div>
              <div>To: {tx.to ? (
                <Link
                  href={`/address/${tx.to}`}
                  className='text-blue-400 hover:text-blue-300 transition-colors hover:underline'
                >
                  {`${tx.to.slice(0, 6)}...${tx.to.slice(-4)}`}
                </Link>
              ) : 'Unknown'}</div>
            </div>
          </div>
          <div className='flex flex-col items-end gap-1'>
            <div className='text-xs text-gray-400'>
              <span className='flex gap-1 justify-end'>
                {tx.timestamp ? (
                  <div className='flex items-center'>
                    <ClockIcon className='w-4 h-4 text-gray-400 mr-1' />
                    <div>
                      <div className='text-xs text-gray-300'>
                        {(() => {
                          const secondsAgo = Math.floor(now / 1000 - tx.timestamp);
                          if (secondsAgo < 60) return `${secondsAgo}s ago`;
                          if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
                          if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
                          return `${Math.floor(secondsAgo / 86400)}d ago`;
                        })()}
                      </div>
                      <div className='text-xs text-gray-500'>
                        {new Date(tx.timestamp * 1000).toLocaleString(undefined, { timeZoneName: 'short' }) || 'N/A'}
                      </div>
                    </div>
                  </div>
                ) : 'Unknown'}
              </span>
            </div>
          </div>
        </div>
        ))
      ) : (
        <div className='text-center py-8'>
          <p className='text-gray-400'>No transactions available</p>
        </div>
      )}
    </div>
  </div>
);

export default function Page() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
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
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [newBlockNumbers, setNewBlockNumbers] = useState<Set<number>>(new Set());
  const [newTransactionHashes, setNewTransactionHashes] = useState<Set<string>>(new Set());
  const [lastTopBlock, setLastTopBlock] = useState<number>(0);
  const [lastTopTransactionHash, setLastTopTransactionHash] = useState<string>('');
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);
  const [now, setNow] = useState(Date.now());
  const [config, setConfig] = useState<{ miners: Record<string, string> } | null>(null);

  // Ref for the add network button
  const addVbcButtonRef = useRef<HTMLButtonElement | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  useEffect(() => {
    // 設定を取得
    const fetchConfig = async () => {
      try {
        // Initialize currency conversion factors
        await initializeCurrency();
        
        // Fetch config from API
        const response = await fetch('/api/config');
        if (response.ok) {
          const configData = await response.json();
          setConfig({ miners: configData.miners || {} });
        } else {
          const minersConfig = await getMinersConfig();
          setConfig({ miners: minersConfig });
        }
      } catch (err) {
        console.error('Error loading config:', err);
        const minersConfig = await getMinersConfig();
        setConfig({ miners: minersConfig });
      }
    };

    fetchConfig();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch enhanced stats
        const statsResponse = await fetch('/api/stats?enhanced=true');
        const statsData = await statsResponse.json();
        setStats(statsData);

        // Fetch blocks
        const blocksResponse = await fetch('/api/blocks');
        const blocksData = await blocksResponse.json();

        // Check for new blocks to animate (only after initial load)
        const newTopBlock = blocksData.blocks?.[0]?.number;

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
            const newBlocks = blocksData.blocks?.filter((block: Block) => block.number > lastTopBlock) || [];
            const newBlockNums = new Set<number>(newBlocks.map((block: Block) => block.number));

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

        // Ensure blocksData is an array and limit to 25 items
        const blocksArray = Array.isArray(blocksData.blocks) ? blocksData.blocks.slice(0, 25) : [];
        setBlocks(blocksArray);

        // Fetch transactions
        const transactionsResponse = await fetch('/api/transactions');
        const transactionsData = await transactionsResponse.json();

        // Check for new transactions to animate (only after initial load)
        const newTopTransactionHash = transactionsData[0]?.hash;

        if (isInitialLoad) {
          // On initial load, just set the lastTopTransactionHash without animation
          if (newTopTransactionHash) {
            setLastTopTransactionHash(newTopTransactionHash);
          }
        } else {
          // Only animate transactions discovered after page load
          if (newTopTransactionHash && lastTopTransactionHash && newTopTransactionHash !== lastTopTransactionHash) {
            // Clear any existing animations first
            setNewTransactionHashes(new Set());

            // Find all new transactions discovered in this update
            // Compare with the last known transaction hash to detect new ones
            const newTransactions = transactionsData.filter((tx: Transaction) => 
              tx.hash !== lastTopTransactionHash
            );
            const newTransactionHashesSet = new Set<string>(newTransactions.map((tx: Transaction) => tx.hash));

            // Start animation for new transactions
            setTimeout(() => {
              setNewTransactionHashes(newTransactionHashesSet);
            }, 100);

            // Remove animation after 3 seconds
            setTimeout(() => {
              setNewTransactionHashes(new Set());
            }, 3100);

            setLastTopTransactionHash(newTopTransactionHash);
          }
        }

        // Ensure transactionsData is an array and limit to 25 items
        const transactionsArray = Array.isArray(transactionsData) ? transactionsData.slice(0, 25) : [];
        setTransactions(transactionsArray);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();

    // Set up polling for real-time updates
    const interval = setInterval(fetchData, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [isInitialLoad, lastTopBlock, lastTopTransactionHash]); // Add dependencies to ensure proper updates

  useEffect(() => {
    const button = addVbcButtonRef.current;
    const handleClick = async () => {
      try {
        await (window as unknown as { ethereum?: { request: (params: { method: string; params: unknown[] }) => Promise<unknown> } }).ethereum?.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x149',
            chainName: 'VirBiCoin',
            nativeCurrency: {
              name: 'VirBiCoin',
              symbol: 'VBC',
              decimals: 18,
            },
            rpcUrls: ['https://rpc.digitalregion.jp'],
            blockExplorerUrls: ['https://explorer.digitalregion.jp'],
            iconUrls: ['https://vbc.digitalregion.jp/VBC.svg']
          }],
        });
      } catch (addError) {
        console.error('Failed to add VirBiCoin network:', addError);
      }
    };
    button?.addEventListener('click', handleClick);
    return () => {
      button?.removeEventListener('click', handleClick);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <Header />
      {/* Page Header */}
      <div className='bg-gray-800 border-b border-gray-700'>
        <div className='container mx-auto px-4 py-8'>
          <div className='flex items-center gap-3 mb-4'>
            <HomeIcon className='w-8 h-8 text-blue-400' />
            <h1 className='text-3xl font-bold text-gray-100'>VirBiCoin Block Explorer</h1>
          </div>
          <p className='text-gray-400'>Real-time blockchain explorer - search blocks, transactions, addresses, and tokens.</p>
        </div>
      </div>

      <main className='container mx-auto px-4 py-8'>
        {/* Unified Card: Blockchain Search + Add VirBiCoin */}
        <div className='mb-8 bg-gray-800 border border-gray-700 rounded-lg shadow flex flex-col sm:flex-row items-center gap-6 sm:gap-8 p-4 sm:p-6'>
          {/* Left: Title + Description + Search */}
          <div className='w-full sm:flex-1 min-w-[220px]'>
            <div className='flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mb-1'>
              <div className='text-lg text-gray-100 font-bold'>Blockchain Search</div>
              <div className='text-gray-400 text-sm'>Search for blocks, transactions, or wallet addresses on the VirBiCoin network</div>
            </div>
            <form
              onSubmit={handleSearch}
              className='flex gap-2 items-center bg-gray-800 rounded-lg px-2 sm:px-3 py-2 h-[44px] sm:h-[48px] shadow max-w-full w-full'
              style={{ marginBottom: 0 }}
            >
              <input
                type='text'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Search blocks, transactions, addresses...'
                className='flex-1 bg-gray-700 border border-gray-600 text-gray-200 rounded px-2 py-1 focus:border-blue-500 focus:outline-none text-sm h-8 max-w-full w-full'
                style={{ minWidth: 0 }}
              />
              <button
                type='submit'
                className='bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors text-sm h-8 border border-blue-700 min-w-[70px]'
                disabled={!searchQuery.trim()}
              >
                Search
              </button>
            </form>
          </div>
          {/* Right: Add VirBiCoin Button */}
          <button
            id='add-vbc-button'
            ref={addVbcButtonRef}
            className='w-full sm:w-auto mt-4 sm:mt-0 px-5 py-2 bg-gray-900 border border-blue-600 hover:bg-blue-600 text-white font-bold rounded-lg shadow transition-all duration-200 flex items-center justify-center gap-2 text-base h-[44px] sm:h-[48px] whitespace-nowrap'
          >
            <Image src='/img/MetaMask.svg' alt='MetaMask' width={24} height={24} className='w-6 h-6' />
            Add VirBiCoin
          </button>
        </div>
        {/* Summary Cards */}
        <section className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
          <SummaryCard
            title='Latest Block'
            value={stats.latestBlock.toLocaleString()}
            sub='Live updates'
            icon={<CubeIcon className='w-8 h-8 text-green-400' />}
            isLive={stats.isConnected}
          />
          <SummaryCard
            title='Average Block Time'
            value={`${stats.avgBlockTime}s`}
            sub='Last 100 blocks'
            icon={<ClockIcon className='w-8 h-8 text-yellow-400' />}
          />
          <SummaryCard
            title='Network Hashrate'
            value={stats.networkHashrate || 'N/A'}
            sub='Current mining power'
            icon={<GlobeAltIcon className='w-8 h-8 text-orange-400' />}
          />
          <SummaryCard
            title='Last Block Found'
            value={stats.lastBlockTimestamp && stats.lastBlockTimestamp > 0 ? (() => {
              const secondsAgo = Math.floor(now / 1000 - stats.lastBlockTimestamp);
              if (secondsAgo < 0) return '0s ago';
              if (secondsAgo < 60) return `${secondsAgo}s ago`;
              if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
              if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
              return `${Math.floor(secondsAgo / 86400)}d ago`;
            })() : (stats.lastBlockTime || 'Unknown')}
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
            icon={<ArrowPathIcon className='w-8 h-8 text-blue-400' />}
          />
          <SummaryCard
            title='Network Difficulty'
            value={stats.networkDifficulty || 'N/A'}
            sub='Current difficulty'
            icon={<ChartBarIcon className='w-8 h-8 text-orange-400' />}
          />
          <SummaryCard
            title='Active Miners'
            value={(stats.activeMiners || 0).toString()}
            sub='Last 100 blocks'
            icon={<UserGroupIcon className='w-8 h-8 text-cyan-400' />}
          />
          <SummaryCard
            title='Avg Transaction Fee'
            value={stats.avgTransactionFee || '0 Gwei'}
            sub='Average gas price for transactions'
            icon={<ChartBarIcon className='w-8 h-8 text-rose-400' />}
          />
        </section>

        {/* Latest Blocks & Transactions */}
        <section className='grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch'>
          <BlockList blocks={blocks} newBlockNumbers={newBlockNumbers} now={now} config={config} />
          <TransactionList transactions={transactions} newTransactionHashes={newTransactionHashes} now={now} />
        </section>
      </main>
    </>
  );
}
