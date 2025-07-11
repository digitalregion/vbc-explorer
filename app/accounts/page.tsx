import Header from '../components/Header';
import Link from 'next/link';

const accounts = [
  { rank: 1, address: '0x7d4cbf1...', percent: '14.8501', balance: '195,735.13950591' },
  { rank: 2, address: '0x01fc33e...', percent: '13.1532', balance: '133,152.54332821' },
  { rank: 3, address: '0x516f9e1...', percent: '6.9411', balance: '91,489.13960267' },
  { rank: 4, address: '0x2ac3f4...', percent: '5.5798', balance: '73,541.41162524' },
  { rank: 5, address: '0xbc18a9...', percent: '5.3976', balance: '71,145.01869945' },
];

export default function AccountsPage() {
  return (
    <>
      <Header />

      {/* Page Header */}
      <div className='page-header-container'>
        <div className='container mx-auto px-4 py-8'>
          <h1 className='text-3xl font-bold mb-2 text-gray-100'>Accounts</h1>
          <p className='text-gray-400'>Top VBC holders by balance. Total supply: 1,318,073.98 VBC</p>
        </div>
      </div>

      <main className='container mx-auto px-4 py-8'>
        <div className='bg-gray-800 rounded-lg border border-gray-700 p-6'>
          <div className='flex items-center justify-between mb-6'>
            <h2 className='text-xl font-semibold text-gray-100'>Rich List</h2>
            <div className='text-sm text-gray-400'>
              Showing top 5 accounts
            </div>
          </div>
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead>
                <tr className='border-b border-gray-700'>
                  <th className='text-left py-3 px-4 text-sm font-medium text-gray-300'>#</th>
                  <th className='text-left py-3 px-4 text-sm font-medium text-gray-300'>Address</th>
                  <th className='text-left py-3 px-4 text-sm font-medium text-gray-300'>Balance</th>
                  <th className='text-left py-3 px-4 text-sm font-medium text-gray-300'>Percentage</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-700'>
                {accounts.map((acc) => (
                  <tr key={acc.rank} className='hover:bg-gray-700/50 transition-colors'>
                    <td className='py-3 px-4 text-gray-200 font-medium'>#{acc.rank}</td>
                    <td className='py-3 px-4'>
                      <Link
                        href={`/accounts/${acc.address}`}
                        className='font-mono text-blue-400 hover:text-blue-300 transition-colors'
                      >
                        {acc.address}
                      </Link>
                    </td>
                    <td className='py-3 px-4 text-green-400 font-medium'>{acc.balance} VBC</td>
                    <td className='py-3 px-4'>
                      <div className='flex items-center gap-2'>
                        <span className='text-yellow-400 font-medium'>{acc.percent}%</span>
                        <div className='flex-1 bg-gray-700 rounded-full h-2 max-w-[100px]'>
                          <div
                            className='bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full'
                            style={{ width: `${parseFloat(acc.percent) * 6}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
