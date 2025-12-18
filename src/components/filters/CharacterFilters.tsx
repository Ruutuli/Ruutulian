'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
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

  const search = searchParams.get('search') || '';
  const worldId = searchParams.get('world') || '';
  const seriesType = searchParams.get('series_type') || '';

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
    router.push('/ocs');
  };

  const hasActiveFilters = !!(search || worldId || seriesType);

  return (
    <FilterContainer
      onClear={clearFilters}
      hasActiveFilters={hasActiveFilters}
      clearColor="pink"
    >
      <FilterInput
        label="Search"
        value={search}
        onChange={(value) => updateFilter('search', value)}
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
    </FilterContainer>
  );
}
