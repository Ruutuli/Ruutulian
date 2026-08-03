import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoreList } from '@/components/lore/LoreList';
import { LoreFilters } from '@/components/filters/LoreFilters';
import { NumberedPagination } from '@/components/ui/NumberedPagination';
import { generatePageMetadata } from '@/lib/config/metadata-helpers';
import { getSiteConfig } from '@/lib/config/site-config';
import { fetchLoreFilterWorlds, fetchPublicLoreList } from '@/lib/supabase/oc-public-queries';
import type { WorldLore } from '@/types/oc';

export async function generateMetadata() {
  const config = await getSiteConfig();
  return generatePageMetadata(
    'Lore',
    `Browse all lore entries and codex information on ${config.websiteName}. Discover detailed world building, history, and background information.`,
    '/lore'
  );
}

export const revalidate = 60;

const PAGE_SIZE = 24;

interface LorePageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

function buildLoreHref(
  searchParams: LorePageProps['searchParams'],
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
  return qs ? `/lore?${qs}` : '/lore';
}

export default async function LorePage({ searchParams }: LorePageProps) {
  const supabase = await createClient();

  const search = typeof searchParams.search === 'string' ? searchParams.search : '';
  const worldId = typeof searchParams.world === 'string' ? searchParams.world : '';
  const loreType = typeof searchParams.lore_type === 'string' ? searchParams.lore_type : '';
  const page = Math.max(1, parseInt(typeof searchParams.page === 'string' ? searchParams.page : '1', 10) || 1);

  const [worlds, { loreEntries, count: totalCount }] = await Promise.all([
    fetchLoreFilterWorlds(supabase),
    fetchPublicLoreList(supabase, {
      search,
      worldId,
      loreType,
      page,
      pageSize: PAGE_SIZE,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Lore"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Lore' },
        ]}
      />

      <Suspense fallback={<div className="wiki-card p-6 mb-6">Loading filters...</div>}>
        <LoreFilters worlds={worlds} />
      </Suspense>

      <section className="mt-8">
        <LoreList loreEntries={(loreEntries || []) as unknown as WorldLore[]} />
        <NumberedPagination
          page={page}
          totalPages={totalPages}
          buildHref={(p) => buildLoreHref(searchParams, p)}
          ariaLabel="Lore pagination"
        />
      </section>
    </div>
  );
}
