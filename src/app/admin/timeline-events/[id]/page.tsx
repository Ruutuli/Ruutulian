import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { TimelineEventForm } from '@/components/admin/TimelineEventForm';

export default async function EditTimelineEventPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const supabase = await createClient();
  const resolvedParams = params instanceof Promise ? await params : params;

  const { data: event } = await supabase
    .from('timeline_events')
    .select('*')
    .eq('id', resolvedParams.id)
    .single();

  if (!event) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-100 mb-8">Edit Timeline Event</h1>
      <div className="bg-gray-700/90 rounded-lg shadow-lg p-6 border border-gray-600/70">
        <TimelineEventForm event={event} worldId={event.world_id} />
      </div>
    </div>
  );
}
