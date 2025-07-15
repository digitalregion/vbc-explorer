'use client';

import { useEffect, useState } from 'react';
import AccountDetails from '@/components/AccountDetails';

export default function AddressPage({ params }: { params: Promise<{ address: string }> }) {
  const [address, setAddress] = useState<string>('');

  useEffect(() => {
    async function getParams() {
      const { address: addr } = await params;
      setAddress(addr);
    }
    getParams();
  }, [params]);

  if (!address) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading address...</p>
        </div>
      </div>
    );
  }

  return <AccountDetails address={address} />;
} 