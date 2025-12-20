'use client';

import { useRouter } from 'next/navigation';
import type { StoryAlias } from '@/types/oc';

interface WorldStorySelectorProps {
  storyAliases: StoryAlias[];
  currentStorySlug?: string | null;
}

export function WorldStorySelector({ storyAliases, currentStorySlug }: WorldStorySelectorProps) {
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStory = e.target.value;
    const url = new URL(window.location.href);
    if (newStory) {
      url.searchParams.set('story', newStory);
    } else {
      url.searchParams.delete('story');
    }
    router.push(url.pathname + url.search);
  };

  const selectedStoryAlias = currentStorySlug 
    ? storyAliases.find(sa => sa.slug === currentStorySlug)
    : null;

  return (
    <div className="mb-6 p-4 bg-purple-900/20 border border-purple-700/50 rounded-lg">
      <label htmlFor="story-selector" className="block text-sm font-semibold text-purple-300 mb-2">
        View World Version
      </label>
      <select
        id="story-selector"
        value={currentStorySlug || ''}
        onChange={handleChange}
        className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700 rounded text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        <option value="">Base World (Default)</option>
        {storyAliases.map((alias) => (
          <option key={alias.id} value={alias.slug}>
            {alias.name}
          </option>
        ))}
      </select>
      {selectedStoryAlias && (
        <div className="mt-2 text-xs text-purple-300">
          Currently viewing: <strong>{selectedStoryAlias.name}</strong>
        </div>
      )}
    </div>
  );
}

















