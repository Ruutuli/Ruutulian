'use client';

import { format } from 'date-fns';

interface DevelopmentLogEntry {
  id: string;
  change_type: string;
  notes: string;
  created_at: string;
}

interface DevelopmentLogProps {
  entries: DevelopmentLogEntry[];
  showTitle?: boolean;
}

const changeTypeLabels: Record<string, string> = {
  personality: 'Personality',
  appearance: 'Appearance',
  backstory: 'Backstory',
  stats: 'Stats',
  relationships: 'Relationships',
  abilities: 'Abilities',
  other: 'Other',
};

const changeTypeColors: Record<string, string> = {
  personality: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  appearance: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  backstory: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  stats: 'bg-green-500/20 text-green-300 border-green-500/30',
  relationships: 'bg-red-500/20 text-red-300 border-red-500/30',
  abilities: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  other: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
};

export function DevelopmentLog({ entries, showTitle = true }: DevelopmentLogProps) {
  if (!entries || entries.length === 0) {
    return null;
  }

  // Sort by date, newest first
  const sortedEntries = [...entries].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <section className="wiki-card p-4 md:p-6 lg:p-8">
      {showTitle && (
        <h2 id="development-log" className="wiki-section-header scroll-mt-20 mb-4">
          <i className="fas fa-history text-purple-400" aria-hidden="true"></i>
          Development Log
        </h2>
      )}
      <div className="space-y-4">
        {sortedEntries.map((entry, index) => {
          const date = new Date(entry.created_at);
          const changeTypeLabel = changeTypeLabels[entry.change_type] || entry.change_type;
          const changeTypeColor = changeTypeColors[entry.change_type] || changeTypeColors.other;

          return (
            <div
              key={entry.id}
              className="border-l-4 border-gray-600 pl-4 py-2 hover:bg-gray-800/30 transition-colors rounded-r-lg"
            >
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`px-2 py-1 rounded text-xs font-medium border ${changeTypeColor}`}>
                  {changeTypeLabel}
                </span>
                <span className="text-gray-400 text-sm">
                  {format(date, 'MMM d, yyyy')}
                </span>
              </div>
              <p className="text-gray-200">{entry.notes}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

