export default function OCLoading() {
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

      {/* Main content layout skeleton */}
      <div className="flex flex-col lg:flex-row gap-8 animate-pulse">
        {/* Sidebar (Infobox) skeleton */}
        <div className="lg:w-96 flex-shrink-0">
          <div className="wiki-infobox">
            {/* Image skeleton */}
            <div className="w-full h-64 md:h-80 bg-gray-700/50 rounded-lg mb-4"></div>
            
            {/* Info rows skeleton */}
            <div className="space-y-3">
              <div className="py-2 border-b border-gray-700/50">
                <div className="h-4 bg-gray-700/50 rounded w-20 mb-1"></div>
                <div className="h-5 bg-gray-700/50 rounded w-32"></div>
              </div>
              <div className="py-2 border-b border-gray-700/50">
                <div className="h-4 bg-gray-700/50 rounded w-16 mb-1"></div>
                <div className="h-5 bg-gray-700/50 rounded w-28"></div>
              </div>
              <div className="py-2 border-b border-gray-700/50">
                <div className="h-4 bg-gray-700/50 rounded w-12 mb-1"></div>
                <div className="h-5 bg-gray-700/50 rounded w-24"></div>
              </div>
              <div className="py-2">
                <div className="h-4 bg-gray-700/50 rounded w-20 mb-1"></div>
                <div className="h-5 bg-gray-700/50 rounded w-28"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content (Biography) skeleton */}
        <div className="flex-1">
          <div className="wiki-card p-6 md:p-8">
            <div className="h-8 bg-gray-700/50 rounded w-32 mb-6"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-700/50 rounded w-full"></div>
              <div className="h-4 bg-gray-700/50 rounded w-full"></div>
              <div className="h-4 bg-gray-700/50 rounded w-5/6"></div>
              <div className="h-4 bg-gray-700/50 rounded w-full"></div>
              <div className="h-4 bg-gray-700/50 rounded w-4/5"></div>
              <div className="h-4 bg-gray-700/50 rounded w-full"></div>
              <div className="h-4 bg-gray-700/50 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}





















