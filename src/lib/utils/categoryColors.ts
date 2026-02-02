import { PREDEFINED_EVENT_CATEGORIES } from '@/types/oc';

/**
 * Generate a consistent color for a category based on its name
 * Uses a hash function to deterministically assign colors
 */
function getCategoryColor(category: string): string {
  // Predefined colors for known categories
  const categoryColors: Record<string, string> = {
    'Death': 'bg-red-600/30 text-red-300 border-red-500/50',
    'Birth': 'bg-green-600/30 text-green-300 border-green-500/50',
    'War': 'bg-orange-600/30 text-orange-300 border-orange-500/50',
    'Battle': 'bg-amber-600/30 text-amber-300 border-amber-500/50',
    'Discovery': 'bg-blue-600/30 text-blue-300 border-blue-500/50',
    'Celebration': 'bg-yellow-600/30 text-yellow-300 border-yellow-500/50',
    'Political': 'bg-purple-600/30 text-purple-300 border-purple-500/50',
    'Disaster': 'bg-rose-600/30 text-rose-300 border-rose-500/50',
    'Marriage': 'bg-pink-600/30 text-pink-300 border-pink-500/50',
    'Coronation': 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50',
    'Treaty': 'bg-cyan-600/30 text-cyan-300 border-cyan-500/50',
    'Rebellion': 'bg-red-700/30 text-red-200 border-red-600/50',
    'Founding': 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50',
    'Destruction': 'bg-gray-700/30 text-gray-300 border-gray-600/50',
    'Revelation': 'bg-violet-600/30 text-violet-300 border-violet-500/50',
    'Transformation': 'bg-teal-600/30 text-teal-300 border-teal-500/50',
  };

  if (categoryColors[category]) {
    return categoryColors[category];
  }

  // Generate consistent color based on category name hash
  const colorPalette = [
    'bg-sky-600/30 text-sky-300 border-sky-500/50',
    'bg-fuchsia-600/30 text-fuchsia-300 border-fuchsia-500/50',
    'bg-lime-600/30 text-lime-300 border-lime-500/50',
    'bg-amber-600/30 text-amber-300 border-amber-500/50',
    'bg-emerald-600/30 text-emerald-300 border-emerald-500/50',
    'bg-cyan-600/30 text-cyan-300 border-cyan-500/50',
    'bg-violet-600/30 text-violet-300 border-violet-500/50',
    'bg-rose-600/30 text-rose-300 border-rose-500/50',
    'bg-indigo-600/30 text-indigo-300 border-indigo-500/50',
    'bg-pink-600/30 text-pink-300 border-pink-500/50',
    'bg-teal-600/30 text-teal-300 border-teal-500/50',
    'bg-orange-600/30 text-orange-300 border-orange-500/50',
  ];

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = ((hash << 5) - hash) + category.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  const index = Math.abs(hash) % colorPalette.length;
  return colorPalette[index];
}

/**
 * Get color classes for a category
 * Returns different colors for predefined categories, random but consistent colors for custom categories
 */
export function getCategoryColorClasses(category: string): string {
  return getCategoryColor(category);
}

/**
 * Card container accent: left border + subtle background tint for timeline event cards.
 * Use first category when present; otherwise pass empty and use getFallbackCardAccentClasses(id).
 */
export function getCategoryCardAccentClasses(category: string): string {
  const accents: Record<string, string> = {
    Death: 'border-l-4 border-red-500/50 bg-gradient-to-r from-red-600/10 to-transparent',
    Birth: 'border-l-4 border-green-500/50 bg-gradient-to-r from-green-600/10 to-transparent',
    War: 'border-l-4 border-orange-500/50 bg-gradient-to-r from-orange-600/10 to-transparent',
    Battle: 'border-l-4 border-amber-500/50 bg-gradient-to-r from-amber-600/10 to-transparent',
    Discovery: 'border-l-4 border-blue-500/50 bg-gradient-to-r from-blue-600/10 to-transparent',
    Celebration: 'border-l-4 border-yellow-500/50 bg-gradient-to-r from-yellow-600/10 to-transparent',
    Political: 'border-l-4 border-purple-500/50 bg-gradient-to-r from-purple-600/10 to-transparent',
    Disaster: 'border-l-4 border-rose-500/50 bg-gradient-to-r from-rose-600/10 to-transparent',
    Marriage: 'border-l-4 border-pink-500/50 bg-gradient-to-r from-pink-600/10 to-transparent',
    Coronation: 'border-l-4 border-indigo-500/50 bg-gradient-to-r from-indigo-600/10 to-transparent',
    Treaty: 'border-l-4 border-cyan-500/50 bg-gradient-to-r from-cyan-600/10 to-transparent',
    Rebellion: 'border-l-4 border-red-600/50 bg-gradient-to-r from-red-700/10 to-transparent',
    Founding: 'border-l-4 border-emerald-500/50 bg-gradient-to-r from-emerald-600/10 to-transparent',
    Destruction: 'border-l-4 border-gray-500/50 bg-gradient-to-r from-gray-600/10 to-transparent',
    Revelation: 'border-l-4 border-violet-500/50 bg-gradient-to-r from-violet-600/10 to-transparent',
    Transformation: 'border-l-4 border-teal-500/50 bg-gradient-to-r from-teal-600/10 to-transparent',
  };
  if (accents[category]) return accents[category];
  const fallbacks = [
    'border-l-4 border-sky-500/50 bg-gradient-to-r from-sky-600/10 to-transparent',
    'border-l-4 border-fuchsia-500/50 bg-gradient-to-r from-fuchsia-600/10 to-transparent',
    'border-l-4 border-lime-500/50 bg-gradient-to-r from-lime-600/10 to-transparent',
    'border-l-4 border-violet-500/50 bg-gradient-to-r from-violet-600/10 to-transparent',
  ];
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = ((hash << 5) - hash) + category.charCodeAt(i);
    hash = hash & hash;
  }
  return fallbacks[Math.abs(hash) % fallbacks.length];
}

const FALLBACK_CARD_ACCENTS = [
  'border-l-4 border-purple-500/50 bg-gradient-to-r from-purple-600/10 to-transparent',
  'border-l-4 border-blue-500/50 bg-gradient-to-r from-blue-600/10 to-transparent',
  'border-l-4 border-teal-500/50 bg-gradient-to-r from-teal-600/10 to-transparent',
  'border-l-4 border-amber-500/50 bg-gradient-to-r from-amber-600/10 to-transparent',
  'border-l-4 border-rose-500/50 bg-gradient-to-r from-rose-600/10 to-transparent',
  'border-l-4 border-cyan-500/50 bg-gradient-to-r from-cyan-600/10 to-transparent',
  'border-l-4 border-indigo-500/50 bg-gradient-to-r from-indigo-600/10 to-transparent',
  'border-l-4 border-pink-500/50 bg-gradient-to-r from-pink-600/10 to-transparent',
];

/** Fallback accent for events with no category (based on event id so it’s stable). */
export function getFallbackCardAccentClasses(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash = hash & hash;
  }
  return FALLBACK_CARD_ACCENTS[Math.abs(hash) % FALLBACK_CARD_ACCENTS.length];
}

/**
 * Get color classes for category selector buttons (selected and unselected states)
 */
export function getCategoryButtonColorClasses(category: string, isSelected: boolean): string {
  const unselectedColors: Record<string, string> = {
    'Death': 'bg-red-700/40 text-red-200 hover:bg-red-700/60 border border-red-600/30',
    'Birth': 'bg-green-700/40 text-green-200 hover:bg-green-700/60 border border-green-600/30',
    'War': 'bg-orange-700/40 text-orange-200 hover:bg-orange-700/60 border border-orange-600/30',
    'Battle': 'bg-amber-700/40 text-amber-200 hover:bg-amber-700/60 border border-amber-600/30',
    'Discovery': 'bg-blue-700/40 text-blue-200 hover:bg-blue-700/60 border border-blue-600/30',
    'Celebration': 'bg-yellow-700/40 text-yellow-200 hover:bg-yellow-700/60 border border-yellow-600/30',
    'Political': 'bg-purple-700/40 text-purple-200 hover:bg-purple-700/60 border border-purple-600/30',
    'Disaster': 'bg-rose-700/40 text-rose-200 hover:bg-rose-700/60 border border-rose-600/30',
    'Marriage': 'bg-pink-700/40 text-pink-200 hover:bg-pink-700/60 border border-pink-600/30',
    'Coronation': 'bg-indigo-700/40 text-indigo-200 hover:bg-indigo-700/60 border border-indigo-600/30',
    'Treaty': 'bg-cyan-700/40 text-cyan-200 hover:bg-cyan-700/60 border border-cyan-600/30',
    'Rebellion': 'bg-red-800/40 text-red-200 hover:bg-red-800/60 border border-red-700/30',
    'Founding': 'bg-emerald-700/40 text-emerald-200 hover:bg-emerald-700/60 border border-emerald-600/30',
    'Destruction': 'bg-gray-700/40 text-gray-200 hover:bg-gray-700/60 border border-gray-600/30',
    'Revelation': 'bg-violet-700/40 text-violet-200 hover:bg-violet-700/60 border border-violet-600/30',
    'Transformation': 'bg-teal-700/40 text-teal-200 hover:bg-teal-700/60 border border-teal-600/30',
  };

  const selectedColors: Record<string, string> = {
    'Death': 'bg-red-600 text-white border border-red-500',
    'Birth': 'bg-green-600 text-white border border-green-500',
    'War': 'bg-orange-600 text-white border border-orange-500',
    'Battle': 'bg-amber-600 text-white border border-amber-500',
    'Discovery': 'bg-blue-600 text-white border border-blue-500',
    'Celebration': 'bg-yellow-600 text-white border border-yellow-500',
    'Political': 'bg-purple-600 text-white border border-purple-500',
    'Disaster': 'bg-rose-600 text-white border border-rose-500',
    'Marriage': 'bg-pink-600 text-white border border-pink-500',
    'Coronation': 'bg-indigo-600 text-white border border-indigo-500',
    'Treaty': 'bg-cyan-600 text-white border border-cyan-500',
    'Rebellion': 'bg-red-700 text-white border border-red-600',
    'Founding': 'bg-emerald-600 text-white border border-emerald-500',
    'Destruction': 'bg-gray-700 text-white border border-gray-600',
    'Revelation': 'bg-violet-600 text-white border border-violet-500',
    'Transformation': 'bg-teal-600 text-white border border-teal-500',
  };

  if (isSelected) {
    return selectedColors[category] || 'bg-purple-600 text-white border border-purple-500';
  }

  return unselectedColors[category] || 'bg-gray-700/40 text-gray-200 hover:bg-gray-700/60 border border-gray-600/30';
}

