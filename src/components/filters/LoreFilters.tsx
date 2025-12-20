'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface World {
  id: string;
  name: string;
}

const loreTypes = ['clan', 'organization', 'location', 'religion', 'species', 'technique', 'concept', 'artifact', 'other'] as const;

export function LoreFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [worlds, setWorlds] = useState<World[]>([]);

  const search = searchParams.get('search') || '';
  const worldId = searchParams.get('world') || '';
  const loreType = searchParams.get('lore_type') || '';

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
    router.push(`/lore?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push('/lore');
  };

  const hasActiveFilters = search || worldId || loreType;

  return (
    <div className="wiki-card p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-100">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <i className="fas fa-search mr-2"></i>
            Search
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => updateFilter('search', e.target.value)}
            placeholder="Search by name or description..."
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <i className="fas fa-globe mr-2"></i>
            World / Fandom
          </label>
          <select
            value={worldId}
            onChange={(e) => updateFilter('world', e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">All Worlds</option>
            {worlds.map((world) => (
              <option key={world.id} value={world.id}>
                {world.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <i className="fas fa-tag mr-2"></i>
            Lore Type
          </label>
          <select
            value={loreType}
            onChange={(e) => updateFilter('lore_type', e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">All Types</option>
            {loreTypes.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}









