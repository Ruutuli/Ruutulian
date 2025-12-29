import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoreList } from '@/components/lore/LoreList';
import { LoreFilters } from '@/components/filters/LoreFilters';
import { generatePageMetadata } from '@/lib/config/metadata-helpers';
import { getSiteConfig } from '@/lib/config/site-config';

export async function generateMetadata() {
  const config = await getSiteConfig();
  return generatePageMetadata(
    'Lore',
    `Browse all lore entries and codex information on ${config.websiteName}. Discover detailed world building, history, and background information.`,
    '/lore'
  );
}

export const dynamic = 'force-dynamic';

interface LorePageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function LorePage({ searchParams }: LorePageProps) {
  const supabase = await createClient();

  // Extract filter values from searchParams
  const worldId = typeof searchParams.world === 'string' ? searchParams.world : '';
  const loreType = typeof searchParams.lore_type === 'string' ? searchParams.lore_type : '';

  // Build query
  let query = supabase
    .from('world_lore')
    .select(`
      *,
      world:worlds!inner(id, name, slug, is_public),
      related_ocs:world_lore_ocs(
        *,
        oc:ocs(id, name, slug)
      ),
      related_events:world_lore_timeline_events(
        *,
        event:timeline_events(id, title)
      )
    `)
    .eq('world.is_public', true);

  // Apply filters
  if (worldId) {
    query = query.eq('world_id', worldId);
  }
  if (loreType) {
    query = query.eq('lore_type', loreType);
  }

  const { data: loreEntries } = await query
    .order('world_id', { ascending: true })
    .order('name', { ascending: true });

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
        <LoreFilters />
      </Suspense>

      <section className="mt-8">
        <LoreList loreEntries={loreEntries || []} searchParams={searchParams} />
      </section>
    </div>
  );
}








