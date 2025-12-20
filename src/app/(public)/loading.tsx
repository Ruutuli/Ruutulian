export default function HomeLoading() {
  return (
    <div className="space-y-16 animate-pulse">
      {/* Hero Section */}
      <section className="hero-gradient rounded-2xl p-8 md:p-12 text-center">
        <div className="h-16 bg-gray-700/50 rounded w-64 mx-auto mb-4"></div>
        <div className="h-6 bg-gray-700/50 rounded w-96 mx-auto mb-8"></div>
        <div className="flex flex-wrap justify-center gap-4">
          <div className="h-12 bg-gray-700/50 rounded-lg w-32"></div>
          <div className="h-12 bg-gray-700/50 rounded-lg w-36"></div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="wiki-card p-6 text-center">
            <div className="h-10 bg-gray-700/50 rounded w-16 mx-auto mb-2"></div>
            <div className="h-5 bg-gray-700/50 rounded w-24 mx-auto"></div>
          </div>
        ))}
      </section>

      {/* Current Projects Section */}
      <section>
        <div className="h-8 bg-gray-700/50 rounded w-48 mb-6"></div>
        <div className="wiki-card p-6">
          <div className="space-y-3 mb-4">
            <div className="h-4 bg-gray-700/50 rounded w-full"></div>
            <div className="h-4 bg-gray-700/50 rounded w-5/6"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-700/50 rounded-lg"></div>
            ))}
          </div>
        </div>
      </section>

      {/* Random Worlds */}
      <section>
        <div className="h-8 bg-gray-700/50 rounded w-48 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-800/95 rounded-lg border border-gray-600/70 overflow-hidden shadow-md">
              <div className="h-48 bg-gray-700/50"></div>
              <div className="p-4 space-y-2">
                <div className="h-5 bg-gray-700/50 rounded w-3/4"></div>
                <div className="h-4 bg-gray-700/50 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Random Characters */}
      <section>
        <div className="h-8 bg-gray-700/50 rounded w-56 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-800/95 rounded-lg border border-gray-600/70 overflow-hidden shadow-md">
              <div className="h-48 bg-gray-700/50"></div>
              <div className="p-4 space-y-2">
                <div className="h-5 bg-gray-700/50 rounded w-3/4"></div>
                <div className="h-4 bg-gray-700/50 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}




















