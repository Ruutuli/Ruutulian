import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { CharacterFilters } from '@/components/filters/CharacterFilters';
import { OCListView } from '@/components/discovery/OCListView';
import { generatePageMetadata } from '@/lib/config/metadata-helpers';
import { getSiteConfig } from '@/lib/config/site-config';

export async function generateMetadata() {
  const config = await getSiteConfig();
  return generatePageMetadata(
    'Characters',
    `Browse all original characters on ${config.websiteName}. Discover characters from various worlds with detailed information, appearance, personality, and relationships.`,
    '/ocs'
  );
}

export const revalidate = 60;
export const dynamic = 'force-dynamic';

interface OCsPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function OCsPage({ searchParams }: OCsPageProps) {
  const supabase = await createClient();

  // Extract filter values from searchParams
  const search = typeof searchParams.search === 'string' ? searchParams.search : '';
  const worldId = typeof searchParams.world === 'string' ? searchParams.world : '';
  const seriesType = typeof searchParams.series_type === 'string' ? searchParams.series_type : '';
  const gender = typeof searchParams.gender === 'string' ? searchParams.gender : '';
  const sex = typeof searchParams.sex === 'string' ? searchParams.sex : '';
  const tagId = typeof searchParams.tag === 'string' ? searchParams.tag : '';

  // Build query - try with tags first, fallback to without tags if it fails
  let query = supabase
    .from('ocs')
    .select(`
      *,
      world:worlds(*),
      character_tags(
        tag_id,
        tags(id, name)
      )
    `)
    .eq('is_public', true);

  // Apply filters
  if (worldId) {
    if (worldId === 'none') {
      query = query.is('world_id', null);
    } else {
      query = query.eq('world_id', worldId);
    }
  }
  if (seriesType) {
    query = query.eq('series_type', seriesType);
  }
  if (gender) {
    query = query.eq('gender', gender);
  }
  if (sex) {
    query = query.eq('sex', sex);
  }

  let { data: ocs, error: ocsError } = await query.order('name', { ascending: true });

  // If query fails (possibly due to tags relationship), retry without tags
  if (ocsError) {
    console.error('Error fetching OCs with tags, retrying without tags:', ocsError);
    let fallbackQuery = supabase
      .from('ocs')
      .select('*, world:worlds(*)')
      .eq('is_public', true);

    // Reapply filters
    if (worldId) {
      if (worldId === 'none') {
        fallbackQuery = fallbackQuery.is('world_id', null);
      } else {
        fallbackQuery = fallbackQuery.eq('world_id', worldId);
      }
    }
    if (seriesType) {
      fallbackQuery = fallbackQuery.eq('series_type', seriesType);
    }
    if (gender) {
      fallbackQuery = fallbackQuery.eq('gender', gender);
    }
    if (sex) {
      fallbackQuery = fallbackQuery.eq('sex', sex);
    }

    const fallbackResult = await fallbackQuery.order('name', { ascending: true });
    ocs = fallbackResult.data;
    if (fallbackResult.error) {
      console.error('Error fetching OCs (fallback):', fallbackResult.error);
    }
  }

  // Filter by tag (client-side since we need to check character_tags relationship)
  let filteredByTag = ocs || [];
  if (tagId) {
    filteredByTag = filteredByTag.filter(oc => {
      const tags = (oc as any).character_tags || [];
      return tags.some((ct: any) => ct.tag_id === tagId);
    });
  }

  // Filter by search term (name) on the client side since Supabase text search might be complex
  let filteredOCs = filteredByTag;
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
        <OCListView ocs={filteredOCs} />
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
