'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { WorldLoreCard } from './WorldLoreCard';
import { FilterContainer } from '@/components/filters/FilterContainer';
import { FilterInput } from '@/components/filters/FilterInput';
import { FilterSelect } from '@/components/filters/FilterSelect';
import type { WorldLore } from '@/types/oc';

interface WorldLoreListProps {
  loreEntries: WorldLore[];
  worlds: Array<{ id: string; name: string }>;
  initialFilters: {
    worldId: string;
    loreType: string;
    search: string;
  };
}

const loreTypes = ['clan', 'organization', 'location', 'religion', 'species', 'technique', 'concept', 'artifact', 'other'] as const;

type SortOption = 'name' | 'type' | 'world' | 'updated';

export function WorldLoreList({
  loreEntries,
  worlds,
  initialFilters,
}: WorldLoreListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState<string>(initialFilters.search || '');
  const [worldId, setWorldId] = useState<string>(initialFilters.worldId || '');
  const [loreType, setLoreType] = useState<string>(initialFilters.loreType || '');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync search input with URL param on mount or when URL changes externally
  useEffect(() => {
    setSearchInput(initialFilters.search || '');
    setWorldId(initialFilters.worldId || '');
    setLoreType(initialFilters.loreType || '');
  }, [initialFilters]);

  // Debounced search update
  useEffect(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Only update URL if search input differs from URL param
    if (searchInput !== (initialFilters.search || '')) {
      debounceTimerRef.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (searchInput.trim()) {
          params.set('search', searchInput.trim());
        } else {
          params.delete('search');
        }
        router.push(`/admin/world-lore?${params.toString()}`);
      }, 300); // 300ms debounce delay
    }

    // Cleanup on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchInput, initialFilters.search, searchParams, router]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/admin/world-lore?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearchInput('');
    setWorldId('');
    setLoreType('');
    router.push('/admin/world-lore');
  };

  // Filter and sort lore entries
  const filteredAndSortedLore = useMemo(() => {
    let filtered = loreEntries;

    // Apply search filter (client-side since server already filtered)
    if (searchInput.trim()) {
      const query = searchInput.toLowerCase();
      filtered = filtered.filter((entry) => {
        const name = entry.name?.toLowerCase() || '';
        const description = entry.description?.toLowerCase() || '';
        const descriptionMarkdown = entry.description_markdown?.toLowerCase() || '';
        const worldName = entry.world?.name?.toLowerCase() || '';

        return (
          name.includes(query) ||
          description.includes(query) ||
          descriptionMarkdown.includes(query) ||
          worldName.includes(query)
        );
      });
    }

    // Apply world filter (client-side since server already filtered)
    if (worldId) {
      filtered = filtered.filter(entry => entry.world_id === worldId);
    }

    // Apply lore type filter (client-side since server already filtered)
    if (loreType) {
      filtered = filtered.filter(entry => entry.lore_type === loreType);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'type':
          return a.lore_type.localeCompare(b.lore_type);
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
  }, [loreEntries, searchInput, worldId, loreType, sortBy]);

  const hasActiveFilters = !!(searchInput || worldId || loreType);

  return (
    <>
      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, description, or world..."
            className="w-full px-4 py-2 bg-gray-700/90 border border-gray-600/70 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <FilterContainer
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
          clearColor="purple"
        >
          <FilterSelect
            label="World"
            value={worldId}
            onChange={(value) => {
              setWorldId(value);
              updateFilter('world_id', value);
            }}
            options={[
              { value: '', label: 'All Worlds' },
              ...worlds.map((world) => ({ value: world.id, label: world.name })),
            ]}
            focusColor="purple"
          />

          <FilterSelect
            label="Lore Type"
            value={loreType}
            onChange={(value) => {
              setLoreType(value);
              updateFilter('lore_type', value);
            }}
            options={[
              { value: '', label: 'All Types' },
              ...loreTypes.map((type) => ({
                value: type,
                label: type.charAt(0).toUpperCase() + type.slice(1),
              })),
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
              <option value="type">Type</option>
              <option value="world">World</option>
              <option value="updated">Last Updated</option>
            </select>
          </div>
        </FilterContainer>

        <div className="text-sm text-gray-400">
          Showing {filteredAndSortedLore.length} of {loreEntries.length} lore entries
        </div>
      </div>

      {/* Cards Grid */}
      {filteredAndSortedLore.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAndSortedLore.map((entry) => (
            <WorldLoreCard key={entry.id} lore={entry} />
          ))}
        </div>
      ) : searchInput || worldId || loreType ? (
        <div className="bg-gray-700/90 rounded-lg shadow-lg p-12 text-center border border-gray-600/70">
          <p className="text-gray-400 mb-4">
            No lore entries found matching your criteria.
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
          <p className="text-gray-400 mb-4">No lore entries yet.</p>
          <Link
            href="/admin/world-lore/new"
            className="text-purple-400 hover:text-purple-300"
          >
            Create your first lore entry →
          </Link>
        </div>
      )}
    </>
  );
}
