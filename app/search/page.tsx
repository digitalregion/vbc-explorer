'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import Link from 'next/link';
import { MagnifyingGlassIcon, ArrowLeftIcon, HashtagIcon, UserIcon } from '@heroicons/react/24/outline';
import config from '../../config.json';

interface SearchResult {
  type: 'block' | 'transaction' | 'address' | 'token';
  data: Record<string, unknown>;
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams?.get('q') || '';
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState(query);

  const getMinerDisplayInfo = (miner: string) => {
    if (!miner) return { name: 'Unknown', isPool: false, address: null };

    if ((config as { miners: Record<string, string> }).miners) {
      const minerKey = Object.keys((config as { miners: Record<string, string> }).miners).find(
        key => key.toLowerCase() === miner.toLowerCase()
      );
      if (minerKey) {
        return {
          name: (config as { miners: Record<string, string> }).miners[minerKey],
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

  useEffect(() => {
    if (query) {
      performSearch(query);
    }
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      // For miner addresses, redirect to blocks filtered by that miner
      if (searchQuery.startsWith('0x') && searchQuery.length === 42) {
        // It's likely an address - search for blocks mined by this address
        const response = await fetch(`/api/search/blocks-by-miner?miner=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const blocks = await response.json();
          setResults(blocks.map((block: Record<string, unknown>) => ({ type: 'block' as const, data: block })));
        } else {
          setResults([]);
        }
      } else {
        // Try to find by block number or hash
        try {
          const blockResponse = await fetch(`/api/blocks/${searchQuery}`);
          if (blockResponse.ok) {
            const block = await blockResponse.json();
            setResults([{ type: 'block', data: block }]);
          } else {
            setResults([]);
          }
        } catch {
          setResults([]);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  return (
    <div className='min-h-screen bg-gray-900 text-white'>
      <Header />

      {/* Page Header */}
      <div className='bg-gray-800 border-b border-gray-700'>
        <div className='container mx-auto px-4 py-8'>
          <div className='flex items-center gap-3 mb-4'>
            <MagnifyingGlassIcon className='w-8 h-8 text-blue-400' />
            <h1 className='text-3xl font-bold text-gray-100'>Search Results</h1>
          </div>
          <div className='flex items-center gap-4'>
            <Link
              href='/'
              className='inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors'
            >
              <ArrowLeftIcon className='w-4 h-4' />
              Back to Explorer
            </Link>
            {query && (
              <span className='text-gray-400'>
                Results for: <span className='font-mono text-blue-400'>&quot;{query}&quot;</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <main className='container mx-auto px-4 py-8'>
        {/* Search Form */}
        <div className='bg-gray-800 rounded-lg border border-gray-700 p-6 mb-8'>
          <form onSubmit={handleSearch} className='flex gap-4'>
            <input
              type='text'
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder='Search by block number, block hash, or miner address...'
              className='flex-1 bg-gray-700 border border-gray-600 text-gray-200 rounded px-4 py-2 focus:border-blue-500 focus:outline-none'
            />
            <button
              type='submit'
              className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded transition-colors'
              disabled={loading}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>

        {/* Results */}
        <div className='bg-gray-800 rounded-lg border border-gray-700 p-6'>
          {loading ? (
            <div className='text-center py-8'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4'></div>
              <p className='text-gray-400'>Searching...</p>
            </div>
          ) : results.length > 0 ? (
            <div className='space-y-4'>
              <h2 className='text-xl font-bold text-gray-100 mb-4'>
                Found {results.length} result{results.length !== 1 ? 's' : ''}
              </h2>
              {results.map((result, index) => (
                <div key={index} className='bg-gray-700/50 rounded-lg border border-gray-600 p-4'>
                  {result.type === 'block' && (
                    <div>
                      <div className='flex items-center justify-between mb-2'>
                        <span className='text-sm text-blue-400 font-medium'>Block</span>
                        <Link
                          href={`/block/${result.data.number}`}
                          className='text-blue-400 hover:text-blue-300 text-sm transition-colors'
                        >
                          View Details →
                        </Link>
                      </div>
                      <h3 className='text-lg font-bold text-gray-100 mb-2 flex items-center gap-2'>
                        <HashtagIcon className='w-5 h-5 text-blue-400 mr-2' />
                        <Link
                          href={`/block/${result.data.number}`}
                          className='text-blue-400 hover:text-blue-300 transition-colors hover:underline'
                        >
                          {result.data.number?.toLocaleString()}
                        </Link>
                        {result.data.number === 0 && (
                          <span className='bg-yellow-600/20 text-yellow-400 text-xs font-bold px-2 py-1 rounded border border-yellow-600/50'>
                            GENESIS
                          </span>
                        )}
                      </h3>
                      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
                        <div>
                          <span className='text-gray-400'>Hash:</span>
                          <Link
                            href={`/block/${result.data.hash}`}
                            className='font-mono text-blue-400 hover:text-blue-300 ml-2 break-all transition-colors hover:underline'
                            title={String(result.data.hash)}
                          >
                            {String(result.data.hash)}
                          </Link>
                        </div>
                        <div className='flex items-center'>
                          <span className='text-gray-400'>Miner:</span>
                          <UserIcon className='w-4 h-4 text-green-400 ml-2 mr-1' />
                          {(() => {
                            const minerInfo = getMinerDisplayInfo(String(result.data.miner));
                            if (minerInfo.isPool) {
                              return (
                                <Link
                                  href={`/search?q=${encodeURIComponent(String(result.data.miner))}`}
                                  className='text-green-400 hover:text-green-300 font-mono text-sm transition-colors hover:underline'
                                  title={`Search blocks mined by ${minerInfo.name} (${String(result.data.miner)})`}
                                >
                                  {minerInfo.name}
                                </Link>
                              );
                            }
                            return (
                              <Link
                                href={`/search?q=${encodeURIComponent(String(result.data.miner))}`}
                                className='text-green-400 hover:text-green-300 font-mono text-sm transition-colors hover:underline'
                                title={`Search for address ${String(result.data.miner)}`}
                              >
                                {minerInfo.name}
                              </Link>
                            );

                          })()}
                        </div>
                        <div>
                          <span className='text-gray-400'>Transactions:</span>
                          <span className='text-gray-200 ml-2'>
                            {String(result.data.transactionCount || (Array.isArray(result.data.transactions) ? result.data.transactions.length : 0) || 0)}
                          </span>
                        </div>
                        <div>
                          <span className='text-gray-400'>Timestamp:</span>
                          <span className='text-gray-200 ml-2'>
                            {result.data.timestamp ?
                              new Date(Number(result.data.timestamp) * 1000).toLocaleString(undefined, { timeZoneName: 'short' }) :
                              'Unknown'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : query ? (
            <div className='text-center py-8'>
              <MagnifyingGlassIcon className='w-16 h-16 text-gray-600 mx-auto mb-4' />
              <p className='text-gray-400 text-lg mb-2'>No results found</p>
              <p className='text-gray-500 text-sm'>
                Try searching with a different block number, hash, or address.
              </p>
            </div>
          ) : (
            <div className='text-center py-8'>
              <MagnifyingGlassIcon className='w-16 h-16 text-gray-600 mx-auto mb-4' />
              <p className='text-gray-400 text-lg'>Enter a search term to get started</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}
