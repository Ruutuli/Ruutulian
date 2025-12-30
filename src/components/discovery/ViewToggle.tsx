'use client';

interface ViewToggleProps {
  view: 'list' | 'gallery';
  onViewChange: (view: 'list' | 'gallery') => void;
  className?: string;
}

export function ViewToggle({ view, onViewChange, className = '' }: ViewToggleProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={() => onViewChange('list')}
        className={`p-2 rounded transition-colors ${
          view === 'list'
            ? 'bg-purple-600 text-white'
            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
        }`}
        title="List view"
      >
        <i className="fas fa-list"></i>
      </button>
      <button
        onClick={() => onViewChange('gallery')}
        className={`p-2 rounded transition-colors ${
          view === 'gallery'
            ? 'bg-purple-600 text-white'
            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
        }`}
        title="Gallery view"
      >
        <i className="fas fa-th"></i>
      </button>
    </div>
  );
}

