import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { SimpleWorldCard } from '@/components/world/SimpleWorldCard';
import { SimpleOCCard } from '@/components/oc/SimpleOCCard';
import { FeatureTile } from '@/components/admin/FeatureTile';
import { QuoteOfTheDay } from '@/components/content/QuotesSection';
import { generatePageMetadata } from '@/lib/seo/page-metadata';
import { getSiteConfig } from '@/lib/config/site-config';
import { getDaySeed, getRandomItemsPerRequest, seededShuffle } from '@/lib/utils/random';
import { generateWebSiteSchema, generateOrganizationSchema, generatePersonSchema } from '@/lib/seo/structured-data';
import { getAbsoluteIconUrl } from '@/lib/seo/metadata-helpers';
import { getDateInEST, formatDateOfBirth } from '@/lib/utils/dateFormat';
import { logMemoryUsage } from '@/lib/memory-monitor';
import type { World, OC } from '@/types/oc';

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  return generatePageMetadata({
    title: 'Home',
    description: `Welcome to ${config.websiteName} - ${config.websiteDescription}`,
    path: '/',
    keywords: ['original characters', 'OC wiki', 'character wiki', 'world building', 'character development', 'fictional characters'],
  });
}

export const revalidate = 60; // Cache RSC payload to reduce repeated full fetches; random content refreshes per revalidate window
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  if (process.env.NODE_ENV === 'development') {
    logMemoryUsage('Server', 'HomePage: Start', { path: '/' });
  }
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
      .select('id, name, slug, header_image_url, primary_color, accent_color')
      .eq('is_public', true)
      .limit(6),
    supabase
      .from('ocs')
      .select('id, name, slug, image_url, world:worlds(id, name, slug, primary_color, accent_color)')
      .eq('is_public', true)
      .limit(6),
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
  // Using per-request randomization so they change on each page load
  const totalWorlds = worldSample ? worldSample.length : 0;
  const totalOCs = ocSample ? ocSample.length : 0;
  const randomWorldCount = totalWorlds > 0 ? Math.min(3, totalWorlds) : 0;
  const randomOCCount = totalOCs > 0 ? Math.min(3, totalOCs) : 0;
  const randomWorlds = worldSample ? getRandomItemsPerRequest(worldSample, randomWorldCount) : [];
  const randomOCs = ocSample ? getRandomItemsPerRequest(ocSample, randomOCCount) : [];

  const worldCount = worldCountResult.count ?? 0;
  const ocCount = ocCountResult.count ?? 0;
  const loreCount = loreCountResult.count ?? 0;
  const timelineEventCount = timelineEventCountResult.count ?? 0;

  // Get recent public content
  const [recentWorlds, recentOCs, recentLore] = await Promise.all([
    supabase
      .from('worlds')
      .select('id, name, slug, header_image_url, primary_color, accent_color, updated_at')
      .eq('is_public', true)
      .order('updated_at', { ascending: false })
      .limit(3),
    supabase
      .from('ocs')
      .select('id, name, slug, image_url, world:worlds(id, name, slug, primary_color, accent_color)')
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
    .select('id, quote_text, context, oc:ocs!inner(id, name, slug, is_public)')
    .eq('oc.is_public', true)
    .limit(20);

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

  // Get today's date in EST timezone
  const today = new Date();
  const todayEST = getDateInEST(today);
  const todayMonth = todayEST.month; // 1-12
  const todayDay = todayEST.day;
  
  // Format today's date for display
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const todayDateFormatted = `${monthNames[todayMonth - 1]} ${todayDay}`;

  const birthdayOCs = (allOCsWithBirthdays || []).filter((oc) => {
    if (!oc.date_of_birth) return false;
    try {
      const dateStr = oc.date_of_birth.trim();
      
      // Parse YYYY-MM-DD format directly (most common format)
      const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (isoMatch) {
        const birthMonth = parseInt(isoMatch[2], 10); // 1-12
        const birthDay = parseInt(isoMatch[3], 10);
        return birthMonth === todayMonth && birthDay === todayDay;
      }
      
      // Parse MM/DD or MM/DD/YYYY format
      const mmddMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
      if (mmddMatch) {
        const birthMonth = parseInt(mmddMatch[1], 10); // 1-12
        const birthDay = parseInt(mmddMatch[2], 10);
        return birthMonth === todayMonth && birthDay === todayDay;
      }
      
      // Fallback: try parsing as Date and convert to EST
      const birthDate = new Date(dateStr);
      if (!isNaN(birthDate.getTime())) {
        const birthEST = getDateInEST(birthDate);
        return birthEST.month === todayMonth && birthEST.day === todayDay;
      }
      
      return false;
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
  const iconUrl = getAbsoluteIconUrl(config, baseUrl, false, true);
  
  // Structured data for SEO
  const websiteSchema = generateWebSiteSchema(config.websiteName, baseUrl, {
    description: config.websiteDescription,
    searchUrlTemplate: `${baseUrl}/ocs?search={search_term_string}`,
  });
  
  const organizationSchema = generateOrganizationSchema(config.websiteName, baseUrl, {
    logo: iconUrl,
    description: config.websiteDescription,
  });
  
  const authorSchema = generatePersonSchema(config.authorName);
  
  const structuredData = [websiteSchema, organizationSchema, authorSchema];

  if (process.env.NODE_ENV === 'development') {
    logMemoryUsage('Server', 'HomePage: Data fetched', {
      path: '/',
      worldCount,
      ocCount,
      loreCount,
      timelineEventCount,
      fanficCount,
      randomWorldsCount: randomWorlds.length,
      randomOCsCount: randomOCs.length,
      recentWorldsCount: recentWorlds.data?.length || 0,
      recentOCsCount: recentOCs.data?.length || 0,
      recentLoreCount: recentLore.data?.length || 0,
      quotesCount: allQuotes?.length || 0,
      birthdayOCsCount: birthdayOCs.length,
    });
  }

  return (
    <>
      {structuredData.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
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
                  <i className="fas fa-birthday-cake text-white" aria-hidden="true"></i>
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-100 mb-2">
                  {birthdayOCs.length === 1 ? (
                    <>
                      It's {todayDateFormatted}! It's <Link href={`/ocs/${birthdayOCs[0].slug}`} className="text-pink-400 hover:text-pink-300 underline transition-colors">{birthdayOCs[0].name}</Link>'s birthday!!
                    </>
                  ) : (
                    <>
                      It's {todayDateFormatted}! It's {birthdayOCs.map((oc, index) => (
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
                  <i className="fas fa-calendar-alt" aria-hidden="true"></i>
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
            <i className="fas fa-chart-bar text-purple-400 text-xl md:text-2xl" aria-hidden="true"></i>
            Statistics
          </h2>
          <Link
            href="/stats"
            className="text-purple-400 hover:text-purple-300 font-medium flex items-center gap-2 text-sm md:text-base transition-colors"
          >
            View Full Stats <i className="fas fa-arrow-right" aria-hidden="true"></i>
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
          <i className="fas fa-compass text-xl md:text-2xl text-purple-400" aria-hidden="true"></i>
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
            <i className="fas fa-clock text-xl md:text-2xl text-blue-400" aria-hidden="true"></i>
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
          <i className="fas fa-folder-open text-xl md:text-2xl text-purple-400" aria-hidden="true"></i>
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
                    <i className={`${item.icon} ${color.icon} text-xl mt-1`} aria-hidden="true"></i>
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
            <i className="fas fa-dice text-purple-400 text-xl md:text-2xl" aria-hidden="true"></i>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-100">Random Worlds</h2>
          </div>
          <Link
            href="/worlds"
            prefetch={true}
            className="text-purple-400 hover:text-purple-300 font-medium flex items-center gap-2 text-sm md:text-base"
          >
            View All <i className="fas fa-arrow-right" aria-hidden="true"></i>
          </Link>
        </div>
        {randomWorlds.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {randomWorlds.map((world) => (
              <SimpleWorldCard key={world.id} world={world as World} />
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
            <i className="fas fa-dice text-pink-400 text-xl md:text-2xl" aria-hidden="true"></i>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-100">Random Characters</h2>
          </div>
          <Link
            href="/ocs"
            prefetch={true}
            className="text-pink-400 hover:text-pink-300 font-medium flex items-center gap-2 text-sm md:text-base"
          >
            View All <i className="fas fa-arrow-right" aria-hidden="true"></i>
          </Link>
        </div>
        {randomOCs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {randomOCs.map((oc) => (
              <SimpleOCCard key={oc.id} oc={oc as unknown as OC} />
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
