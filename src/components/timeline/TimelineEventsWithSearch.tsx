'use client';

import { useMemo, useState } from 'react';
import { TimelineEvent } from '@/components/timeline/TimelineEvent';
import type { TimelineEvent as TimelineEventType } from '@/types/oc';

interface TimelineEventsWithSearchProps {
  events: TimelineEventType[];
}

interface Filters {
  search: string;
  category: string;
  story: string;
  keyEventOnly: boolean;
}

function normalizeForSearch(s: string | null | undefined): string {
  if (s == null) return '';
  return String(s).toLowerCase().trim();
}

function eventMatchesSearch(event: TimelineEventType, query: string): boolean {
  if (!query.trim()) return true;
  const q = normalizeForSearch(query);
  if (normalizeForSearch(event.title).includes(q)) return true;
  if (event.description && normalizeForSearch(event.description).includes(q)) return true;
  if (event.description_markdown && normalizeForSearch(event.description_markdown).includes(q)) return true;
  if (event.location && normalizeForSearch(event.location).includes(q)) return true;
  if (event.date_text && normalizeForSearch(event.date_text).includes(q)) return true;
  if (event.story_alias?.name && normalizeForSearch(event.story_alias.name).includes(q)) return true;
  if (event.categories?.some((c) => normalizeForSearch(c).includes(q))) return true;
  if (event.characters?.length) {
    const charNames = event.characters.map(
      (c) => c.custom_name ?? c.oc?.name ?? ''
    );
    if (charNames.some((n) => normalizeForSearch(n).includes(q))) return true;
  }
  return false;
}

function eventMatchesFilters(event: TimelineEventType, filters: Filters): boolean {
  if (!eventMatchesSearch(event, filters.search)) return false;
  if (filters.keyEventOnly && !event.is_key_event) return false;
  if (filters.category && (!event.categories?.length || !event.categories.includes(filters.category))) return false;
  if (filters.story) {
    const storyId = filters.story;
    if (event.story_alias_id !== storyId && event.story_alias?.id !== storyId) return false;
  }
  return true;
}

export function TimelineEventsWithSearch({ events }: TimelineEventsWithSearchProps) {
  const [filters, setFilters] = useState<Filters>({
    search: '',
    category: '',
    story: '',
    keyEventOnly: false,
  });

  const filterOptions = useMemo(() => {
    const categories = new Set<string>();
    const stories: { id: string; name: string }[] = [];
    const seenStoryIds = new Set<string>();
    for (const e of events) {
      e.categories?.forEach((c) => categories.add(c));
      const sa = e.story_alias;
      if (sa?.id && sa?.name && !seenStoryIds.has(sa.id)) {
        seenStoryIds.add(sa.id);
        stories.push({ id: sa.id, name: sa.name });
      }
    }
    return {
      categories: Array.from(categories).sort(),
      stories: stories.sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [events]);

  const filtered = useMemo(() => {
    return events.filter((e) => eventMatchesFilters(e, filters));
  }, [events, filters]);

  const hasActiveFilters = filters.search.trim() !== '' || filters.category !== '' || filters.story !== '' || filters.keyEventOnly;

  const clearFilters = () => {
    setFilters({ search: '', category: '', story: '', keyEventOnly: false });
  };

  if (!events || events.length === 0) {
    return (
      <div className="wiki-card p-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <i className="fas fa-calendar-times text-4xl text-gray-600" aria-hidden="true"></i>
          <p className="text-gray-400 text-lg">No events in this timeline yet.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="timeline-event-search" className="sr-only">
            Search timeline events
          </label>
          <div className="relative flex-1 min-w-[200px]">
            <i
              className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
              aria-hidden="true"
            />
            <input
              id="timeline-event-search"
              type="search"
              placeholder="Search events…"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              className="w-full pl-11 pr-4 py-2.5 bg-gray-800/80 border border-gray-600/50 rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 text-sm"
            />
          </div>
          <label className="inline-flex items-center gap-2 px-3 py-2.5 bg-gray-800/80 border border-gray-600/50 rounded-xl cursor-pointer hover:bg-gray-700/50 transition-colors">
            <input
              type="checkbox"
              checked={filters.keyEventOnly}
              onChange={(e) => setFilters((f) => ({ ...f, keyEventOnly: e.target.checked }))}
              className="rounded border-gray-500 bg-gray-700 text-purple-500 focus:ring-purple-500/50"
            />
            <span className="text-sm text-gray-300">Key events only</span>
          </label>
          {filterOptions.categories.length > 0 && (
            <select
              value={filters.category}
              onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
              className="px-3 py-2.5 bg-gray-800/80 border border-gray-600/50 rounded-xl text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
              aria-label="Filter by category"
            >
              <option value="">All categories</option>
              {filterOptions.categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
          {filterOptions.stories.length > 0 && (
            <select
              value={filters.story}
              onChange={(e) => setFilters((f) => ({ ...f, story: e.target.value }))}
              className="px-3 py-2.5 bg-gray-800/80 border border-gray-600/50 rounded-xl text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 min-w-[140px]"
              aria-label="Filter by story"
            >
              <option value="">All stories</option>
              {filterOptions.stories.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-3 py-2.5 text-sm text-purple-300 hover:text-purple-200 border border-purple-500/30 rounded-xl hover:bg-purple-600/20 transition-colors"
              aria-label="Clear all filters"
            >
              <i className="fas fa-times mr-1.5" aria-hidden="true" />
              Clear filters
            </button>
          )}
        </div>
        {hasActiveFilters && (
          <p className="text-sm text-gray-400">
            Showing {filtered.length} of {events.length} {events.length === 1 ? 'event' : 'events'}
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="wiki-card p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <i className="fas fa-filter text-4xl text-gray-600" aria-hidden="true"></i>
            <p className="text-gray-400 text-lg">No events match your filters.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 rounded-lg border border-purple-500/30 transition-colors"
            >
              Clear filters
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div
            className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 via-purple-400 to-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)] z-10 md:hidden"
            style={{ left: '1.375rem' }}
          />
          <div
            className="hidden md:block absolute top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 via-purple-400 to-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)] z-10"
            style={{ left: '1.875rem' }}
          />
          {filtered.map((event: TimelineEventType, index: number) => (
            <TimelineEvent
              key={event.id}
              event={event}
              isLast={index === filtered.length - 1}
            />
          ))}
        </div>
      )}
    </>
  );
}
