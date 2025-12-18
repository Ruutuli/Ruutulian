import { ReactNode } from 'react';

interface FilterContainerProps {
  title?: string;
  clearLabel?: string;
  onClear: () => void;
  hasActiveFilters: boolean;
  clearColor?: 'pink' | 'purple';
  children: ReactNode;
}

export function FilterContainer({
  title = 'Filters',
  clearLabel = 'Clear all',
  onClear,
  hasActiveFilters,
  clearColor = 'pink',
  children,
}: FilterContainerProps) {
  const clearColorClass = clearColor === 'pink'
    ? 'text-pink-400 hover:text-pink-300'
    : 'text-purple-400 hover:text-purple-300';

  return (
    <div className="wiki-card p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-100">{title}</h3>
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className={`text-sm ${clearColorClass}`}
          >
            {clearLabel}
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {children}
      </div>
    </div>
  );
}

