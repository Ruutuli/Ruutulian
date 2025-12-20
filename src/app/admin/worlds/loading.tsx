export default function WorldsLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex justify-between items-center mb-8">
        <div className="h-9 bg-gray-700 rounded w-32"></div>
        <div className="h-10 bg-gray-700 rounded w-32"></div>
      </div>
      <div className="bg-gray-700/90 rounded-lg shadow-lg overflow-hidden border border-gray-600/70">
        <div className="min-w-full">
          <div className="bg-gray-600/80 px-6 py-3">
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-4 bg-gray-500 rounded"></div>
              ))}
            </div>
          </div>
          <div className="divide-y divide-gray-600/50">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="px-6 py-4">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <div className="h-4 bg-gray-600 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-600 rounded w-24"></div>
                  </div>
                  <div className="h-6 bg-gray-600 rounded w-20"></div>
                  <div className="h-4 bg-gray-600 rounded w-12"></div>
                  <div className="h-4 bg-gray-600 rounded w-16 ml-auto"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}





















