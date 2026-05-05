import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { WorldCard } from '@/components/world/WorldCard';
import { WorldFilters } from '@/components/filters/WorldFilters';
import { generatePageMetadata } from '@/lib/config/metadata-helpers';
import { getSiteConfig } from '@/lib/config/site-config';
import { WORLD_CARD_LIST_COLUMNS } from '@/lib/supabase/world-public-queries';
import type { World } from '@/types/oc';

export async function generateMetadata() {
  const config = await getSiteConfig();
  return generatePageMetadata(
    'Worlds',
    `Browse all fictional worlds and universes on ${config.websiteName}. Explore canon and original worlds with detailed lore, characters, and timelines.`,
    '/worlds'
  );
}

export const revalidate = 60;
export const dynamic = 'force-dynamic';

interface WorldsPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function WorldsPage({ searchParams }: WorldsPageProps) {
  const supabase = await createClient();

  // Extract filter values from searchParams
  const search = typeof searchParams.search === 'string' ? searchParams.search : '';
  const seriesType = typeof searchParams.series_type === 'string' ? searchParams.series_type : '';

  // Build query
  let query = supabase
    .from('worlds')
    .select(WORLD_CARD_LIST_COLUMNS as any)
    .eq('is_public', true);

  // Apply series type filter
  if (seriesType) {
    query = query.eq('series_type', seriesType);
  }

  // Apply search filter on server-side
  if (search) {
    query = query.or(`name.ilike.%${search}%,summary.ilike.%${search}%`);
  }

  const { data: worlds } = await query.order('name', { ascending: true });

  const filteredWorlds = (worlds || []) as World[];

  // Group by series type if no series type filter is applied
  const canonWorlds = !seriesType
    ? filteredWorlds.filter((w) => w.series_type === 'canon')
    : seriesType === 'canon'
      ? filteredWorlds
      : [];
  const originalWorlds = !seriesType
    ? filteredWorlds.filter((w) => w.series_type === 'original')
    : seriesType === 'original'
      ? filteredWorlds
      : [];

  return (
    <div>
      <PageHeader
        title="Worlds"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Worlds' }]}
      />

      <Suspense fallback={<div className="wiki-card p-6 mb-6">Loading filters...</div>}>
        <WorldFilters />
      </Suspense>

      {filteredWorlds.length === 0 ? (
        <div className="wiki-card p-12 text-center">
          <p className="text-gray-500 text-lg">
            {worlds && worlds.length > 0
              ? 'No worlds match your filters.'
              : 'No worlds available yet.'}
          </p>
        </div>
      ) : (
        <>
          {canonWorlds.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-100 mb-6">Canon Worlds</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {canonWorlds.map((world) => (
                  <WorldCard key={world.id} world={world} />
                ))}
              </div>
            </section>
          )}

          {originalWorlds.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-gray-100 mb-6">Original Worlds</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {originalWorlds.map((world) => (
                  <WorldCard key={world.id} world={world} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
