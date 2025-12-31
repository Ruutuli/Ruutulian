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

interface Tag {
  id: string;
  name: string;
}

export function FanficFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [worlds, setWorlds] = useState<World[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [searchInput, setSearchInput] = useState<string>('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const search = searchParams.get('search') || '';
  const worldId = searchParams.get('world') || '';
  const rating = searchParams.get('rating') || '';
  const tagId = searchParams.get('tag') || '';

  // Sync search input with URL param on mount or when URL changes externally
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

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
          .eq('category', 'fanfic')
          .order('name');
        if (error) {
          console.error('Error fetching fanfic tags:', error);
        } else if (data) {
          setTags(data);
        }
      } catch (error) {
        console.error('Error fetching fanfic tags:', error);
      }
    }
    fetchTags();
  }, []);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/fanfics?${params.toString()}`);
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    // Debounce the URL update
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      updateFilter('search', value);
    }, 300);
  };

  const clearFilters = () => {
    router.push('/fanfics');
  };

  const hasActiveFilters = !!(search || worldId || rating || tagId);

  const RATING_OPTIONS = [
    { value: '', label: 'All Ratings' },
    { value: 'G', label: 'G' },
    { value: 'PG', label: 'PG' },
    { value: 'PG-13', label: 'PG-13' },
    { value: 'R', label: 'R' },
    { value: 'M', label: 'M' },
    { value: 'Not Rated', label: 'Not Rated' },
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
        onChange={handleSearchChange}
        placeholder="Title or author..."
        focusColor="purple"
      />

      <FilterSelect
        label="World/Fandom"
        value={worldId}
        onChange={(value) => updateFilter('world', value)}
        options={[
          { value: '', label: 'All Worlds' },
          ...worlds.map((world) => ({ value: world.id, label: world.name })),
        ]}
        focusColor="purple"
      />

      <FilterSelect
        label="Rating"
        value={rating}
        onChange={(value) => updateFilter('rating', value)}
        options={RATING_OPTIONS}
        focusColor="purple"
      />

      <FilterSelect
        label="Tag"
        value={tagId}
        onChange={(value) => updateFilter('tag', value)}
        options={[
          { value: '', label: 'All Tags' },
          ...tags.map((tag) => ({ value: tag.id, label: tag.name })),
        ]}
        focusColor="purple"
      />
    </FilterContainer>
  );
}

