'use client';

import { useEffect, useState } from 'react';
import TransactionDetails from '@/components/TransactionDetails';

export default function TxPage({ params }: { params: Promise<{ hash: string }> }) {
  const [hash, setHash] = useState<string>('');

  useEffect(() => {
    async function getParams() {
      const { hash: txHash } = await params;
      setHash(txHash);
    }
    getParams();
  }, [params]);

  if (!hash) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading transaction...</p>
        </div>
      </div>
    );
  }

  return <TransactionDetails hash={hash} />;
} 