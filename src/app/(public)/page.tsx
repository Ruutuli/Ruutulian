import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { WorldCard } from '@/components/world/WorldCard';
import { OCCard } from '@/components/oc/OCCard';
import { FeatureTile } from '@/components/admin/FeatureTile';

export const metadata: Metadata = {
  title: 'Home',
  description: "Welcome to Ruutulian - Ruu's personal OC wiki! A place to store and organize information on her original characters, worlds, lore, and timelines. Browse characters, worlds, lore, timelines, and statistics.",
  keywords: ['original characters', 'OC wiki', 'character wiki', 'world building', 'character development', 'fictional characters'],
  openGraph: {
    title: "Ruu's Personal OC Wiki - Ruutulian",
    description: "Ruu's personal OC wiki! A place to store and organize information on her original characters, worlds, lore, and timelines. Browse characters, worlds, lore, timelines, and statistics.",
    url: '/',
    type: 'website',
    images: [
      {
        url: '/images/logo.png',
        width: 512,
        height: 512,
        alt: 'Ruutulian Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: "Ruu's Personal OC Wiki - Ruutulian",
    description: "Ruu's personal OC wiki! A place to store and organize information on her original characters, worlds, lore, and timelines. Browse characters, worlds, lore, timelines, and statistics.",
    images: ['/images/logo.png'],
  },
  alternates: {
    canonical: '/',
  },
};

export const revalidate = 60;

// Helper function to shuffle array and get random items
function getRandomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export default async function HomePage() {
  const supabase = await createClient();

  // Check if user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch a sample of public worlds for random selection (fetch 10, then randomly select 2-3)
  // This is much more efficient than fetching all worlds
  const { data: worldSample } = await supabase
    .from('worlds')
    .select('*')
    .eq('is_public', true)
    .limit(10);

  // Fetch a sample of public OCs for random selection (fetch 10, then randomly select 2-3)
  const { data: ocSample } = await supabase
    .from('ocs')
    .select('*, world:worlds(*)')
    .eq('is_public', true)
    .limit(10);

  // Get random worlds and characters (always show 3, or all available if less than 3)
  const totalWorlds = worldSample ? worldSample.length : 0;
  const totalOCs = ocSample ? ocSample.length : 0;
  const randomWorldCount = totalWorlds > 0 ? Math.min(3, totalWorlds) : 0;
  const randomOCCount = totalOCs > 0 ? Math.min(3, totalOCs) : 0;
  const randomWorlds = worldSample ? getRandomItems(worldSample, randomWorldCount) : [];
  const randomOCs = ocSample ? getRandomItems(ocSample, randomOCCount) : [];

  // Get stats
  const [
    worldCountResult,
    ocCountResult,
    loreCountResult,
    timelineEventCountResult,
  ] = await Promise.all([
    supabase.from('worlds').select('*', { count: 'exact', head: true }).eq('is_public', true),
    supabase.from('ocs').select('*', { count: 'exact', head: true }).eq('is_public', true),
    supabase.from('world_lore').select('*', { count: 'exact', head: true }).eq('is_public', true),
    supabase.from('timeline_events').select('*', { count: 'exact', head: true }),
  ]);

  const worldCount = worldCountResult.count ?? 0;
  const ocCount = ocCountResult.count ?? 0;
  const loreCount = loreCountResult.count ?? 0;
  const timelineEventCount = timelineEventCountResult.count ?? 0;

  // Get recent public content
  const [recentWorlds, recentOCs, recentLore] = await Promise.all([
    supabase
      .from('worlds')
      .select('id, name, slug, updated_at')
      .eq('is_public', true)
      .order('updated_at', { ascending: false })
      .limit(3),
    supabase
      .from('ocs')
      .select('id, name, slug, updated_at, world:worlds(slug)')
      .eq('is_public', true)
      .order('updated_at', { ascending: false })
      .limit(3),
    supabase
      .from('world_lore')
      .select('id, name, slug, updated_at, world:worlds(slug)')
      .eq('is_public', true)
      .order('updated_at', { ascending: false })
      .limit(3),
  ]);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ruutulian.com';
  
  // Structured data for SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Ruutulian',
    description: "Ruu's personal OC wiki! A place to store and organize information on her original characters, worlds, lore, and timelines across every universe.",
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/ocs?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="space-y-12 md:space-y-16">
      {/* Hero Section */}
      <section className="hero-gradient rounded-2xl p-6 md:p-8 lg:p-12 text-center fade-in">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-100 mb-3 md:mb-4">
          Ruutulian
        </h1>
        <p className="text-base md:text-lg lg:text-xl text-gray-300 max-w-2xl mx-auto mb-6 md:mb-8 px-4">
          Ruu's personal OC wiki! A place to store and organize information on her original characters, worlds, lore, and timelines across every universe.
        </p>
        <div className="flex flex-wrap justify-center gap-3 md:gap-4 px-4">
          <Link
            href="/worlds"
            prefetch={true}
            className="px-5 py-2.5 md:px-6 md:py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all hover:scale-105 shadow-lg text-sm md:text-base"
          >
            Browse Worlds
          </Link>
          <Link
            href="/ocs"
            prefetch={true}
            className="px-5 py-2.5 md:px-6 md:py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-all hover:scale-105 shadow-lg text-sm md:text-base"
          >
            View Characters
          </Link>
          <Link
            href="/lore"
            prefetch={true}
            className="px-5 py-2.5 md:px-6 md:py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all hover:scale-105 shadow-lg text-sm md:text-base"
          >
            Browse Lore
          </Link>
          <Link
            href="/timelines"
            prefetch={true}
            className="px-5 py-2.5 md:px-6 md:py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all hover:scale-105 shadow-lg text-sm md:text-base"
          >
            View Timelines
          </Link>
          <Link
            href="/stats"
            prefetch={true}
            className="px-5 py-2.5 md:px-6 md:py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all hover:scale-105 shadow-lg text-sm md:text-base"
          >
            View Statistics
          </Link>
          {user && (
            <Link
              href="/admin"
              prefetch={false}
              className="px-5 py-2.5 md:px-6 md:py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all hover:scale-105 shadow-lg text-sm md:text-base"
            >
              Admin Dashboard
            </Link>
          )}
        </div>
      </section>

      {/* Enhanced Stats Section */}
      <section className="slide-up">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-100 flex items-center gap-2 md:gap-3">
            <i className="fas fa-chart-bar text-purple-400 text-xl md:text-2xl"></i>
            Statistics
          </h2>
          <Link
            href="/stats"
            className="text-purple-400 hover:text-purple-300 font-medium flex items-center gap-2 text-sm md:text-base transition-colors"
          >
            View Full Stats <i className="fas fa-arrow-right"></i>
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
          <div className="wiki-card p-4 md:p-6 text-center hover:scale-105 transition-transform cursor-pointer">
            <Link href="/worlds" className="block">
              <div className="text-3xl md:text-4xl font-bold text-purple-400 mb-2">
                {worldCount}
              </div>
              <div className="text-sm md:text-base text-gray-300">Worlds</div>
            </Link>
          </div>
          <div className="wiki-card p-4 md:p-6 text-center hover:scale-105 transition-transform cursor-pointer">
            <Link href="/ocs" className="block">
              <div className="text-3xl md:text-4xl font-bold text-pink-400 mb-2">
                {ocCount}
              </div>
              <div className="text-sm md:text-base text-gray-300">Characters</div>
            </Link>
          </div>
          <div className="wiki-card p-4 md:p-6 text-center hover:scale-105 transition-transform cursor-pointer">
            <Link href="/lore" className="block">
              <div className="text-3xl md:text-4xl font-bold text-teal-400 mb-2">
                {loreCount}
              </div>
              <div className="text-sm md:text-base text-gray-300">Lore Entries</div>
            </Link>
          </div>
          <div className="wiki-card p-4 md:p-6 text-center hover:scale-105 transition-transform cursor-pointer">
            <Link href="/timelines" className="block">
              <div className="text-3xl md:text-4xl font-bold text-orange-400 mb-2">
                {timelineEventCount}
              </div>
              <div className="text-sm md:text-base text-gray-300">Timeline Events</div>
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Navigation Cards */}
      <section className="slide-up">
        <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
          <i className="fas fa-compass text-xl md:text-2xl text-purple-400"></i>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-100">Explore</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <FeatureTile
            title="Browse Worlds"
            description="Explore all available worlds and universes"
            href="/worlds"
            icon="fas fa-globe"
            color="purple"
            count={worldCount}
            actionLabel="Explore →"
          />
          <FeatureTile
            title="Browse Characters"
            description="Discover original characters across all worlds"
            href="/ocs"
            icon="fas fa-users"
            color="pink"
            count={ocCount}
            actionLabel="Explore →"
          />
          <FeatureTile
            title="Browse Lore"
            description="Read lore entries and codex information"
            href="/lore"
            icon="fas fa-book"
            color="teal"
            count={loreCount}
            actionLabel="Explore →"
          />
          <FeatureTile
            title="View Timelines"
            description="Explore chronological timelines and events"
            href="/timelines"
            icon="fas fa-calendar-alt"
            color="orange"
            actionLabel="Explore →"
          />
        </div>
      </section>

      {/* Recent Content Section */}
      {(recentWorlds.data && recentWorlds.data.length > 0) ||
      (recentOCs.data && recentOCs.data.length > 0) ||
      (recentLore.data && recentLore.data.length > 0) ? (
        <section className="slide-up">
          <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
            <i className="fas fa-clock text-xl md:text-2xl text-blue-400"></i>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-100">Recently Updated</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {recentWorlds.data && recentWorlds.data.length > 0 && (
              <div className="wiki-card p-4">
                <h3 className="text-lg font-semibold text-gray-100 mb-3 flex items-center gap-2">
                  <i className="fas fa-globe text-purple-400"></i>
                  Worlds
                </h3>
                <div className="space-y-2">
                  {recentWorlds.data.slice(0, 3).map((world) => (
                    <Link
                      key={world.id}
                      href={`/worlds/${world.slug}`}
                      prefetch={true}
                      className="block p-2 bg-gray-700/50 rounded hover:bg-gray-700 transition-colors"
                    >
                      <div className="text-sm font-medium text-gray-200">{world.name}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {recentOCs.data && recentOCs.data.length > 0 && (
              <div className="wiki-card p-4">
                <h3 className="text-lg font-semibold text-gray-100 mb-3 flex items-center gap-2">
                  <i className="fas fa-user text-pink-400"></i>
                  Characters
                </h3>
                <div className="space-y-2">
                  {recentOCs.data.slice(0, 3).map((oc) => (
                    <Link
                      key={oc.id}
                      href={`/ocs/${oc.slug}`}
                      prefetch={true}
                      className="block p-2 bg-gray-700/50 rounded hover:bg-gray-700 transition-colors"
                    >
                      <div className="text-sm font-medium text-gray-200">{oc.name}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {recentLore.data && recentLore.data.length > 0 && (
              <div className="wiki-card p-4">
                <h3 className="text-lg font-semibold text-gray-100 mb-3 flex items-center gap-2">
                  <i className="fas fa-book text-teal-400"></i>
                  Lore
                </h3>
                <div className="space-y-2">
                  {recentLore.data.slice(0, 3).map((lore) => (
                    <Link
                      key={lore.id}
                      href={`/worlds/${(lore.world as any)?.slug}/lore/${lore.slug}`}
                      prefetch={true}
                      className="block p-2 bg-gray-700/50 rounded hover:bg-gray-700 transition-colors"
                    >
                      <div className="text-sm font-medium text-gray-200">{lore.name}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {/* Current Projects Section */}
      <section className="slide-up">
        <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
          <i className="fas fa-folder-open text-xl md:text-2xl text-purple-400"></i>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-100">Current Projects</h2>
        </div>
        <div className="wiki-card p-4 md:p-6">
          <p className="text-gray-300 mb-4">
            Welcome to Ruutulian! Ruu's personal OC wiki for organizing and storing information on her original characters, worlds, lore, and timelines across various universes.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-purple-900/30 to-purple-800/30 rounded-lg">
              <i className="fas fa-globe text-purple-400 text-xl mt-1"></i>
              <div>
                <h3 className="font-semibold text-gray-100 mb-1">World Building</h3>
                <p className="text-sm text-gray-300">Creating and expanding unique worlds and universes</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-pink-900/30 to-pink-800/30 rounded-lg">
              <i className="fas fa-users text-pink-400 text-xl mt-1"></i>
              <div>
                <h3 className="font-semibold text-gray-100 mb-1">Character Development</h3>
                <p className="text-sm text-gray-300">Developing rich characters with detailed backstories</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Random Worlds */}
      <section className="slide-up">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
          <div className="flex items-center gap-2 md:gap-3">
            <i className="fas fa-dice text-purple-400 text-xl md:text-2xl"></i>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-100">Random Worlds</h2>
          </div>
          <Link
            href="/worlds"
            prefetch={true}
            className="text-purple-400 hover:text-purple-300 font-medium flex items-center gap-2 text-sm md:text-base"
          >
            View All <i className="fas fa-arrow-right"></i>
          </Link>
        </div>
        {randomWorlds.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {randomWorlds.map((world) => (
              <WorldCard key={world.id} world={world} />
            ))}
          </div>
        ) : (
          <div className="wiki-card p-12 text-center">
            <p className="text-gray-400 text-lg">No worlds available yet.</p>
          </div>
        )}
      </section>

      {/* Random Characters */}
      <section className="slide-up">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
          <div className="flex items-center gap-2 md:gap-3">
            <i className="fas fa-dice text-pink-400 text-xl md:text-2xl"></i>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-100">Random Characters</h2>
          </div>
          <Link
            href="/ocs"
            prefetch={true}
            className="text-pink-400 hover:text-pink-300 font-medium flex items-center gap-2 text-sm md:text-base"
          >
            View All <i className="fas fa-arrow-right"></i>
          </Link>
        </div>
        {randomOCs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {randomOCs.map((oc) => (
              <OCCard key={oc.id} oc={oc} />
            ))}
          </div>
        ) : (
          <div className="wiki-card p-12 text-center">
            <p className="text-gray-400 text-lg">No characters available yet.</p>
          </div>
        )}
      </section>
    </div>
    </>
  );
}
