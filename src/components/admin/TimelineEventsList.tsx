'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { TimelineEvent, World, OC } from '@/types/oc';
import { getCategoryColorClasses } from '@/lib/utils/categoryColors';

interface TimelineEventsListProps {
  events: TimelineEvent[];
  worlds: Array<{ id: string; name: string }>;
  characters: Array<{ id: string; name: string; world_id: string }>;
  categories: string[];
  initialFilters: {
    worldId: string;
    category: string;
    characterId: string;
    search: string;
  };
}

export function TimelineEventsList({
  events,
  worlds,
  characters,
  categories,
  initialFilters,
}: TimelineEventsListProps) {
  const [filters, setFilters] = useState(initialFilters);

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (filters.worldId) params.set('world_id', filters.worldId);
    if (filters.category) params.set('category', filters.category);
    if (filters.characterId) params.set('character_id', filters.characterId);
    if (filters.search) params.set('search', filters.search);
    return params.toString();
  };

  const applyFilters = () => {
    const query = buildQueryString();
    window.location.href = `/admin/timeline-events${query ? `?${query}` : ''}`;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-gray-700/90 rounded-lg p-4 border border-gray-600/70">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              World
            </label>
            <select
              value={filters.worldId}
              onChange={(e) => updateFilter('worldId', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
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
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Category
            </label>
            <select
              value={filters.category}
              onChange={(e) => updateFilter('category', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Character
            </label>
            <select
              value={filters.characterId}
              onChange={(e) => updateFilter('characterId', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
            >
              <option value="">All Characters</option>
              {characters.map((char) => (
                <option key={char.id} value={char.id}>
                  {char.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Search
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyFilters();
              }}
              placeholder="Search events..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={applyFilters}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-500"
          >
            Apply Filters
          </button>
          <button
            onClick={() => {
              setFilters({
                worldId: '',
                category: '',
                characterId: '',
                search: '',
              });
              window.location.href = '/admin/timeline-events';
            }}
            className="ml-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Events List */}
      {events.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No events found. {filters.worldId || filters.category || filters.characterId || filters.search
            ? 'Try adjusting your filters.'
            : 'Create your first event to get started.'}
        </div>
      ) : (
        <div className="bg-gray-700/90 rounded-lg shadow-lg overflow-hidden border border-gray-600/70">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-600/80">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  World
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Categories
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Characters
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800/50 divide-y divide-gray-700">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {event.is_key_event && (
                        <span className="px-2 py-0.5 bg-yellow-600/30 text-yellow-300 rounded text-xs font-semibold">
                          KEY
                        </span>
                      )}
                      <Link
                        href={`/admin/timeline-events/${event.id}`}
                        className="text-sm font-medium text-purple-400 hover:text-purple-300"
                      >
                        {event.title}
                      </Link>
                    </div>
                    {event.description && (
                      <div className="text-xs text-gray-400 mt-1 line-clamp-1">
                        {event.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {event.world?.name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {event.date_text || event.year ? (
                      <div>
                        {event.date_text || `${event.year}${event.month ? `-${event.month}` : ''}${event.day ? `-${event.day}` : ''}`}
                      </div>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {event.categories && event.categories.length > 0 ? (
                        event.categories.map((cat) => (
                          <span
                            key={cat}
                            className={`text-xs px-2 py-0.5 rounded border ${getCategoryColorClasses(cat)}`}
                          >
                            {cat}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-500">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {event.characters && event.characters.length > 0 ? (
                        event.characters.map((char) => (
                          <span
                            key={char.id}
                            className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded"
                          >
                            {char.oc?.name || 'Unknown'}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-500">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/admin/timeline-events/${event.id}`}
                      className="text-purple-400 hover:text-purple-300"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

