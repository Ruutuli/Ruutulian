export default function DropdownOptionsLoading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-9 w-64 bg-gray-700 rounded animate-pulse mb-2"></div>
          <div className="h-5 w-96 bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="h-10 w-32 bg-gray-700 rounded animate-pulse"></div>
      </div>
      <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
        <div className="space-y-6">
          <div className="h-8 w-48 bg-gray-700 rounded animate-pulse"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 bg-gray-700/50 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}




















