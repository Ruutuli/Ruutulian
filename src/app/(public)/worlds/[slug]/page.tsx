import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getSiteConfig } from '@/lib/config/site-config';
import type { StoryAlias } from '@/types/oc';
import { PageHeader } from '@/components/layout/PageHeader';
import { WorldHeader } from '@/components/world/WorldHeader';
import { WorldDetails } from '@/components/world/WorldDetails';
import { WorldStorySelector } from '@/components/world/WorldStorySelector';
import { OCCard } from '@/components/oc/OCCard';
import { TimelineList } from '@/components/timeline/TimelineList';
import { LoreCard } from '@/components/lore/LoreCard';
import { WorldRelationships } from '@/components/world/WorldRelationships';
import { convertGoogleDriveUrl } from '@/lib/utils/googleDriveImage';
import { generateDetailPageMetadata } from '@/lib/seo/page-metadata';
import { logMemoryUsage } from '@/lib/memory-monitor';
import Link from 'next/link';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const supabase = await createClient();
  const resolvedParams = await params;

  // Query with limit(1) to prevent PGRST116 when multiple rows exist
  let { data: world, error } = await supabase
    .from('worlds')
    .select('name, slug, summary, description_markdown, header_image_url, icon_url, series_type')
    .eq('slug', resolvedParams.slug)
    .eq('is_public', true)
    .limit(1)
    .maybeSingle();

  // If PGRST116 error (multiple rows), try again with explicit limit and take first
  if (error && error.code === 'PGRST116') {
    const { data: worldArray } = await supabase
      .from('worlds')
      .select('name, slug, summary, description_markdown, header_image_url, icon_url, series_type')
      .eq('slug', resolvedParams.slug)
      .eq('is_public', true)
      .limit(1);
    
    world = worldArray?.[0] || null;
    error = null;
  }

  if (!world) {
    return {
      title: 'World Not Found',
    };
  }

  const config = await getSiteConfig();
  const baseUrl = config.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
  
  // Prioritize description_markdown, then summary, then fallback
  const descriptionText = world.description_markdown || world.summary || '';
  const description = descriptionText
    ? descriptionText.substring(0, 155).replace(/\n/g, ' ').replace(/[#*`]/g, '').trim() + (descriptionText.length > 155 ? '...' : '')
    : `${world.name} - ${world.series_type} world on ${config.websiteName}`;

  // Use header_image_url or icon_url for OG image
  const imageUrl = world.header_image_url || world.icon_url || null;

  return generateDetailPageMetadata({
    title: world.name,
    description,
    path: `/worlds/${resolvedParams.slug}`,
    keywords: [
      world.name,
      world.series_type,
      'world building',
      'fictional world',
      'universe',
      'OC wiki',
    ],
    entityName: world.name,
    entityImage: imageUrl,
    entityType: 'website',
    imageUrl,
    imageAlt: world.name,
  });
}

export const revalidate = 300;

export default async function WorldDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ story?: string }>;
}) {
  logMemoryUsage('Server', 'WorldDetailPage: Start', { path: 'worlds/[slug]' });
  
  const supabase = await createClient();
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const storySlug = resolvedSearchParams?.story;

  const { data: world } = await supabase
    .from('worlds')
    .select(`
      *,
      story_aliases:story_aliases(
        id,
        name,
        slug,
        description
      ),
      races:world_races(
        id,
        world_id,
        story_alias_id,
        name,
        info,
        picture_url,
        position
      )
    `)
    .eq('slug', resolvedParams.slug)
    .eq('is_public', true)
    .single();

  if (!world) {
    notFound();
  }

  // Load story-specific world data if story parameter is provided
  let storyData = null;
  let selectedStoryAlias = null;
  
  if (storySlug && world.series_type === 'canon') {
    // Find story alias by slug
    selectedStoryAlias = world.story_aliases?.find((sa: StoryAlias) => sa.slug === storySlug);
    
    if (selectedStoryAlias) {
      const { data: storyDataResult } = await supabase
        .from('world_story_data')
        .select('*')
        .eq('world_id', world.id)
        .eq('story_alias_id', selectedStoryAlias.id)
        .single();
      
      storyData = storyDataResult;
    }
  }
  
  // Build query filters based on story alias
  const storyAliasId = selectedStoryAlias?.id || null;
  
  // Filter races based on story alias (if no story selected, show base races)
  let filteredRaces = world.races || [];
  if (filteredRaces.length > 0) {
    filteredRaces = filteredRaces.filter((race: any) => {
      if (storyAliasId) {
        return race.story_alias_id === storyAliasId;
      } else {
        return race.story_alias_id === null;
      }
    }).sort((a: any, b: any) => a.position - b.position);
  }

  // Merge base world data with story-specific data (story data overrides base)
  const displayWorld = storyData ? {
    ...world,
    setting: storyData.setting ?? world.setting,
    lore: storyData.lore ?? world.lore,
    the_world_society: storyData.the_world_society ?? world.the_world_society,
    culture: storyData.culture ?? world.culture,
    politics: storyData.politics ?? world.politics,
    technology: storyData.technology ?? world.technology,
    environment: storyData.environment ?? world.environment,
    races_species: storyData.races_species ?? world.races_species,
    power_systems: storyData.power_systems ?? world.power_systems,
    religion: storyData.religion ?? world.religion,
    government: storyData.government ?? world.government,
    important_factions: storyData.important_factions ?? world.important_factions,
    notable_figures: storyData.notable_figures ?? world.notable_figures,
    languages: storyData.languages ?? world.languages,
    trade_economy: storyData.trade_economy ?? world.trade_economy,
    travel_transport: storyData.travel_transport ?? world.travel_transport,
    themes: storyData.themes ?? world.themes,
    inspirations: storyData.inspirations ?? world.inspirations,
    current_era_status: storyData.current_era_status ?? world.current_era_status,
    notes: storyData.notes ?? world.notes,
    overview_image_url: storyData.overview_image_url ?? world.overview_image_url,
    society_culture_image_url: storyData.society_culture_image_url ?? world.society_culture_image_url,
    world_building_image_url: storyData.world_building_image_url ?? world.world_building_image_url,
    economy_systems_image_url: storyData.economy_systems_image_url ?? world.economy_systems_image_url,
    additional_info_image_url: storyData.additional_info_image_url ?? world.additional_info_image_url,
    history_image_url: storyData.history_image_url ?? world.history_image_url,
    history: storyData.history ?? world.history,
    modular_fields: storyData.modular_fields ?? world.modular_fields,
    races: filteredRaces,
  } : {
    ...world,
    races: filteredRaces,
  };
  
  // Parallelize independent queries for better performance
  const [ocsResult, timelinesResult, loreEntriesResult] = await Promise.all([
    supabase
      .from('ocs')
      .select('*, world:worlds(*)')
      .eq('world_id', world.id)
      .eq('is_public', true)
      .order('name', { ascending: true }),
    supabase
      .from('timelines')
      .select('*')
      .eq('world_id', world.id)
      .order('name', { ascending: true }),
    (async () => {
      // Try query with story_alias first
      let loreQuery = supabase
        .from('world_lore')
        .select(`
          *,
          world:worlds(id, name, slug),
          story_alias:story_aliases!fk_world_lore_story_alias_id(id, name, slug, description),
          related_ocs:world_lore_ocs(
            *,
            oc:ocs(id, name, slug)
          ),
          related_events:world_lore_timeline_events(
            *,
            event:timeline_events(id, title)
          )
        `)
        .eq('world_id', world.id);
      
      // Filter by story alias if selected, or show base world lore (null story_alias_id)
      if (storyAliasId) {
        loreQuery = loreQuery.or(`story_alias_id.eq.${storyAliasId},story_alias_id.is.null`);
      } else {
        loreQuery = loreQuery.is('story_alias_id', null);
      }
      
      let { data: loreData, error: loreError } = await loreQuery
        .order('lore_type', { ascending: true })
        .order('name', { ascending: true })
        .limit(6); // Show preview of 6 entries
      
      // If error is related to story_aliases relationship, retry without it
      if (loreError && loreError.code === 'PGRST200' && 
          (loreError.message?.includes('story_aliases') || loreError.details?.includes('story_alias'))) {
        let retryQuery = supabase
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
          `)
          .eq('world_id', world.id);
        
        if (storyAliasId) {
          retryQuery = retryQuery.or(`story_alias_id.eq.${storyAliasId},story_alias_id.is.null`);
        } else {
          retryQuery = retryQuery.is('story_alias_id', null);
        }
        
        const retryResult = await retryQuery
          .order('lore_type', { ascending: true })
          .order('name', { ascending: true })
          .limit(6);
        
        loreData = retryResult.data;
        loreError = retryResult.error;
        
        // Fetch story_aliases separately for lore entries that need them
        if (loreData) {
          const loreIdsWithStoryAlias = loreData
            .filter(l => l.story_alias_id !== null && l.story_alias_id !== undefined)
            .map(l => l.story_alias_id as string);
          
          if (loreIdsWithStoryAlias.length > 0) {
            const storyAliasIds = [...new Set(loreIdsWithStoryAlias)];
            const { data: storyAliases } = await supabase
              .from('story_aliases')
              .select('id, name, slug, description')
              .in('id', storyAliasIds);
            
            if (storyAliases) {
              const storyAliasMap = new Map(storyAliases.map(sa => [sa.id, sa]));
              loreData.forEach(lore => {
                if (lore.story_alias_id) {
                  const storyAlias = storyAliasMap.get(lore.story_alias_id);
                  if (storyAlias) {
                    lore.story_alias = storyAlias;
                  }
                }
              });
            }
          }
        }
      }
      
      return { data: loreData, error: loreError };
    })(),
  ]);

  const ocs = ocsResult.data;
  const timelines = timelinesResult.data;
  const loreEntries = loreEntriesResult.data;

  logMemoryUsage('Server', 'WorldDetailPage: Data fetched', {
    path: 'worlds/[slug]',
    slug: resolvedParams.slug,
    ocsCount: ocs?.length || 0,
    timelinesCount: timelines?.length || 0,
    loreEntriesCount: loreEntries?.length || 0,
  });

  return (
    <div>
      <PageHeader
        title={world.name}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Worlds', href: '/worlds' },
          { label: world.name },
        ]}
      />

      {world.series_type === 'canon' && world.story_aliases && world.story_aliases.length > 0 && (
        <WorldStorySelector 
          storyAliases={world.story_aliases} 
          currentStorySlug={storySlug || null}
        />
      )}

      {selectedStoryAlias && (
        <div className="mb-6 p-3 bg-amber-900/20 border border-amber-700/50 rounded text-sm text-amber-300">
          <strong>Note:</strong> You are viewing the world information for the story "{selectedStoryAlias.name}".
          Some content may differ from the base world.
        </div>
      )}

      <WorldHeader world={displayWorld} />
      <WorldDetails world={displayWorld} />

      {ocs && ocs.length > 0 && (
        <>
          <section className="mt-12">
            <h2 className="wiki-section-header">
              <i className="fas fa-users text-blue-400"></i>
              Characters
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
              {ocs.map((oc) => (
                <OCCard key={oc.id} oc={oc} />
              ))}
            </div>
          </section>

          <section className="mt-12">
            <WorldRelationships ocs={ocs} />
          </section>
        </>
      )}

      {timelines && timelines.length > 0 && (
        <section className="mt-12">
          <h2 className="wiki-section-header">
            <i className="fas fa-clock text-purple-400"></i>
            Timelines
          </h2>
          {/* TimelineList component extracts worldSlug from timeline data internally */}
          <TimelineList timelines={timelines} />
        </section>
      )}

      {loreEntries && loreEntries.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="wiki-section-header">
              <i className="fas fa-book-open text-green-400"></i>
              Lore Entries
            </h2>
            <Link
              href={`/worlds/${world.slug}/lore`}
              prefetch={true}
              className="px-4 py-2 text-sm font-medium text-purple-400 hover:text-purple-300 hover:bg-purple-400/10 rounded-lg transition-colors border border-purple-400/30 hover:border-purple-400/50"
            >
              View All <i className="fas fa-arrow-right ml-1"></i>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loreEntries.map((lore) => (
              <LoreCard key={lore.id} lore={lore} />
            ))}
          </div>
          {loreEntries.length >= 6 && (
            <div className="mt-6 text-center">
              <Link
                href={`/worlds/${world.slug}/lore`}
                prefetch={true}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-purple-400 hover:text-purple-300 hover:bg-purple-400/10 rounded-lg transition-colors border border-purple-400/30 hover:border-purple-400/50"
              >
                View All Lore Entries
                <i className="fas fa-arrow-right"></i>
              </Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
