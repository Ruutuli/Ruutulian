import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { cache } from 'react';

const CSV_PATH = path.join(
  process.cwd(),
  'docs',
  'OC IDEAS AND BRAINSTORMING - Options.csv'
);

export interface BrainstormCategory {
  key: string;
  label: string;
  icon: string;
  iconColor: string;
  items: string[];
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: string; iconColor: string }> = {
  RACE: { label: 'Races', icon: 'fas fa-users', iconColor: 'text-purple-400' },
  WEAPON: { label: 'Weapons', icon: 'fas fa-crosshairs', iconColor: 'text-red-400' },
  ELEMENT: { label: 'Elements', icon: 'fas fa-fire', iconColor: 'text-orange-400' },
  ANIMAL: { label: 'Animals', icon: 'fas fa-paw', iconColor: 'text-amber-400' },
  'SPECIAL BODY PART': { label: 'Special Body Parts', icon: 'fas fa-hand-sparkles', iconColor: 'text-pink-400' },
  COLORS: { label: 'Colors', icon: 'fas fa-palette', iconColor: 'text-cyan-400' },
  OCCUPATION: { label: 'Occupations', icon: 'fas fa-briefcase', iconColor: 'text-blue-400' },
  SETTING: { label: 'Settings', icon: 'fas fa-map-marker-alt', iconColor: 'text-emerald-400' },
  MISC: { label: 'Misc', icon: 'fas fa-star', iconColor: 'text-yellow-400' },
  'POS PERSONALITY': { label: 'Positive Personality', icon: 'fas fa-smile', iconColor: 'text-green-400' },
  'NUE PERSONALITY': { label: 'Neutral Personality', icon: 'fas fa-meh', iconColor: 'text-gray-400' },
  'NEG PERSONALITY': { label: 'Negative Personality', icon: 'fas fa-frown', iconColor: 'text-rose-400' },
  TROPE: { label: 'Tropes', icon: 'fas fa-theater-masks', iconColor: 'text-indigo-400' },
  'LIKES / DISLIKES': { label: 'Likes & Dislikes', icon: 'fas fa-heart', iconColor: 'text-rose-300' },
};

export const loadBrainstormOptions = cache((): BrainstormCategory[] => {
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, string>[];

  const columnKeys = Object.keys(CATEGORY_CONFIG);
  const sets = Object.fromEntries(columnKeys.map((key) => [key, new Set<string>()]));

  for (const record of records) {
    for (const key of columnKeys) {
      const value = record[key]?.trim();
      if (value) {
        sets[key].add(value);
      }
    }
  }

  return columnKeys
    .map((key) => ({
      key,
      ...CATEGORY_CONFIG[key],
      items: Array.from(sets[key]).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' })
      ),
    }))
    .filter((category) => category.items.length > 0);
});
