/**
 * Get Tailwind CSS classes for fanfic rating badges
 * Ensures consistent styling across admin and public pages
 */
export function getRatingColorClasses(rating?: string | null): string {
  switch (rating) {
    case 'G': return 'bg-green-900/70 text-green-200 border-green-700';
    case 'PG': return 'bg-blue-900/70 text-blue-200 border-blue-700';
    case 'PG-13': return 'bg-yellow-900/70 text-yellow-200 border-yellow-700';
    case 'R': return 'bg-orange-900/70 text-orange-200 border-orange-700';
    case 'M': return 'bg-red-900/70 text-red-200 border-red-700';
    default: return 'bg-gray-800/70 text-gray-300 border-gray-700';
  }
}

