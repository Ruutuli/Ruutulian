export default function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900/30">
      <div className="max-w-md w-full space-y-8 p-8 bg-gray-800 rounded-xl shadow-lg border border-gray-700">
        <div className="flex flex-col items-center justify-center">
          <div className="relative w-12 h-12 mb-4">
            <div className="absolute inset-0 border-4 border-purple-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-purple-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <div className="h-9 bg-gray-700 rounded w-48 mb-3 animate-pulse"></div>
          <div className="h-5 bg-gray-700 rounded w-64 animate-pulse"></div>
        </div>
        <div className="mt-8 space-y-6">
          <div>
            <div className="h-4 bg-gray-700 rounded w-16 mb-2 animate-pulse"></div>
            <div className="h-10 bg-gray-700 rounded w-full animate-pulse"></div>
          </div>
          <div>
            <div className="h-4 bg-gray-700 rounded w-20 mb-2 animate-pulse"></div>
            <div className="h-10 bg-gray-700 rounded w-full animate-pulse"></div>
          </div>
          <div>
            <div className="h-10 bg-gray-700 rounded w-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}



















