'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FunnelConfig } from '@/lib/funnels/types';
import { loadFunnels } from '@/lib/funnels/storage';
import { TEMPLATES } from '@/lib/templates/registry';

export default function FunnelsPage() {
  const router = useRouter();
  const [funnels, setFunnels] = useState<FunnelConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loaded = loadFunnels();
    setFunnels(loaded);
    setIsLoading(false);
  }, []);

  const handleLoadInWizard = (funnelId: string) => {
    router.push(`/wizard?id=${encodeURIComponent(funnelId)}`);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <main className="min-h-screen p-8 sm:p-20 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← Back to home
          </Link>
          <h1 className="text-4xl font-bold mb-4 text-gray-900">My Funnels</h1>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-gray-600">Loading...</p>
          </div>
        ) : funnels.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-600 mb-4">No saved funnels yet.</p>
            <p className="text-sm text-gray-500">
              Create a funnel in the wizard and save it to see it here.
            </p>
            <Link
              href="/wizard"
              className="inline-block mt-6 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Create New Funnel
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Saved Funnels</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Main Keyword</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Template</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Created</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {funnels.map((funnel) => {
                    const template = TEMPLATES.find((t) => t.id === funnel.templateId);
                    return (
                      <tr key={funnel.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4 font-medium text-gray-900">{funnel.name}</td>
                        <td className="py-4 px-4 text-gray-600">{funnel.mainKeyword || '—'}</td>
                        <td className="py-4 px-4 text-gray-600">
                          {template?.name || 'Unknown'}
                        </td>
                        <td className="py-4 px-4 text-gray-600 text-sm">
                          {formatDate(funnel.createdAt)}
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => handleLoadInWizard(funnel.id)}
                            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                          >
                            Load in wizard
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

