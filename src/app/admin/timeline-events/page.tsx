import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { TimelineEventsList } from '@/components/admin/TimelineEventsList';
import type { TimelineEventCharacter } from '@/types/oc';

export default async function AdminTimelineEventsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const supabase = await createClient();

  // Extract filter parameters
  const worldId = typeof searchParams.world_id === 'string' ? searchParams.world_id : '';
  const category = typeof searchParams.category === 'string' ? searchParams.category : '';
  const characterId = typeof searchParams.character_id === 'string' ? searchParams.character_id : '';
  const search = typeof searchParams.search === 'string' ? searchParams.search : '';

  // Build query
  let query = supabase
    .from('timeline_events')
    .select(`
      *,
      world:worlds(id, name, slug),
      characters:timeline_event_characters(
        *,
        oc:ocs(id, name, slug)
      )
    `);

  if (worldId) {
    query = query.eq('world_id', worldId);
  }

  if (category) {
    query = query.contains('categories', [category]);
  }

  // Note: Character filtering would need a join, handled client-side for now
  const { data: events } = await query
    .order('year', { ascending: true, nullsFirst: false })
    .order('month', { ascending: true, nullsFirst: true })
    .order('day', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: false });

  // Filter by character and search on client side
  let filteredEvents = events || [];
  if (characterId) {
    filteredEvents = filteredEvents.filter((event) =>
      event.characters?.some((char: TimelineEventCharacter) => char.oc_id === characterId)
    );
  }
  if (search) {
    const searchLower = search.toLowerCase();
    filteredEvents = filteredEvents.filter(
      (event) =>
        event.title.toLowerCase().includes(searchLower) ||
        event.description?.toLowerCase().includes(searchLower) ||
        event.description_markdown?.toLowerCase().includes(searchLower)
    );
  }

  // Get worlds and characters for filters
  const { data: worlds } = await supabase
    .from('worlds')
    .select('id, name')
    .order('name');

  const { data: characters } = await supabase
    .from('ocs')
    .select('id, name, world_id')
    .order('name');

  // Get all unique categories
  const allCategories = new Set<string>();
  events?.forEach((event) => {
    event.categories?.forEach((cat: string) => allCategories.add(cat));
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-100">Timeline Events</h1>
        <Link
          href="/admin/timeline-events/new"
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-500"
        >
          Create Event
        </Link>
      </div>

      <TimelineEventsList
        events={filteredEvents}
        worlds={worlds || []}
        characters={characters || []}
        categories={Array.from(allCategories)}
        initialFilters={{
          worldId,
          category,
          characterId,
          search,
        }}
      />
    </div>
  );
}

