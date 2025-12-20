'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { TimelineCard } from './TimelineCard';
import { FilterContainer } from '@/components/filters/FilterContainer';
import { FilterSelect } from '@/components/filters/FilterSelect';

interface Timeline {
  id: string;
  name: string;
  world: { name: string } | null;
  event_count?: number;
  updated_at?: string;
}

interface TimelinesListProps {
  timelines: Timeline[];
}

type SortOption = 'name' | 'world' | 'updated';

export function TimelinesList({ timelines }: TimelinesListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [worldFilter, setWorldFilter] = useState<string>('');

  // Filter and sort timelines
  const filteredAndSortedTimelines = useMemo(() => {
    let filtered = timelines;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((timeline) => {
        const name = timeline.name?.toLowerCase() || '';
        const worldName = timeline.world?.name?.toLowerCase() || '';

        return (
          name.includes(query) ||
          worldName.includes(query)
        );
      });
    }

    // Apply world filter
    if (worldFilter) {
      filtered = filtered.filter(timeline => 
        timeline.world?.name === worldFilter
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'world':
          const aWorld = a.world?.name || '';
          const bWorld = b.world?.name || '';
          return aWorld.localeCompare(bWorld);
        case 'updated':
          const aUpdated = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          const bUpdated = b.updated_at ? new Date(b.updated_at).getTime() : 0;
          return bUpdated - aUpdated;
        default:
          return 0;
      }
    });

    return sorted;
  }, [timelines, searchQuery, sortBy, worldFilter]);

  // Get unique worlds for filter
  const uniqueWorlds = useMemo(() => {
    const worlds = new Set<string>();
    timelines.forEach(timeline => {
      if (timeline.world?.name) {
        worlds.add(timeline.world.name);
      }
    });
    return Array.from(worlds).sort();
  }, [timelines]);

  const clearFilters = () => {
    setSearchQuery('');
    setWorldFilter('');
  };

  const hasActiveFilters = !!(searchQuery || worldFilter);

  return (
    <>
      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or world..."
            className="w-full px-4 py-2 bg-gray-700/90 border border-gray-600/70 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <FilterContainer
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
          clearColor="purple"
        >
          <FilterSelect
            label="World"
            value={worldFilter}
            onChange={(value) => setWorldFilter(value)}
            options={[
              { value: '', label: 'All Worlds' },
              ...uniqueWorlds.map((world) => ({ value: world, label: world })),
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
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="name">Name</option>
              <option value="world">World</option>
              <option value="updated">Last Updated</option>
            </select>
          </div>
        </FilterContainer>

        <div className="text-sm text-gray-400">
          Showing {filteredAndSortedTimelines.length} of {timelines.length} timelines
        </div>
      </div>

      {/* Cards Grid */}
      {filteredAndSortedTimelines.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAndSortedTimelines.map((timeline) => (
            <TimelineCard key={timeline.id} timeline={timeline} />
          ))}
        </div>
      ) : searchQuery || worldFilter ? (
        <div className="bg-gray-700/90 rounded-lg shadow-lg p-12 text-center border border-gray-600/70">
          <p className="text-gray-400 mb-4">
            No timelines found matching your criteria.
          </p>
          <button
            onClick={clearFilters}
            className="text-blue-400 hover:text-blue-300"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="bg-gray-700/90 rounded-lg shadow-lg p-12 text-center border border-gray-600/70">
          <p className="text-gray-400 mb-4">No timelines yet.</p>
          <Link
            href="/admin/timelines/new"
            className="text-blue-400 hover:text-blue-300"
          >
            Create your first timeline →
          </Link>
        </div>
      )}
    </>
  );
}
