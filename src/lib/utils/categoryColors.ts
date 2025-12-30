import { PREDEFINED_EVENT_CATEGORIES } from '@/types/oc';

/**
 * Get color classes for a category
 * Returns different colors for predefined categories, default gray for custom categories
 */
export function getCategoryColorClasses(category: string): string {
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

  return categoryColors[category] || 'bg-gray-700/30 text-gray-300 border-gray-600/50';
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

