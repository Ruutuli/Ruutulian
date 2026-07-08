'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { WorldLore } from '@/types/oc';
import { LoreCard } from './LoreCard';

interface LoreListProps {
  loreEntries: WorldLore[];
}

export function LoreList({ loreEntries }: LoreListProps) {
  const groupedByWorld = useMemo(() => {
    return loreEntries.reduce((acc, entry) => {
      const worldId = entry.world?.id || 'unknown';
      const worldName = entry.world?.name || 'Unknown World';
      
      if (!acc[worldId]) {
        acc[worldId] = {
          world: entry.world,
          worldName,
          entries: [],
        };
      }
      acc[worldId].entries.push(entry);
      return acc;
    }, {} as Record<string, { world: WorldLore['world']; worldName: string; entries: WorldLore[] }>);
  }, [loreEntries]);

  // Sort entries within each world by lore type, then by name
  const sortedGroups = useMemo(() => {
    return Object.entries(groupedByWorld).map(([worldId, group]) => ({
      ...group,
      entries: group.entries.sort((a, b) => {
        // First sort by lore type
        if (a.lore_type !== b.lore_type) {
          return a.lore_type.localeCompare(b.lore_type);
        }
        // Then by name
        return a.name.localeCompare(b.name);
      }),
    }));
  }, [groupedByWorld]);

  if (loreEntries.length === 0) {
    return (
      <div className="wiki-card p-12 text-center">
        <p className="text-gray-500 text-lg">No lore entries match your search or filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {sortedGroups.map((group) => (
        <section key={group.world?.id || 'unknown'} className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-100">
              {group.worldName}
            </h2>
            {group.world && (
              <Link
                href={`/worlds/${group.world.slug}`}
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                <i className="fas fa-external-link-alt mr-1"></i>
                View World
              </Link>
            )}
            <span className="text-sm text-gray-400">
              ({group.entries.length} {group.entries.length === 1 ? 'entry' : 'entries'})
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {group.entries.map((entry) => (
              <LoreCard key={entry.id} lore={entry} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

