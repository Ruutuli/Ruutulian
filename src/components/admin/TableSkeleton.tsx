interface TableSkeletonProps {
  columns: number;
  rows?: number;
  showHeader?: boolean;
  className?: string;
}

export function TableSkeleton({ 
  columns, 
  rows = 5, 
  showHeader = true,
  className = '' 
}: TableSkeletonProps) {
  return (
    <div className={`bg-gray-700/90 rounded-lg shadow-lg overflow-hidden border border-gray-600/70 ${className}`}>
      <div className="min-w-full">
        {showHeader && (
          <div className="bg-gray-600/80 px-6 py-3">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
              {Array.from({ length: columns }).map((_, i) => (
                <div key={i} className="h-4 bg-gray-500 rounded"></div>
              ))}
            </div>
          </div>
        )}
        <div className="divide-y divide-gray-600/50">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="px-6 py-4">
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <div key={colIndex} className="h-4 bg-gray-600 rounded w-full"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}





















