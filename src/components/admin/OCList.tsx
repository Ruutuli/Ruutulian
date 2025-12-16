'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface OC {
  id: string;
  name: string;
  slug: string;
  template_type: string | null;
  is_public: boolean;
  world: { name: string } | null | any;
  identity_id: string | null;
  identity: {
    id: string;
    name: string;
    versions: { id: string }[];
  } | null | any;
}

interface Templates {
  [key: string]: { name: string };
}

interface OCListProps {
  ocs: OC[];
  templates: Templates;
}

export function OCList({ ocs, templates }: OCListProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone and will completely remove this OC from the database.`)) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/admin/ocs/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete OC');
      }

      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete OC');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredOCs = useMemo(() => {
    if (!searchQuery.trim()) {
      return ocs;
    }

    const query = searchQuery.toLowerCase();
    return ocs.filter((oc) => {
      const name = oc.name?.toLowerCase() || '';
      const slug = oc.slug?.toLowerCase() || '';
      const worldName = (oc.world as any)?.name?.toLowerCase() || '';
      const templateName = templates[oc.template_type || '']?.name?.toLowerCase() || '';
      const templateType = oc.template_type?.toLowerCase() || '';

      return (
        name.includes(query) ||
        slug.includes(query) ||
        worldName.includes(query) ||
        templateName.includes(query) ||
        templateType.includes(query)
      );
    });
  }, [ocs, templates, searchQuery]);

  return (
    <>
      <div className="mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, slug, world, or template..."
          className="w-full px-4 py-2 bg-gray-700/90 border border-gray-600/70 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />
      </div>

      {filteredOCs.length > 0 ? (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-gray-700/90 rounded-lg shadow-lg overflow-hidden border border-gray-600/70">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-600/80">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                    World
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                    Template
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                    Versions
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
                {filteredOCs.map((oc) => {
                  const identity = oc.identity as any;
                  const versions = identity?.versions || [];
                  const versionCount = versions.length || 1;
                  const hasMultipleVersions = versionCount > 1;

                  return (
                    <tr key={oc.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-100">{oc.name}</div>
                        <div className="text-sm text-gray-400">{oc.slug}</div>
                        {hasMultipleVersions && (
                          <div className="text-xs text-blue-400 mt-1">
                            Part of multi-fandom identity
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {oc.world ? (oc.world as any).name : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-pink-900/50 text-pink-300 border border-pink-700">
                          {templates[oc.template_type || '']?.name || oc.template_type || 'None'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {identity?.id ? (
                          <Link
                            href={`/admin/oc-identities/${identity.id}`}
                            className="text-blue-400 hover:text-blue-300 underline"
                          >
                            {versionCount} version{versionCount !== 1 ? 's' : ''}
                          </Link>
                        ) : (
                          <span className="text-gray-500">1 version</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {oc.is_public ? (
                          <span className="text-green-400">Yes</span>
                        ) : (
                          <span className="text-gray-500">No</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/admin/ocs/${oc.id}`}
                          className="text-pink-400 hover:text-pink-300 mr-4"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(oc.id, oc.name)}
                          disabled={deletingId === oc.id}
                          className="text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingId === oc.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {filteredOCs.map((oc) => {
              const identity = oc.identity as any;
              const versions = identity?.versions || [];
              const versionCount = versions.length || 1;
              const hasMultipleVersions = versionCount > 1;

              return (
                <div
                  key={oc.id}
                  className="bg-gray-700/90 rounded-lg shadow-lg border border-gray-600/70 p-4"
                >
                  <div className="mb-3">
                    <div className="text-base font-medium text-gray-100 mb-1">{oc.name}</div>
                    <div className="text-sm text-gray-400 truncate mb-2">{oc.slug}</div>
                    {hasMultipleVersions && (
                      <div className="text-xs text-blue-400 mb-2">
                        Part of multi-fandom identity
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">World:</span>
                      <span className="text-sm text-gray-300">
                        {oc.world ? (oc.world as any).name : '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Template:</span>
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-pink-900/50 text-pink-300 border border-pink-700">
                        {templates[oc.template_type || '']?.name || oc.template_type || 'None'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Versions:</span>
                      {identity?.id ? (
                        <Link
                          href={`/admin/oc-identities/${identity.id}`}
                          className="text-blue-400 hover:text-blue-300 text-sm underline"
                        >
                          {versionCount} version{versionCount !== 1 ? 's' : ''}
                        </Link>
                      ) : (
                        <span className="text-sm text-gray-500">1 version</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Public:</span>
                      {oc.is_public ? (
                        <span className="text-green-400 text-sm">Yes</span>
                      ) : (
                        <span className="text-gray-500 text-sm">No</span>
                      )}
                    </div>
                  </div>
                  <div className="pt-3 border-t border-gray-600/50 flex gap-4">
                    <Link
                      href={`/admin/ocs/${oc.id}`}
                      className="inline-block text-pink-400 hover:text-pink-300 text-sm font-medium"
                    >
                      Edit →
                    </Link>
                    <button
                      onClick={() => handleDelete(oc.id, oc.name)}
                      disabled={deletingId === oc.id}
                      className="text-red-400 hover:text-red-300 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingId === oc.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : searchQuery ? (
        <div className="bg-gray-700/90 rounded-lg shadow-lg p-12 text-center border border-gray-600/70">
          <p className="text-gray-400 mb-4">No characters found matching "{searchQuery}".</p>
          <button
            onClick={() => setSearchQuery('')}
            className="text-pink-400 hover:text-pink-300"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="bg-gray-700/90 rounded-lg shadow-lg p-12 text-center border border-gray-600/70">
          <p className="text-gray-400 mb-4">No characters yet.</p>
          <Link
            href="/admin/ocs/new"
            className="text-pink-400 hover:text-pink-300"
          >
            Create your first character →
          </Link>
        </div>
      )}
    </>
  );
}


