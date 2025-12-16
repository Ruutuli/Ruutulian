import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { TimelinesList } from '@/components/admin/TimelinesList';

export default async function AdminTimelinesPage() {
  const supabase = await createClient();

  const { data: timelines } = await supabase
    .from('timelines')
    .select('id, name, world:worlds(name)')
    .order('name', { ascending: true });

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

      <TimelinesList timelines={timelines || []} />
    </div>
  );
}
