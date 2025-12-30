import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { SimpleWorldCard } from '@/components/world/SimpleWorldCard';
import { SimpleOCCard } from '@/components/oc/SimpleOCCard';
import { FeatureTile } from '@/components/admin/FeatureTile';
import { QuoteOfTheDay } from '@/components/content/QuotesSection';
import { getSiteConfig } from '@/lib/config/site-config';
import { convertGoogleDriveUrl } from '@/lib/utils/googleDriveImage';

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const siteUrl = config.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
  const iconUrl = convertGoogleDriveUrl(config.iconUrl || '/images/logo.png');
  
  return {
    title: 'Home',
    description: `Welcome to ${config.websiteName} - ${config.websiteDescription}`,
    keywords: ['original characters', 'OC wiki', 'character wiki', 'world building', 'character development', 'fictional characters'],
    openGraph: {
      title: `${config.websiteName} - ${config.websiteDescription.split('.')[0]}`,
      description: config.websiteDescription,
      url: '/',
      type: 'website',
      images: [
        {
          url: `${siteUrl}/og-image`,
          width: 1200,
          height: 630,
          alt: `${config.websiteName} Logo`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${config.websiteName} - ${config.websiteDescription.split('.')[0]}`,
      description: config.websiteDescription,
      images: [`${siteUrl}/og-image`],
    },
    alternates: {
      canonical: '/',
    },
  };
}

export const revalidate = 60;

// Generate a seed based on the current date (same seed for the same day)
function getDaySeed(): number {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateString = `${year}-${month}-${day}`;
  
  // Better hash function to convert date string to number
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    const char = dateString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Improved seeded random number generator (Linear Congruential Generator)
function seededRandom(seed: number): () => number {
  let value = seed;
  return function() {
    // LCG parameters (from Numerical Recipes)
    value = (value * 1664525 + 1013904223) % Math.pow(2, 32);
    return value / Math.pow(2, 32);
  };
}

// Fisher-Yates shuffle with seeded random
function seededShuffle<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  const random = seededRandom(seed);
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

// Helper function to shuffle array and get random items using day-based seed
function getRandomItems<T>(array: T[], count: number): T[] {
  if (array.length === 0) return [];
  
  // Use day-based seed for consistent daily randomization
  const seed = getDaySeed();
  const shuffled = seededShuffle(array, seed);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export default async function HomePage() {
  const supabase = await createClient();
  
  // Batch initial data fetches in parallel
  const [
    config,
    userResult,
    worldSampleResult,
    ocSampleResult,
    worldCountResult,
    ocCountResult,
    loreCountResult,
    timelineEventCountResult,
    fanficCountResult,
  ] = await Promise.all([
    getSiteConfig(),
    supabase.auth.getUser(),
    supabase
      .from('worlds')
      .select('*')
      .eq('is_public', true)
      .limit(6), // Reduced from 10 to 6 since we only show 3
    supabase
      .from('ocs')
      .select('*, world:worlds(*)')
      .eq('is_public', true)
      .limit(6), // Reduced from 10 to 6 since we only show 3
    supabase.from('worlds').select('*', { count: 'exact', head: true }).eq('is_public', true),
    supabase.from('ocs').select('*', { count: 'exact', head: true }).eq('is_public', true),
    supabase.from('world_lore').select('*, world:worlds!inner(is_public)', { count: 'exact', head: true }).eq('world.is_public', true),
    supabase.from('timeline_events').select('*', { count: 'exact', head: true }),
    supabase.from('fanfics').select('*', { count: 'exact', head: true }).eq('is_public', true),
  ]);

  const { data: { user } } = userResult;
  const fanficCount = fanficCountResult.count ?? 0;
  const { data: worldSample } = worldSampleResult;
  const { data: ocSample } = ocSampleResult;

  // Get random worlds and characters (always show 3, or all available if less than 3)
  const totalWorlds = worldSample ? worldSample.length : 0;
  const totalOCs = ocSample ? ocSample.length : 0;
  const randomWorldCount = totalWorlds > 0 ? Math.min(3, totalWorlds) : 0;
  const randomOCCount = totalOCs > 0 ? Math.min(3, totalOCs) : 0;
  const randomWorlds = worldSample ? getRandomItems(worldSample, randomWorldCount) : [];
  const randomOCs = ocSample ? getRandomItems(ocSample, randomOCCount) : [];

  const worldCount = worldCountResult.count ?? 0;
  const ocCount = ocCountResult.count ?? 0;
  const loreCount = loreCountResult.count ?? 0;
  const timelineEventCount = timelineEventCountResult.count ?? 0;

  // Get recent public content
  const [recentWorlds, recentOCs, recentLore] = await Promise.all([
    supabase
      .from('worlds')
      .select('*')
      .eq('is_public', true)
      .order('updated_at', { ascending: false })
      .limit(3),
    supabase
      .from('ocs')
      .select('*, world:worlds(id, name, slug, primary_color, accent_color)')
      .eq('is_public', true)
      .order('updated_at', { ascending: false })
      .limit(3),
    supabase
      .from('world_lore')
      .select('*, world:worlds!inner(id, name, slug, is_public, primary_color, accent_color)')
      .eq('world.is_public', true)
      .order('updated_at', { ascending: false })
      .limit(3),
  ]);


  // Get quote of the day - optimized: fetch only what we need
  // Since we're using seeded shuffle, we can fetch a smaller sample
  const { data: allQuotes } = await supabase
    .from('character_quotes')
    .select('*, oc:ocs!inner(id, name, slug, is_public)')
    .eq('oc.is_public', true)
    .limit(20); // Reduced from 100 to 20 - still plenty for daily variety

  let quoteOfTheDay = null;
  if (allQuotes && allQuotes.length > 0) {
    const seed = getDaySeed();
    const shuffled = seededShuffle(allQuotes, seed);
    quoteOfTheDay = shuffled[0];
  }

  // Get OCs with birthdays and check if today is anyone's birthday
  const { data: allOCsWithBirthdays } = await supabase
    .from('ocs')
    .select('id, name, slug, date_of_birth, image_url')
    .eq('is_public', true)
    .not('date_of_birth', 'is', null);

  const today = new Date();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();

  const birthdayOCs = (allOCsWithBirthdays || []).filter((oc) => {
    if (!oc.date_of_birth) return false;
    try {
      const birthDate = new Date(oc.date_of_birth);
      if (isNaN(birthDate.getTime())) return false;
      // Match month and day, ignore year
      return birthDate.getMonth() === todayMonth && birthDate.getDate() === todayDay;
    } catch {
      return false;
    }
  });

  // Get current projects section data
  const { data: currentProjectsData } = await supabase
    .from('current_projects')
    .select('*')
    .single();

  // Default current projects data if none exists
  const currentProjects = currentProjectsData || {
    description: `Welcome to ${config.websiteName}! ${config.websiteDescription}`,
    project_items: [
      {
        title: 'World Building',
        description: 'Creating and expanding unique worlds and universes',
        icon: 'fas fa-globe',
        color: 'purple',
      },
      {
        title: 'Character Development',
        description: 'Developing rich characters with detailed backstories',
        icon: 'fas fa-users',
        color: 'pink',
      },
    ],
  };

  const baseUrl = config.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
  
  // Structured data for SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: config.websiteName,
    description: config.websiteDescription,
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
          {config.websiteName}
        </h1>
        <p className="text-base md:text-lg lg:text-xl text-gray-300 max-w-2xl mx-auto mb-6 md:mb-8 px-4">
          {config.websiteDescription}
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
            href="/fanfics"
            prefetch={true}
            className="px-5 py-2.5 md:px-6 md:py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-all hover:scale-105 shadow-lg text-sm md:text-base"
          >
            Browse Fanfics
          </Link>
          <Link
            href="/stats"
            prefetch={true}
            className="px-5 py-2.5 md:px-6 md:py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all hover:scale-105 shadow-lg text-sm md:text-base"
          >
            View Statistics
          </Link>
          <Link
            href="/ocs/random"
            prefetch={true}
            className="px-5 py-2.5 md:px-6 md:py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-all hover:scale-105 shadow-lg text-sm md:text-base"
          >
            Random Character
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

      {/* Birthday Celebration Section */}
      {birthdayOCs.length > 0 && (
        <section className="slide-up">
          <div className="wiki-card p-6 md:p-8 bg-gradient-to-br from-pink-600/20 via-purple-600/20 to-pink-600/20 border-2 border-pink-500/50 rounded-2xl">
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-3xl md:text-4xl animate-bounce">
                  <i className="fas fa-birthday-cake text-white"></i>
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-100 mb-2">
                  {birthdayOCs.length === 1 ? (
                    <>
                      It's <Link href={`/ocs/${birthdayOCs[0].slug}`} className="text-pink-400 hover:text-pink-300 underline transition-colors">{birthdayOCs[0].name}</Link>'s birthday!!
                    </>
                  ) : (
                    <>
                      It's {birthdayOCs.map((oc, index) => (
                        <span key={oc.id}>
                          <Link href={`/ocs/${oc.slug}`} className="text-pink-400 hover:text-pink-300 underline transition-colors">
                            {oc.name}
                          </Link>
                          {index < birthdayOCs.length - 2 && ', '}
                          {index === birthdayOCs.length - 2 && ' and '}
                        </span>
                      ))}'s birthday!!
                    </>
                  )}
                </h2>
                <p className="text-gray-300 text-sm md:text-base">
                  {birthdayOCs.length === 1 
                    ? 'Wish them a happy birthday! 🎉'
                    : `Wish ${birthdayOCs.length} characters a happy birthday! 🎉`}
                </p>
              </div>
              <div className="flex-shrink-0">
                <Link
                  href="/calendar"
                  className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-all hover:scale-105 shadow-lg text-sm md:text-base flex items-center gap-2"
                >
                  <i className="fas fa-calendar-alt"></i>
                  View Calendar
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Quote of the Day */}
      {quoteOfTheDay && quoteOfTheDay.oc && (
        <section className="slide-up">
          <QuoteOfTheDay
            quote={quoteOfTheDay}
            ocName={(quoteOfTheDay.oc as any).name}
            ocSlug={(quoteOfTheDay.oc as any).slug}
          />
        </section>
      )}

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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 lg:gap-6">
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
            <Link href="/fanfics" className="block">
              <div className="text-3xl md:text-4xl font-bold text-pink-400 mb-2">
                {fanficCount}
              </div>
              <div className="text-sm md:text-base text-gray-300">Fanfics</div>
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
          <div className="wiki-card p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {recentWorlds.data && recentWorlds.data.map((world) => (
                <Link
                  key={world.id}
                  href={`/worlds/${world.slug}`}
                  prefetch={true}
                  className="block p-3 hover:bg-gray-700/50 rounded transition-colors border-l-2 border-purple-400"
                >
                  <div className="text-sm md:text-base text-gray-200">
                    <span className="text-purple-400 font-medium">World</span>
                    <span className="mx-2 text-gray-500">|</span>
                    <span className="text-gray-100">{world.name}</span>
                  </div>
                </Link>
              ))}
              {recentOCs.data && recentOCs.data.map((oc) => (
                <Link
                  key={oc.id}
                  href={`/ocs/${oc.slug}`}
                  prefetch={true}
                  className="block p-3 hover:bg-gray-700/50 rounded transition-colors border-l-2 border-pink-400"
                >
                  <div className="text-sm md:text-base text-gray-200">
                    <span className="text-pink-400 font-medium">OC</span>
                    <span className="mx-2 text-gray-500">|</span>
                    <span className="text-gray-100">{oc.name}</span>
                  </div>
                </Link>
              ))}
              {recentLore.data && recentLore.data.map((lore) => (
                <Link
                  key={lore.id}
                  href={`/worlds/${(lore.world as any)?.slug}/lore/${lore.slug}`}
                  prefetch={true}
                  className="block p-3 hover:bg-gray-700/50 rounded transition-colors border-l-2 border-teal-400"
                >
                  <div className="text-sm md:text-base text-gray-200">
                    <span className="text-teal-400 font-medium">Lore</span>
                    <span className="mx-2 text-gray-500">|</span>
                    <span className="text-gray-100">{lore.name}</span>
                  </div>
                </Link>
              ))}
            </div>
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
          {currentProjects.description && (
            <p className="text-gray-300 mb-4">{currentProjects.description}</p>
          )}
          {currentProjects.project_items && currentProjects.project_items.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentProjects.project_items.map((item: any, index: number) => {
                const colorConfig: Record<string, { bg: string; icon: string }> = {
                  purple: { bg: 'from-purple-900/30 to-purple-800/30', icon: 'text-purple-400' },
                  pink: { bg: 'from-pink-900/30 to-pink-800/30', icon: 'text-pink-400' },
                  teal: { bg: 'from-teal-900/30 to-teal-800/30', icon: 'text-teal-400' },
                  blue: { bg: 'from-blue-900/30 to-blue-800/30', icon: 'text-blue-400' },
                  orange: { bg: 'from-orange-900/30 to-orange-800/30', icon: 'text-orange-400' },
                  indigo: { bg: 'from-indigo-900/30 to-indigo-800/30', icon: 'text-indigo-400' },
                };
                const color = colorConfig[item.color] || colorConfig.purple;
                return (
                  <div
                    key={index}
                    className={`flex items-start gap-3 p-4 bg-gradient-to-br ${color.bg} rounded-lg`}
                  >
                    <i className={`${item.icon} ${color.icon} text-xl mt-1`}></i>
                    <div>
                      <h3 className="font-semibold text-gray-100 mb-1">{item.title}</h3>
                      <p className="text-sm text-gray-300">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
              <SimpleWorldCard key={world.id} world={world} />
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
              <SimpleOCCard key={oc.id} oc={oc} />
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
