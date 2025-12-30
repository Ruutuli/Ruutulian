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

export function CharacterFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [worlds, setWorlds] = useState<World[]>([]);
  const [tags, setTags] = useState<Array<{ id: string; name: string }>>([]);
  const [genderOptions, setGenderOptions] = useState<string[]>([]);
  const [sexOptions, setSexOptions] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState<string>('');
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
          console.error('Error fetching tags:', error);
          // Silently fail - tags are optional
          return;
        }
        if (data) setTags(data);
      } catch (error) {
        console.error('Error fetching tags:', error);
        // Silently fail - tags are optional
      }
    }
    fetchTags();
  }, []);

  useEffect(() => {
    async function fetchFilterOptions() {
      const supabase = createClient();
      
      // Fetch unique gender values
      const { data: genderData } = await supabase
        .from('ocs')
        .select('gender')
        .eq('is_public', true)
        .not('gender', 'is', null)
        .not('gender', 'eq', '');
      
      // Fetch unique sex values
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
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Only update URL if search input differs from URL param
    if (searchInput !== search) {
      debounceTimerRef.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (searchInput.trim()) {
          params.set('search', searchInput.trim());
        } else {
          params.delete('search');
        }
        router.push(`/ocs?${params.toString()}`);
      }, 300); // 300ms debounce delay
    }

    // Cleanup on unmount
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
    router.push('/ocs');
  };

  const hasActiveFilters = !!(search || worldId || seriesType || gender || sex || tagId);

  return (
    <FilterContainer
      onClear={clearFilters}
      hasActiveFilters={hasActiveFilters}
      clearColor="pink"
    >
      <FilterInput
        label="Search"
        value={searchInput}
        onChange={(value) => setSearchInput(value)}
        placeholder="Name..."
        focusColor="pink"
      />

      <FilterSelect
        label="World"
        value={worldId}
        onChange={(value) => updateFilter('world', value)}
        options={[
          { value: '', label: 'All Worlds' },
          { value: 'none', label: 'None' },
          ...worlds.map((world) => ({ value: world.id, label: world.name })),
        ]}
        focusColor="pink"
      />

      <FilterSelect
        label="Series Type"
        value={seriesType}
        onChange={(value) => updateFilter('series_type', value)}
        options={[
          { value: '', label: 'All Types' },
          { value: 'canon', label: 'Canon' },
          { value: 'original', label: 'Original' },
        ]}
        focusColor="pink"
      />

      {genderOptions.length > 0 && (
        <FilterSelect
          label="Gender"
          value={gender}
          onChange={(value) => updateFilter('gender', value)}
          options={[
            { value: '', label: 'All Genders' },
            ...genderOptions.map((g) => ({ value: g, label: g })),
          ]}
          focusColor="pink"
        />
      )}

      {sexOptions.length > 0 && (
        <FilterSelect
          label="Sex"
          value={sex}
          onChange={(value) => updateFilter('sex', value)}
          options={[
            { value: '', label: 'All Sexes' },
            ...sexOptions.map((s) => ({ value: s, label: s })),
          ]}
          focusColor="pink"
        />
      )}

      {tags.length > 0 && (
        <FilterSelect
          label="Tag"
          value={tagId}
          onChange={(value) => updateFilter('tag', value)}
          options={[
            { value: '', label: 'All Tags' },
            ...tags.map((tag) => ({ value: tag.id, label: tag.name })),
          ]}
          focusColor="pink"
        />
      )}
    </FilterContainer>
  );
}
