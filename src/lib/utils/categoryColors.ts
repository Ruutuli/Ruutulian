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
 * Get color classes for category selector buttons (selected state)
 */
export function getCategoryButtonColorClasses(category: string, isSelected: boolean): string {
  if (!isSelected) {
    return 'bg-gray-700 text-gray-300 hover:bg-gray-600';
  }

  const categoryColors: Record<string, string> = {
    'Death': 'bg-red-600 text-white',
    'Birth': 'bg-green-600 text-white',
    'War': 'bg-orange-600 text-white',
    'Battle': 'bg-amber-600 text-white',
    'Discovery': 'bg-blue-600 text-white',
    'Celebration': 'bg-yellow-600 text-white',
    'Political': 'bg-purple-600 text-white',
    'Disaster': 'bg-rose-600 text-white',
    'Marriage': 'bg-pink-600 text-white',
    'Coronation': 'bg-indigo-600 text-white',
    'Treaty': 'bg-cyan-600 text-white',
    'Rebellion': 'bg-red-700 text-white',
    'Founding': 'bg-emerald-600 text-white',
    'Destruction': 'bg-gray-700 text-white',
    'Revelation': 'bg-violet-600 text-white',
    'Transformation': 'bg-teal-600 text-white',
  };

  return categoryColors[category] || 'bg-purple-600 text-white';
}

