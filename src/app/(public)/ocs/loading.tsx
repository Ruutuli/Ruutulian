export default function OCsPageLoading() {
  return (
    <div className="max-w-6xl mx-auto animate-pulse">
      <div className="mb-8">
        <div className="h-10 bg-gray-700 rounded w-48 mb-4"></div>
        <div className="h-6 bg-gray-700 rounded w-96"></div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="bg-gray-800/95 rounded-lg border border-gray-600/70 overflow-hidden shadow-md">
            <div className="h-48 bg-gray-700"></div>
            <div className="p-4 space-y-2">
              <div className="h-5 bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-700 rounded w-full"></div>
              <div className="h-4 bg-gray-700 rounded w-5/6"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}





















