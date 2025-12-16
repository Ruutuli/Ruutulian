import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { TimelineList } from '@/components/timeline/TimelineList';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Timelines',
  description: 'Explore chronological timelines and events across all worlds on Ruutulian. Track story progression and major events in your favorite worlds.',
  keywords: ['timelines', 'events', 'chronology', 'story timeline', 'world events', 'OC wiki'],
  openGraph: {
    title: 'Timelines | Ruutulian',
    description: 'Explore chronological timelines and events across all worlds on Ruutulian.',
    url: '/timelines',
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
    title: 'Timelines | Ruutulian',
    description: 'Explore chronological timelines and events across all worlds.',
    images: ['/images/logo.png'],
  },
  alternates: {
    canonical: '/timelines',
  },
};

export const revalidate = 60;

interface TimelinesPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function TimelinesPage({ searchParams }: TimelinesPageProps) {
  const supabase = await createClient();

  // Extract filter values from searchParams
  const search = typeof searchParams.search === 'string' ? searchParams.search : '';
  const worldId = typeof searchParams.world === 'string' ? searchParams.world : '';

  // Build query - get all timelines, we'll filter by public worlds after
  let query = supabase
    .from('timelines')
    .select('*, world:worlds(*)');

  // Apply world filter
  if (worldId) {
    query = query.eq('world_id', worldId);
  }

  const { data: allTimelines } = await query.order('name', { ascending: true });

  // Filter to only include timelines from public worlds
  const timelines = (allTimelines || []).filter(
    (timeline) => {
      const world = timeline.world as any;
      return world && world.is_public === true;
    }
  );

  // Filter by search term (name or description) on the client side
  let filteredTimelines = timelines;
  if (search) {
    const searchLower = search.toLowerCase();
    filteredTimelines = filteredTimelines.filter(
      (timeline) =>
        timeline.name.toLowerCase().includes(searchLower) ||
        timeline.description_markdown?.toLowerCase().includes(searchLower) ||
        (timeline.world as any)?.name?.toLowerCase().includes(searchLower)
    );
  }

  // Group by world if no world filter is applied
  const timelinesByWorld = new Map<string, typeof filteredTimelines>();
  
  if (!worldId) {
    filteredTimelines.forEach((timeline) => {
      const world = timeline.world as any;
      const worldName = world?.name || 'Uncategorized';
      if (!timelinesByWorld.has(worldName)) {
        timelinesByWorld.set(worldName, []);
      }
      timelinesByWorld.get(worldName)!.push(timeline);
    });
  }

  return (
    <div>
      <PageHeader
        title="Timelines"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Timelines' }]}
      />

      {filteredTimelines.length === 0 ? (
        <div className="wiki-card p-12 text-center">
          <p className="text-gray-500 text-lg">
            {timelines && timelines.length > 0
              ? 'No timelines match your filters.'
              : 'No timelines available yet.'}
          </p>
        </div>
      ) : worldId ? (
        // If filtered by world, show simple list
        <TimelineList timelines={filteredTimelines} />
      ) : (
        // If not filtered, group by world
        <div className="space-y-12">
          {Array.from(timelinesByWorld.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([worldName, worldTimelines]) => {
              const firstTimeline = worldTimelines[0];
              const world = firstTimeline.world as any;
              const worldSlug = world?.slug;

              return (
                <section key={worldName}>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-100">{worldName}</h2>
                    {worldSlug && (
                      <Link
                        href={`/worlds/${worldSlug}`}
                        className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        View World →
                      </Link>
                    )}
                  </div>
                  <TimelineList timelines={worldTimelines} worldSlug={worldSlug} />
                </section>
              );
            })}
        </div>
      )}
    </div>
  );
}
