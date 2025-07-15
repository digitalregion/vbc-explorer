'use client';

import Header from '../app/components/Header';
import Link from 'next/link';
import {
  ArrowPathIcon,
  ClockIcon,
  ArrowLeftIcon,
  FireIcon,
  HashtagIcon,
  UserIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';
import { weiToVBC, weiToGwei, formatVBC, formatGwei } from '../lib/bigint-utils';
import config from '../config.json';

interface TransactionData {
  hash: string;
  from: string;
  to: string;
  value: string;
  blockNumber: number;
  blockHash: string;
  transactionIndex: number;
  gas: number;
  gasPrice: string;
  gasUsed?: number;
  timestamp: number;
  status?: string | number;
  nonce?: number;
  input?: string;
  block?: {
    number: number;
    hash: string;
    timestamp: number;
    miner: string;
  };
}

interface TransactionDetailsProps {
  hash: string;
}

export default function TransactionDetails({ hash }: TransactionDetailsProps) {
  const [transaction, setTransaction] = useState<TransactionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactionDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/tx/${hash}`);

        if (!response.ok) {
          throw new Error('Transaction not found');
        }

        const transactionData = await response.json();
        setTransaction(transactionData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch transaction details');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactionDetails();
  }, [hash]);

  if (loading) {
    return (
      <>
        <Header />
        <div className='bg-gray-800 border-b border-gray-700'>
          <div className='container mx-auto px-4 py-8'>
            <div className='flex items-center gap-3 mb-4'>
              <ArrowPathIcon className='w-8 h-8 text-green-400' />
              <h1 className='text-3xl font-bold text-gray-100'>Transaction Details</h1>
            </div>
            <p className='text-gray-400'>Loading transaction information...</p>
          </div>
        </div>
        <main className='container mx-auto px-4 py-8'>
          <div className='bg-gray-800 rounded-lg border border-gray-700 p-8 text-center'>
            <div className='animate-spin w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full mx-auto mb-4'></div>
            <p className='text-gray-400'>Loading transaction details...</p>
          </div>
        </main>
      </>
    );
  }

  if (error || !transaction) {
    return (
      <>
        <Header />
        <div className='bg-gray-800 border-b border-gray-700'>
          <div className='container mx-auto px-4 py-8'>
            <div className='flex items-center gap-3 mb-4'>
              <ArrowPathIcon className='w-8 h-8 text-red-400' />
              <h1 className='text-3xl font-bold text-gray-100'>Transaction Not Found</h1>
            </div>
            <p className='text-gray-400'>The requested transaction could not be found.</p>
          </div>
        </div>
        <main className='container mx-auto px-4 py-8'>
          <div className='bg-gray-800 rounded-lg border border-gray-700 p-8 text-center'>
            <p className='text-red-400 mb-4'>{error || 'Transaction not found'}</p>
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

  const formatValue = (value: string) => {
    try {
      const vbcValue = weiToVBC(value);
      return formatVBC(vbcValue);
    } catch {
      return '0 VBC';
    }
  };

  const formatGasPrice = (gasPrice: string) => {
    try {
      const gwei = weiToGwei(gasPrice);
      return formatGwei(gwei);
    } catch {
      return 'N/A';
    }
  };

  const formatMiner = (miner: string) => {
    if (!miner) return 'Unknown';
    if ((config as { miners: Record<string, string> }).miners) {
      const minerKey = Object.keys((config as { miners: Record<string, string> }).miners).find(
        key => key.toLowerCase() === miner.toLowerCase()
      );
      if (minerKey) {
        return (config as { miners: Record<string, string> }).miners[minerKey];
      }
    }
    return `${miner.slice(0, 12)}...${miner.slice(-12)}`;
  };

  return (
    <>
      <Header />
      {/* Page Header */}
      <div className='bg-gray-800 border-b border-gray-700'>
        <div className='container mx-auto px-4 py-8'>
          <div className='flex items-center gap-3 mb-4'>
            <ArrowPathIcon className='w-8 h-8 text-green-400' />
            <h1 className='text-3xl font-bold text-gray-100'>Transaction Details</h1>
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
              Transaction Hash: {transaction.hash.slice(0, 16)}...{transaction.hash.slice(-16)}
            </span>
          </div>
        </div>
      </div>

      <main className='container mx-auto px-4 py-8'>
        {/* Transaction Overview */}
        <section className='bg-gray-800 rounded-lg border border-gray-700 p-6 mb-8'>
          <h2 className='text-xl font-bold text-gray-100 mb-6 flex items-center gap-2'>
            <HashtagIcon className='w-6 h-6 text-green-400' />
            Transaction Overview
          </h2>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            <div className='space-y-2'>
              <p className='text-sm text-gray-400'>Transaction Hash</p>
              <Link
                href={`/tx/${transaction.hash}`}
                className='text-sm font-mono text-green-400 hover:text-green-300 break-all bg-gray-700/50 p-3 rounded border border-gray-600 block transition-colors hover:bg-gray-700'
                title={`Transaction: ${transaction.hash}`}
              >
                {transaction.hash}
              </Link>
            </div>

            <div className='space-y-2'>
              <p className='text-sm text-gray-400'>Status</p>
              <div className='flex items-center gap-2'>
                {transaction.status === 'success' || transaction.status === 1 || transaction.status === '1' ? (
                  <CheckCircleIcon className='w-5 h-5 text-green-400' />
                ) : (
                  <ExclamationCircleIcon className='w-5 h-5 text-red-400' />
                )}
                <span className={`text-sm font-medium ${
                  transaction.status === 'success' || transaction.status === 1 || transaction.status === '1' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {transaction.status === 'success' || transaction.status === 1 || transaction.status === '1' ? 'Success' : 'Failed'}
                </span>
              </div>
            </div>

            <div className='space-y-2'>
              <p className='text-sm text-gray-400'>Block Number</p>
              <Link
                href={`/block/${transaction.blockNumber}`}
                className='text-lg font-mono text-blue-400 hover:text-blue-300 hover:underline transition-colors'
              >
                #{transaction.blockNumber.toLocaleString()}
              </Link>
            </div>

            <div className='space-y-2'>
              <p className='text-sm text-gray-400'>Timestamp</p>
              <div className='flex items-center'>
                <ClockIcon className='w-4 h-4 text-gray-400 mr-2' />
                <div>
                  <div className='text-sm text-gray-300'>{getTimeAgo(transaction.timestamp)}</div>
                  <div className='text-xs text-gray-500'>{formatTimestamp(transaction.timestamp)}</div>
                </div>
              </div>
            </div>

            <div className='space-y-2'>
              <p className='text-sm text-gray-400'>Value</p>
              <div className='flex items-center gap-2'>
                <CurrencyDollarIcon className='w-5 h-5 text-green-400' />
                <span className='text-lg font-mono text-green-400'>{formatValue(transaction.value)}</span>
              </div>
            </div>

            <div className='space-y-2'>
              <p className='text-sm text-gray-400'>Transaction Index</p>
              <p className='text-lg font-mono text-purple-400'>{transaction.transactionIndex}</p>
            </div>
          </div>
        </section>

        {/* From/To Information */}
        <section className='bg-gray-800 rounded-lg border border-gray-700 p-6 mb-8'>
          <h2 className='text-xl font-bold text-gray-100 mb-6 flex items-center gap-2'>
            <UserIcon className='w-6 h-6 text-blue-400' />
            Address Information
          </h2>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div className='space-y-2'>
              <p className='text-sm text-gray-400'>From</p>
              <Link
                href={`/address/${transaction.from}`}
                className='font-mono text-sm text-blue-400 hover:text-blue-300 break-all bg-gray-700/50 p-3 rounded border border-gray-600 block transition-colors hover:bg-gray-700'
                title={`View account: ${transaction.from}`}
              >
                {transaction.from}
              </Link>
            </div>

            <div className='space-y-2'>
              <p className='text-sm text-gray-400'>To</p>
              <Link
                href={`/address/${transaction.to}`}
                className='font-mono text-sm text-blue-400 hover:text-blue-300 break-all bg-gray-700/50 p-3 rounded border border-gray-600 block transition-colors hover:bg-gray-700'
                title={`View account: ${transaction.to}`}
              >
                {transaction.to}
              </Link>
            </div>
          </div>
        </section>

        {/* Gas Information */}
        <section className='bg-gray-800 rounded-lg border border-gray-700 p-6 mb-8'>
          <h2 className='text-xl font-bold text-gray-100 mb-6 flex items-center gap-2'>
            <FireIcon className='w-6 h-6 text-orange-400' />
            Gas Information
          </h2>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            <div className='space-y-2'>
              <p className='text-sm text-gray-400'>Gas Limit</p>
              <p className='font-mono text-sm text-orange-400'>{transaction.gas.toLocaleString()}</p>
            </div>

            {transaction.gasUsed && (
              <div className='space-y-2'>
                <p className='text-sm text-gray-400'>Gas Used</p>
                <p className='font-mono text-sm text-orange-400'>
                  {transaction.gasUsed.toLocaleString()}
                  <span className='text-xs text-gray-400 ml-2'>
                    ({((transaction.gasUsed / transaction.gas) * 100).toFixed(1)}%)
                  </span>
                </p>
              </div>
            )}

            <div className='space-y-2'>
              <p className='text-sm text-gray-400'>Gas Price</p>
              <p className='font-mono text-sm text-orange-400'>{formatGasPrice(transaction.gasPrice)}</p>
            </div>

            {transaction.nonce !== undefined && (
              <div className='space-y-2'>
                <p className='text-sm text-gray-400'>Nonce</p>
                <p className='font-mono text-sm text-green-400'>{transaction.nonce}</p>
              </div>
            )}
          </div>
        </section>

        {/* Block Information */}
        {transaction.block && (
          <section className='bg-gray-800 rounded-lg border border-gray-700 p-6 mb-8'>
            <h2 className='text-xl font-bold text-gray-100 mb-6'>Block Information</h2>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='space-y-2'>
                <p className='text-sm text-gray-400'>Block Hash</p>
                <Link
                  href={`/block/${transaction.block.hash}`}
                  className='font-mono text-sm text-blue-400 hover:text-blue-300 break-all bg-gray-700/50 p-3 rounded border border-gray-600 block transition-colors hover:bg-gray-700'
                  title={`View block: ${transaction.block.hash}`}
                >
                  {transaction.block.hash}
                </Link>
              </div>

              <div className='space-y-2'>
                <p className='text-sm text-gray-400'>Mined by</p>
                <Link
                  href={`/address/${transaction.block.miner}`}
                  className='text-green-400 hover:text-green-300 transition-colors hover:underline'
                  title={`View miner account: ${transaction.block.miner}`}
                >
                  {formatMiner(transaction.block.miner)}
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Input Data */}
        {transaction.input && transaction.input !== '0x' && (
          <section className='bg-gray-800 rounded-lg border border-gray-700 p-6'>
            <h2 className='text-xl font-bold text-gray-100 mb-6'>Input Data</h2>

            <div className='bg-gray-700/50 p-4 rounded border border-gray-600'>
              <p className='font-mono text-xs text-gray-300 break-all'>{transaction.input}</p>
            </div>
          </section>
        )}
      </main>
    </>
  );
} 