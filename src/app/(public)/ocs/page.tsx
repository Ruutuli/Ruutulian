import type { Metadata } from 'next';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { OCCard } from '@/components/oc/OCCard';
import { CharacterFilters } from '@/components/filters/CharacterFilters';

export const metadata: Metadata = {
  title: 'Characters',
  description: 'Browse all original characters on Ruutulian. Discover characters from various worlds with detailed information, appearance, personality, and relationships.',
  keywords: ['original characters', 'OCs', 'characters', 'fictional characters', 'character database', 'OC wiki'],
  openGraph: {
    title: 'Characters | Ruutulian',
    description: 'Browse all original characters on Ruutulian. Discover characters from various worlds with detailed information, appearance, personality, and relationships.',
    url: '/ocs',
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
    title: 'Characters | Ruutulian',
    description: 'Browse all original characters on Ruutulian.',
    images: ['/images/logo.png'],
  },
  alternates: {
    canonical: '/ocs',
  },
};

export const revalidate = 60;

interface OCsPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function OCsPage({ searchParams }: OCsPageProps) {
  const supabase = await createClient();

  // Extract filter values from searchParams
  const search = typeof searchParams.search === 'string' ? searchParams.search : '';
  const worldId = typeof searchParams.world === 'string' ? searchParams.world : '';
  const seriesType = typeof searchParams.series_type === 'string' ? searchParams.series_type : '';

  // Build query
  let query = supabase
    .from('ocs')
    .select('*, world:worlds(*)')
    .eq('is_public', true);

  // Apply filters
  if (worldId) {
    query = query.eq('world_id', worldId);
  }
  if (seriesType) {
    query = query.eq('series_type', seriesType);
  }

  const { data: ocs } = await query.order('name', { ascending: true });

  // Filter by search term (name) on the client side since Supabase text search might be complex
  let filteredOCs = ocs || [];
  if (search) {
    const searchLower = search.toLowerCase();
    filteredOCs = filteredOCs.filter(
      (oc) =>
        oc.name.toLowerCase().includes(searchLower) ||
        oc.history_summary?.toLowerCase().includes(searchLower) ||
        oc.world?.name.toLowerCase().includes(searchLower)
    );
  }

  return (
    <div>
      <PageHeader
        title="Characters"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Characters' }]}
      />

      <Suspense fallback={<div className="wiki-card p-6 mb-6">Loading filters...</div>}>
        <CharacterFilters />
      </Suspense>

      {filteredOCs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOCs.map((oc) => (
            <OCCard key={oc.id} oc={oc} />
          ))}
        </div>
      ) : (
        <div className="wiki-card p-12 text-center">
          <p className="text-gray-500 text-lg">
            {ocs && ocs.length > 0
              ? 'No characters match your filters.'
              : 'No characters available yet.'}
          </p>
        </div>
      )}
    </div>
  );
}
