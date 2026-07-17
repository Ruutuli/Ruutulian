import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { FanficCard } from '@/components/fanfic/FanficCard';
import { FanficFilters } from '@/components/filters/FanficFilters';
import { NumberedPagination } from '@/components/ui/NumberedPagination';
import { generatePageMetadata } from '@/lib/config/metadata-helpers';
import { getSiteConfig } from '@/lib/config/site-config';
import {
  FANFIC_LIST_SELECT,
  FANFIC_LIST_SELECT_WITH_TAG,
  fetchFanficFilterFacets,
} from '@/lib/supabase/oc-public-queries';
import type { Fanfic } from '@/types/oc';

export async function generateMetadata() {
  const config = await getSiteConfig();
  return generatePageMetadata(
    'Fanfics',
    `Browse all fanfiction works on ${config.websiteName}. Discover fanfiction stories with detailed metadata, characters, and tags.`,
    '/fanfics'
  );
}

export const revalidate = 60;

const PAGE_SIZE = 24;

interface FanficsPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

function buildFanficsHref(
  searchParams: FanficsPageProps['searchParams'],
  page: number
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string' && value && key !== 'page') {
      params.set(key, value);
    }
  }
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/fanfics?${qs}` : '/fanfics';
}

export default async function FanficsPage({ searchParams }: FanficsPageProps) {
  const supabase = await createClient();

  const search = typeof searchParams.search === 'string' ? searchParams.search : '';
  const worldId = typeof searchParams.world === 'string' ? searchParams.world : '';
  const rating = typeof searchParams.rating === 'string' ? searchParams.rating : '';
  const tagId = typeof searchParams.tag === 'string' ? searchParams.tag : '';
  const page = Math.max(1, parseInt(typeof searchParams.page === 'string' ? searchParams.page : '1', 10) || 1);

  const filterFacets = await fetchFanficFilterFacets(supabase);

  const select = tagId ? FANFIC_LIST_SELECT_WITH_TAG : FANFIC_LIST_SELECT;

  function applyFilters(q: any) {
    let next = q.eq('is_public', true);
    if (worldId) next = next.eq('world_id', worldId);
    if (rating) next = next.eq('rating', rating);
    if (tagId) next = next.eq('fanfic_tags.tag_id', tagId);
    if (search) {
      next = next.or(`title.ilike.%${search}%,author.ilike.%${search}%`);
    }
    return next;
  }

  let query = applyFilters(
    supabase.from('fanfics').select(select, { count: 'exact' })
  )
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  let { data: fanficsData, error: fanficsError, count } = await query;

  if (
    fanficsError &&
    fanficsError.code === 'PGRST200' &&
    (fanficsError.message?.includes('story_aliases') ||
      fanficsError.details?.includes('story_alias'))
  ) {
    const retrySelect = tagId
      ? FANFIC_LIST_SELECT_WITH_TAG.replace('story_alias:story_aliases(id, name, slug),', '')
      : FANFIC_LIST_SELECT.replace('story_alias:story_aliases(id, name, slug),', '');

    const retryResult = await applyFilters(
      supabase.from('fanfics').select(retrySelect, { count: 'exact' })
    )
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    fanficsData = retryResult.data;
    fanficsError = retryResult.error;
    count = retryResult.count;

    if (fanficsData) {
      const aliasIds = [
        ...new Set(
          fanficsData
            .map((f: any) => f.story_alias_id)
            .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
        ),
      ];
      if (aliasIds.length > 0) {
        const { data: storyAliases } = await supabase
          .from('story_aliases')
          .select('id, name, slug')
          .in('id', aliasIds);
        if (storyAliases) {
          const aliasMap = new Map(storyAliases.map((sa) => [sa.id, sa]));
          fanficsData.forEach((fanfic: any) => {
            if (fanfic.story_alias_id) {
              fanfic.story_alias = aliasMap.get(fanfic.story_alias_id) ?? null;
            }
          });
        }
      }
    }
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const fanfics: Fanfic[] = (fanficsData || []).map((fanficData: any) => ({
    ...fanficData,
    characters: Array.isArray(fanficData.characters)
      ? fanficData.characters.map((fc: any) => ({
          id: fc.id || '',
          fanfic_id: fanficData.id,
          oc_id: fc.oc_id || null,
          name: fc.name || null,
          created_at: '',
          oc: fc.oc || undefined,
        }))
      : [],
    tags: Array.isArray(fanficData.tags)
      ? fanficData.tags
          .map((ft: any) => ft.tag)
          .filter((t: any) => t !== null && t !== undefined)
          .flat()
      : [],
  }));

  return (
    <div>
      <PageHeader
        title="Fanfics"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Fanfics' },
        ]}
      />

      <Suspense fallback={<div className="wiki-card p-6 mb-6">Loading filters...</div>}>
        <FanficFilters worlds={filterFacets.worlds} tags={filterFacets.tags} />
      </Suspense>

      {fanfics.length === 0 ? (
        <div className="wiki-card p-12 text-center">
          <p className="text-gray-500 text-lg">
            {totalCount > 0
              ? 'No fanfics match your filters.'
              : 'No fanfics available yet.'}
          </p>
        </div>
      ) : (
        <section className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fanfics.map((fanfic) => (
              <FanficCard key={fanfic.id} fanfic={fanfic} />
            ))}
          </div>
          <NumberedPagination
            page={page}
            totalPages={totalPages}
            buildHref={(p) => buildFanficsHref(searchParams, p)}
            ariaLabel="Fanfics pagination"
          />
        </section>
      )}
    </div>
  );
}
