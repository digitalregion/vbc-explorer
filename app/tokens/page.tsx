'use client';
import Header from '../components/Header';
import Link from 'next/link';
import Image from 'next/image';
import { CubeTransparentIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

type Token = {
  symbol: string;
  name: string;
  address: string;
  holders: number;
  supply: string;
  type: string;
  verified?: boolean;
};

export default function TokensPage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [blockHeight, setBlockHeight] = useState<number | null>(null);

  useEffect(() => {
    async function fetchTokens() {
      try {
        const res = await fetch('/api/tokens');
        if (!res.ok) throw new Error('Failed to fetch tokens');
        const data = await res.json();
        setTokens(data.tokens || []);
      } catch {
        setTokens([]);
      } finally {
        setLoading(false);
      }
    }
    fetchTokens();

    // ブロック高をAPIから取得
    async function fetchBlockHeight() {
      try {
        const res = await fetch('/api/blockheight');
        if (res.ok) {
          const data = await res.json();
          setBlockHeight(data.height);
        }
      } catch {}
    }
    fetchBlockHeight();
  }, []);

  return (
    <div className='min-h-screen bg-gray-900 text-white'>
      <Header />

      {/* Page Header */}
      <div className='bg-gray-800 border-b border-gray-700'>
        <div className='container mx-auto px-4 py-8'>
          <div className='flex items-center gap-3 mb-4'>
            <CubeTransparentIcon className='w-8 h-8 text-purple-400' />
            <h1 className='text-3xl font-bold text-gray-100'>Tokens</h1>
          </div>
          <p className='text-gray-400'>Explore tokens and smart contracts on the VirBiCoin network</p>
        </div>
      </div>

      <main className='container mx-auto px-4 py-8'>
        <div className='bg-gray-800 rounded-lg border border-gray-700 p-6'>
          <div className='flex items-center justify-between mb-6'>
            <div className='flex items-center gap-2'>
              <CubeTransparentIcon className='w-6 h-6 text-blue-400' />
              <h2 className='text-xl font-semibold text-gray-100'>Token List</h2>
            </div>
            <div className='text-sm text-gray-400'>
              {loading ? 'Loading...' : `${tokens.length} tokens found`}
            </div>
          </div>

          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead>
                <tr className='border-b border-gray-700'>
                  <th className='text-left py-3 px-4 text-sm font-medium text-gray-300'>Token</th>
                  <th className='text-left py-3 px-4 text-sm font-medium text-gray-300'>Type</th>
                  <th className='text-left py-3 px-4 text-sm font-medium text-gray-300'>Contract Address</th>
                  <th className='text-left py-3 px-4 text-sm font-medium text-gray-300 w-32'>Verify</th>
                  <th className='text-left py-3 px-4 text-sm font-medium text-gray-300'>Holders</th>
                  <th className='text-left py-3 px-4 text-sm font-medium text-gray-300'>Total Supply</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-700'>
                {loading ? (
                  <tr>
                    <td colSpan={5} className='py-6 text-center text-gray-400'>Loading...</td>
                  </tr>
                ) : tokens.length === 0 ? (
                  <tr>
                    <td colSpan={5} className='py-6 text-center text-gray-400'>No tokens found</td>
                  </tr>
                ) : (
                  tokens.map((token) => (
                    <tr key={token.symbol} className='hover:bg-gray-700/50 transition-colors'>
                      <td className='py-3 px-4'>
                        <div className='flex items-center gap-3'>
                          <div className='w-12 h-12 rounded-full flex items-center justify-center bg-gray-700 border border-gray-600'>
                            {['OSATO', 'VBC'].includes(token.symbol) ? (
                              <Image
                                src={`/img/tokens/${token.symbol}.svg`}
                                alt={`${token.symbol} logo`}
                                width={32}
                                height={32}
                                className='rounded-full'
                                unoptimized
                              />
                            ) : (
                              <span className='text-gray-400 font-bold text-sm'>{token.symbol[0]}</span>
                            )}
                          </div>
                          <div>
                            <div className='font-bold text-gray-200'>{token.symbol}</div>
                            <div className='text-sm text-gray-400'>{token.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className='py-3 px-4'>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          token.type === 'Native' ?
                            'bg-green-500/20 text-green-400' :
                            token.type === 'VRC-20' ?
                              'bg-blue-500/20 text-blue-400' :
                              token.type === 'VRC-721' ?
                                'bg-purple-500/20 text-purple-400' :
                                token.type === 'VRC-1155' ?
                                  'bg-orange-500/20 text-orange-400' :
                                  'bg-gray-500/20 text-gray-400'
                        }`}>
                          {token.type}
                        </span>
                      </td>
                      <td className='py-3 px-4'>
                        <div className='flex items-center gap-2'>
                          {token.address === 'N/A' ? (
                            token.type === 'Native' ? (
                              <Link
                                href={`/tokens/0x0000000000000000000000000000000000000000`}
                                className='font-mono text-blue-400 hover:text-blue-300 transition-colors break-all'
                              >
                                N/A
                              </Link>
                            ) : (
                              <span className='font-mono text-gray-400 break-all'>N/A</span>
                            )
                          ) : (
                            <Link
                              href={`/tokens/${token.address}`}
                              className='font-mono text-blue-400 hover:text-blue-300 transition-colors break-all'
                            >
                              {token.address}
                            </Link>
                          )}
                        </div>
                      </td>
                      <td className='py-3 px-4 w-32'>
                        {token.type !== 'Native' && token.verified ? (
                          <span className='flex items-center gap-0.5 px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-base font-medium w-fit'>
                            <CheckCircleIcon className='w-4 h-4' />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span className='text-gray-400 text-xs'>-</span>
                        )}
                      </td>
                      <td className='py-3 px-4'>
                        <span className='text-gray-200 font-medium'>{token.holders?.toLocaleString?.() ?? '-'}</span>
                      </td>
                      <td className='py-3 px-4'>
                        <span className='text-green-400 font-bold'>
                          {token.type === 'Native' ? (blockHeight ?? '-') : (token.supply ?? '-')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Summary Stats */}
          <div className='mt-8 grid grid-cols-1 md:grid-cols-4 gap-4'>
            <div className='bg-gray-700/50 rounded-lg p-4 border border-gray-600/50'>
              <h3 className='text-sm font-medium text-gray-300 mb-2'>Total Tokens</h3>
              <p className='text-2xl font-bold text-blue-400'>{loading ? '-' : tokens.length}</p>
              <p className='text-xs text-gray-400'>Contracts deployed</p>
            </div>
            <div className='bg-gray-700/50 rounded-lg p-4 border border-gray-600/50'>
              <h3 className='text-sm font-medium text-gray-300 mb-2'>NFT Collections</h3>
              <p className='text-2xl font-bold text-purple-400'>{loading ? '-' : tokens.filter(t => t.type === 'VRC-721' || t.type === 'VRC-1155').length}</p>
              <p className='text-xs text-gray-400'>NFT contracts</p>
            </div>
            <div className='bg-gray-700/50 rounded-lg p-4 border border-gray-600/50'>
              <h3 className='text-sm font-medium text-gray-300 mb-2'>Total Holders</h3>
              <p className='text-2xl font-bold text-green-400'>{loading ? '-' : tokens.reduce((sum, token) => sum + (token.holders || 0), 0).toLocaleString()}</p>
              <p className='text-xs text-gray-400'>Unique addresses</p>
            </div>
            <div className='bg-gray-700/50 rounded-lg p-4 border border-gray-600/50'>
              <h3 className='text-sm font-medium text-gray-300 mb-2'>Contract Types</h3>
              <p className='text-2xl font-bold text-orange-400'>{loading ? '-' : new Set(tokens.map(t => t.type)).size}</p>
              <p className='text-xs text-gray-400'>Different standards</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
