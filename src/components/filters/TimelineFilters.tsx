'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FilterContainer } from './FilterContainer';
import { FilterInput } from './FilterInput';
import { FilterSelect } from './FilterSelect';

interface World {
  id: string;
  name: string;
}

export function TimelineFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [worlds, setWorlds] = useState<World[]>([]);
  const [searchInput, setSearchInput] = useState<string>('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const search = searchParams.get('search') || '';
  const worldId = searchParams.get('world') || '';
  const sort = searchParams.get('sort') || 'name-asc';

  // Sync search input with URL param on mount or when URL changes externally
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Fetch worlds for dropdown
  useEffect(() => {
    let cancelled = false;

    async function fetchWorlds() {
      const supabase = createClient();
      const { data } = await supabase
        .from('worlds')
        .select('id, name')
        .eq('is_public', true)
        .order('name');
      if (!cancelled && data) setWorlds(data);
    }
    fetchWorlds();

    return () => {
      cancelled = true;
    };
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
        router.push(`/timelines?${params.toString()}`);
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
    router.push(`/timelines?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearchInput('');
    router.push('/timelines');
  };

  const hasActiveFilters = !!(search || worldId || (sort && sort !== 'name-asc'));

  const sortOptions = [
    { value: 'name-asc', label: 'Name A-Z' },
    { value: 'name-desc', label: 'Name Z-A' },
    { value: 'events-desc', label: 'Most Events' },
    { value: 'events-asc', label: 'Fewest Events' },
    { value: 'world', label: 'World' },
    { value: 'date-desc', label: 'Newest First' },
    { value: 'date-asc', label: 'Oldest First' },
  ];

  return (
    <FilterContainer
      onClear={clearFilters}
      hasActiveFilters={hasActiveFilters}
      clearColor="purple"
    >
      <FilterInput
        label="Search"
        value={searchInput}
        onChange={(value) => setSearchInput(value)}
        placeholder="Timeline name, description, or world..."
        focusColor="purple"
      />

      <FilterSelect
        label="World"
        value={worldId}
        onChange={(value) => updateFilter('world', value)}
        options={[
          { value: '', label: 'All Worlds' },
          ...worlds.map((world) => ({
            value: world.id,
            label: world.name,
          })),
        ]}
        focusColor="purple"
      />

      <FilterSelect
        label="Sort By"
        value={sort}
        onChange={(value) => updateFilter('sort', value)}
        options={sortOptions}
        focusColor="purple"
      />
    </FilterContainer>
  );
}
