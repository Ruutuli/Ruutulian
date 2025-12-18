'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { FilterContainer } from './FilterContainer';
import { FilterInput } from './FilterInput';
import { FilterSelect } from './FilterSelect';

export function WorldFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const search = searchParams.get('search') || '';
  const seriesType = searchParams.get('series_type') || '';

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/worlds?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push('/worlds');
  };

  const hasActiveFilters = !!(search || seriesType);

  return (
    <FilterContainer
      onClear={clearFilters}
      hasActiveFilters={hasActiveFilters}
      clearColor="purple"
    >
      <FilterInput
        label="Search"
        value={search}
        onChange={(value) => updateFilter('search', value)}
        placeholder="World name..."
        focusColor="purple"
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
        focusColor="purple"
      />
    </FilterContainer>
  );
}












