'use client';

import { useState } from 'react';
import Header from '../components/Header';

export default function MigratePage() {
  const [isMigrating, setIsMigrating] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    migrated?: number;
    errors?: number;
    total?: number;
    error?: string;
    details?: string;
  } | null>(null);

  const handleMigrate = async () => {
    setIsMigrating(true);
    setResult(null);

    try {
      const response = await fetch('/api/migrate', {
        method: 'POST',
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ 
        error: 'Migration failed', 
        details: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-100 mb-8">Database Migration</h1>
            
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">Contract Data Migration</h2>
              <p className="text-gray-400 mb-6">
                This will migrate contract verification data from vbc-explorer database to explorerDB database.
              </p>
              
              <button
                onClick={handleMigrate}
                disabled={isMigrating}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMigrating ? 'Migrating...' : 'Start Migration'}
              </button>
              
              {result && (
                <div className="mt-6 p-4 rounded-lg border">
                  {result.error ? (
                    <div className="text-red-400">
                      <h3 className="font-semibold">Error:</h3>
                      <p>{result.error}</p>
                      {result.details && <p className="text-sm mt-2">{result.details}</p>}
                    </div>
                  ) : (
                    <div className="text-green-400">
                      <h3 className="font-semibold">Success:</h3>
                      <p>{result.message}</p>
                      <div className="mt-2 text-sm">
                        <p>Total: {result.total}</p>
                        <p>Migrated: {result.migrated}</p>
                        <p>Errors: {result.errors}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 