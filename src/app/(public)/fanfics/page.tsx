import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { FanficCard } from '@/components/fanfic/FanficCard';
import { FanficFilters } from '@/components/filters/FanficFilters';
import { generatePageMetadata } from '@/lib/config/metadata-helpers';
import { getSiteConfig } from '@/lib/config/site-config';
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
export const dynamic = 'force-dynamic';

interface FanficsPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function FanficsPage({ searchParams }: FanficsPageProps) {
  const supabase = await createClient();

  // Extract filter values from searchParams
  const search = typeof searchParams.search === 'string' ? searchParams.search : '';
  const worldId = typeof searchParams.world === 'string' ? searchParams.world : '';
  const rating = typeof searchParams.rating === 'string' ? searchParams.rating : '';
  const tagId = typeof searchParams.tag === 'string' ? searchParams.tag : '';

  // Build query
  let query = supabase
    .from('fanfics')
    .select(`
      *,
      world:worlds(id, name, slug, is_public),
      story_alias:story_aliases(id, name, slug),
      characters:fanfic_characters(id, oc_id, name, oc:ocs(id, name, slug)),
      tags:fanfic_tags(tag:tags(id, name))
    `)
    .eq('is_public', true);

  // Apply filters
  if (worldId) {
    query = query.eq('world_id', worldId);
  }
  if (rating) {
    query = query.eq('rating', rating);
  }

  const { data: fanficsData } = await query
    .order('created_at', { ascending: false });

  // Filter by tag and search on client side if needed (due to complexity of junction table filtering)
  let filteredFanfics = fanficsData || [];
  
  // Filter by tag
  if (tagId) {
    filteredFanfics = filteredFanfics.filter((fanfic: any) => {
      const tags = fanfic.tags || [];
      return tags.some((ft: any) => {
        const tag = ft.tag;
        return tag && (Array.isArray(tag) ? tag.some((t: any) => t.id === tagId) : tag.id === tagId);
      });
    });
  }

  // Filter by search term (title, author, or alternative titles)
  if (search) {
    const searchLower = search.toLowerCase();
    filteredFanfics = filteredFanfics.filter((fanfic: any) => {
      const title = fanfic.title?.toLowerCase() || '';
      const author = fanfic.author?.toLowerCase() || '';
      const altTitles = Array.isArray(fanfic.alternative_titles) 
        ? fanfic.alternative_titles.join(' ').toLowerCase() 
        : '';
      return title.includes(searchLower) || author.includes(searchLower) || altTitles.includes(searchLower);
    });
  }

  // Transform the data to match our Fanfic type
  const fanfics: Fanfic[] = filteredFanfics.map((fanficData: any) => ({
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
        <FanficFilters />
      </Suspense>

      {fanfics.length === 0 ? (
        <div className="wiki-card p-12 text-center">
          <p className="text-gray-500 text-lg">
            {fanficsData && fanficsData.length > 0
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
        </section>
      )}
    </div>
  );
}

