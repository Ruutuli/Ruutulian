'use client';

import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { FanficCard } from './FanficCard';
import { FilterContainer } from '@/components/filters/FilterContainer';
import { FilterSelect } from '@/components/filters/FilterSelect';

interface Fanfic {
  id: string;
  title: string;
  slug: string;
  rating?: string | null;
  is_public: boolean;
  world_count?: number;
  character_count?: number;
  tag_count?: number;
  updated_at?: string;
}

interface FanficsListProps {
  fanfics: Fanfic[];
}

type SortOption = 'title' | 'rating' | 'updated' | 'created' | 'world_count' | 'character_count';

const RATING_OPTIONS = ['G', 'PG', 'PG-13', 'R', 'M', 'Not Rated'];

export function FanficsList({ fanfics }: FanficsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [ratingFilter, setRatingFilter] = useState<string>('');
  const [publicFilter, setPublicFilter] = useState<string>('');

  // Filter and sort fanfics
  const filteredAndSortedFanfics = useMemo(() => {
    let filtered = fanfics;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((fanfic) => {
        const title = fanfic.title?.toLowerCase() || '';
        const slug = fanfic.slug?.toLowerCase() || '';

        return title.includes(query) || slug.includes(query);
      });
    }

    // Apply rating filter
    if (ratingFilter) {
      filtered = filtered.filter(fanfic => fanfic.rating === ratingFilter);
    }

    // Apply public filter
    if (publicFilter) {
      const isPublic = publicFilter === 'true';
      filtered = filtered.filter(fanfic => fanfic.is_public === isPublic);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'rating':
          const ratingOrder: Record<string, number> = {
            'G': 1, 'PG': 2, 'PG-13': 3, 'R': 4, 'M': 5, 'Not Rated': 6
          };
          const aRating = a.rating ? ratingOrder[a.rating] || 99 : 99;
          const bRating = b.rating ? ratingOrder[b.rating] || 99 : 99;
          return aRating - bRating;
        case 'updated':
          const aUpdated = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          const bUpdated = b.updated_at ? new Date(b.updated_at).getTime() : 0;
          return bUpdated - aUpdated;
        case 'created':
          // Assuming created_at exists in the data structure
          return 0;
        case 'world_count':
          return (b.world_count || 0) - (a.world_count || 0);
        case 'character_count':
          return (b.character_count || 0) - (a.character_count || 0);
        default:
          return 0;
      }
    });

    return sorted;
  }, [fanfics, searchQuery, sortBy, ratingFilter, publicFilter]);

  // Get unique ratings for filter
  const uniqueRatings = useMemo(() => {
    const ratings = new Set<string>();
    fanfics.forEach(fanfic => {
      if (fanfic.rating) {
        ratings.add(fanfic.rating);
      }
    });
    return Array.from(ratings).sort((a, b) => {
      const order: Record<string, number> = {
        'G': 1, 'PG': 2, 'PG-13': 3, 'R': 4, 'M': 5, 'Not Rated': 6
      };
      return (order[a] || 99) - (order[b] || 99);
    });
  }, [fanfics]);

  const clearFilters = () => {
    setSearchQuery('');
    setRatingFilter('');
    setPublicFilter('');
  };

  const hasActiveFilters = !!(searchQuery || ratingFilter || publicFilter);

  return (
    <>
      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or slug..."
            className="w-full px-4 py-2 bg-gray-700/90 border border-gray-600/70 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <FilterContainer
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
          clearColor="purple"
        >
          <FilterSelect
            label="Rating"
            value={ratingFilter}
            onChange={(value) => setRatingFilter(value)}
            options={[
              { value: '', label: 'All Ratings' },
              ...uniqueRatings.map((rating) => ({ value: rating, label: rating })),
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
              <option value="title">Title</option>
              <option value="rating">Rating</option>
              <option value="updated">Last Updated</option>
              <option value="world_count">World Count</option>
              <option value="character_count">Character Count</option>
            </select>
          </div>
        </FilterContainer>

        <div className="text-sm text-gray-400">
          Showing {filteredAndSortedFanfics.length} of {fanfics.length} fanfics
        </div>
      </div>

      {/* Cards Grid */}
      {filteredAndSortedFanfics.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAndSortedFanfics.map((fanfic) => (
            <FanficCard key={fanfic.id} fanfic={fanfic} />
          ))}
        </div>
      ) : searchQuery || ratingFilter || publicFilter ? (
        <div className="bg-gray-700/90 rounded-lg shadow-lg p-12 text-center border border-gray-600/70">
          <p className="text-gray-400 mb-4">
            No fanfics found matching your criteria.
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
          <p className="text-gray-400 mb-4">No fanfics yet.</p>
          <Link
            href="/admin/fanfics/new"
            className="text-purple-400 hover:text-purple-300"
          >
            Create your first fanfic →
          </Link>
        </div>
      )}
    </>
  );
}

