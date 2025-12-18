'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GoogleDriveImage } from '@/components/oc/GoogleDriveImage';

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
  modular_fields?: Record<string, any> | null;
  extra_fields?: Record<string, any> | null;
  image_url?: string | null;
  icon_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface Templates {
  [key: string]: { name: string; fields?: Array<{ key: string; label: string }> };
}

interface OCListProps {
  ocs: OC[];
  templates: Templates;
}

type SortOption = 'name' | 'completion' | 'updated' | 'created' | 'world';
type FilterOption = 'all' | 'public' | 'private' | 'incomplete' | 'complete';

// Calculate completion percentage for an OC
function calculateCompletion(oc: OC, templates: Templates): { filled: number; total: number; percentage: number } {
  let filled = 0;
  let total = 0;

  // All OC fields from the database (excluding system/metadata fields)
  const ocFields = [
    // Overview
    'first_name', 'last_name', 'aliases', 'species', 'sex', 'gender', 'pronouns',
    'age', 'date_of_birth', 'occupation', 'affiliations', 'romantic_orientation',
    'sexual_orientation', 'star_sign',
    // Identity Background
    'ethnicity', 'place_of_origin', 'current_residence', 'languages',
    // Personality Overview
    'personality_summary', 'alignment',
    // Personality Metrics (1-10 scale)
    'sociability', 'communication_style', 'judgment', 'emotional_resilience',
    'courage', 'risk_behavior', 'honesty', 'discipline', 'temperament', 'humor',
    // Personality Traits
    'positive_traits', 'neutral_traits', 'negative_traits',
    // Abilities
    'abilities', 'skills', 'aptitudes', 'strengths', 'limits', 'conditions',
    // Appearance
    'standard_look', 'alternate_looks', 'accessories', 'visual_motifs',
    'appearance_changes', 'height', 'weight', 'build', 'eye_color', 'hair_color',
    'skin_tone', 'features', 'appearance_summary',
    // Relationships
    'family', 'friends_allies', 'rivals_enemies', 'romantic', 'other_relationships',
    // History
    'origin', 'formative_years', 'major_life_events', 'history_summary',
    // Preferences & Habits
    'likes', 'dislikes',
    // Media
    'gallery', 'image_url', 'icon_url', 'seiyuu', 'voice_actor', 'theme_song',
    'inspirations', 'design_notes', 'name_meaning_etymology', 'creator_notes',
    // Trivia
    'trivia',
    // Development
    'development_status',
  ];

  // Count all OC fields
  ocFields.forEach(field => {
    total++;
    const value = (oc as any)[field];
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value) && value.length > 0) {
        filled++;
      } else if (!Array.isArray(value)) {
        filled++;
      }
    }
  });

  // Count template-specific fields (these are stored in modular_fields)
  if (oc.template_type && templates[oc.template_type]?.fields) {
    templates[oc.template_type].fields!.forEach(field => {
      total++;
      const value = oc.modular_fields?.[field.key];
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value) && value.length > 0) {
          filled++;
        } else if (!Array.isArray(value)) {
          filled++;
        }
      }
    });
  }

  // Count other modular_fields (world-specific fields, etc.)
  // Only count fields that aren't already counted as template fields
  if (oc.modular_fields && typeof oc.modular_fields === 'object') {
    const templateFieldKeys = new Set(
      oc.template_type && templates[oc.template_type]?.fields
        ? templates[oc.template_type].fields!.map(f => f.key)
        : []
    );

    Object.entries(oc.modular_fields).forEach(([key, value]) => {
      // Skip if this is a template field (already counted above)
      if (!templateFieldKeys.has(key)) {
        total++;
        if (value !== null && value !== undefined && value !== '') {
          if (Array.isArray(value) && value.length > 0) {
            filled++;
          } else if (!Array.isArray(value)) {
            filled++;
          }
        }
      }
    });
  }

  // Count extra_fields
  if (oc.extra_fields && typeof oc.extra_fields === 'object') {
    Object.entries(oc.extra_fields).forEach(([key, value]) => {
      total++;
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value) && value.length > 0) {
          filled++;
        } else if (!Array.isArray(value)) {
          filled++;
        }
      }
    });
  }

  const percentage = total > 0 ? Math.round((filled / total) * 100) : 0;
  return { filled, total, percentage };
}

export function OCList({ ocs, templates }: OCListProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
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

  // Calculate completion for all OCs
  const ocsWithCompletion = useMemo(() => {
    return ocs.map(oc => ({
      ...oc,
      completion: calculateCompletion(oc, templates),
    }));
  }, [ocs, templates]);

  // Filter and sort OCs
  const filteredAndSortedOCs = useMemo(() => {
    let filtered = ocsWithCompletion;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((oc) => {
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
    }

    // Apply status filter
    if (filterBy === 'public') {
      filtered = filtered.filter(oc => oc.is_public);
    } else if (filterBy === 'private') {
      filtered = filtered.filter(oc => !oc.is_public);
    } else if (filterBy === 'complete') {
      filtered = filtered.filter(oc => oc.completion.percentage >= 80);
    } else if (filterBy === 'incomplete') {
      filtered = filtered.filter(oc => oc.completion.percentage < 80);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'completion':
          return b.completion.percentage - a.completion.percentage;
        case 'updated':
          const aUpdated = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          const bUpdated = b.updated_at ? new Date(b.updated_at).getTime() : 0;
          return bUpdated - aUpdated;
        case 'created':
          const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bCreated - aCreated;
        case 'world':
          const aWorld = (a.world as any)?.name || '';
          const bWorld = (b.world as any)?.name || '';
          return aWorld.localeCompare(bWorld);
        default:
          return 0;
      }
    });

    return sorted;
  }, [ocsWithCompletion, searchQuery, sortBy, filterBy, templates]);

  // Get unique worlds for filtering
  const uniqueWorlds = useMemo(() => {
    const worlds = new Set<string>();
    ocs.forEach(oc => {
      if (oc.world && (oc.world as any).name) {
        worlds.add((oc.world as any).name);
      }
    });
    return Array.from(worlds).sort();
  }, [ocs]);

  return (
    <>
      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, slug, world, or template..."
            className="w-full px-4 py-2 bg-gray-700/90 border border-gray-600/70 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-300 whitespace-nowrap">Filter:</label>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as FilterOption)}
              className="px-3 py-1.5 bg-gray-700/90 border border-gray-600/70 rounded-md text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              <option value="all">All</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
              <option value="complete">Complete (80%+)</option>
              <option value="incomplete">Incomplete (&lt;80%)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-300 whitespace-nowrap">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-1.5 bg-gray-700/90 border border-gray-600/70 rounded-md text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              <option value="name">Name</option>
              <option value="completion">Completion</option>
              <option value="updated">Last Updated</option>
              <option value="created">Date Created</option>
              <option value="world">World</option>
            </select>
          </div>

          <div className="text-sm text-gray-400 ml-auto">
            Showing {filteredAndSortedOCs.length} of {ocs.length} characters
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      {filteredAndSortedOCs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAndSortedOCs.map((oc) => {
            const identity = oc.identity as any;
            const versions = identity?.versions || [];
            const versionCount = versions.length || 1;
            const hasMultipleVersions = versionCount > 1;
            const completion = oc.completion;
            const completionColor = 
              completion.percentage >= 80 ? 'text-green-400' :
              completion.percentage >= 50 ? 'text-yellow-400' :
              'text-red-400';

            return (
              <div
                key={oc.id}
                className="bg-gray-700/90 rounded-lg shadow-lg border border-gray-600/70 overflow-hidden hover:border-pink-500/50 transition-colors"
              >
                {/* Image/Icon Header */}
                <div className="relative h-32 bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden">
                  {oc.icon_url || oc.image_url ? (
                    (oc.icon_url || oc.image_url)?.includes('drive.google.com') ? (
                      <GoogleDriveImage
                        src={oc.icon_url || oc.image_url || ''}
                        alt={oc.name}
                        className="w-full h-full"
                        style={{ 
                          objectFit: oc.icon_url ? 'contain' : 'cover',
                          objectPosition: 'top'
                        }}
                      />
                    ) : (
                      <img
                        src={oc.icon_url || oc.image_url || ''}
                        alt={oc.name}
                        className={`w-full h-full ${oc.icon_url ? 'object-contain object-top' : 'object-cover object-top'}`}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-4xl text-gray-600">👤</div>
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    {oc.is_public ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-900/70 text-green-300 border border-green-700">
                        Public
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-800/70 text-gray-400 border border-gray-700">
                        Private
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4">
                  <div className="mb-3">
                    <h3 className="text-lg font-semibold text-gray-100 mb-1 line-clamp-1">
                      {oc.name}
                    </h3>
                    <p className="text-xs text-gray-400 truncate mb-2">{oc.slug}</p>
                    
                    {/* Completion Progress */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-400">Completion</span>
                        <span className={completionColor}>
                          {completion.percentage}% ({completion.filled}/{completion.total})
                        </span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            completion.percentage >= 80 ? 'bg-green-500' :
                            completion.percentage >= 50 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${completion.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 mb-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs">World:</span>
                      <span className="text-gray-300 truncate">
                        {oc.world ? (oc.world as any).name : '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs">Template:</span>
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-pink-900/50 text-pink-300 border border-pink-700">
                        {templates[oc.template_type || '']?.name || oc.template_type || 'None'}
                      </span>
                    </div>
                    {hasMultipleVersions && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs">Versions:</span>
                        {identity?.id ? (
                          <Link
                            href={`/admin/oc-identities/${identity.id}`}
                            className="text-blue-400 hover:text-blue-300 text-xs underline"
                          >
                            {versionCount} version{versionCount !== 1 ? 's' : ''}
                          </Link>
                        ) : (
                          <span className="text-gray-500 text-xs">1 version</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-gray-600/50 flex gap-2">
                    <Link
                      href={`/admin/ocs/${oc.id}`}
                      className="flex-1 px-3 py-2 text-sm font-medium text-center bg-pink-600 hover:bg-pink-500 text-white rounded-md transition-colors"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(oc.id, oc.name)}
                      disabled={deletingId === oc.id}
                      className="px-3 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingId === oc.id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : searchQuery || filterBy !== 'all' ? (
        <div className="bg-gray-700/90 rounded-lg shadow-lg p-12 text-center border border-gray-600/70">
          <p className="text-gray-400 mb-4">
            No characters found matching your criteria.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterBy('all');
            }}
            className="text-pink-400 hover:text-pink-300"
          >
            Clear filters
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
