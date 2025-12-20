'use client';

import { useEffect, useState } from 'react';
import type { StoryAlias } from '@/types/oc';
import { createClient } from '@/lib/supabase/client';

interface WorldStorySwitcherProps {
  worldId: string;
  worldIsCanon: boolean;
  selectedStoryAliasId: string | null;
  onStoryAliasChange: (storyAliasId: string | null) => void;
  disabled?: boolean;
}

export function WorldStorySwitcher({
  worldId,
  worldIsCanon,
  selectedStoryAliasId,
  onStoryAliasChange,
  disabled = false,
}: WorldStorySwitcherProps) {
  const [storyAliases, setStoryAliases] = useState<StoryAlias[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchStoryAliases() {
      if (!worldId || !worldIsCanon) {
        setStoryAliases([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const supabase = createClient();

      // Fetch story aliases for this world
      const { data, error } = await supabase
        .from('story_aliases')
        .select('*')
        .eq('world_id', worldId)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching story aliases:', error);
        setStoryAliases([]);
      } else {
        setStoryAliases(data || []);
      }

      setIsLoading(false);
    }

    fetchStoryAliases();
  }, [worldId, worldIsCanon]);

  // Don't show switcher if world is not canon
  if (!worldIsCanon) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onStoryAliasChange(value === '' ? null : value);
  };

  const options = [
    { value: '', label: 'Base World (Default)' },
    ...storyAliases.map((alias) => ({
      value: alias.id,
      label: alias.name,
    })),
  ];

  const displayValue = selectedStoryAliasId || '';

  return (
    <div className="mb-6 p-4 bg-purple-900/20 border border-purple-700/50 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <label htmlFor="world-story-switcher" className="block text-sm font-semibold text-purple-300 mb-2">
            Edit World Version
          </label>
          <p className="text-xs text-gray-400 mb-3">
            Select a story alias to edit story-specific world information. Each story can have its own version of world content fields.
          </p>
          <select
            id="world-story-switcher"
            value={displayValue}
            onChange={handleChange}
            disabled={disabled || isLoading}
            className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700 rounded text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {selectedStoryAliasId && (
        <div className="mt-3 text-xs text-purple-300">
          <span className="font-medium">Currently editing:</span>{' '}
          {storyAliases.find((a) => a.id === selectedStoryAliasId)?.name || 'Unknown Story'}
        </div>
      )}
    </div>
  );
}
















