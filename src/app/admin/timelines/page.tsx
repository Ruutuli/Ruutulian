import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { TimelinesList } from '@/components/admin/TimelinesList';

export default async function AdminTimelinesPage() {
  const supabase = await createClient();

  const { data: timelines } = await supabase
    .from('timelines')
    .select('id, name, updated_at, world:worlds(name)')
    .order('name', { ascending: true });

  // Get event counts for each timeline
  const timelinesWithEventCounts = await Promise.all(
    (timelines || []).map(async (timeline) => {
      const { count } = await supabase
        .from('timeline_event_timelines')
        .select('*', { count: 'exact', head: true })
        .eq('timeline_id', timeline.id);

      const world = timeline.world as { name: string } | { name: string }[] | null;
      let worldValue: { name: string } | null = null;
      
      if (Array.isArray(world) && world.length > 0) {
        worldValue = { name: world[0].name };
      } else if (world && !Array.isArray(world)) {
        worldValue = { name: world.name };
      }
      
      return {
        id: timeline.id,
        name: timeline.name,
        updated_at: timeline.updated_at,
        world: worldValue,
        event_count: count || 0,
      };
    })
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-100">Timelines</h1>
        <Link
          href="/admin/timelines/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 transition-colors text-sm sm:text-base w-fit"
        >
          Create Timeline
        </Link>
      </div>

      <TimelinesList timelines={timelinesWithEventCounts} />
    </div>
  );
}
