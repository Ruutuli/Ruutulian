import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function AdminTimelineEventsPage() {
  const supabase = await createClient();

  const { data: events } = await supabase
    .from('timeline_events')
    .select(`
      id,
      title,
      year,
      month,
      day,
      created_at,
      updated_at,
      world:worlds(id, name, slug)
    `)
    .order('year', { ascending: true, nullsFirst: false })
    .order('month', { ascending: true, nullsFirst: true })
    .order('day', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-100">Timeline Events</h1>
        <Link
          href="/admin/timeline-events/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 transition-colors text-sm sm:text-base w-fit"
        >
          Create Timeline Event
        </Link>
      </div>

      <div className="bg-gray-700/90 rounded-lg shadow-lg p-6 border border-gray-600/70">
        {!events || events.length === 0 ? (
          <p className="text-gray-400">No timeline events found.</p>
        ) : (
          <div className="space-y-4">
            {events.map((event) => {
              const world = Array.isArray(event.world) 
                ? event.world[0] 
                : event.world;
              
              const dateStr = event.year 
                ? `${event.year}${event.month ? `-${String(event.month).padStart(2, '0')}` : ''}${event.day ? `-${String(event.day).padStart(2, '0')}` : ''}`
                : 'No date';
              
              return (
                <Link
                  key={event.id}
                  href={`/admin/timeline-events/${event.id}`}
                  className="block p-4 bg-gray-600/50 rounded-md hover:bg-gray-600/70 transition-colors border border-gray-500/50"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-100">{event.title}</h3>
                      <p className="text-sm text-gray-400">
                        {dateStr}
                        {world && ` • ${world.name}`}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(event.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
