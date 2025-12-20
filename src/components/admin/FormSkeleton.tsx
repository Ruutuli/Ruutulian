interface FormSkeletonProps {
  fields?: number;
  includeTextarea?: boolean;
  className?: string;
}

export function FormSkeleton({ 
  fields = 6, 
  includeTextarea = false,
  className = '' 
}: FormSkeletonProps) {
  return (
    <div className={`bg-gray-700/90 rounded-lg shadow-lg p-6 border border-gray-600/70 ${className}`}>
      <div className="space-y-6">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i}>
            <div className="h-4 bg-gray-600 rounded w-24 mb-2"></div>
            <div className="h-10 bg-gray-600 rounded w-full"></div>
          </div>
        ))}
        {includeTextarea && (
          <div>
            <div className="h-4 bg-gray-600 rounded w-32 mb-2"></div>
            <div className="h-32 bg-gray-600 rounded w-full"></div>
          </div>
        )}
      </div>
    </div>
  );
}





















