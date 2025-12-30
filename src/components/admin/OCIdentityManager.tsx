'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { OCIdentity, OC } from '@/types/oc';
import { createClient } from '@/lib/supabase/client';

interface OCIdentityManagerProps {
  identityId: string;
}

export function OCIdentityManager({ identityId }: OCIdentityManagerProps) {
  const [identity, setIdentity] = useState<OCIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchIdentity() {
      try {
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from('oc_identities')
          .select(`
            *,
            versions:ocs(
              *,
              world:worlds(*)
            )
          `)
          .eq('id', identityId)
          .single();

        if (fetchError) {
          setError(fetchError.message);
          return;
        }

        setIdentity(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load identity');
      } finally {
        setLoading(false);
      }
    }

    fetchIdentity();
  }, [identityId]);

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-400">
        Loading identity...
      </div>
    );
  }

  if (error || !identity) {
    return (
      <div className="p-8 text-center text-red-400">
        {error || 'Identity not found'}
      </div>
    );
  }

  const versions = identity.versions || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">{identity.name}</h1>
          <p className="text-gray-400 mt-1">
            {versions.length} version{versions.length !== 1 ? 's' : ''} across different fandoms
          </p>
        </div>
        <Link
          href={`/admin/ocs/new?identity_id=${identityId}`}
          className="px-6 py-3 bg-pink-600 text-white rounded-md hover:bg-pink-500 font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          ➕ Add New Version
        </Link>
      </div>

      {/* Prominent call-to-action banner */}
      <div className="bg-gradient-to-r from-pink-900/30 to-purple-900/30 border border-pink-700/50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-100 mb-1">
              Want to add this character to another fandom?
            </h3>
            <p className="text-sm text-gray-300">
              Create a new version in a different world while keeping them linked as the same character identity.
            </p>
          </div>
          <Link
            href={`/admin/ocs/new?identity_id=${identityId}`}
            className="px-6 py-3 bg-pink-600 text-white rounded-md hover:bg-pink-500 font-semibold shadow-lg hover:shadow-xl transition-all whitespace-nowrap ml-4"
          >
            Add New Version
          </Link>
        </div>
      </div>

      {versions.length === 0 ? (
        <div className="bg-gray-700/90 rounded-lg shadow-lg p-12 text-center border border-gray-600/70">
          <p className="text-gray-400 mb-4">No versions yet.</p>
          <Link
            href="/admin/ocs/new"
            className="text-pink-400 hover:text-pink-300"
          >
            Create the first version →
          </Link>
        </div>
      ) : (
        <div className="bg-gray-700/90 rounded-lg shadow-lg overflow-hidden border border-gray-600/70">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-600/80">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                  Version Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                  World/Fandom
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                  Template
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                  Public
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-700/50 divide-y divide-gray-600/50">
              {versions.map((version) => (
                <tr key={version.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-100">{version.name}</div>
                    <div className="text-sm text-gray-400">{version.slug}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {version.world ? (version.world as any).name : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-pink-900/50 text-pink-300 border border-pink-700">
                      {version.template_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {version.is_public ? (
                      <span className="text-green-400">Yes</span>
                    ) : (
                      <span className="text-gray-500">No</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/admin/ocs/${version.id}`}
                      className="text-pink-400 hover:text-pink-300 mr-4"
                    >
                      Edit
                    </Link>
                    {version.is_public && (
                      <Link
                        href={`/ocs/${version.slug}`}
                        className="text-blue-400 hover:text-blue-300"
                        target="_blank"
                      >
                        View
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

