export default function AdminLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-700 rounded w-64 mb-8"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-700/90 rounded-lg shadow-lg p-6 border border-gray-600/70">
            <div className="h-5 bg-gray-600 rounded w-24 mb-2"></div>
            <div className="h-8 bg-gray-600 rounded w-16 mb-4"></div>
            <div className="h-4 bg-gray-600 rounded w-20"></div>
          </div>
        ))}
      </div>
      <div className="bg-gray-700/90 rounded-lg shadow-lg p-6 border border-gray-600/70">
        <div className="h-6 bg-gray-600 rounded w-32 mb-4"></div>
        <div className="flex flex-wrap gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-600 rounded w-32"></div>
          ))}
        </div>
      </div>
    </div>
  );
}





















