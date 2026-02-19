import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient, queryOCWithFallback, buildOCSelectQueryFallback } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { OCInfobox } from '@/components/oc/OCInfobox';
import { OCPageLayout } from '@/components/oc/OCPageLayout';
import { TableOfContents } from '@/components/oc/TableOfContents';
import { OCGallery } from '@/components/oc/OCGallery';
import { BackToTopButton } from '@/components/oc/BackToTopButton';
import { Markdown } from '@/lib/utils/markdown';
import { DnDRadarChart } from '@/components/visualizations/RadarChart';
import { QuotesSection } from '@/components/content/QuotesSection';
import { TagsDisplay } from '@/components/content/TagsInput';
import { StorySnippets } from '@/components/content/StorySnippets';
import { DevelopmentLog } from '@/components/content/DevelopmentLog';
import { WritingPromptResponses } from '@/components/content/WritingPromptResponses';
import { getEffectiveFieldDefinitions, getFieldValue } from '@/lib/fields/worldFields';
import type { WorldFieldDefinition, OC } from '@/types/oc';
import { TagList } from '@/components/wiki/TagList';
import { convertGoogleDriveUrl, getProxyUrl, isAnimatedImage, isGoogleSitesUrl } from '@/lib/utils/googleDriveImage';
import { extractColorHex, extractColorName } from '@/lib/utils/colorHexUtils';
import { SpotifyEmbed } from '@/components/oc/SpotifyEmbed';
import { formatHeightWithMetric, formatWeightWithMetric } from '@/lib/utils/unitConversion';
import { getRelationshipTypeConfig } from '@/lib/relationships/relationshipTypes';
import { formatLastUpdated } from '@/lib/utils/dateFormat';
import { getSiteConfig } from '@/lib/config/site-config';
import { generateDetailPageMetadata } from '@/lib/seo/page-metadata';
import { getAbsoluteUrl } from '@/lib/seo/metadata-helpers';
import { logger } from '@/lib/logger';
import { formatSupabaseErrorForLog } from '@/lib/utils/supabase-error';
import { generateProfilePageSchema } from '@/lib/seo/structured-data';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const supabase = await createClient();
  const resolvedParams = await params;

  // Query with limit(1) to prevent PGRST116 when multiple rows exist
  let { data: oc, error } = await supabase
    .from('ocs')
    .select('name, slug, history_summary, image_url, icon_url, world:worlds(name, slug)')
    .eq('slug', resolvedParams.slug)
    .eq('is_public', true)
    .limit(1)
    .maybeSingle();

  // If PGRST116 error (multiple rows), try again with explicit limit and take first
  if (error && error.code === 'PGRST116') {
    const { data: ocArray } = await supabase
      .from('ocs')
      .select('name, slug, history_summary, image_url, icon_url, world:worlds(name, slug)')
      .eq('slug', resolvedParams.slug)
      .eq('is_public', true)
      .limit(1);
    
    oc = ocArray?.[0] || null;
    error = null;
    
    if (ocArray && ocArray.length > 1) {
      logger.warn('OCMetadata', 'Multiple OCs found with same slug, using first', {
        slug: resolvedParams.slug,
        count: ocArray.length,
      });
    }
  }

  if (error) {
    logger.error('OCMetadata', 'Supabase query error', {
      slug: resolvedParams.slug,
      error: formatSupabaseErrorForLog(error),
      code: error.code,
    });
  }

  if (!oc) {
    return {
      title: 'Character Not Found',
    };
  }

  const config = await getSiteConfig();
  const baseUrl = config.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
  
  // Use history_summary for description, clean up markdown syntax
  const descriptionText = oc.history_summary || '';
  // Handle world as array (Supabase relationship syntax returns arrays)
  const worldArray = Array.isArray(oc.world) ? oc.world : (oc.world ? [oc.world] : []);
  const world = worldArray[0] as { name: string; slug: string } | undefined;
  const description = descriptionText
    ? descriptionText.substring(0, 155).replace(/\n/g, ' ').replace(/[#*`]/g, '').trim() + (descriptionText.length > 155 ? '...' : '')
    : `${oc.name}${world ? ` from ${world.name}` : ''} - Original Character on ${config.websiteName}`;
  return generateDetailPageMetadata({
    title: oc.name,
    description,
    path: `/ocs/${resolvedParams.slug}`,
    keywords: [
      oc.name,
      'original character',
      'OC',
      world?.name || '',
      'character wiki',
      'fictional character',
    ],
    entityName: oc.name,
    entityImage: oc.icon_url || null,
    entityIconUrl: oc.icon_url || null,
    entityType: 'profile',
    imageAlt: oc.name,
  });
}

export const revalidate = 300;

export default async function OCDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await params;

  // Use fallback helper to handle story_aliases relationship errors gracefully
  let { data: oc, error } = await queryOCWithFallback<OC>(
    async (selectQuery: string) => {
      return await supabase
        .from('ocs')
        .select(selectQuery)
        .eq('slug', resolvedParams.slug)
        .eq('is_public', true)
        .limit(1)
        .maybeSingle();
    },
    supabase,
    'OCDetailPage'
  );

  // If PGRST116 error (multiple rows), try again with explicit limit and take first
  if (error && error.code === 'PGRST116') {
    logger.warn('OCDetailPage', 'PGRST116 error detected, fetching with limit', {
      slug: resolvedParams.slug,
    });
    
    // Build the select query without story_aliases to avoid relationship issues
    const selectQuery = buildOCSelectQueryFallback();
    const { data: ocArray, error: arrayError } = await supabase
      .from('ocs')
      .select(selectQuery)
      .eq('slug', resolvedParams.slug)
      .eq('is_public', true)
      .limit(1);
    
    if (!arrayError && ocArray && ocArray.length > 0) {
      oc = ocArray[0] as unknown as OC;
      error = null;
      
      // Fetch story_alias separately if needed
      if (oc.story_alias_id) {
        try {
          const { data: storyAlias } = await supabase
            .from('story_aliases')
            .select('id, name, slug, description, world_id, created_at, updated_at')
            .eq('id', oc.story_alias_id)
            .single();
          
          if (storyAlias) {
            oc.story_alias = storyAlias;
          }
        } catch (err) {
          // Silently fail - story_alias is optional
        }
      }
      
      if (ocArray.length > 1) {
        logger.warn('OCDetailPage', 'Multiple OCs found with same slug, using first', {
          slug: resolvedParams.slug,
          count: ocArray.length,
        });
      }
    } else {
      // If still error, keep the original error
      error = arrayError || error;
    }
  }

  if (error) {
    logger.error('OCDetailPage', 'Supabase query error', {
      slug: resolvedParams.slug,
      error: formatSupabaseErrorForLog(error),
      code: error.code,
    });
  }

  if (!oc) {
    notFound();
  }
  
  // Type assertion: queryOCWithFallback returns OC type but TypeScript infers a narrower type
  const typedOc: OC = oc as OC;
  
  const config = await getSiteConfig();
  const baseUrl = config.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
  const imageUrl = typedOc.image_url ? getAbsoluteUrl(convertGoogleDriveUrl(typedOc.image_url), baseUrl) : null;
  
  // Generate structured data for OC profile page
  const profileSchema = generateProfilePageSchema(typedOc.name, {
    description: typedOc.history_summary || undefined,
    image: imageUrl ? [imageUrl] : undefined,
    mainEntityName: typedOc.name,
    mainEntityImage: imageUrl || undefined,
  });

  // Fetch quotes
  const { data: quotes } = await supabase
    .from('character_quotes')
    .select('*')
    .eq('oc_id', typedOc.id)
    .order('created_at', { ascending: false });

  // Fetch tags
  const { data: characterTags } = await supabase
    .from('character_tags')
    .select('tag_id, tags(*)')
    .eq('oc_id', typedOc.id);

  const tags = characterTags?.map(ct => ct.tags).filter(Boolean) || [];

  // Fetch story snippets
  const { data: storySnippets, error: storySnippetsError } = await supabase
    .from('story_snippets')
    .select('*')
    .eq('oc_id', typedOc.id)
    .order('created_at', { ascending: false });
  
  if (storySnippetsError) {
    logger.error('OCDetailPage', 'Failed to fetch story snippets', {
      oc_id: typedOc.id,
      error: storySnippetsError.message,
    });
  }
  
  // Ensure storySnippets is always an array
  const validStorySnippets = Array.isArray(storySnippets) ? storySnippets : [];

  // Fetch development log
  const { data: developmentLog } = await supabase
    .from('character_development_log')
    .select('*')
    .eq('oc_id', typedOc.id)
    .order('created_at', { ascending: false });

  // Fetch writing prompt responses
  const { data: writingPromptResponses } = await supabase
    .from('writing_prompt_responses')
    .select(`
      *,
      other_oc:ocs!other_oc_id(id, name, slug)
    `)
    .eq('oc_id', typedOc.id)
    .order('created_at', { ascending: false });

  // Increment view count
  await supabase
    .from('ocs')
    .update({ 
      view_count: (typedOc.view_count || 0) + 1,
      last_viewed_at: new Date().toISOString()
    })
    .eq('id', typedOc.id);

  // Helper function to render a field value
  const renderFieldValue = (field: WorldFieldDefinition, value: string | number | string[] | null) => {
    if (value === null || value === undefined || value === '' || 
        (Array.isArray(value) && value.length === 0)) {
      return null;
    }

    if (field.type === 'array' && Array.isArray(value)) {
      return <TagList tags={value} />;
    } else if (field.type === 'number') {
      return <span>{value}</span>;
    } else {
      return (
        <div className="prose max-w-none">
          <Markdown content={String(value)} />
        </div>
      );
    }
  };

  // Get all field definitions and group by category
  const fieldDefinitions = getEffectiveFieldDefinitions(typedOc.world, typedOc);
  const fieldsByCategory = new Map<string, WorldFieldDefinition[]>();
  
  fieldDefinitions.forEach(field => {
    const category = field.description || 'World-Specific Information';
    if (!fieldsByCategory.has(category)) {
      fieldsByCategory.set(category, []);
    }
    fieldsByCategory.get(category)!.push(field);
  });

  // Helper to check if category has fields with values
  const hasCategoryFields = (category: string): boolean => {
    const fields = fieldsByCategory.get(category) || [];
    return fields.some(field => {
      const value = getFieldValue(field, typedOc.modular_fields);
      return value !== null && value !== undefined && value !== '' && 
        (Array.isArray(value) ? value.length > 0 : true);
    });
  };

  // Helper to render template fields for a category
  const renderCategoryFields = (category: string) => {
    const fields = fieldsByCategory.get(category) || [];
    const fieldsWithValues = fields.filter(field => {
      const value = getFieldValue(field, typedOc.modular_fields);
      return value !== null && value !== undefined && value !== '' && 
        (Array.isArray(value) ? value.length > 0 : true);
    });

    if (fieldsWithValues.length === 0) return null;

    return (
      <div className="space-y-3 mt-3">
        {fieldsWithValues.map((field) => {
          const value = getFieldValue(field, typedOc.modular_fields);
          const rendered = renderFieldValue(field, value);
          if (!rendered) return null;
          
          return (
            <div key={field.key} className="flex items-start gap-2" suppressHydrationWarning>
              <i className="fas fa-circle text-gray-500 mt-1.5 flex-shrink-0 text-xs" aria-hidden="true" suppressHydrationWarning></i>
              <div className="flex-1">
                <span className="font-semibold text-gray-200">{field.label}: </span>
                <div className="mt-1">{rendered}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div suppressHydrationWarning>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profileSchema) }}
      />
      <nav className="flex mb-6 text-sm text-gray-400" suppressHydrationWarning>
        <Link href="/" prefetch={true} className="hover:text-purple-400 transition-colors">
          Home
        </Link>
        <span className="mx-2 text-gray-500">/</span>
        <Link href="/ocs" prefetch={true} className="hover:text-purple-400 transition-colors">
          Characters
        </Link>
        <span className="mx-2 text-gray-500">/</span>
        <span>{typedOc.name}</span>
      </nav>

      <OCPageLayout oc={typedOc}>
        <div className="flex flex-col lg:flex-row gap-4 md:gap-6 lg:gap-8" suppressHydrationWarning>
          <div className="w-full lg:w-96 flex-shrink-0 lg:sticky lg:top-20 lg:self-start lg:h-fit" suppressHydrationWarning>
            <OCInfobox oc={typedOc} />

            {/* Tags */}
            {tags.length > 0 && (
              <div className="mt-4">
                <TagsDisplay tags={tags as any} />
              </div>
            )}
          </div>
          <div id="oc-content" className="flex-1 space-y-4 md:space-y-6" suppressHydrationWarning>
            {/* Header - smaller, next to sidebar */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-800/80 via-gray-800/60 to-gray-900/80 p-3 md:p-4 lg:p-5 border border-gray-700/50 shadow-lg backdrop-blur-sm" suppressHydrationWarning>
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 pointer-events-none" suppressHydrationWarning></div>
              <div className="relative flex items-start gap-4" suppressHydrationWarning>
                {typedOc.world?.icon_url && (
                  <div className="relative w-12 h-12 md:w-14 md:h-14 flex-shrink-0 group">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative w-full h-full">
                      <Image
                        src={typedOc.world.icon_url?.includes('drive.google.com')
                          ? getProxyUrl(typedOc.world.icon_url)
                          : convertGoogleDriveUrl(typedOc.world.icon_url)}
                        alt={typedOc.world.name}
                        fill
                        sizes="(max-width: 768px) 48px, 56px"
                        className="object-contain rounded-lg bg-gray-800/70 p-1.5 border-2 border-gray-600/50 shadow-lg group-hover:border-purple-500/50 transition-all duration-300"
                        unoptimized={typedOc.world.icon_url?.includes('drive.google.com') || isGoogleSitesUrl(typedOc.world.icon_url) || isAnimatedImage(typedOc.world.icon_url)}
                      />
                    </div>
                  </div>
                )}
                <div className="flex-1 min-w-0" suppressHydrationWarning>
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-100 mb-2 flex items-center gap-2 leading-tight" suppressHydrationWarning>
                    <i className="fas fa-user text-purple-400 text-xl md:text-2xl lg:text-3xl" aria-hidden="true" suppressHydrationWarning></i>
                    <span className="bg-gradient-to-r from-gray-100 via-gray-50 to-gray-200 bg-clip-text text-transparent">
                      {typedOc.name}
                    </span>
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    {typedOc.world && (
                      <Link 
                        href={`/worlds/${typedOc.world.slug}`}
                        prefetch={true}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 transition-all duration-200 border border-blue-500/20 hover:border-blue-500/40 group/link backdrop-blur-sm text-sm"
                        suppressHydrationWarning
                      >
                        <i className="fas fa-globe text-xs group-hover/link:scale-110 transition-transform duration-200" aria-hidden="true" suppressHydrationWarning></i>
                        <span className="font-semibold">{typedOc.world.name}</span>
                        <i className="fas fa-arrow-right text-xs opacity-0 group-hover/link:opacity-100 group-hover/link:translate-x-1 transition-all duration-200" aria-hidden="true" suppressHydrationWarning></i>
                      </Link>
                    )}
                    {typedOc.updated_at && (
                      <span className="text-sm text-gray-400" suppressHydrationWarning>
                        <i className="fas fa-clock mr-1.5" aria-hidden="true" suppressHydrationWarning></i>
                        Last updated: {formatLastUpdated(typedOc.updated_at)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Alternative Versions Notice */}
            {typedOc.identity?.versions && typedOc.identity.versions.length > 1 && (() => {
              // Filter to get only alternative versions (public, different world, not current OC)
              const alternativeVersions = typedOc.identity.versions.filter(
                (version: any) => 
                  version.is_public && 
                  version.id !== typedOc.id && 
                  version.world_id !== typedOc.world_id &&
                  version.world
              );

              if (alternativeVersions.length === 0) return null;

              return (
                <div className="wiki-card p-4 md:p-6 border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-purple-600/5" suppressHydrationWarning>
                  <div className="flex items-start gap-3" suppressHydrationWarning>
                    <i className="fas fa-info-circle text-purple-400 text-xl mt-0.5 flex-shrink-0" aria-hidden="true" suppressHydrationWarning></i>
                    <div className="flex-1 space-y-2" suppressHydrationWarning>
                      <p className="text-gray-200 font-medium" suppressHydrationWarning>
                        Alternative Versions Available:
                      </p>
                      <div className="space-y-2" suppressHydrationWarning>
                        {alternativeVersions.map((version: any) => (
                          <Link
                            key={version.id}
                            href={`/ocs/${version.slug}`}
                            prefetch={true}
                            className="block px-4 py-2.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 hover:border-purple-500/50 transition-all duration-200 group"
                            suppressHydrationWarning
                          >
                            <span className="text-gray-200" suppressHydrationWarning>
                              Are you looking for{' '}
                              <span className="font-semibold text-purple-300 group-hover:text-purple-200" suppressHydrationWarning>
                                {version.name}
                              </span>
                              {version.world && (
                                <>
                                  {' '}(<span className="text-blue-300 group-hover:text-blue-200" suppressHydrationWarning>{version.world.name}</span>)
                                </>
                              )}
                              ?
                            </span>
                            <i className="fas fa-arrow-right ml-2 text-purple-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" aria-hidden="true" suppressHydrationWarning></i>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Table of Contents */}
            <TableOfContents oc={typedOc} storySnippets={validStorySnippets.length > 0 ? validStorySnippets : undefined} />

            {/* Overview Section */}
            {((typedOc.aliases || typedOc.affiliations || typedOc.romantic_orientation || typedOc.sexual_orientation || typedOc.story_alias || typedOc.species || typedOc.occupation || typedOc.development_status) || 
              hasCategoryFields('Core Identity') || hasCategoryFields('Overview')) && (
              <div className="wiki-card p-4 md:p-6 lg:p-8" suppressHydrationWarning>
                <h2 id="overview" className="wiki-section-header scroll-mt-20" suppressHydrationWarning>
                  <i className="fas fa-info-circle text-blue-400" aria-hidden="true" suppressHydrationWarning></i>
                  Overview
                </h2>
                <div className="space-y-4 text-gray-300">
                  {/* Story Alias - Special badge */}
                  {typedOc.story_alias && (
                    <div className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-lg border border-purple-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <i className="fas fa-bookmark text-purple-400" aria-hidden="true" suppressHydrationWarning></i>
                        <span className="font-semibold text-gray-200 text-sm uppercase tracking-wide">Story Alias</span>
                      </div>
                      <span className="px-3 py-1.5 text-sm font-medium bg-purple-600/30 text-purple-300 rounded-lg inline-block border border-purple-500/30">
                        {typedOc.story_alias.name}
                      </span>
                    </div>
                  )}
                  
                  {/* Core Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {typedOc.species && (
                      <div className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-lg border border-blue-500/20 hover:border-blue-500/40 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                          <i className="fas fa-dna text-blue-400"></i>
                          <span className="font-semibold text-gray-200">Species</span>
                        </div>
                        <div className="prose max-w-none">
                          <Markdown content={typedOc.species} />
                        </div>
                      </div>
                    )}
                    {typedOc.occupation && (
                      <div className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-lg border border-blue-500/20 hover:border-blue-500/40 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                          <i className="fas fa-briefcase text-blue-400" aria-hidden="true" suppressHydrationWarning></i>
                          <span className="font-semibold text-gray-200">Occupation</span>
                        </div>
                        <div className="prose max-w-none">
                          <Markdown content={typedOc.occupation} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Aliases */}
                  {typedOc.aliases && (
                    <div className="p-4 bg-gradient-to-br from-gray-700/30 to-gray-800/20 rounded-lg border border-gray-600/30">
                      <div className="flex items-center gap-2 mb-2">
                        <i className="fas fa-tag text-blue-400"></i>
                        <span className="font-semibold text-gray-200">Aliases</span>
                      </div>
                      <div className="prose max-w-none">
                        <Markdown content={typedOc.aliases} />
                      </div>
                    </div>
                  )}

                  {/* Affiliations */}
                  {typedOc.affiliations && (
                    <div className="p-4 bg-gradient-to-br from-gray-700/30 to-gray-800/20 rounded-lg border border-gray-600/30">
                      <div className="flex items-center gap-2 mb-2">
                        <i className="fas fa-users-cog text-blue-400" aria-hidden="true" suppressHydrationWarning></i>
                        <span className="font-semibold text-gray-200">Affiliations</span>
                      </div>
                      <div className="prose max-w-none mt-1">
                        <Markdown content={typedOc.affiliations} />
                      </div>
                    </div>
                  )}

                  {/* Orientation Cards */}
                  {(typedOc.romantic_orientation || typedOc.sexual_orientation) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {typedOc.romantic_orientation && (
                        <div className="p-4 bg-gradient-to-br from-red-500/10 to-pink-600/5 rounded-lg border border-red-500/20 hover:border-red-500/40 transition-colors">
                          <div className="flex items-center gap-2 mb-2">
                            <i className="fas fa-heart text-red-400"></i>
                            <span className="font-semibold text-gray-200">Romantic Orientation</span>
                          </div>
                          <div className="prose max-w-none">
                            <Markdown content={typedOc.romantic_orientation} />
                          </div>
                        </div>
                      )}
                      {typedOc.sexual_orientation && (
                        <div className="p-4 bg-gradient-to-br from-rose-500/10 to-rose-600/5 rounded-lg border border-rose-500/20 hover:border-rose-500/40 transition-colors">
                          <div className="flex items-center gap-2 mb-2">
                            <i className="fas fa-heart text-rose-400" aria-hidden="true" suppressHydrationWarning></i>
                            <span className="font-semibold text-gray-200">Sexual Orientation</span>
                          </div>
                          <div className="prose max-w-none">
                            <Markdown content={typedOc.sexual_orientation} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Development Status */}
                  {oc.development_status && (
                    <div className="p-4 bg-gradient-to-br from-gray-700/30 to-gray-800/20 rounded-lg border border-gray-600/30">
                      <div className="flex items-center gap-2 mb-2">
                        <i className="fas fa-tasks text-blue-400"></i>
                        <span className="font-semibold text-gray-200">Development Status</span>
                      </div>
                      <div className="prose max-w-none">
                        <Markdown content={oc.development_status} />
                      </div>
                    </div>
                  )}

                  {/* Template fields with "Overview" category */}
                  {renderCategoryFields('Overview')}
                </div>
              </div>
            )}

            {/* Identity Background Section */}
            {(oc.ethnicity || oc.place_of_origin || oc.current_residence || (oc.languages && oc.languages.length > 0)) && (
              <div className="wiki-card p-4 md:p-6 lg:p-8" suppressHydrationWarning>
                <h2 id="identity-background" className="wiki-section-header scroll-mt-20" suppressHydrationWarning>
                  <i className="fas fa-globe-americas text-green-400" aria-hidden="true" suppressHydrationWarning></i>
                  Identity Background
                </h2>
                <div className="space-y-4 text-gray-300">
                  {/* Ethnicity */}
                  {oc.ethnicity && (
                    <div className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-lg border border-green-500/20 hover:border-green-500/40 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <i className="fas fa-flag text-green-400" aria-hidden="true" suppressHydrationWarning></i>
                        <span className="font-semibold text-gray-200">Ethnicity</span>
                      </div>
                      <div className="prose max-w-none">
                        <Markdown content={oc.ethnicity} />
                      </div>
                    </div>
                  )}

                  {/* Location Grid */}
                  {(oc.place_of_origin || oc.current_residence) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {oc.place_of_origin && (
                        <div className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-lg border border-green-500/20 hover:border-green-500/40 transition-colors">
                          <div className="flex items-center gap-2 mb-2">
                            <i className="fas fa-map-marker-alt text-green-400"></i>
                            <span className="font-semibold text-gray-200">Place of Origin</span>
                          </div>
                          <div className="prose max-w-none">
                            <Markdown content={oc.place_of_origin} />
                          </div>
                        </div>
                      )}
                      {oc.current_residence && (
                        <div className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-lg border border-green-500/20 hover:border-green-500/40 transition-colors">
                          <div className="flex items-center gap-2 mb-2">
                            <i className="fas fa-home text-green-400" aria-hidden="true" suppressHydrationWarning></i>
                            <span className="font-semibold text-gray-200">Current Residence</span>
                          </div>
                          <div className="prose max-w-none">
                            <Markdown content={oc.current_residence} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Languages */}
                  {oc.languages && oc.languages.length > 0 && (
                    <div className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-lg border border-green-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <i className="fas fa-language text-green-400"></i>
                        <span className="font-semibold text-gray-200">Languages</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {oc.languages.map((lang: string, index: number) => (
                          <span key={index} className="px-3 py-1.5 bg-green-600/30 text-green-300 rounded-lg text-sm font-medium flex items-center gap-1.5 border border-green-500/30 hover:bg-green-600/40 transition-colors">
                            <i className="fas fa-comments text-xs" aria-hidden="true" suppressHydrationWarning></i>
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Template fields with "Identity Background" category */}
                  {renderCategoryFields('Identity Background')}
                </div>
              </div>
            )}

            {/* History Summary Section */}
            {oc.history_summary && (
            <div className="wiki-card p-4 md:p-6 lg:p-8" suppressHydrationWarning>
              <h2 id="biography" className="wiki-section-header scroll-mt-20" suppressHydrationWarning>
                <i className="fas fa-book text-blue-400" aria-hidden="true" suppressHydrationWarning></i>
                Biography
              </h2>
                <div className="text-gray-300 prose max-w-none">
                  <Markdown content={oc.history_summary} />
                </div>
              </div>
            )}

            {/* Abilities Section */}
            {((oc.abilities || oc.skills || oc.aptitudes || oc.strengths || oc.limits || oc.conditions) || 
              hasCategoryFields('Abilities')) && (
              <div className="wiki-card p-4 md:p-6 lg:p-8" suppressHydrationWarning>
                <h2 id="abilities" className="wiki-section-header scroll-mt-20" suppressHydrationWarning>
                  <i className="fas fa-magic text-indigo-400" aria-hidden="true" suppressHydrationWarning></i>
                  Abilities
                </h2>
                <div className="space-y-4 text-gray-300 prose max-w-none">
                  {oc.abilities && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-200 mb-2 flex items-center gap-2">
                        <i className="fas fa-sparkles text-indigo-400"></i>
                        Abilities
                      </h3>
                      <Markdown content={oc.abilities} />
                    </div>
                  )}
                  {oc.skills && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-200 mb-2 flex items-center gap-2">
                        <i className="fas fa-tools text-indigo-400" aria-hidden="true" suppressHydrationWarning></i>
                        Skills
                      </h3>
                      <Markdown content={oc.skills} />
                    </div>
                  )}
                  {oc.aptitudes && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-200 mb-2 flex items-center gap-2">
                        <i className="fas fa-gem text-indigo-400"></i>
                        Aptitudes
                      </h3>
                      <Markdown content={oc.aptitudes} />
                    </div>
                  )}
                  {oc.strengths && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-200 mb-2 flex items-center gap-2">
                        <i className="fas fa-fist-raised text-green-400" aria-hidden="true" suppressHydrationWarning></i>
                        Strengths
                      </h3>
                      <Markdown content={oc.strengths} />
                    </div>
                  )}
                  {oc.limits && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-200 mb-2 flex items-center gap-2">
                        <i className="fas fa-exclamation-triangle text-yellow-400"></i>
                        Limits
                      </h3>
                      <Markdown content={oc.limits} />
                    </div>
                  )}
                  {oc.conditions && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-200 mb-2 flex items-center gap-2">
                        <i className="fas fa-clipboard-list text-orange-400" aria-hidden="true" suppressHydrationWarning></i>
                        Conditions
                      </h3>
                      <Markdown content={oc.conditions} />
                    </div>
                  )}

                  {/* Template fields with "Abilities" category */}
                  {(() => {
                    const fields = fieldsByCategory.get('Abilities') || [];
                    const fieldsWithValues = fields.filter(field => {
                      const value = getFieldValue(field, typedOc.modular_fields);
                      return value !== null && value !== undefined && value !== '' && 
                        (Array.isArray(value) ? value.length > 0 : true);
                    });

                    if (fieldsWithValues.length === 0) return null;

                    return fieldsWithValues.map((field) => {
                      const value = getFieldValue(field, typedOc.modular_fields);
                      const rendered = renderFieldValue(field, value);
                      if (!rendered) return null;
                      
                      return (
                        <div key={field.key}>
                          <h3 className="text-lg font-semibold text-gray-200 mb-2 flex items-center gap-2">
                            <i className="fas fa-magic text-indigo-400" aria-hidden="true" suppressHydrationWarning></i>
                            {field.label}
                          </h3>
                          {rendered}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* Stats Section */}
            {(oc.stat_strength || oc.stat_dexterity || oc.stat_constitution || oc.stat_intelligence || oc.stat_wisdom || oc.stat_charisma || oc.stat_level || oc.stat_class || oc.stat_subclass || oc.stat_hit_points_current || oc.stat_hit_points_max || oc.stat_armor_class || oc.stat_speed || oc.stat_initiative || oc.stat_notes) && (
              <div className="wiki-card p-4 md:p-6 lg:p-8" suppressHydrationWarning>
                <h2 id="stats" className="wiki-section-header scroll-mt-20" suppressHydrationWarning>
                  <i className="fas fa-dice-d20 text-amber-400" aria-hidden="true" suppressHydrationWarning></i>
                  Stats
                </h2>
                <div className="space-y-6 text-gray-300">
                  {/* Ability Scores */}
                  {(oc.stat_strength || oc.stat_dexterity || oc.stat_constitution || oc.stat_intelligence || oc.stat_wisdom || oc.stat_charisma) && (
                    <div className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-xl border border-amber-500/20 shadow-lg">
                      <h3 className="text-base font-semibold text-gray-200 mb-3 flex items-center gap-2">
                        <i className="fas fa-dice-d20 text-amber-400"></i>
                        Ability Scores
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                        {oc.stat_strength && (() => {
                          const modifier = Math.floor((oc.stat_strength - 10) / 2);
                          const modifierStr = modifier >= 0 ? `+${modifier}` : `${modifier}`;
                          const statColor = oc.stat_strength >= 20 ? 'text-amber-200' : oc.stat_strength >= 15 ? 'text-amber-300' : 'text-amber-400';
                          return (
                            <div className="p-3 bg-gradient-to-br from-gray-800/60 to-gray-800/40 rounded-lg border border-amber-500/30 hover:border-amber-400/50 transition-all shadow-md">
                              <div className="text-xs font-semibold text-amber-400/80 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                                <i className="fas fa-dumbbell text-xs"></i>
                                STR
                              </div>
                              <div className={`${statColor} font-bold text-xl mb-0.5`}>{oc.stat_strength}</div>
                              <div className="text-xs font-medium text-gray-400 mt-1.5 pt-1.5 border-t border-gray-700/50">
                                <span className="text-gray-500">Mod:</span> <span className="text-amber-300 font-semibold">{modifierStr}</span>
                              </div>
                            </div>
                          );
                        })()}
                        {oc.stat_dexterity && (() => {
                          const modifier = Math.floor((oc.stat_dexterity - 10) / 2);
                          const modifierStr = modifier >= 0 ? `+${modifier}` : `${modifier}`;
                          const statColor = oc.stat_dexterity >= 20 ? 'text-amber-200' : oc.stat_dexterity >= 15 ? 'text-amber-300' : 'text-amber-400';
                          return (
                            <div className="p-3 bg-gradient-to-br from-gray-800/60 to-gray-800/40 rounded-lg border border-amber-500/30 hover:border-amber-400/50 transition-all shadow-md">
                              <div className="text-xs font-semibold text-amber-400/80 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                                <i className="fas fa-running text-xs"></i>
                                DEX
                              </div>
                              <div className={`${statColor} font-bold text-xl mb-0.5`}>{oc.stat_dexterity}</div>
                              <div className="text-xs font-medium text-gray-400 mt-1.5 pt-1.5 border-t border-gray-700/50">
                                <span className="text-gray-500">Mod:</span> <span className="text-amber-300 font-semibold">{modifierStr}</span>
                              </div>
                            </div>
                          );
                        })()}
                        {oc.stat_constitution && (() => {
                          const modifier = Math.floor((oc.stat_constitution - 10) / 2);
                          const modifierStr = modifier >= 0 ? `+${modifier}` : `${modifier}`;
                          const statColor = oc.stat_constitution >= 20 ? 'text-amber-200' : oc.stat_constitution >= 15 ? 'text-amber-300' : 'text-amber-400';
                          return (
                            <div className="p-3 bg-gradient-to-br from-gray-800/60 to-gray-800/40 rounded-lg border border-amber-500/30 hover:border-amber-400/50 transition-all shadow-md">
                              <div className="text-xs font-semibold text-amber-400/80 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                                <i className="fas fa-heartbeat text-xs"></i>
                                CON
                              </div>
                              <div className={`${statColor} font-bold text-xl mb-0.5`}>{oc.stat_constitution}</div>
                              <div className="text-xs font-medium text-gray-400 mt-1.5 pt-1.5 border-t border-gray-700/50">
                                <span className="text-gray-500">Mod:</span> <span className="text-amber-300 font-semibold">{modifierStr}</span>
                              </div>
                            </div>
                          );
                        })()}
                        {oc.stat_intelligence && (() => {
                          const modifier = Math.floor((oc.stat_intelligence - 10) / 2);
                          const modifierStr = modifier >= 0 ? `+${modifier}` : `${modifier}`;
                          const statColor = oc.stat_intelligence >= 20 ? 'text-amber-200' : oc.stat_intelligence >= 15 ? 'text-amber-300' : 'text-amber-400';
                          return (
                            <div className="p-3 bg-gradient-to-br from-gray-800/60 to-gray-800/40 rounded-lg border border-amber-500/30 hover:border-amber-400/50 transition-all shadow-md">
                              <div className="text-xs font-semibold text-amber-400/80 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                                <i className="fas fa-brain text-xs"></i>
                                INT
                              </div>
                              <div className={`${statColor} font-bold text-xl mb-0.5`}>{oc.stat_intelligence}</div>
                              <div className="text-xs font-medium text-gray-400 mt-1.5 pt-1.5 border-t border-gray-700/50">
                                <span className="text-gray-500">Mod:</span> <span className="text-amber-300 font-semibold">{modifierStr}</span>
                              </div>
                            </div>
                          );
                        })()}
                        {oc.stat_wisdom && (() => {
                          const modifier = Math.floor((oc.stat_wisdom - 10) / 2);
                          const modifierStr = modifier >= 0 ? `+${modifier}` : `${modifier}`;
                          const statColor = oc.stat_wisdom >= 20 ? 'text-amber-200' : oc.stat_wisdom >= 15 ? 'text-amber-300' : 'text-amber-400';
                          return (
                            <div className="p-3 bg-gradient-to-br from-gray-800/60 to-gray-800/40 rounded-lg border border-amber-500/30 hover:border-amber-400/50 transition-all shadow-md">
                              <div className="text-xs font-semibold text-amber-400/80 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                                <i className="fas fa-eye text-xs"></i>
                                WIS
                              </div>
                              <div className={`${statColor} font-bold text-xl mb-0.5`}>{oc.stat_wisdom}</div>
                              <div className="text-xs font-medium text-gray-400 mt-1.5 pt-1.5 border-t border-gray-700/50">
                                <span className="text-gray-500">Mod:</span> <span className="text-amber-300 font-semibold">{modifierStr}</span>
                              </div>
                            </div>
                          );
                        })()}
                        {oc.stat_charisma && (() => {
                          const modifier = Math.floor((oc.stat_charisma - 10) / 2);
                          const modifierStr = modifier >= 0 ? `+${modifier}` : `${modifier}`;
                          const statColor = oc.stat_charisma >= 20 ? 'text-amber-200' : oc.stat_charisma >= 15 ? 'text-amber-300' : 'text-amber-400';
                          return (
                            <div className="p-3 bg-gradient-to-br from-gray-800/60 to-gray-800/40 rounded-lg border border-amber-500/30 hover:border-amber-400/50 transition-all shadow-md">
                              <div className="text-xs font-semibold text-amber-400/80 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                                <i className="fas fa-comments text-xs"></i>
                                CHA
                              </div>
                              <div className={`${statColor} font-bold text-xl mb-0.5`}>{oc.stat_charisma}</div>
                              <div className="text-xs font-medium text-gray-400 mt-1.5 pt-1.5 border-t border-gray-700/50">
                                <span className="text-gray-500">Mod:</span> <span className="text-amber-300 font-semibold">{modifierStr}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* D&D Stats Visualization */}
                  {(oc.stat_strength || oc.stat_dexterity || oc.stat_constitution || oc.stat_intelligence || oc.stat_wisdom || oc.stat_charisma) && (
                    <div className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-xl border border-amber-500/20 shadow-lg">
                      <DnDRadarChart
                        stats={{
                          strength: oc.stat_strength || undefined,
                          dexterity: oc.stat_dexterity || undefined,
                          constitution: oc.stat_constitution || undefined,
                          intelligence: oc.stat_intelligence || undefined,
                          wisdom: oc.stat_wisdom || undefined,
                          charisma: oc.stat_charisma || undefined,
                        }}
                        title=""
                        height={350}
                        showModifiers={true}
                      />
                    </div>
                  )}

                  {/* Character Info */}
                  {(oc.stat_level || oc.stat_class || oc.stat_subclass) && (
                    <div className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-xl border border-amber-500/20 shadow-lg">
                      <h3 className="text-base font-semibold text-gray-200 mb-3 flex items-center gap-2">
                        <i className="fas fa-user-circle text-amber-400"></i>
                        Character Info
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {oc.stat_level && (
                          <div className="p-3 bg-gradient-to-br from-gray-800/60 to-gray-800/40 rounded-lg border border-amber-500/30 hover:border-amber-400/50 transition-all shadow-md">
                            <div className="text-xs font-semibold text-amber-400/80 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                              <i className="fas fa-level-up-alt text-xs"></i>
                              Level
                            </div>
                            <div className="text-amber-300 font-bold text-xl">{oc.stat_level}</div>
                          </div>
                        )}
                        {oc.stat_class && (
                          <div className="p-3 bg-gradient-to-br from-gray-800/60 to-gray-800/40 rounded-lg border border-amber-500/30 hover:border-amber-400/50 transition-all shadow-md">
                            <div className="text-xs font-semibold text-amber-400/80 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                              <i className="fas fa-user-ninja text-xs"></i>
                              Class
                            </div>
                            <div className="text-gray-200 font-semibold">{oc.stat_class}</div>
                          </div>
                        )}
                        {oc.stat_subclass && (
                          <div className="p-3 bg-gradient-to-br from-gray-800/60 to-gray-800/40 rounded-lg border border-amber-500/30 hover:border-amber-400/50 transition-all shadow-md">
                            <div className="text-xs font-semibold text-amber-400/80 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                              <i className="fas fa-star text-xs"></i>
                              Subclass
                            </div>
                            <div className="text-gray-200 font-semibold">{oc.stat_subclass}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Combat Stats */}
                  {(oc.stat_hit_points_current || oc.stat_hit_points_max || oc.stat_armor_class || oc.stat_speed || oc.stat_initiative) && (
                    <div className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-xl border border-amber-500/20 shadow-lg">
                      <h3 className="text-base font-semibold text-gray-200 mb-3 flex items-center gap-2">
                        <i className="fas fa-shield-alt text-amber-400"></i>
                        Combat Stats
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {oc.stat_hit_points_max && (
                          <div className="p-3 bg-gradient-to-br from-red-900/30 to-red-800/20 rounded-lg border border-red-500/30 hover:border-red-400/50 transition-all shadow-md">
                            <div className="text-xs font-semibold text-red-400/80 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                              <i className="fas fa-heart text-xs"></i>
                              HP
                            </div>
                            <div className="text-red-300 font-bold text-xl mb-0.5">{oc.stat_hit_points_max}</div>
                            {oc.stat_hit_points_current !== null && oc.stat_hit_points_current !== undefined && (
                              <div className="text-xs font-medium text-gray-400 mt-1.5 pt-1.5 border-t border-gray-700/50">
                                <span className="text-gray-500">Cur:</span> <span className="text-red-200 font-semibold">{oc.stat_hit_points_current}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {oc.stat_armor_class !== null && oc.stat_armor_class !== undefined && (
                          <div className="p-3 bg-gradient-to-br from-blue-900/30 to-blue-800/20 rounded-lg border border-blue-500/30 hover:border-blue-400/50 transition-all shadow-md">
                            <div className="text-xs font-semibold text-blue-400/80 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                              <i className="fas fa-shield text-xs"></i>
                              AC
                            </div>
                            <div className="text-blue-300 font-bold text-xl">{oc.stat_armor_class}</div>
                          </div>
                        )}
                        {oc.stat_initiative !== null && oc.stat_initiative !== undefined && (
                          <div className="p-3 bg-gradient-to-br from-purple-900/30 to-purple-800/20 rounded-lg border border-purple-500/30 hover:border-purple-400/50 transition-all shadow-md">
                            <div className="text-xs font-semibold text-purple-400/80 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                              <i className="fas fa-bolt text-xs"></i>
                              Initiative
                            </div>
                            <div className="text-purple-300 font-bold text-xl">{oc.stat_initiative >= 0 ? '+' : ''}{oc.stat_initiative}</div>
                          </div>
                        )}
                        {oc.stat_speed !== null && oc.stat_speed !== undefined && (
                          <div className="p-3 bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-lg border border-green-500/30 hover:border-green-400/50 transition-all shadow-md">
                            <div className="text-xs font-semibold text-green-400/80 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                              <i className="fas fa-running text-xs"></i>
                              Speed
                            </div>
                            <div className="text-green-300 font-bold text-xl">{oc.stat_speed}</div>
                            <div className="text-xs text-gray-500 mt-0.5">ft</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Stats Notes */}
                  {oc.stat_notes && (
                    <div className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-xl border border-amber-500/20 shadow-lg">
                      <h3 className="text-base font-semibold text-gray-200 mb-3 flex items-center gap-2">
                        <i className="fas fa-sticky-note text-amber-400"></i>
                        Stats Notes
                      </h3>
                      <div className="prose prose-invert max-w-none">
                        <Markdown content={oc.stat_notes} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Appearance Section */}
            {(oc.standard_look || oc.alternate_looks || oc.accessories || oc.visual_motifs || oc.appearance_changes || oc.height || oc.weight || oc.build || oc.eye_color || oc.hair_color || oc.skin_tone || oc.features || oc.appearance_summary) && (
            <div className="wiki-card p-4 md:p-6 lg:p-8" suppressHydrationWarning>
                <h2 id="appearance" className="wiki-section-header scroll-mt-20" suppressHydrationWarning>
                <i className="fas fa-user text-purple-400" aria-hidden="true" suppressHydrationWarning></i>
                Appearance
              </h2>
                <div className="space-y-6 text-gray-300 prose max-w-none">
                  {/* Appearance Summary */}
                  {oc.appearance_summary && (
                    <div className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-lg border border-purple-500/20">
                      <Markdown content={oc.appearance_summary} />
                    </div>
                  )}

                  {/* Physical Attributes Grid */}
                  {(oc.height || oc.weight || oc.build || oc.eye_color || oc.hair_color || oc.skin_tone) && (
                    <div className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-lg border border-purple-500/20">
                      <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
                        <i className="fas fa-ruler-combined text-purple-400"></i>
                        Physical Attributes
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {oc.height && (
                          <div className="p-3 bg-gray-800/40 rounded-lg border border-gray-700/30">
                            <div className="text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">Height</div>
                            <div className="text-gray-200 font-medium">{formatHeightWithMetric(oc.height)}</div>
                          </div>
                        )}
                        {oc.weight && (
                          <div className="p-3 bg-gray-800/40 rounded-lg border border-gray-700/30">
                            <div className="text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">Weight</div>
                            <div className="text-gray-200 font-medium">{formatWeightWithMetric(oc.weight)}</div>
                          </div>
                        )}
                        {oc.build && (
                          <div className="p-3 bg-gray-800/40 rounded-lg border border-gray-700/30">
                            <div className="text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">Build</div>
                            <div className="text-gray-200 font-medium">{oc.build}</div>
                          </div>
                        )}
                        {oc.eye_color && (() => {
                          const colorName = extractColorName(oc.eye_color);
                          const hexCode = extractColorHex(oc.eye_color);
                          return (
                            <div className="p-3 bg-gray-800/40 rounded-lg border border-gray-700/30">
                              <div className="text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">Eye Color</div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-200 font-medium">{colorName}</span>
                                {hexCode && (
                                  <div 
                                    className="w-5 h-5 rounded border-2 border-gray-600 flex-shrink-0 shadow-sm"
                                    style={{ backgroundColor: hexCode }}
                                    title={hexCode}
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })()}
                        {oc.hair_color && (() => {
                          const colorName = extractColorName(oc.hair_color);
                          const hexCode = extractColorHex(oc.hair_color);
                          return (
                            <div className="p-3 bg-gray-800/40 rounded-lg border border-gray-700/30">
                              <div className="text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">Hair Color</div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-200 font-medium">{colorName}</span>
                                {hexCode && (
                                  <div 
                                    className="w-5 h-5 rounded border-2 border-gray-600 flex-shrink-0 shadow-sm"
                                    style={{ backgroundColor: hexCode }}
                                    title={hexCode}
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })()}
                        {oc.skin_tone && (() => {
                          const colorName = extractColorName(oc.skin_tone);
                          const hexCode = extractColorHex(oc.skin_tone);
                          return (
                            <div className="p-3 bg-gray-800/40 rounded-lg border border-gray-700/30">
                              <div className="text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">Skin Tone</div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-200 font-medium">{colorName}</span>
                                {hexCode && (
                                  <div 
                                    className="w-5 h-5 rounded border-2 border-gray-600 flex-shrink-0 shadow-sm"
                                    style={{ backgroundColor: hexCode }}
                                    title={hexCode}
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Features */}
                  {oc.features && (
                    <div className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-lg border border-purple-500/20">
                      <h3 className="text-lg font-semibold text-gray-200 mb-3 flex items-center gap-2">
                        <i className="fas fa-star text-purple-400" aria-hidden="true" suppressHydrationWarning></i>
                        Features
                      </h3>
                      <Markdown content={oc.features} />
                    </div>
                  )}

                  {/* Standard Look */}
                  {oc.standard_look && (
                    <div className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-lg border border-purple-500/20">
                      <h3 className="text-lg font-semibold text-gray-200 mb-3 flex items-center gap-2">
                        <i className="fas fa-tshirt text-purple-400"></i>
                        Standard Look
                      </h3>
                      <Markdown content={oc.standard_look} />
                    </div>
                  )}

                  {/* Alternate Looks */}
                  {oc.alternate_looks && (
                    <div className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-lg border border-purple-500/20">
                      <h3 className="text-lg font-semibold text-gray-200 mb-3 flex items-center gap-2">
                        <i className="fas fa-palette text-purple-400"></i>
                        Alternate Looks
                      </h3>
                      <Markdown content={oc.alternate_looks} />
                    </div>
                  )}

                  {/* Accessories */}
                  {oc.accessories && (
                    <div className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-lg border border-purple-500/20">
                      <h3 className="text-lg font-semibold text-gray-200 mb-3 flex items-center gap-2">
                        <i className="fas fa-ring text-purple-400"></i>
                        Accessories
                      </h3>
                      <Markdown content={oc.accessories} />
                    </div>
                  )}

                  {/* Visual Motifs */}
                  {oc.visual_motifs && (
                    <div className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-lg border border-purple-500/20">
                      <h3 className="text-lg font-semibold text-gray-200 mb-3 flex items-center gap-2">
                        <i className="fas fa-paint-brush text-purple-400"></i>
                        Visual Motifs
                      </h3>
                      <Markdown content={oc.visual_motifs} />
                    </div>
                  )}

                  {/* Appearance Changes */}
                  {oc.appearance_changes && (
                    <div className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-lg border border-purple-500/20">
                      <h3 className="text-lg font-semibold text-gray-200 mb-3 flex items-center gap-2">
                        <i className="fas fa-sync-alt text-purple-400"></i>
                        Appearance Changes
                      </h3>
                      <Markdown content={oc.appearance_changes} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Personality Overview Section */}
            {(oc.personality_summary || oc.alignment) && (
            <div className="wiki-card p-4 md:p-6 lg:p-8" suppressHydrationWarning>
              <h2 id="personality-overview" className="wiki-section-header scroll-mt-20">
                <i className="fas fa-heart text-pink-400" aria-hidden="true" suppressHydrationWarning></i>
                  Personality Overview
              </h2>
                <div className="text-gray-300 prose max-w-none">
                  {oc.personality_summary && <Markdown content={oc.personality_summary} />}
                  {oc.alignment && (
                    <div className="mt-4">
                      <span className="font-semibold text-gray-200">Alignment: </span>
                      <Markdown content={oc.alignment} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Personality Traits Section */}
            {(oc.positive_traits || oc.neutral_traits || oc.negative_traits) && (
              <div className="wiki-card p-4 md:p-6 lg:p-8" suppressHydrationWarning>
                <h2 id="personality-traits" className="wiki-section-header scroll-mt-20" suppressHydrationWarning>
                  <i className="fas fa-star text-yellow-400" aria-hidden="true" suppressHydrationWarning></i>
                  Personality Traits
                </h2>
                <div className="space-y-6 text-gray-300">
                  {oc.positive_traits && (
                    <div>
                      <h3 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
                        <i className="fas fa-check-circle"></i>
                        Positive Traits
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {oc.positive_traits.split(',').map((trait: string, index: number) => (
                          <span 
                            key={index}
                            className="px-3 py-1.5 bg-green-600/30 text-green-300 rounded-lg text-sm font-medium border border-green-500/30"
                          >
                            {trait.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {oc.neutral_traits && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-400 mb-3 flex items-center gap-2">
                        <i className="fas fa-minus-circle"></i>
                        Neutral Traits
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {oc.neutral_traits.split(',').map((trait: string, index: number) => (
                          <span 
                            key={index}
                            className="px-3 py-1.5 bg-gray-600/30 text-gray-300 rounded-lg text-sm font-medium border border-gray-500/30"
                          >
                            {trait.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {oc.negative_traits && (
                    <div>
                      <h3 className="text-lg font-semibold text-red-400 mb-3 flex items-center gap-2">
                        <i className="fas fa-times-circle"></i>
                        Negative Traits
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {oc.negative_traits.split(',').map((trait: string, index: number) => (
                          <span 
                            key={index}
                            className="px-3 py-1.5 bg-red-600/30 text-red-300 rounded-lg text-sm font-medium border border-red-500/30"
                          >
                            {trait.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quotes Section - After Personality Traits for character voice */}
            {quotes && quotes.length > 0 && (
              <QuotesSection quotes={quotes} ocName={oc.name} />
            )}

            {/* Personality Metrics Section */}
            {(oc.sociability || oc.communication_style || oc.judgment || oc.emotional_resilience || oc.courage || oc.risk_behavior || oc.honesty || oc.discipline || oc.temperament || oc.humor) && (
              <div className="wiki-card p-4 md:p-6 lg:p-8" suppressHydrationWarning>
                <h2 id="personality-metrics" className="wiki-section-header scroll-mt-20">
                  <i className="fas fa-chart-line text-cyan-400" aria-hidden="true" suppressHydrationWarning></i>
                  Personality Metrics
                </h2>
                <div className="space-y-6 text-gray-300">
                  {oc.sociability && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <i className="fas fa-user-friends text-cyan-400"></i>
                          <span className="text-sm font-medium">Sociability</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-400">{oc.sociability}/10</span>
                      </div>
                      <div className="relative">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">Friendly</span>
                          <span className="text-gray-400">Reserved</span>
                        </div>
                        <div className="relative w-full bg-gray-700 rounded-full h-3">
                          <div 
                            className="absolute bg-cyan-400 h-3 rounded-full transition-all" 
                            style={{ width: `${(oc.sociability / 10) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                  {oc.communication_style && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <i className="fas fa-comments text-cyan-400"></i>
                          <span className="text-sm font-medium">Communication Style</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-400">{oc.communication_style}/10</span>
                      </div>
                      <div className="relative">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">Polite</span>
                          <span className="text-gray-400">Blunt</span>
                        </div>
                        <div className="relative w-full bg-gray-700 rounded-full h-3">
                          <div 
                            className="absolute bg-cyan-400 h-3 rounded-full transition-all" 
                            style={{ width: `${(oc.communication_style / 10) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                  {oc.judgment && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <i className="fas fa-brain text-cyan-400"></i>
                          <span className="text-sm font-medium">Judgment</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-400">{oc.judgment}/10</span>
                      </div>
                      <div className="relative">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">Clever</span>
                          <span className="text-gray-400">Impulsive</span>
                        </div>
                        <div className="relative w-full bg-gray-700 rounded-full h-3">
                          <div 
                            className="absolute bg-cyan-400 h-3 rounded-full transition-all" 
                            style={{ width: `${(oc.judgment / 10) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                  {oc.emotional_resilience && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <i className="fas fa-shield-alt text-cyan-400"></i>
                          <span className="text-sm font-medium">Emotional Resilience</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-400">{oc.emotional_resilience}/10</span>
                      </div>
                      <div className="relative">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">Sensitive</span>
                          <span className="text-gray-400">Hardened</span>
                        </div>
                        <div className="relative w-full bg-gray-700 rounded-full h-3">
                          <div 
                            className="absolute bg-cyan-400 h-3 rounded-full transition-all" 
                            style={{ width: `${(oc.emotional_resilience / 10) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                  {oc.courage && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <i className="fas fa-shield text-cyan-400"></i>
                          <span className="text-sm font-medium">Courage</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-400">{oc.courage}/10</span>
                      </div>
                      <div className="relative">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">Bold</span>
                          <span className="text-gray-400">Hesitant</span>
                        </div>
                        <div className="relative w-full bg-gray-700 rounded-full h-3">
                          <div 
                            className="absolute bg-cyan-400 h-3 rounded-full transition-all" 
                            style={{ width: `${(oc.courage / 10) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                  {oc.risk_behavior && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <i className="fas fa-exclamation-triangle text-cyan-400"></i>
                          <span className="text-sm font-medium">Risk Behavior</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-400">{oc.risk_behavior}/10</span>
                      </div>
                      <div className="relative">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">Careful</span>
                          <span className="text-gray-400">Reckless</span>
                        </div>
                        <div className="relative w-full bg-gray-700 rounded-full h-3">
                          <div 
                            className="absolute bg-cyan-400 h-3 rounded-full transition-all" 
                            style={{ width: `${(oc.risk_behavior / 10) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                  {oc.honesty && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <i className="fas fa-handshake text-cyan-400"></i>
                          <span className="text-sm font-medium">Honesty</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-400">{oc.honesty}/10</span>
                      </div>
                      <div className="relative">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">Sincere</span>
                          <span className="text-gray-400">Deceptive</span>
                        </div>
                        <div className="relative w-full bg-gray-700 rounded-full h-3">
                          <div 
                            className="absolute bg-cyan-400 h-3 rounded-full transition-all" 
                            style={{ width: `${(oc.honesty / 10) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                  {oc.discipline && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <i className="fas fa-tasks text-cyan-400"></i>
                          <span className="text-sm font-medium">Discipline</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-400">{oc.discipline}/10</span>
                      </div>
                      <div className="relative">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">Diligent</span>
                          <span className="text-gray-400">Neglectful</span>
                        </div>
                        <div className="relative w-full bg-gray-700 rounded-full h-3">
                          <div 
                            className="absolute bg-cyan-400 h-3 rounded-full transition-all" 
                            style={{ width: `${(oc.discipline / 10) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                  {oc.temperament && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <i className="fas fa-peace text-cyan-400"></i>
                          <span className="text-sm font-medium">Temperament</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-400">{oc.temperament}/10</span>
                      </div>
                      <div className="relative">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">Calm</span>
                          <span className="text-gray-400">Volatile</span>
                        </div>
                        <div className="relative w-full bg-gray-700 rounded-full h-3">
                          <div 
                            className="absolute bg-cyan-400 h-3 rounded-full transition-all" 
                            style={{ width: `${(oc.temperament / 10) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                  {oc.humor && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <i className="fas fa-smile text-cyan-400"></i>
                          <span className="text-sm font-medium">Humor</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-400">{oc.humor}/10</span>
                      </div>
                      <div className="relative">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">Lighthearted</span>
                          <span className="text-gray-400">Serious</span>
                        </div>
                        <div className="relative w-full bg-gray-700 rounded-full h-3">
                          <div 
                            className="absolute bg-cyan-400 h-3 rounded-full transition-all" 
                            style={{ width: `${(oc.humor / 10) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Relationships Section */}
            {(() => {
              // Helper to parse relationship data (handles both old string format and new JSON array format)
              const parseRelationships = (value: string | null | undefined): Array<{ name: string; relationship?: string; description?: string; oc_id?: string; oc_slug?: string; relationship_type?: string; image_url?: string }> => {
                if (!value) return [];
                try {
                  const parsed = JSON.parse(value);
                  if (Array.isArray(parsed)) {
                    return parsed.filter(item => item && item.name);
                  }
                } catch {
                  // Not JSON, treat as old string format - return empty array
                  return [];
                }
                return [];
              };

              const family = parseRelationships(oc.family);
              const friendsAllies = parseRelationships(oc.friends_allies);
              const rivalsEnemies = parseRelationships(oc.rivals_enemies);
              const romantic = parseRelationships(oc.romantic);
              const otherRelationships = parseRelationships(oc.other_relationships);

              const hasRelationships = family.length > 0 || friendsAllies.length > 0 || rivalsEnemies.length > 0 || 
                                      romantic.length > 0 || otherRelationships.length > 0 ||
                                      (oc.family && !family.length) || (oc.friends_allies && !friendsAllies.length) ||
                                      (oc.rivals_enemies && !rivalsEnemies.length) || (oc.romantic && !romantic.length) ||
                                      (oc.other_relationships && !otherRelationships.length);

              if (!hasRelationships) return null;

              return (
                <div className="wiki-card p-6 md:p-8" suppressHydrationWarning>
                  <h2 id="relationships" className="wiki-section-header scroll-mt-20" suppressHydrationWarning>
                    <i className="fas fa-users text-blue-400" aria-hidden="true" suppressHydrationWarning></i>
                    Relationships
                  </h2>
                  <div className="space-y-6 text-gray-300">
                    {family.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-200 mb-3 flex items-center gap-2">
                          <i className="fas fa-users text-blue-400"></i>
                          Family
                        </h3>
                        <div className="space-y-4">
                          {family.map((entry, index) => {
                            const relTypeConfig = getRelationshipTypeConfig(entry.relationship_type);
                            return (
                            <div key={index} className="group p-5 bg-gradient-to-br from-gray-800/40 to-gray-800/20 rounded-xl border border-gray-700/60 hover:border-blue-500/40 transition-all duration-300 shadow-md hover:shadow-lg">
                              <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                                    {entry.image_url && (
                                      <div className="flex-shrink-0 w-[100px] h-[100px] rounded-full overflow-hidden border-2 border-gray-600/50">
                                        <Image
                                          src={convertGoogleDriveUrl(entry.image_url)}
                                          alt={entry.name}
                                          width={100}
                                          height={100}
                                          className="w-full h-full object-cover"
                                          unoptimized
                                        />
                                      </div>
                                    )}
                                    <i className={`${relTypeConfig.icon} text-lg`} style={{ color: relTypeConfig.color }} aria-hidden="true" suppressHydrationWarning></i>
                                    <h4 className="font-bold text-blue-300 text-xl group-hover:text-blue-200 transition-colors">
                                      {entry.oc_slug ? (
                                        <Link 
                                          href={`/ocs/${entry.oc_slug}`}
                                          prefetch={true}
                                          className="hover:text-blue-200 transition-colors flex items-center gap-2"
                                          suppressHydrationWarning
                                        >
                                          {entry.name}
                                          <i className="fas fa-external-link-alt text-xs opacity-70" suppressHydrationWarning></i>
                                        </Link>
                                      ) : (
                                        entry.name
                                      )}
                                    </h4>
                                    {entry.relationship && (
                                      <span className="px-3 py-1 bg-blue-600/30 text-blue-300 rounded-full text-xs font-medium border border-blue-500/30 whitespace-nowrap">
                                        {entry.relationship}
                                      </span>
                                    )}
                                    {entry.relationship_type && (
                                      <span 
                                        className="px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap"
                                        style={{ 
                                          backgroundColor: relTypeConfig.bgColor,
                                          color: relTypeConfig.color,
                                          borderColor: relTypeConfig.borderColor
                                        }}
                                      >
                                        {relTypeConfig.label}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {entry.description && (
                                <div className="mt-3 pt-3 border-t border-gray-700/50">
                                  <div className="prose prose-sm max-w-none text-gray-300 leading-relaxed">
                                    <Markdown content={entry.description} />
                                  </div>
                                </div>
                              )}
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {friendsAllies.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-200 mb-3 flex items-center gap-2">
                          <i className="fas fa-handshake text-green-400"></i>
                          Friends & Allies
                        </h3>
                        <div className="space-y-4">
                          {friendsAllies.map((entry, index) => {
                            const relTypeConfig = getRelationshipTypeConfig(entry.relationship_type);
                            return (
                            <div key={index} className="group p-5 bg-gradient-to-br from-gray-800/40 to-gray-800/20 rounded-xl border border-gray-700/60 hover:border-green-500/40 transition-all duration-300 shadow-md hover:shadow-lg">
                              <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                                    {entry.image_url && (
                                      <div className="flex-shrink-0 w-[100px] h-[100px] rounded-full overflow-hidden border-2 border-gray-600/50">
                                        <Image
                                          src={convertGoogleDriveUrl(entry.image_url)}
                                          alt={entry.name}
                                          width={100}
                                          height={100}
                                          className="w-full h-full object-cover"
                                          unoptimized
                                        />
                                      </div>
                                    )}
                                    <i className={`${relTypeConfig.icon} text-lg`} style={{ color: relTypeConfig.color }} aria-hidden="true" suppressHydrationWarning></i>
                                    <h4 className="font-bold text-green-300 text-xl group-hover:text-green-200 transition-colors">
                                      {entry.oc_slug ? (
                                        <Link 
                                          href={`/ocs/${entry.oc_slug}`}
                                          className="hover:text-green-200 transition-colors flex items-center gap-2"
                                          suppressHydrationWarning
                                        >
                                          {entry.name}
                                          <i className="fas fa-external-link-alt text-xs opacity-70" suppressHydrationWarning></i>
                                        </Link>
                                      ) : (
                                        entry.name
                                      )}
                                    </h4>
                                    {entry.relationship && (
                                      <span className="px-3 py-1 bg-green-600/30 text-green-300 rounded-full text-xs font-medium border border-green-500/30 whitespace-nowrap">
                                        {entry.relationship}
                                      </span>
                                    )}
                                    {entry.relationship_type && (
                                      <span 
                                        className="px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap"
                                        style={{ 
                                          backgroundColor: relTypeConfig.bgColor,
                                          color: relTypeConfig.color,
                                          borderColor: relTypeConfig.borderColor
                                        }}
                                      >
                                        {relTypeConfig.label}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {entry.description && (
                                <div className="mt-3 pt-3 border-t border-gray-700/50">
                                  <div className="prose prose-sm max-w-none text-gray-300 leading-relaxed">
                                    <Markdown content={entry.description} />
                                  </div>
                                </div>
                              )}
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {rivalsEnemies.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-200 mb-3 flex items-center gap-2">
                          <i className="fas fa-sword text-red-400"></i>
                          Rivals & Enemies
                        </h3>
                        <div className="space-y-4">
                          {rivalsEnemies.map((entry, index) => {
                            const relTypeConfig = getRelationshipTypeConfig(entry.relationship_type);
                            return (
                            <div key={index} className="group p-5 bg-gradient-to-br from-gray-800/40 to-gray-800/20 rounded-xl border border-gray-700/60 hover:border-red-500/40 transition-all duration-300 shadow-md hover:shadow-lg">
                              <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                                    {entry.image_url && (
                                      <div className="flex-shrink-0 w-[100px] h-[100px] rounded-full overflow-hidden border-2 border-gray-600/50">
                                        <Image
                                          src={convertGoogleDriveUrl(entry.image_url)}
                                          alt={entry.name}
                                          width={100}
                                          height={100}
                                          className="w-full h-full object-cover"
                                          unoptimized
                                        />
                                      </div>
                                    )}
                                    <i className={`${relTypeConfig.icon} text-lg`} style={{ color: relTypeConfig.color }} aria-hidden="true" suppressHydrationWarning></i>
                                    <h4 className="font-bold text-red-300 text-xl group-hover:text-red-200 transition-colors">
                                      {entry.oc_slug ? (
                                        <Link 
                                          href={`/ocs/${entry.oc_slug}`}
                                          className="hover:text-red-200 transition-colors flex items-center gap-2"
                                          suppressHydrationWarning
                                        >
                                          {entry.name}
                                          <i className="fas fa-external-link-alt text-xs opacity-70" suppressHydrationWarning></i>
                                        </Link>
                                      ) : (
                                        entry.name
                                      )}
                                    </h4>
                                    {entry.relationship && (
                                      <span className="px-3 py-1 bg-red-600/30 text-red-300 rounded-full text-xs font-medium border border-red-500/30 whitespace-nowrap">
                                        {entry.relationship}
                                      </span>
                                    )}
                                    {entry.relationship_type && (
                                      <span 
                                        className="px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap"
                                        style={{ 
                                          backgroundColor: relTypeConfig.bgColor,
                                          color: relTypeConfig.color,
                                          borderColor: relTypeConfig.borderColor
                                        }}
                                      >
                                        {relTypeConfig.label}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {entry.description && (
                                <div className="mt-3 pt-3 border-t border-gray-700/50">
                                  <div className="prose prose-sm max-w-none text-gray-300 leading-relaxed">
                                    <Markdown content={entry.description} />
                                  </div>
                                </div>
                              )}
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {romantic.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-200 mb-3 flex items-center gap-2">
                          <i className="fas fa-heart text-pink-400"></i>
                          Romantic
                        </h3>
                        <div className="space-y-4">
                          {romantic.map((entry, index) => {
                            const relTypeConfig = getRelationshipTypeConfig(entry.relationship_type);
                            return (
                            <div key={index} className="group p-5 bg-gradient-to-br from-gray-800/40 to-gray-800/20 rounded-xl border border-gray-700/60 hover:border-pink-500/40 transition-all duration-300 shadow-md hover:shadow-lg">
                              <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                                    {entry.image_url && (
                                      <div className="flex-shrink-0 w-[100px] h-[100px] rounded-full overflow-hidden border-2 border-gray-600/50">
                                        <Image
                                          src={convertGoogleDriveUrl(entry.image_url)}
                                          alt={entry.name}
                                          width={100}
                                          height={100}
                                          className="w-full h-full object-cover"
                                          unoptimized
                                        />
                                      </div>
                                    )}
                                    <i className={`${relTypeConfig.icon} text-lg`} style={{ color: relTypeConfig.color }} aria-hidden="true" suppressHydrationWarning></i>
                                    <h4 className="font-bold text-pink-300 text-xl group-hover:text-pink-200 transition-colors">
                                      {entry.oc_slug ? (
                                        <Link 
                                          href={`/ocs/${entry.oc_slug}`}
                                          className="hover:text-pink-200 transition-colors flex items-center gap-2"
                                          suppressHydrationWarning
                                        >
                                          {entry.name}
                                          <i className="fas fa-external-link-alt text-xs opacity-70" suppressHydrationWarning></i>
                                        </Link>
                                      ) : (
                                        entry.name
                                      )}
                                    </h4>
                                    {entry.relationship && (
                                      <span className="px-3 py-1 bg-pink-600/30 text-pink-300 rounded-full text-xs font-medium border border-pink-500/30 whitespace-nowrap">
                                        {entry.relationship}
                                      </span>
                                    )}
                                    {entry.relationship_type && (
                                      <span 
                                        className="px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap"
                                        style={{ 
                                          backgroundColor: relTypeConfig.bgColor,
                                          color: relTypeConfig.color,
                                          borderColor: relTypeConfig.borderColor
                                        }}
                                      >
                                        {relTypeConfig.label}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {entry.description && (
                                <div className="mt-3 pt-3 border-t border-gray-700/50">
                                  <div className="prose prose-sm max-w-none text-gray-300 leading-relaxed">
                                    <Markdown content={entry.description} />
                                  </div>
                                </div>
                              )}
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {otherRelationships.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-200 mb-3 flex items-center gap-2">
                          <i className="fas fa-user-friends text-blue-400"></i>
                          Other Relationships
                        </h3>
                        <div className="space-y-4">
                          {otherRelationships.map((entry, index) => {
                            const relTypeConfig = getRelationshipTypeConfig(entry.relationship_type);
                            return (
                            <div key={index} className="group p-5 bg-gradient-to-br from-gray-800/40 to-gray-800/20 rounded-xl border border-gray-700/60 hover:border-blue-500/40 transition-all duration-300 shadow-md hover:shadow-lg">
                              <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                                    {entry.image_url && (
                                      <div className="flex-shrink-0 w-[100px] h-[100px] rounded-full overflow-hidden border-2 border-gray-600/50">
                                        <Image
                                          src={convertGoogleDriveUrl(entry.image_url)}
                                          alt={entry.name}
                                          width={100}
                                          height={100}
                                          className="w-full h-full object-cover"
                                          unoptimized
                                        />
                                      </div>
                                    )}
                                    <i className={`${relTypeConfig.icon} text-lg`} style={{ color: relTypeConfig.color }} aria-hidden="true" suppressHydrationWarning></i>
                                    <h4 className="font-bold text-blue-300 text-xl group-hover:text-blue-200 transition-colors">
                                      {entry.oc_slug ? (
                                        <Link 
                                          href={`/ocs/${entry.oc_slug}`}
                                          prefetch={true}
                                          className="hover:text-blue-200 transition-colors flex items-center gap-2"
                                          suppressHydrationWarning
                                        >
                                          {entry.name}
                                          <i className="fas fa-external-link-alt text-xs opacity-70" suppressHydrationWarning></i>
                                        </Link>
                                      ) : (
                                        entry.name
                                      )}
                                    </h4>
                                    {entry.relationship && (
                                      <span className="px-3 py-1 bg-blue-600/30 text-blue-300 rounded-full text-xs font-medium border border-blue-500/30 whitespace-nowrap">
                                        {entry.relationship}
                                      </span>
                                    )}
                                    {entry.relationship_type && (
                                      <span 
                                        className="px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap"
                                        style={{ 
                                          backgroundColor: relTypeConfig.bgColor,
                                          color: relTypeConfig.color,
                                          borderColor: relTypeConfig.borderColor
                                        }}
                                      >
                                        {relTypeConfig.label}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {entry.description && (
                                <div className="mt-3 pt-3 border-t border-gray-700/50">
                                  <div className="prose prose-sm max-w-none text-gray-300 leading-relaxed">
                                    <Markdown content={entry.description} />
                                  </div>
                                </div>
                              )}
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {/* Fallback for old string format */}
                    {(!family.length && oc.family) && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-200 mb-2 flex items-center gap-2">
                          <i className="fas fa-users text-blue-400"></i>
                          Family
                        </h3>
                        <div className="prose max-w-none">
                          <Markdown content={oc.family} />
                        </div>
                      </div>
                    )}
                    {(!friendsAllies.length && oc.friends_allies) && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-200 mb-2 flex items-center gap-2">
                          <i className="fas fa-handshake text-green-400"></i>
                          Friends & Allies
                        </h3>
                        <div className="prose max-w-none">
                          <Markdown content={oc.friends_allies} />
                        </div>
                      </div>
                    )}
                    {(!rivalsEnemies.length && oc.rivals_enemies) && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-200 mb-2 flex items-center gap-2">
                          <i className="fas fa-sword text-red-400"></i>
                          Rivals & Enemies
                        </h3>
                        <div className="prose max-w-none">
                          <Markdown content={oc.rivals_enemies} />
                        </div>
                      </div>
                    )}
                    {(!romantic.length && oc.romantic) && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-200 mb-2 flex items-center gap-2">
                          <i className="fas fa-heart text-pink-400"></i>
                          Romantic
                        </h3>
                        <div className="prose max-w-none">
                          <Markdown content={oc.romantic} />
                        </div>
                      </div>
                    )}
                    {(!otherRelationships.length && oc.other_relationships) && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-200 mb-2 flex items-center gap-2">
                          <i className="fas fa-user-friends text-blue-400"></i>
                          Other Relationships
                        </h3>
                        <div className="prose max-w-none">
                          <Markdown content={oc.other_relationships} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* History Section */}
            {(oc.origin || oc.formative_years || oc.major_life_events) && (
            <div className="wiki-card p-4 md:p-6 lg:p-8" suppressHydrationWarning>
                <h2 id="history" className="wiki-section-header scroll-mt-20">
                <i className="fas fa-history text-amber-400" aria-hidden="true" suppressHydrationWarning></i>
                History
              </h2>
                <div className="space-y-4 text-gray-300 prose max-w-none">
                  {oc.origin && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-200 mb-2 flex items-center gap-2">
                        <i className="fas fa-seedling text-amber-400"></i>
                        Origin
                      </h3>
                      <Markdown content={oc.origin} />
                    </div>
                  )}
                  {oc.formative_years && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-200 mb-2 flex items-center gap-2">
                        <i className="fas fa-child text-amber-400"></i>
                        Formative Years
                      </h3>
                      <Markdown content={oc.formative_years} />
                    </div>
                  )}
                  {oc.major_life_events && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-200 mb-2 flex items-center gap-2">
                        <i className="fas fa-calendar-check text-amber-400"></i>
                        Major Life Events
                      </h3>
                      <Markdown content={oc.major_life_events} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Story Snippets Section - After History for content-related snippets */}
            {validStorySnippets.length > 0 && (
              <div className="wiki-card p-4 md:p-6 lg:p-8" suppressHydrationWarning>
                <h2 id="story-snippets" className="wiki-section-header scroll-mt-20" suppressHydrationWarning>
                  <i className="fas fa-book-open text-purple-400" aria-hidden="true" suppressHydrationWarning></i>
                  Story Snippets
                </h2>
                <div className="mt-4">
                  <StorySnippets snippets={validStorySnippets} showTitle={false} />
                </div>
              </div>
            )}

            {/* Preferences & Habits Section */}
            {(oc.likes || oc.dislikes) && (
              <div className="wiki-card p-4 md:p-6 lg:p-8" suppressHydrationWarning>
                <h2 id="preferences" className="wiki-section-header scroll-mt-20" suppressHydrationWarning>
                  <i className="fas fa-heart text-red-400" aria-hidden="true" suppressHydrationWarning></i>
                  Preferences & Habits
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-300 prose max-w-none">
                  {oc.likes && (() => {
                    const likesText = oc.likes.trim();
                    const hasCommas = likesText.includes(',');
                    const items = hasCommas ? likesText.split(',').map((item: string) => item.trim()).filter(Boolean) : null;
                    
                    return (
                      <div>
                        <h3 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
                          <i className="fas fa-heart text-green-400"></i>
                          Likes
                        </h3>
                        {items ? (
                          <ul className="space-y-2 list-none pl-0">
                            {items.map((item: string, index: number) => (
                              <li key={index} className="flex items-start gap-3 text-gray-300 leading-relaxed">
                                <span className="text-green-400 mt-1.5 flex-shrink-0">
                                  <i className="fas fa-circle text-xs" aria-hidden="true"></i>
                                </span>
                                <span className="flex-1">{item}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <Markdown content={likesText} />
                        )}
                      </div>
                    );
                  })()}
                  {oc.dislikes && (() => {
                    const dislikesText = oc.dislikes.trim();
                    const hasCommas = dislikesText.includes(',');
                    const items = hasCommas ? dislikesText.split(',').map((item: string) => item.trim()).filter(Boolean) : null;
                    
                    return (
                      <div>
                        <h3 className="text-lg font-semibold text-red-400 mb-3 flex items-center gap-2">
                          <i className="fas fa-heart-broken text-red-400"></i>
                          Dislikes
                        </h3>
                        {items ? (
                          <ul className="space-y-2 list-none pl-0">
                            {items.map((item: string, index: number) => (
                              <li key={index} className="flex items-start gap-3 text-gray-300 leading-relaxed">
                                <span className="text-red-400 mt-1.5 flex-shrink-0">
                                  <i className="fas fa-circle text-xs" aria-hidden="true"></i>
                                </span>
                                <span className="flex-1">{item}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <Markdown content={dislikesText} />
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Media Section - Additional Fields */}
            {(oc.seiyuu || oc.voice_actor || oc.theme_song || oc.pinterest_board || oc.inspirations || oc.design_notes || oc.name_meaning_etymology || oc.creator_notes) && (
              <div className="wiki-card p-4 md:p-6 lg:p-8" suppressHydrationWarning>
                <h2 id="media" className="wiki-section-header scroll-mt-20">
                  <i className="fas fa-film text-purple-400"></i>
                  Media & Additional Information
                </h2>
                <div className="space-y-4 text-gray-300 prose max-w-none">
                  <div className="grid grid-cols-2 gap-4">
                    {oc.seiyuu && (
                      <div className="flex items-center gap-2">
                        <i className="fas fa-microphone text-purple-400 flex-shrink-0"></i>
                        <div>
                          <span className="font-semibold text-gray-200">Seiyuu: </span>
                          <span>{oc.seiyuu}</span>
                        </div>
                      </div>
                    )}
                    {oc.voice_actor && (
                      <div className="flex items-center gap-2">
                        <i className="fas fa-microphone-alt text-purple-400 flex-shrink-0"></i>
                        <div>
                          <span className="font-semibold text-gray-200">Voice Actor: </span>
                          <span>{oc.voice_actor}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  {oc.theme_song && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-200 mb-2 flex items-center gap-2">
                        <i className="fas fa-music text-purple-400"></i>
                        Theme Song
                      </h3>
                      {oc.theme_song.startsWith('http') ? (
                        <>
                          {oc.theme_song.includes('spotify.com') ? (
                            <>
                              <a href={oc.theme_song} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline flex items-center gap-2 mb-2">
                                <i className="fab fa-spotify text-sm"></i>
                                Open in Spotify
                              </a>
                              <SpotifyEmbed url={oc.theme_song} />
                            </>
                          ) : (
                            <a href={oc.theme_song} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline flex items-center gap-2">
                              <i className="fas fa-external-link-alt text-sm"></i>
                              {oc.theme_song}
                            </a>
                          )}
                        </>
                      ) : (
                        <span>{oc.theme_song}</span>
                      )}
                    </div>
                  )}
                  {oc.pinterest_board && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-200 mb-2 flex items-center gap-2">
                        <i className="fab fa-pinterest text-red-500"></i>
                        Pinterest Board
                      </h3>
                      {oc.pinterest_board.startsWith('http') ? (
                        <a href={oc.pinterest_board} target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline flex items-center gap-2">
                          <i className="fab fa-pinterest text-sm"></i>
                          View Pinterest Board
                        </a>
                      ) : (
                        <span>{oc.pinterest_board}</span>
                      )}
                    </div>
                  )}
                  {oc.inspirations && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-200 mb-2 flex items-center gap-2">
                        <i className="fas fa-lightbulb text-yellow-400"></i>
                        Inspirations
                      </h3>
                      <Markdown content={oc.inspirations} />
                    </div>
                  )}
                  {oc.design_notes && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-200 mb-2 flex items-center gap-2">
                        <i className="fas fa-drafting-compass text-purple-400"></i>
                        Design Notes
                      </h3>
                      <Markdown content={oc.design_notes} />
                    </div>
                  )}
                  {oc.name_meaning_etymology && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-200 mb-2 flex items-center gap-2">
                        <i className="fas fa-book-open text-purple-400"></i>
                        Name Meaning / Etymology
                      </h3>
                      <Markdown content={oc.name_meaning_etymology} />
                    </div>
                  )}
                  {oc.creator_notes && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-200 mb-2 flex items-center gap-2">
                        <i className="fas fa-sticky-note text-purple-400"></i>
                        Creator Notes
                      </h3>
                      <Markdown content={oc.creator_notes} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Trivia Section */}
            {oc.trivia && (
            <div className="wiki-card p-4 md:p-6 lg:p-8" suppressHydrationWarning>
              <h2 id="trivia" className="wiki-section-header scroll-mt-20" suppressHydrationWarning>
                <i className="fas fa-star text-yellow-400" aria-hidden="true" suppressHydrationWarning></i>
                Trivia
              </h2>
                <div className="text-gray-300 prose max-w-none">
                  <Markdown content={oc.trivia} />
                </div>
              </div>
            )}

            {/* Development Log Section - After Trivia/Development section */}
            {developmentLog && developmentLog.length > 0 && (
              <div className="wiki-card p-4 md:p-6 lg:p-8" suppressHydrationWarning>
                <h2 id="development-log" className="wiki-section-header scroll-mt-20" suppressHydrationWarning>
                  <i className="fas fa-history text-purple-400" aria-hidden="true" suppressHydrationWarning></i>
                  Development Log
                </h2>
                <DevelopmentLog entries={developmentLog} showTitle={false} />
              </div>
            )}

            {/* Writing Prompt Responses Section */}
            {writingPromptResponses && writingPromptResponses.length > 0 && (
              <div className="wiki-card p-4 md:p-6 lg:p-8" suppressHydrationWarning>
                <h2 id="writing-prompts" className="wiki-section-header scroll-mt-20" suppressHydrationWarning>
                  <i className="fas fa-pen-fancy text-purple-400" aria-hidden="true" suppressHydrationWarning></i>
                  Writing Prompt Responses
                </h2>
                <WritingPromptResponses responses={writingPromptResponses} showTitle={false} />
              </div>
            )}

            {/* Modular Fields Section - World-specific fields (only uncategorized or unrecognized category fields) */}
            {(() => {
              // Categories that have dedicated sections - exclude these from World-Specific Information
              const recognizedCategories = [
                'Core Identity', 'Overview', 'Identity Background', 'Appearance',
                'Personality Overview', 'Personality Metrics', 'Personality Traits',
                'Abilities', 'Stats', 'Relationships', 'History', 'Preferences & Habits',
                'Media', 'Trivia', 'Development', 'Settings'
              ];
              
              // Get fields that don't have a recognized category
              const uncategorizedFields = fieldDefinitions.filter(field => {
                const category = field.description || '';
                return !recognizedCategories.includes(category);
              });
              
              const hasUncategorizedFields = uncategorizedFields.length > 0 && 
                uncategorizedFields.some(field => {
                  const value = getFieldValue(field, typedOc.modular_fields);
                  return value !== null && value !== undefined && value !== '' && 
                    (Array.isArray(value) ? value.length > 0 : true);
                });
              
              if (!hasUncategorizedFields) return null;
              
              return (
                <div className="wiki-card p-4 md:p-6 lg:p-8" suppressHydrationWarning>
                  <h2 id="world-specific" className="wiki-section-header scroll-mt-20">
                    <i className="fas fa-cog text-cyan-400"></i>
                    World-Specific Information
                  </h2>
                  <div className="space-y-4 text-gray-300">
                    {uncategorizedFields.map((field) => {
                      const value = getFieldValue(field, typedOc.modular_fields);
                      if (value === null || value === undefined || value === '' || 
                          (Array.isArray(value) && value.length === 0)) {
                        return null;
                      }
                      
                      return (
                        <div key={field.key}>
                          <h3 className="text-lg font-semibold text-gray-200 mb-2">{field.label}</h3>
                          {field.type === 'array' && Array.isArray(value) ? (
                            <TagList tags={value} />
                          ) : field.type === 'number' ? (
                            <span>{value}</span>
                          ) : (
                            <div className="prose max-w-none">
                              <Markdown content={String(value)} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Other Versions Section - Show if part of multi-fandom identity */}
            {oc.identity && (oc.identity as any).versions && (oc.identity as any).versions.length > 1 && (
              <div className="wiki-card p-4 md:p-6 lg:p-8" suppressHydrationWarning>
                <h2 id="other-versions" className="wiki-section-header scroll-mt-20" suppressHydrationWarning>
                  <i className="fas fa-globe text-blue-400" aria-hidden="true" suppressHydrationWarning></i>
                  Other Versions
                </h2>
                <p className="text-gray-300 mb-4">
                  This character appears in multiple fandoms. View other versions:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {((oc.identity as any).versions as any[])
                    .filter((version: any) => version.id !== oc.id && version.is_public)
                    .map((version: any) => (
                      <Link
                        key={version.id}
                        href={`/ocs/${version.slug}`}
                        prefetch={true}
                        className="p-4 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/50 rounded-lg transition-colors"
                      >
                        <div className="font-semibold text-gray-200 mb-1">{version.name}</div>
                        <div className="text-sm text-gray-400">
                          {version.world ? (version.world as any).name : 'Unknown World'}
                        </div>
                      </Link>
                    ))}
                </div>
              </div>
            )}

            {/* Gallery Section */}
            {oc.gallery && oc.gallery.length > 0 && (
              <div className="wiki-card p-4 md:p-6 lg:p-8" suppressHydrationWarning>
                <h2 id="gallery" className="wiki-section-header scroll-mt-20" suppressHydrationWarning>
                  <i className="fas fa-images text-purple-400" aria-hidden="true" suppressHydrationWarning></i>
                  Gallery
                </h2>
                <OCGallery images={oc.gallery} ocName={oc.name} />
            </div>
            )}
          </div>
        </div>
      </OCPageLayout>
      <BackToTopButton />
    </div>
  );
}

