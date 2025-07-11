import Header from '../../components/Header';

export default async function TransactionDetailPage({ params }: { params: Promise<{ txhash: string }> }) {
  const { txhash } = await params;
  return (
    <>
      <Header />
      <main className='max-w-4xl mx-auto py-8 px-4'>
        <h1 className='text-2xl font-bold mb-6 text-cyan-400'>Transaction Detail</h1>
        <div className='bg-[#232c3b] rounded-lg p-4 shadow mb-6'>
          <div className='mb-2'><span className='text-gray-400'>TxHash:</span> <span className='font-mono text-cyan-200'>{txhash}</span></div>
          <div className='mb-2'><span className='text-gray-400'>From:</span> 0x9503...</div>
          <div className='mb-2'><span className='text-gray-400'>To:</span> 0x1fc3...</div>
          <div className='mb-2'><span className='text-gray-400'>Value:</span> 1212.017029372 VBC</div>
          <div className='mb-2'><span className='text-gray-400'>Time:</span> 1 hour ago</div>
        </div>
      </main>
    </>
  );
}
