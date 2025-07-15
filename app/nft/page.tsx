'use client';

import Header from '../components/Header';
import Link from 'next/link';
import Image from 'next/image';
import { PhotoIcon, UsersIcon, CubeIcon } from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';

interface NFTCollection {
  name: string;
  symbol: string;
  address: string;
  totalSupply: number;
  holders: number;
  floorPrice: string;
  description: string;
  creator: string;
}

export default function NFTPage() {
  const [nftCollections, setNftCollections] = useState<NFTCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNFTCollections() {
      try {
        setLoading(true);

        // Fetch actual VRC-721 tokens from the tokens API
        const response = await fetch('/api/tokens');
        if (!response.ok) {
          throw new Error('Failed to fetch tokens');
        }

        const tokensData = await response.json();
        
        // Filter for VRC-721 tokens only
        const nftTokens = tokensData.tokens.filter((token: Record<string, unknown>) => 
          token.type === 'VRC-721' || token.type === 'VRC-1155'
        );

        // Fetch detailed data for each NFT collection
        const collections = await Promise.all(
          nftTokens.map(async (token: Record<string, unknown>) => {
            try {
              const response = await fetch(`/api/nft/${token.address}`);
              if (!response.ok) {
                throw new Error(`Failed to fetch NFT data for ${token.address}`);
              }

              const data = await response.json();
              return {
                name: data.nft.name,
                symbol: data.nft.symbol,
                address: data.nft.address,
                totalSupply: parseInt(data.nft.totalSupply) || 0,
                holders: data.statistics.holders || 0,
                floorPrice: data.nft.floorPrice || '0.00',
                description: data.nft.description || 'NFT Collection on VirBiCoin network',
                creator: data.nft.creator || 'Unknown'
              };
            } catch (err) {
              console.error(`Error fetching NFT ${token.address}:`, err);
              return null;
            }
          })
        );

        // Filter out failed requests
        const validCollections = collections.filter(Boolean) as NFTCollection[];
        setNftCollections(validCollections);
      } catch (err) {
        console.error('Error fetching NFT collections:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchNFTCollections();
  }, []);

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-900 text-white'>
        <Header />
        <div className='container mx-auto px-4 py-8'>
          <div className='animate-pulse'>
            <div className='h-8 bg-gray-700 rounded mb-4'></div>
            <div className='h-64 bg-gray-700 rounded'></div>
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
          <div className='text-red-400'>Error: {error}</div>
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
            <PhotoIcon className='w-8 h-8 text-pink-400' />
            <h1 className='text-3xl font-bold text-gray-100'>NFT Collections</h1>
          </div>
          <p className='text-gray-400'>Explore NFT collections and digital assets on the VirBiCoin network</p>
        </div>
      </div>

      <main className='container mx-auto px-4 py-8'>
        <div className='bg-gray-800 rounded-lg border border-gray-700 p-6'>
          <div className='flex items-center justify-between mb-6'>
            <div className='flex items-center gap-2'>
              <PhotoIcon className='w-6 h-6 text-purple-400' />
              <h2 className='text-xl font-semibold text-gray-100'>NFT Collections</h2>
            </div>
            <div className='text-sm text-gray-400'>
              {nftCollections.length} collections found
            </div>
          </div>

          <div className='grid gap-6'>
            {nftCollections.map((collection) => (
              <div key={collection.address} className='bg-gray-700/50 rounded-lg p-6 border border-gray-600/50 hover:bg-gray-700 transition-colors'>
                <div className='flex flex-col lg:flex-row gap-6'>
                  {/* NFT Preview */}
                  <div className='flex-shrink-0'>
                    <div className='w-32 h-32 bg-gray-700 border border-gray-600 rounded-lg flex items-center justify-center'>
                      <Image
                        src={`/img/tokens/${collection.symbol}.svg`}
                        alt={`${collection.symbol} logo`}
                        width={64}
                        height={64}
                        className='rounded'
                        unoptimized
                      />
                    </div>
                  </div>

                  {/* Collection Info */}
                  <div className='flex-1'>
                    <div className='flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4'>
                      <div>
                        <h3 className='text-xl font-bold text-gray-100 mb-2'>
                          <Link
                            href={`/nft/${collection.address}`}
                            className='hover:text-purple-400 transition-colors'
                          >
                            {collection.name} ({collection.symbol})
                          </Link>
                        </h3>
                        <p className='text-gray-400 mb-3'>{collection.description}</p>

                        <div className='space-y-2'>
                          <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
                            <span className='text-gray-400 font-medium min-w-[100px]'>Contract:</span>
                            <Link
                              href={`/nft/${collection.address}`}
                              className='font-mono text-blue-400 hover:text-blue-300 transition-colors break-all'
                            >
                              {collection.address}
                            </Link>
                          </div>
                          <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
                            <span className='text-gray-400 font-medium min-w-[100px]'>Creator:</span>
                            <Link
                              href={`/address/${collection.creator}`}
                              className='font-mono text-blue-400 hover:text-blue-300 transition-colors break-all'
                            >
                              {collection.creator}
                            </Link>
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className='flex gap-6 lg:flex-col lg:gap-4'>
                        <div className='text-center lg:text-right'>
                          <div className='flex items-center gap-1 justify-center lg:justify-end mb-1'>
                            <CubeIcon className='w-4 h-4 text-purple-400' />
                            <span className='text-sm text-gray-400'>Total Supply</span>
                          </div>
                          <span className='text-lg font-bold text-purple-400'>{collection.totalSupply.toLocaleString()}</span>
                        </div>

                        <div className='text-center lg:text-right'>
                          <div className='flex items-center gap-1 justify-center lg:justify-end mb-1'>
                            <UsersIcon className='w-4 h-4 text-green-400' />
                            <span className='text-sm text-gray-400'>Holders</span>
                          </div>
                          <span className='text-lg font-bold text-green-400'>{collection.holders.toLocaleString()}</span>
                        </div>

                        <div className='text-center lg:text-right'>
                          <div className='flex items-center gap-1 justify-center lg:justify-end mb-1'>
                            <span className='text-sm text-gray-400'>Floor Price</span>
                          </div>
                          <span className='text-lg font-bold text-yellow-400'>{collection.floorPrice} VBC</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary Stats */}
          <div className='mt-8 grid grid-cols-1 md:grid-cols-4 gap-4'>
            <div className='bg-gray-700/50 rounded-lg p-4 border border-gray-600/50'>
              <h3 className='text-sm font-medium text-gray-300 mb-2'>Total Collections</h3>
              <p className='text-2xl font-bold text-purple-400'>{nftCollections.length}</p>
              <p className='text-xs text-gray-400'>NFT contracts</p>
            </div>
            <div className='bg-gray-700/50 rounded-lg p-4 border border-gray-600/50'>
              <h3 className='text-sm font-medium text-gray-300 mb-2'>Total NFTs</h3>
              <p className='text-2xl font-bold text-blue-400'>
                {nftCollections.reduce((sum, col) => sum + col.totalSupply, 0).toLocaleString()}
              </p>
              <p className='text-xs text-gray-400'>Minted tokens</p>
            </div>
            <div className='bg-gray-700/50 rounded-lg p-4 border border-gray-600/50'>
              <h3 className='text-sm font-medium text-gray-300 mb-2'>Total Holders</h3>
              <p className='text-2xl font-bold text-green-400'>
                {nftCollections.reduce((sum, col) => sum + col.holders, 0).toLocaleString()}
              </p>
              <p className='text-xs text-gray-400'>Unique owners</p>
            </div>
            <div className='bg-gray-700/50 rounded-lg p-4 border border-gray-600/50'>
              <h3 className='text-sm font-medium text-gray-300 mb-2'>Avg Floor Price</h3>
              <p className='text-2xl font-bold text-yellow-400'>
                {nftCollections.length > 0 ?
                  (nftCollections.reduce((sum, col) => sum + parseFloat(col.floorPrice), 0) / nftCollections.length).toFixed(2) :
                  '0.00'
                } VBC
              </p>
              <p className='text-xs text-gray-400'>Across collections</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
