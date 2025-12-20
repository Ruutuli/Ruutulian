'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { WorldCard } from './WorldCard';
import { FilterContainer } from '@/components/filters/FilterContainer';
import { FilterInput } from '@/components/filters/FilterInput';
import { FilterSelect } from '@/components/filters/FilterSelect';

interface World {
  id: string;
  name: string;
  slug: string;
  series_type: string;
  is_public: boolean;
  story_count: number;
  header_image_url?: string | null;
  icon_url?: string | null;
  updated_at?: string;
}

interface WorldsListProps {
  worlds: World[];
}

type SortOption = 'name' | 'series_type' | 'public' | 'story_count' | 'updated';

export function WorldsList({ worlds }: WorldsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [seriesTypeFilter, setSeriesTypeFilter] = useState<string>('');
  const [publicFilter, setPublicFilter] = useState<string>('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Filter and sort worlds
  const filteredAndSortedWorlds = useMemo(() => {
    let filtered = worlds;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((world) => {
        const name = world.name?.toLowerCase() || '';
        const slug = world.slug?.toLowerCase() || '';
        const seriesType = world.series_type?.toLowerCase() || '';

        return (
          name.includes(query) ||
          slug.includes(query) ||
          seriesType.includes(query)
        );
      });
    }

    // Apply series type filter
    if (seriesTypeFilter) {
      filtered = filtered.filter(world => world.series_type === seriesTypeFilter);
    }

    // Apply public filter
    if (publicFilter) {
      const isPublic = publicFilter === 'true';
      filtered = filtered.filter(world => world.is_public === isPublic);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'series_type':
          return a.series_type.localeCompare(b.series_type);
        case 'public':
          return (b.is_public ? 1 : 0) - (a.is_public ? 1 : 0);
        case 'story_count':
          return b.story_count - a.story_count;
        case 'updated':
          const aUpdated = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          const bUpdated = b.updated_at ? new Date(b.updated_at).getTime() : 0;
          return bUpdated - aUpdated;
        default:
          return 0;
      }
    });

    return sorted;
  }, [worlds, searchQuery, sortBy, seriesTypeFilter, publicFilter]);

  // Get unique series types for filter
  const uniqueSeriesTypes = useMemo(() => {
    const types = new Set<string>();
    worlds.forEach(world => {
      if (world.series_type) {
        types.add(world.series_type);
      }
    });
    return Array.from(types).sort();
  }, [worlds]);

  const clearFilters = () => {
    setSearchQuery('');
    setSeriesTypeFilter('');
    setPublicFilter('');
  };

  const hasActiveFilters = !!(searchQuery || seriesTypeFilter || publicFilter);

  return (
    <>
      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, slug, or series type..."
            className="w-full px-4 py-2 bg-gray-700/90 border border-gray-600/70 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <FilterContainer
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
          clearColor="purple"
        >
          <FilterSelect
            label="Series Type"
            value={seriesTypeFilter}
            onChange={(value) => setSeriesTypeFilter(value)}
            options={[
              { value: '', label: 'All Types' },
              ...uniqueSeriesTypes.map((type) => ({ value: type, label: type })),
            ]}
            focusColor="purple"
          />

          <FilterSelect
            label="Public Status"
            value={publicFilter}
            onChange={(value) => setPublicFilter(value)}
            options={[
              { value: '', label: 'All' },
              { value: 'true', label: 'Public' },
              { value: 'false', label: 'Private' },
            ]}
            focusColor="purple"
          />

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sort by
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="name">Name</option>
              <option value="series_type">Series Type</option>
              <option value="public">Public Status</option>
              <option value="story_count">Story Count</option>
              <option value="updated">Last Updated</option>
            </select>
          </div>
        </FilterContainer>

        <div className="text-sm text-gray-400">
          Showing {filteredAndSortedWorlds.length} of {worlds.length} worlds
        </div>
      </div>

      {/* Cards Grid */}
      {filteredAndSortedWorlds.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAndSortedWorlds.map((world) => (
            <WorldCard key={world.id} world={world} />
          ))}
        </div>
      ) : searchQuery || seriesTypeFilter || publicFilter ? (
        <div className="bg-gray-700/90 rounded-lg shadow-lg p-12 text-center border border-gray-600/70">
          <p className="text-gray-400 mb-4">
            No worlds found matching your criteria.
          </p>
          <button
            onClick={clearFilters}
            className="text-purple-400 hover:text-purple-300"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="bg-gray-700/90 rounded-lg shadow-lg p-12 text-center border border-gray-600/70">
          <p className="text-gray-400 mb-4">No worlds yet.</p>
          <Link
            href="/admin/worlds/new"
            className="text-purple-400 hover:text-purple-300"
          >
            Create your first world →
          </Link>
        </div>
      )}
    </>
  );
}
