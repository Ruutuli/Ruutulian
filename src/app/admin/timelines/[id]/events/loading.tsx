export default function TimelineEventsLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-9 bg-gray-700 rounded w-64 mb-8"></div>
      <div className="bg-gray-700/90 rounded-lg shadow-lg p-6 border border-gray-600/70">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="h-6 bg-gray-600 rounded w-32"></div>
            <div className="h-10 bg-gray-600 rounded w-24"></div>
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-gray-600/70 rounded-lg p-6 bg-gray-700/60">
              <div className="h-5 bg-gray-600 rounded w-48 mb-4"></div>
              <div className="h-4 bg-gray-600 rounded w-32 mb-2"></div>
              <div className="h-20 bg-gray-600 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}





















