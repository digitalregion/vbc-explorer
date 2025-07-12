import Header from '../components/Header';
import Link from 'next/link';
import { ArrowPathIcon, ClockIcon } from '@heroicons/react/24/outline';

const transactions = [
  {
    hash: '0x6ea81036a4e9b2c8f3d7e1a5b6c9f2e8d4a7b3c6e9f2d5a8b1c4e7f0a3b6c9e2',
    from: '0x950302976387b43E042aeA242AE8DAB8e5C204D1',
    to: '0x1fc33e03888dd8e649f99672f916125417e5c63',
    value: '1212.017029372',
    time: '1 hour ago',
    status: 'Success',
    gasUsed: '21000'
  },
  {
    hash: '0x574f81f6e3a9b2c8f7d4e1a8b5c2f9e6d3a0b7c4e1f8d5a2b9c6e3f0a7b4c1e8',
    from: '0x950302976387b43E042aeA242AE8DAB8e5C204D1',
    to: '0x2cfabe94f9a7e8b2c5d1a4b7c0e3f6a9d2b5c8e1f4a7b0c3e6f9a2b5c8e1f4a7',
    value: '176.525951685',
    time: '1 hour ago',
    status: 'Success',
    gasUsed: '21000'
  },
  {
    hash: '0xa9961330b7c4e8f1d5a2b6c9e3f0a4b7c1e5d8a2b9c6e0f3a7b4c8e1f5a9b2c6',
    from: '0x950302976387b43E042aeA242AE8DAB8e5C204D1',
    to: '0x846f1c4e7a0b3d6e9c2f5a8b1e4d7a0c3f6b9e2d5a8c1f4b7e0a3d6c9f2e5a8',
    value: '16.458052868',
    time: '1 hour ago',
    status: 'Success',
    gasUsed: '21000'
  },
];

export default function TransactionsPage() {
  return (
    <>
      <Header />

      {/* Page Header */}
      <div className='page-header-container'>
        <div className='container mx-auto px-4 py-8'>
          <h1 className='text-3xl font-bold mb-2 text-gray-100'>Transactions</h1>
          <p className='text-gray-400'>Latest transactions on the VirBiCoin network</p>
        </div>
      </div>

      <main className='container mx-auto px-4 py-8'>
        <div className='bg-gray-800 rounded-lg border border-gray-700 p-6'>
          <div className='flex items-center justify-between mb-6'>
            <div className='flex items-center gap-2'>
              <ArrowPathIcon className='w-6 h-6 text-green-400' />
              <h2 className='text-xl font-semibold text-gray-100'>Recent Transactions</h2>
            </div>
            <div className='text-sm text-gray-400'>
              {transactions.length} transactions shown
            </div>
          </div>

          <div className='space-y-4'>
            {transactions.map((tx) => (
              <div key={tx.hash} className='bg-gray-700/50 rounded-lg p-4 border border-gray-600/50 hover:bg-gray-700 transition-colors'>
                <div className='flex flex-col lg:flex-row lg:items-center gap-4'>
                  <div className='flex-1'>
                    <div className='mb-2'>
                      <Link
                        href={`/transactions/${tx.hash}`}
                        className='text-blue-400 hover:text-blue-300 font-mono text-sm transition-colors break-all'
                        title={tx.hash}
                      >
                        {tx.hash}
                      </Link>
                    </div>
                    <div className='flex flex-col sm:flex-row gap-2 text-xs text-gray-400 mb-2'>
                      <div className='flex items-center gap-1'>
                        <span>From:</span>
                        <Link
                          href={`/accounts/${tx.from}`}
                          className='font-mono text-blue-400 hover:text-blue-300 transition-colors'
                        >
                          {tx.from.slice(0, 20)}...
                        </Link>
                      </div>
                      <div className='flex items-center gap-1'>
                        <span>To:</span>
                        <Link
                          href={`/accounts/${tx.to}`}
                          className='font-mono text-blue-400 hover:text-blue-300 transition-colors'
                        >
                          {tx.to.slice(0, 20)}...
                        </Link>
                      </div>
                    </div>
                    <div className='flex flex-wrap gap-4 text-sm'>
                      <div className='flex items-center gap-1'>
                        <span className='text-gray-400'>Value:</span>
                        <span className='text-green-400 font-bold'>{tx.value} VBC</span>
                      </div>
                      <div className='flex items-center gap-1'>
                        <span className='text-gray-400'>Gas Used:</span>
                        <span className='text-gray-200'>{tx.gasUsed}</span>
                      </div>
                      <div className='flex items-center gap-1'>
                        <span className='text-gray-400'>Status:</span>
                        <span className='text-green-400 font-medium'>{tx.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className='flex items-center gap-2 text-gray-400'>
                    <ClockIcon className='w-4 h-4' />
                    <span className='text-sm'>{tx.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary Stats */}
          <div className='mt-8 grid grid-cols-1 md:grid-cols-3 gap-4'>
            <div className='bg-gray-700/50 rounded-lg p-4 border border-gray-600/50'>
              <h3 className='text-sm font-medium text-gray-300 mb-2'>Total Transactions</h3>
              <p className='text-2xl font-bold text-blue-400'>{transactions.length.toLocaleString()}</p>
              <p className='text-xs text-gray-400'>In this view</p>
            </div>
            <div className='bg-gray-700/50 rounded-lg p-4 border border-gray-600/50'>
              <h3 className='text-sm font-medium text-gray-300 mb-2'>Total Value</h3>
              <p className='text-2xl font-bold text-green-400'>
                {transactions.reduce((sum, tx) => sum + parseFloat(tx.value), 0).toFixed(2)} VBC
              </p>
              <p className='text-xs text-gray-400'>Transferred</p>
            </div>
            <div className='bg-gray-700/50 rounded-lg p-4 border border-gray-600/50'>
              <h3 className='text-sm font-medium text-gray-300 mb-2'>Success Rate</h3>
              <p className='text-2xl font-bold text-purple-400'>100%</p>
              <p className='text-xs text-gray-400'>All successful</p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
