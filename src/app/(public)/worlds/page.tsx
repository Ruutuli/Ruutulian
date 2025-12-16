import type { Metadata } from 'next';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { WorldCard } from '@/components/world/WorldCard';
import { WorldFilters } from '@/components/filters/WorldFilters';

export const metadata: Metadata = {
  title: 'Worlds',
  description: 'Browse all fictional worlds and universes on Ruutulian. Explore canon and original worlds with detailed lore, characters, and timelines.',
  keywords: ['worlds', 'fictional worlds', 'world building', 'universes', 'canon worlds', 'original worlds', 'OC wiki'],
  openGraph: {
    title: 'Worlds | Ruutulian',
    description: 'Browse all fictional worlds and universes on Ruutulian. Explore canon and original worlds with detailed lore, characters, and timelines.',
    url: '/worlds',
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
    title: 'Worlds | Ruutulian',
    description: 'Browse all fictional worlds and universes on Ruutulian.',
    images: ['/images/logo.png'],
  },
  alternates: {
    canonical: '/worlds',
  },
};

export const revalidate = 60;

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
    .select('*')
    .eq('is_public', true);

  // Apply series type filter
  if (seriesType) {
    query = query.eq('series_type', seriesType);
  }

  const { data: worlds } = await query.order('name', { ascending: true });

  // Filter by search term (name or summary) on the client side
  let filteredWorlds = worlds || [];
  if (search) {
    const searchLower = search.toLowerCase();
    filteredWorlds = filteredWorlds.filter(
      (world) =>
        world.name.toLowerCase().includes(searchLower) ||
        world.summary?.toLowerCase().includes(searchLower)
    );
  }

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
