export default function WorldLoreLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex justify-between items-center mb-8">
        <div className="h-9 bg-gray-700 rounded w-48"></div>
        <div className="h-10 bg-gray-700 rounded w-40"></div>
      </div>
      
      {/* Filters skeleton */}
      <div className="bg-gray-700/90 rounded-lg p-4 border border-gray-600/70 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="h-4 bg-gray-600 rounded w-16 mb-2"></div>
            <div className="h-10 bg-gray-600 rounded w-full"></div>
          </div>
          <div>
            <div className="h-4 bg-gray-600 rounded w-20 mb-2"></div>
            <div className="h-10 bg-gray-600 rounded w-full"></div>
          </div>
          <div>
            <div className="h-4 bg-gray-600 rounded w-16 mb-2"></div>
            <div className="h-10 bg-gray-600 rounded w-full"></div>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <div className="h-10 bg-gray-600 rounded w-32"></div>
          <div className="h-10 bg-gray-600 rounded w-24"></div>
        </div>
      </div>

      {/* Table skeleton */}
      <div className="bg-gray-700/90 rounded-lg border border-gray-600/70 overflow-hidden">
        <div className="min-w-full">
          <div className="bg-gray-600/80 px-4 py-3">
            <div className="grid grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-4 bg-gray-500 rounded"></div>
              ))}
            </div>
          </div>
          <div className="divide-y divide-gray-600/50">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="px-4 py-3">
                <div className="grid grid-cols-6 gap-4">
                  <div className="h-4 bg-gray-600 rounded w-32"></div>
                  <div className="h-6 bg-gray-600 rounded w-20"></div>
                  <div className="h-4 bg-gray-600 rounded w-24"></div>
                  <div className="h-4 bg-gray-600 rounded w-12"></div>
                  <div className="h-4 bg-gray-600 rounded w-12"></div>
                  <div className="flex gap-2 justify-end">
                    <div className="h-8 bg-gray-600 rounded w-16"></div>
                    <div className="h-8 bg-gray-600 rounded w-16"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}






















