import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { OCInfobox } from '@/components/oc/OCInfobox';
import { OCPageLayout } from '@/components/oc/OCPageLayout';
import { TableOfContents } from '@/components/oc/TableOfContents';
import { OCGallery } from '@/components/oc/OCGallery';
import { BackToTopButton } from '@/components/oc/BackToTopButton';
import { Markdown } from '@/lib/utils/markdown';
import { getEffectiveFieldDefinitions, getFieldValue } from '@/lib/fields/worldFields';
import type { WorldFieldDefinition } from '@/types/oc';
import { TagList } from '@/components/wiki/TagList';
import { convertGoogleDriveUrl } from '@/lib/utils/googleDriveImage';
import { extractColorHex, extractColorName, getColorHex } from '@/lib/utils/colorHexUtils';
import { SpotifyEmbed } from '@/components/oc/SpotifyEmbed';
import { formatHeightWithMetric, formatWeightWithMetric } from '@/lib/utils/unitConversion';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const supabase = await createClient();
  const resolvedParams = await params;

  const { data: oc } = await supabase
    .from('ocs')
    .select('name, slug, history_summary, image_url, world:worlds(name, slug)')
    .eq('slug', resolvedParams.slug)
    .eq('is_public', true)
    .single();

  if (!oc) {
    return {
      title: 'Character Not Found',
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ruutulian.com';
  const url = `${baseUrl}/ocs/${resolvedParams.slug}`;
  // Use history_summary for description, clean up markdown syntax
  const descriptionText = oc.history_summary || '';
  const description = descriptionText
    ? descriptionText.substring(0, 155).replace(/\n/g, ' ').replace(/[#*`]/g, '').trim() + (descriptionText.length > 155 ? '...' : '')
    : `${oc.name}${oc.world ? ` from ${(oc.world as any).name}` : ''} - Original Character on Ruutulian`;
  const world = oc.world as any;

  return {
    title: oc.name,
    description,
    keywords: [
      oc.name,
      'original character',
      'OC',
      world?.name || '',
      'character wiki',
      'fictional character',
    ].filter(Boolean),
    openGraph: {
      title: `${oc.name} | Ruutulian`,
      description,
      url,
      type: 'profile',
      images: oc.image_url
        ? [
            {
              url: oc.image_url,
              alt: oc.name,
              width: 1200,
              height: 630,
            },
          ]
        : [
            {
              url: `${baseUrl}/icon.png`,
              width: 512,
              height: 512,
              alt: oc.name,
            },
          ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${oc.name} | Ruutulian`,
      description,
      images: oc.image_url ? [oc.image_url] : [`${baseUrl}/icon.png`],
    },
    alternates: {
      canonical: url,
    },
  };
}

export const revalidate = 300;

export default async function OCDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await params;

  const { data: oc } = await supabase
    .from('ocs')
    .select(`
      *,
      likes,
      dislikes,
      world:worlds(*),
      story_alias:story_aliases(id, name, slug, description),
      identity:oc_identities(
        *,
        versions:ocs(
          id,
          name,
          slug,
          world_id,
          is_public,
          world:worlds(id, name, slug)
        )
      )
    `)
    .eq('slug', resolvedParams.slug)
    .eq('is_public', true)
    .single();

  if (!oc) {
    notFound();
  }

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
  const fieldDefinitions = getEffectiveFieldDefinitions(oc.world, oc);
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
      const value = getFieldValue(field, oc.modular_fields);
      return value !== null && value !== undefined && value !== '' && 
        (Array.isArray(value) ? value.length > 0 : true);
    });
  };

  // Helper to render template fields for a category
  const renderCategoryFields = (category: string) => {
    const fields = fieldsByCategory.get(category) || [];
    const fieldsWithValues = fields.filter(field => {
      const value = getFieldValue(field, oc.modular_fields);
      return value !== null && value !== undefined && value !== '' && 
        (Array.isArray(value) ? value.length > 0 : true);
    });

    if (fieldsWithValues.length === 0) return null;

    return (
      <div className="space-y-3 mt-3">
        {fieldsWithValues.map((field) => {
          const value = getFieldValue(field, oc.modular_fields);
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
      <nav className="flex mb-6 text-sm text-gray-400" suppressHydrationWarning>
        <Link href="/" prefetch={true} className="hover:text-purple-400 transition-colors">
          Home
        </Link>
        <span className="mx-2 text-gray-500">/</span>
        <Link href="/ocs" prefetch={true} className="hover:text-purple-400 transition-colors">
          Characters
        </Link>
        <span className="mx-2 text-gray-500">/</span>
        <span>{oc.name}</span>
      </nav>

      <OCPageLayout oc={oc}>
        <div className="flex flex-col lg:flex-row gap-4 md:gap-6 lg:gap-8" suppressHydrationWarning>
          <div className="w-full lg:w-96 flex-shrink-0 lg:sticky lg:top-20 lg:self-start lg:h-fit" suppressHydrationWarning>
            <OCInfobox oc={oc} />
          </div>
          <div className="flex-1 space-y-4 md:space-y-6" suppressHydrationWarning>
            {/* Header - smaller, next to sidebar */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-800/80 via-gray-800/60 to-gray-900/80 p-3 md:p-4 lg:p-5 border border-gray-700/50 shadow-lg backdrop-blur-sm" suppressHydrationWarning>
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 pointer-events-none" suppressHydrationWarning></div>
              <div className="relative flex items-start gap-4" suppressHydrationWarning>
                {oc.world?.icon_url && (
                  <div className="relative w-12 h-12 md:w-14 md:h-14 flex-shrink-0 group">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative w-full h-full">
                      <Image
                        src={convertGoogleDriveUrl(oc.world.icon_url)}
                        alt={oc.world.name}
                        fill
                        sizes="(max-width: 768px) 48px, 56px"
                        className="object-contain rounded-lg bg-gray-800/70 p-1.5 border-2 border-gray-600/50 shadow-lg group-hover:border-purple-500/50 transition-all duration-300"
                        unoptimized={oc.world.icon_url?.includes('drive.google.com') || false}
                      />
                    </div>
                  </div>
                )}
                <div className="flex-1 min-w-0" suppressHydrationWarning>
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-100 mb-2 flex items-center gap-2 leading-tight" suppressHydrationWarning>
                    <i className="fas fa-user text-purple-400 text-xl md:text-2xl lg:text-3xl" aria-hidden="true" suppressHydrationWarning></i>
                    <span className="bg-gradient-to-r from-gray-100 via-gray-50 to-gray-200 bg-clip-text text-transparent">
                      {oc.name}
                    </span>
                  </h1>
                  {oc.world && (
                    <Link 
                      href={`/worlds/${oc.world.slug}`}
                      prefetch={true}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 transition-all duration-200 border border-blue-500/20 hover:border-blue-500/40 group/link backdrop-blur-sm text-sm"
                      suppressHydrationWarning
                    >
                      <i className="fas fa-globe text-xs group-hover/link:scale-110 transition-transform duration-200" aria-hidden="true" suppressHydrationWarning></i>
                      <span className="font-semibold">{oc.world.name}</span>
                      <i className="fas fa-arrow-right text-xs opacity-0 group-hover/link:opacity-100 group-hover/link:translate-x-1 transition-all duration-200" aria-hidden="true" suppressHydrationWarning></i>
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Alternative Versions Notice */}
            {oc.identity?.versions && oc.identity.versions.length > 1 && (() => {
              // Filter to get only alternative versions (public, different world, not current OC)
              const alternativeVersions = oc.identity.versions.filter(
                (version: any) => 
                  version.is_public && 
                  version.id !== oc.id && 
                  version.world_id !== oc.world_id &&
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
            <TableOfContents oc={oc} />

            {/* Overview Section */}
            {((oc.aliases || oc.affiliations || oc.romantic_orientation || oc.sexual_orientation || oc.story_alias || oc.species || oc.occupation || oc.development_status) || 
              hasCategoryFields('Core Identity') || hasCategoryFields('Overview')) && (
              <div className="wiki-card p-4 md:p-6 lg:p-8" suppressHydrationWarning>
                <h2 id="overview" className="wiki-section-header scroll-mt-20" suppressHydrationWarning>
                  <i className="fas fa-info-circle text-blue-400" aria-hidden="true" suppressHydrationWarning></i>
                  Overview
                </h2>
                <div className="space-y-4 text-gray-300">
                  {/* Story Alias - Special badge */}
                  {oc.story_alias && (
                    <div className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-lg border border-purple-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <i className="fas fa-bookmark text-purple-400" aria-hidden="true" suppressHydrationWarning></i>
                        <span className="font-semibold text-gray-200 text-sm uppercase tracking-wide">Story Alias</span>
                      </div>
                      <span className="px-3 py-1.5 text-sm font-medium bg-purple-600/30 text-purple-300 rounded-lg inline-block border border-purple-500/30">
                        {oc.story_alias.name}
                      </span>
                    </div>
                  )}
                  
                  {/* Core Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {oc.species && (
                      <div className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-lg border border-blue-500/20 hover:border-blue-500/40 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                          <i className="fas fa-dna text-blue-400"></i>
                          <span className="font-semibold text-gray-200">Species</span>
                        </div>
                        <div className="prose max-w-none">
                          <Markdown content={oc.species} />
                        </div>
                      </div>
                    )}
                    {oc.occupation && (
                      <div className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-lg border border-blue-500/20 hover:border-blue-500/40 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                          <i className="fas fa-briefcase text-blue-400" aria-hidden="true" suppressHydrationWarning></i>
                          <span className="font-semibold text-gray-200">Occupation</span>
                        </div>
                        <div className="prose max-w-none">
                          <Markdown content={oc.occupation} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Aliases */}
                  {oc.aliases && (
                    <div className="p-4 bg-gradient-to-br from-gray-700/30 to-gray-800/20 rounded-lg border border-gray-600/30">
                      <div className="flex items-center gap-2 mb-2">
                        <i className="fas fa-tag text-blue-400"></i>
                        <span className="font-semibold text-gray-200">Aliases</span>
                      </div>
                      <div className="prose max-w-none">
                        <Markdown content={oc.aliases} />
                      </div>
                    </div>
                  )}

                  {/* Affiliations */}
                  {oc.affiliations && (
                    <div className="p-4 bg-gradient-to-br from-gray-700/30 to-gray-800/20 rounded-lg border border-gray-600/30">
                      <div className="flex items-center gap-2 mb-2">
                        <i className="fas fa-users-cog text-blue-400" aria-hidden="true" suppressHydrationWarning></i>
                        <span className="font-semibold text-gray-200">Affiliations</span>
                      </div>
                      <div className="prose max-w-none mt-1">
                        <Markdown content={oc.affiliations} />
                      </div>
                    </div>
                  )}

                  {/* Orientation Cards */}
                  {(oc.romantic_orientation || oc.sexual_orientation) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {oc.romantic_orientation && (
                        <div className="p-4 bg-gradient-to-br from-red-500/10 to-pink-600/5 rounded-lg border border-red-500/20 hover:border-red-500/40 transition-colors">
                          <div className="flex items-center gap-2 mb-2">
                            <i className="fas fa-heart text-red-400"></i>
                            <span className="font-semibold text-gray-200">Romantic Orientation</span>
                          </div>
                          <div className="prose max-w-none">
                            <Markdown content={oc.romantic_orientation} />
                          </div>
                        </div>
                      )}
                      {oc.sexual_orientation && (
                        <div className="p-4 bg-gradient-to-br from-rose-500/10 to-rose-600/5 rounded-lg border border-rose-500/20 hover:border-rose-500/40 transition-colors">
                          <div className="flex items-center gap-2 mb-2">
                            <i className="fas fa-heart text-rose-400" aria-hidden="true" suppressHydrationWarning></i>
                            <span className="font-semibold text-gray-200">Sexual Orientation</span>
                          </div>
                          <div className="prose max-w-none">
                            <Markdown content={oc.sexual_orientation} />
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
                      const value = getFieldValue(field, oc.modular_fields);
                      return value !== null && value !== undefined && value !== '' && 
                        (Array.isArray(value) ? value.length > 0 : true);
                    });

                    if (fieldsWithValues.length === 0) return null;

                    return fieldsWithValues.map((field) => {
                      const value = getFieldValue(field, oc.modular_fields);
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
                          const hexCode = extractColorHex(oc.eye_color) || getColorHex('eye_color', colorName);
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
                          const hexCode = extractColorHex(oc.hair_color) || getColorHex('hair_color', colorName);
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
                          const hexCode = extractColorHex(oc.skin_tone) || getColorHex('skin_tone', colorName);
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
              const parseRelationships = (value: string | null | undefined): Array<{ name: string; relationship?: string; description?: string; oc_id?: string; oc_slug?: string }> => {
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
                          {family.map((entry, index) => (
                            <div key={index} className="group p-5 bg-gradient-to-br from-gray-800/40 to-gray-800/20 rounded-xl border border-gray-700/60 hover:border-blue-500/40 transition-all duration-300 shadow-md hover:shadow-lg">
                              <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-2">
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
                          ))}
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
                          {friendsAllies.map((entry, index) => (
                            <div key={index} className="group p-5 bg-gradient-to-br from-gray-800/40 to-gray-800/20 rounded-xl border border-gray-700/60 hover:border-green-500/40 transition-all duration-300 shadow-md hover:shadow-lg">
                              <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-2">
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
                          ))}
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
                          {rivalsEnemies.map((entry, index) => (
                            <div key={index} className="group p-5 bg-gradient-to-br from-gray-800/40 to-gray-800/20 rounded-xl border border-gray-700/60 hover:border-red-500/40 transition-all duration-300 shadow-md hover:shadow-lg">
                              <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-2">
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
                          ))}
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
                          {romantic.map((entry, index) => (
                            <div key={index} className="group p-5 bg-gradient-to-br from-gray-800/40 to-gray-800/20 rounded-xl border border-gray-700/60 hover:border-pink-500/40 transition-all duration-300 shadow-md hover:shadow-lg">
                              <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-2">
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
                          ))}
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
                          {otherRelationships.map((entry, index) => (
                            <div key={index} className="group p-5 bg-gradient-to-br from-gray-800/40 to-gray-800/20 rounded-xl border border-gray-700/60 hover:border-blue-500/40 transition-all duration-300 shadow-md hover:shadow-lg">
                              <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-2">
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
                          ))}
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
            {(oc.seiyuu || oc.voice_actor || oc.theme_song || oc.inspirations || oc.design_notes || oc.name_meaning_etymology || oc.creator_notes) && (
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

            {/* Modular Fields Section - World-specific fields (only uncategorized or unrecognized category fields) */}
            {(() => {
              // Categories that have dedicated sections - exclude these from World-Specific Information
              const recognizedCategories = [
                'Core Identity', 'Overview', 'Identity Background', 'Appearance',
                'Personality Overview', 'Personality Metrics', 'Personality Traits',
                'Abilities', 'Relationships', 'History', 'Preferences & Habits',
                'Media', 'Trivia', 'Development', 'Settings'
              ];
              
              // Get fields that don't have a recognized category
              const uncategorizedFields = fieldDefinitions.filter(field => {
                const category = field.description || '';
                return !recognizedCategories.includes(category);
              });
              
              const hasUncategorizedFields = uncategorizedFields.length > 0 && 
                uncategorizedFields.some(field => {
                  const value = getFieldValue(field, oc.modular_fields);
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
                      const value = getFieldValue(field, oc.modular_fields);
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

