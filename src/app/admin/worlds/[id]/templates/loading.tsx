export default function WorldTemplatesLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-9 bg-gray-700 rounded w-80 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-64"></div>
        </div>
        <div className="h-10 bg-gray-700 rounded w-40"></div>
      </div>
      
      <div className="bg-gray-700/90 rounded-lg shadow-lg p-6 border border-gray-600/70">
        <div className="space-y-6">
          <div>
            <div className="h-5 bg-gray-600 rounded w-48 mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border border-gray-600/70 rounded-lg p-4 bg-gray-800/50">
                  <div className="h-4 bg-gray-600 rounded w-32 mb-2"></div>
                  <div className="h-10 bg-gray-600 rounded w-full"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}























