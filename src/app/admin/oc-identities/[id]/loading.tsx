export default function OCIdentityLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-9 bg-gray-700 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-64"></div>
        </div>
        <div className="h-12 bg-gray-700 rounded w-40"></div>
      </div>
      
      {/* Banner skeleton */}
      <div className="bg-gray-700/90 rounded-lg p-4 border border-gray-600/70 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="h-5 bg-gray-600 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-600 rounded w-96"></div>
          </div>
          <div className="h-12 bg-gray-600 rounded w-40 ml-4"></div>
        </div>
      </div>

      {/* Table skeleton */}
      <div className="bg-gray-700/90 rounded-lg shadow-lg overflow-hidden border border-gray-600/70">
        <div className="min-w-full">
          <div className="bg-gray-600/80 px-6 py-3">
            <div className="grid grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-4 bg-gray-500 rounded"></div>
              ))}
            </div>
          </div>
          <div className="divide-y divide-gray-600/50">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="px-6 py-4">
                <div className="grid grid-cols-5 gap-4">
                  <div>
                    <div className="h-4 bg-gray-600 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-600 rounded w-24"></div>
                  </div>
                  <div className="h-4 bg-gray-600 rounded w-24"></div>
                  <div className="h-6 bg-gray-600 rounded w-20"></div>
                  <div className="h-4 bg-gray-600 rounded w-12"></div>
                  <div className="flex gap-4 justify-end">
                    <div className="h-4 bg-gray-600 rounded w-16"></div>
                    <div className="h-4 bg-gray-600 rounded w-16"></div>
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




















