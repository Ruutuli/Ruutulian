import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { WorldLoreList } from '@/components/admin/WorldLoreList';

export default async function AdminWorldLorePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const resolvedSearchParams = await searchParams;

  // Extract filter parameters
  const worldId = typeof resolvedSearchParams.world_id === 'string' ? resolvedSearchParams.world_id : '';
  const loreType = typeof resolvedSearchParams.lore_type === 'string' ? resolvedSearchParams.lore_type : '';
  const search = typeof resolvedSearchParams.search === 'string' ? resolvedSearchParams.search : '';

  // Build query
  let query = supabase
    .from('world_lore')
    .select(`
      *,
      world:worlds(id, name, slug),
      related_ocs:world_lore_ocs(
        *,
        oc:ocs(id, name, slug)
      ),
      related_events:world_lore_timeline_events(
        *,
        event:timeline_events(id, title)
      )
    `);

  if (worldId) {
    query = query.eq('world_id', worldId);
  }

  if (loreType) {
    query = query.eq('lore_type', loreType);
  }

  const { data: loreEntries } = await query.order('name', { ascending: true });

  // Get worlds for filters
  const { data: worlds } = await supabase
    .from('worlds')
    .select('id, name')
    .order('name');

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-100">World Lore Entries</h1>
        <Link
          href="/admin/world-lore/new"
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-500 transition-colors text-sm sm:text-base w-fit"
        >
          Create Lore Entry
        </Link>
      </div>

      <WorldLoreList
        loreEntries={loreEntries || []}
        worlds={worlds || []}
        initialFilters={{
          worldId,
          loreType,
          search,
        }}
      />
    </div>
  );
}

