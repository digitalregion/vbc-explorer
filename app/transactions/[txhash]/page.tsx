'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TransactionsRedirectPage({ params }: { params: Promise<{ txhash: string }> }) {
  const router = useRouter();

  useEffect(() => {
    async function redirect() {
      const { txhash } = await params;
      router.replace(`/tx/${txhash}`);
    }
    redirect();
  }, [params, router]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
        <p className="text-gray-400">Redirecting to transaction...</p>
      </div>
    </div>
  );
}
