export default function TimelineLoading() {
  return (
    <div>
      {/* PageHeader skeleton */}
      <div className="mb-8 animate-pulse">
        {/* Breadcrumbs skeleton */}
        <div className="flex mb-4 gap-2">
          <div className="h-4 bg-gray-700/50 rounded w-16"></div>
          <div className="h-4 bg-gray-700/50 rounded w-2"></div>
          <div className="h-4 bg-gray-700/50 rounded w-24"></div>
          <div className="h-4 bg-gray-700/50 rounded w-2"></div>
          <div className="h-4 bg-gray-700/50 rounded w-32"></div>
        </div>
        {/* Title skeleton */}
        <div className="h-10 bg-gray-700/50 rounded w-64"></div>
      </div>

      {/* Description skeleton */}
      <div className="wiki-card p-6 md:p-8 mb-8 animate-pulse">
        <div className="space-y-3">
          <div className="h-4 bg-gray-700/50 rounded w-full"></div>
          <div className="h-4 bg-gray-700/50 rounded w-full"></div>
          <div className="h-4 bg-gray-700/50 rounded w-5/6"></div>
          <div className="h-4 bg-gray-700/50 rounded w-full"></div>
          <div className="h-4 bg-gray-700/50 rounded w-4/5"></div>
        </div>
      </div>

      {/* Events section skeleton */}
      <div className="animate-pulse">
        <div className="h-8 bg-gray-700/50 rounded w-32 mb-6"></div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="wiki-card p-6">
              <div className="h-6 bg-gray-700/50 rounded w-48 mb-3"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-700/50 rounded w-full"></div>
                <div className="h-4 bg-gray-700/50 rounded w-5/6"></div>
                <div className="h-4 bg-gray-700/50 rounded w-4/5"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}



















