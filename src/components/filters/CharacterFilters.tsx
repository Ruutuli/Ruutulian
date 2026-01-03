'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

interface World {
  id: string;
  name: string;
}

export function CharacterFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [worlds, setWorlds] = useState<World[]>([]);
  const [tags, setTags] = useState<Array<{ id: string; name: string }>>([]);
  const [genderOptions, setGenderOptions] = useState<string[]>([]);
  const [sexOptions, setSexOptions] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const search = searchParams.get('search') || '';
  const worldId = searchParams.get('world') || '';
  const seriesType = searchParams.get('series_type') || '';
  const gender = searchParams.get('gender') || '';
  const sex = searchParams.get('sex') || '';
  const tagId = searchParams.get('tag') || '';

  // Sync search input with URL param on mount or when URL changes externally
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Show advanced filters if any are active
  useEffect(() => {
    if (worldId || seriesType || gender || sex || tagId) {
      setShowAdvanced(true);
    }
  }, [worldId, seriesType, gender, sex, tagId]);

  useEffect(() => {
    async function fetchWorlds() {
      const supabase = createClient();
      const { data } = await supabase
        .from('worlds')
        .select('id, name')
        .eq('is_public', true)
        .order('name');
      if (data) setWorlds(data);
    }
    fetchWorlds();
  }, []);

  useEffect(() => {
    async function fetchTags() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('tags')
          .select('id, name')
          .order('name');
        if (error) {
          logger.error('Component', 'CharacterFilters: Error fetching tags', error);
          return;
        }
        if (data) setTags(data);
      } catch (error) {
        logger.error('Component', 'CharacterFilters: Error fetching tags', error);
      }
    }
    fetchTags();
  }, []);

  useEffect(() => {
    async function fetchFilterOptions() {
      const supabase = createClient();
      
      const { data: genderData } = await supabase
        .from('ocs')
        .select('gender')
        .eq('is_public', true)
        .not('gender', 'is', null)
        .not('gender', 'eq', '');
      
      const { data: sexData } = await supabase
        .from('ocs')
        .select('sex')
        .eq('is_public', true)
        .not('sex', 'is', null)
        .not('sex', 'eq', '');
      
      if (genderData) {
        const uniqueGenders = Array.from(new Set(genderData.map(item => item.gender).filter(Boolean))) as string[];
        setGenderOptions(uniqueGenders.sort());
      }
      
      if (sexData) {
        const uniqueSexes = Array.from(new Set(sexData.map(item => item.sex).filter(Boolean))) as string[];
        setSexOptions(uniqueSexes.sort());
      }
    }
    fetchFilterOptions();
  }, []);

  // Debounced search update
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (searchInput !== search) {
      debounceTimerRef.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (searchInput.trim()) {
          params.set('search', searchInput.trim());
        } else {
          params.delete('search');
        }
        router.push(`/ocs?${params.toString()}`);
      }, 300);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchInput, search, searchParams, router]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/ocs?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearchInput('');
    setShowAdvanced(false);
    router.push('/ocs');
  };

  const hasActiveFilters = !!(search || worldId || seriesType || gender || sex || tagId);
  const activeFilterCount = [search, worldId, seriesType, gender, sex, tagId].filter(Boolean).length;

  return (
    <div className="wiki-card p-4 mb-6">
      {/* Main search bar */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search characters..."
            className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
              aria-label="Clear search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`px-4 py-2.5 rounded-lg border transition-all ${
            showAdvanced
              ? 'bg-pink-500/20 border-pink-500 text-pink-300'
              : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
          }`}
        >
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-pink-500 text-white text-xs rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-4 py-2.5 text-sm text-pink-400 hover:text-pink-300 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Advanced filters (collapsible) */}
      {showAdvanced && (
        <div className="pt-3 border-t border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <select
              value={worldId}
              onChange={(e) => updateFilter('world', e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              <option value="">All Worlds</option>
              <option value="none">None</option>
              {worlds.map((world) => (
                <option key={world.id} value={world.id}>
                  {world.name}
                </option>
              ))}
            </select>

            <select
              value={seriesType}
              onChange={(e) => updateFilter('series_type', e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="canon">Canon</option>
              <option value="original">Original</option>
            </select>

            {genderOptions.length > 0 && (
              <select
                value={gender}
                onChange={(e) => updateFilter('gender', e.target.value)}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="">All Genders</option>
                {genderOptions.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            )}

            {sexOptions.length > 0 && (
              <select
                value={sex}
                onChange={(e) => updateFilter('sex', e.target.value)}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="">All Sexes</option>
                {sexOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}

            {tags.length > 0 && (
              <select
                value={tagId}
                onChange={(e) => updateFilter('tag', e.target.value)}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="">All Tags</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
