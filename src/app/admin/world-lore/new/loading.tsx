export default function NewWorldLoreLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-9 bg-gray-700 rounded w-48 mb-8"></div>
      <div className="bg-gray-700/90 rounded-lg shadow-lg p-6 border border-gray-600/70">
        <div className="space-y-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i}>
              <div className="h-4 bg-gray-600 rounded w-24 mb-2"></div>
              <div className="h-10 bg-gray-600 rounded w-full"></div>
            </div>
          ))}
          <div>
            <div className="h-4 bg-gray-600 rounded w-32 mb-2"></div>
            <div className="h-32 bg-gray-600 rounded w-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}






















