import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { CharacterFilters } from '@/components/filters/CharacterFilters';
import { OCListView } from '@/components/discovery/OCListView';
import { generatePageMetadata } from '@/lib/config/metadata-helpers';
import { getSiteConfig } from '@/lib/config/site-config';
import { logMemoryUsage } from '@/lib/memory-monitor';
import type { OC } from '@/types/oc';

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

const PAGE_SIZE = 24;

// Slim select for list view: only fields needed by OCCard and filters
const OC_LIST_SELECT = `
  id,
  name,
  slug,
  image_url,
  world_id,
  history_summary,
  world:worlds(id, name, slug, primary_color, accent_color),
  character_tags(
    tag_id,
    tags(id, name)
  )
`;

interface OCsPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function OCsPage({ searchParams }: OCsPageProps) {
  if (process.env.NODE_ENV === 'development') {
    logMemoryUsage('Server', 'OCsPage: Start', { path: 'ocs' });
  }
  const supabase = await createClient();

  // Extract filter values from searchParams
  const search = typeof searchParams.search === 'string' ? searchParams.search : '';
  const worldId = typeof searchParams.world === 'string' ? searchParams.world : '';
  const seriesType = typeof searchParams.series_type === 'string' ? searchParams.series_type : '';
  const gender = typeof searchParams.gender === 'string' ? searchParams.gender : '';
  const sex = typeof searchParams.sex === 'string' ? searchParams.sex : '';
  const tagId = typeof searchParams.tag === 'string' ? searchParams.tag : '';
  const page = Math.max(1, parseInt(typeof searchParams.page === 'string' ? searchParams.page : '1', 10) || 1);

  const usePagination = !search;

  function buildBaseQuery(select: string, withTagFilter = false) {
    let q = supabase
      .from('ocs')
      .select(select, usePagination ? { count: 'exact' } : undefined)
      .eq('is_public', true);

    if (worldId) {
      if (worldId === 'none') {
        q = q.is('world_id', null);
      } else {
        q = q.eq('world_id', worldId);
      }
    }
    if (seriesType) q = q.eq('series_type', seriesType);
    if (gender) q = q.eq('gender', gender);
    if (sex) q = q.eq('sex', sex);
    if (search) {
      q = q.or(`name.ilike.*${search}*,history_summary.ilike.*${search}*`);
    }
    if (withTagFilter && tagId) {
      q = q.eq('character_tags.tag_id', tagId);
    }
    return q.order('name', { ascending: true });
  }

  // When tag filter: use inner join so only OCs with that tag are returned (server-side)
  const selectWithTag = tagId
    ? `id, name, slug, image_url, world_id, history_summary, world:worlds(id, name, slug, primary_color, accent_color), character_tags!inner(tag_id, tags(id, name))`
    : OC_LIST_SELECT;

  let query = buildBaseQuery(selectWithTag, !!tagId);
  if (usePagination) {
    query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  }

  const queryResult = await query;
  let ocs: OC[] | null = queryResult.data as OC[] | null;
  const ocsError = queryResult.error;
  let totalCount: number | undefined = queryResult.count ?? undefined;

  if (ocsError) {
    let fallbackQuery = supabase
      .from('ocs')
      .select(tagId ? `id, name, slug, image_url, world_id, history_summary, world:worlds(id, name, slug, primary_color, accent_color)` : OC_LIST_SELECT, usePagination ? { count: 'exact' } : undefined)
      .eq('is_public', true);

    if (worldId) {
      if (worldId === 'none') fallbackQuery = fallbackQuery.is('world_id', null);
      else fallbackQuery = fallbackQuery.eq('world_id', worldId);
    }
    if (seriesType) fallbackQuery = fallbackQuery.eq('series_type', seriesType);
    if (gender) fallbackQuery = fallbackQuery.eq('gender', gender);
    if (sex) fallbackQuery = fallbackQuery.eq('sex', sex);
    if (search) {
      fallbackQuery = fallbackQuery.or(`name.ilike.*${search}*,history_summary.ilike.*${search}*`);
    }
    if (usePagination) {
      fallbackQuery = fallbackQuery.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    }
    const fallbackResult = await fallbackQuery.order('name', { ascending: true });
    ocs = fallbackResult.data as OC[] | null;
    totalCount = fallbackResult.count ?? undefined;
  }

  // With tagId the main query uses character_tags!inner so ocs is already tag-filtered; fallback has no tags so we keep ocs as-is
  let filteredByTag: OC[] = ocs || [];

  let filteredOCs: OC[] = filteredByTag;
  if (search) {
    const searchLower = search.toLowerCase();
    filteredOCs = filteredByTag.filter(
      (oc) =>
        oc.name.toLowerCase().includes(searchLower) ||
        oc.history_summary?.toLowerCase().includes(searchLower) ||
        (oc as any).world?.name?.toLowerCase().includes(searchLower)
    );
  }

  const totalPages = usePagination ? Math.max(1, Math.ceil((totalCount ?? 0) / PAGE_SIZE)) : 1;

  if (process.env.NODE_ENV === 'development') {
    logMemoryUsage('Server', 'OCsPage: Data fetched', {
      path: 'ocs',
      totalOCs: ocs?.length ?? 0,
      filteredOCs: filteredOCs.length,
      page: usePagination ? page : null,
      totalPages: usePagination ? totalPages : null,
    });
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
        <OCListView
          ocs={filteredOCs}
          pagination={usePagination ? { page, totalPages, totalCount: totalCount ?? 0 } : undefined}
          searchParams={searchParams}
        />
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
