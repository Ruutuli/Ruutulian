import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { TimelineList } from '@/components/timeline/TimelineList';
import { TimelineFilters } from '@/components/filters/TimelineFilters';
import { generatePageMetadata } from '@/lib/config/metadata-helpers';
import { getSiteConfig } from '@/lib/config/site-config';

export async function generateMetadata() {
  const config = await getSiteConfig();
  return generatePageMetadata(
    'Timelines',
    `Explore chronological timelines and events across all worlds on ${config.websiteName}. Track story progression and major events in your favorite worlds.`,
    '/timelines'
  );
}

export const revalidate = 60;

interface TimelinesPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function TimelinesPage({ searchParams }: TimelinesPageProps) {
  const supabase = await createClient();

  // Extract filter values from searchParams
  const search = typeof searchParams.search === 'string' ? searchParams.search : '';
  const worldId = typeof searchParams.world === 'string' ? searchParams.world : '';
  const sort = typeof searchParams.sort === 'string' ? searchParams.sort : 'name-asc';

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

  // Filter by search term (name or description)
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

  // Fetch event counts for all timelines (one query)
  const timelineIds = filteredTimelines.map((t) => t.id);
  const eventCountByTimeline: Record<string, number> = {};
  if (timelineIds.length > 0) {
    const { data: junctions } = await supabase
      .from('timeline_event_timelines')
      .select('timeline_id')
      .in('timeline_id', timelineIds);
    (junctions || []).forEach((row) => {
      eventCountByTimeline[row.timeline_id] = (eventCountByTimeline[row.timeline_id] ?? 0) + 1;
    });
  }

  // Attach event_count to each timeline
  let timelinesWithCounts = filteredTimelines.map((t) => ({
    ...t,
    event_count: eventCountByTimeline[t.id] ?? 0,
  }));

  // Apply sorting
  const sortedTimelines = [...timelinesWithCounts];
  switch (sort) {
    case 'name-asc':
      sortedTimelines.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'name-desc':
      sortedTimelines.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case 'events-desc':
      sortedTimelines.sort((a, b) => (b.event_count ?? 0) - (a.event_count ?? 0));
      break;
    case 'events-asc':
      sortedTimelines.sort((a, b) => (a.event_count ?? 0) - (b.event_count ?? 0));
      break;
    case 'world':
      sortedTimelines.sort((a, b) => {
        const worldA = (a.world as any)?.name || '';
        const worldB = (b.world as any)?.name || '';
        if (worldA !== worldB) {
          return worldA.localeCompare(worldB);
        }
        return a.name.localeCompare(b.name);
      });
      break;
    case 'date-desc':
      sortedTimelines.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      break;
    case 'date-asc':
      sortedTimelines.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      break;
  }

  return (
    <div>
      <PageHeader
        title="Timelines"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Timelines' }]}
      />

      <Suspense fallback={<div className="wiki-card p-6 mb-6">Loading filters...</div>}>
        <TimelineFilters />
      </Suspense>

      {sortedTimelines.length === 0 ? (
        <div className="wiki-card p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <i className="fas fa-calendar-times text-4xl text-gray-600" aria-hidden="true"></i>
            <p className="text-gray-500 text-lg">
              {timelines && timelines.length > 0
                ? 'No timelines match your filters.'
                : 'No timelines available yet.'}
            </p>
          </div>
        </div>
      ) : (
        <TimelineList timelines={sortedTimelines} />
      )}
    </div>
  );
}
