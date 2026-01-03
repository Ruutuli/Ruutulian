import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { Markdown } from '@/lib/utils/markdown';
import { TagList } from '@/components/wiki/TagList';
import { formatLastUpdated } from '@/lib/utils/dateFormat';
import { getSiteConfig } from '@/lib/config/site-config';
import { getRatingColorClasses } from '@/lib/utils/fanficRating';
import { ChapterList } from '@/components/fanfic/ChapterList';
import type { Fanfic, FanficCharacter, FanficRelationship, FanficChapter, Tag, OC } from '@/types/oc';
import { generateDetailPageMetadata } from '@/lib/seo/page-metadata';
import { generateArticleSchema, generatePersonSchema } from '@/lib/seo/structured-data';
import { getAbsoluteUrl } from '@/lib/seo/metadata-helpers';
import { convertGoogleDriveUrl } from '@/lib/utils/googleDriveImage';

// Types for Supabase query responses
interface FanficCharacterResponse {
  id: string;
  oc_id: string | null;
  name: string | null;
  oc?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface FanficRelationshipResponse {
  id: string;
  relationship_text: string;
  relationship_type: 'romantic' | 'platonic' | 'other' | null;
}

interface FanficTagResponse {
  tag: {
    id: string;
    name: string;
  } | null;
}

interface FanficChapterResponse {
  id: string;
  chapter_number: number;
  title: string | null;
  content: string | null;
  word_count: number | null;
  image_url: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const supabase = await createClient();

  const { data: fanfic } = await supabase
    .from('fanfics')
    .select('title, slug, summary')
    .eq('slug', resolvedParams.slug)
    .eq('is_public', true)
    .single();

  if (!fanfic) {
    return {
      title: 'Fanfic Not Found',
    };
  }

  const config = await getSiteConfig();
  const description = fanfic.summary
    ? fanfic.summary.substring(0, 155).replace(/\n/g, ' ').replace(/[#*`]/g, '').trim() + (fanfic.summary.length > 155 ? '...' : '')
    : `${fanfic.title} - Fanfiction on ${config.websiteName}`;

  return generateDetailPageMetadata({
    title: fanfic.title,
    description,
    path: `/fanfics/${resolvedParams.slug}`,
    keywords: [fanfic.title, 'fanfiction', 'fanfic', config.websiteName],
    entityName: fanfic.title,
    entityType: 'article',
    imageUrl: null,
    imageAlt: fanfic.title,
  });
}

export const revalidate = 300;

export default async function FanficDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const supabase = await createClient();

  // Try query with story_alias first
  let { data: fanficData, error } = await supabase
    .from('fanfics')
    .select(`
      *,
      world:worlds(id, name, slug, is_public),
      story_alias:story_aliases(id, name, slug, world_id),
      characters:fanfic_characters(id, oc_id, name, oc:ocs(id, name, slug)),
      relationships:fanfic_relationships(id, relationship_text, relationship_type),
      tags:fanfic_tags(tag:tags(id, name)),
      chapters:fanfic_chapters(id, chapter_number, title, content, word_count, image_url, is_published, published_at, created_at, updated_at)
    `)
    .eq('slug', resolvedParams.slug)
    .eq('is_public', true)
    .single();

  // If error is related to story_aliases relationship, retry without it
  if (error && error.code === 'PGRST200' && 
      (error.message?.includes('story_aliases') || error.details?.includes('story_alias'))) {
    const retryResult = await supabase
      .from('fanfics')
      .select(`
        *,
        world:worlds(id, name, slug, is_public),
        characters:fanfic_characters(id, oc_id, name, oc:ocs(id, name, slug)),
        relationships:fanfic_relationships(id, relationship_text, relationship_type),
        tags:fanfic_tags(tag:tags(id, name)),
        chapters:fanfic_chapters(id, chapter_number, title, content, word_count, image_url, is_published, published_at, created_at, updated_at)
      `)
      .eq('slug', resolvedParams.slug)
      .eq('is_public', true)
      .single();
    
    fanficData = retryResult.data;
    error = retryResult.error;
    
    // If we have story_alias_id, fetch story_alias separately
    if (fanficData?.story_alias_id) {
      const { data: storyAlias } = await supabase
        .from('story_aliases')
        .select('id, name, slug, world_id')
        .eq('id', fanficData.story_alias_id)
        .single();
      
      if (storyAlias) {
        fanficData.story_alias = storyAlias;
      }
    }
  }

  if (error || !fanficData) {
    notFound();
  }

  // Transform the data
  const fanfic: Fanfic = {
    ...fanficData,
    characters: Array.isArray(fanficData.characters)
      ? fanficData.characters.map((fc: FanficCharacterResponse): FanficCharacter => ({
          id: fc.id,
          fanfic_id: fanficData.id,
          oc_id: fc.oc_id || null,
          name: fc.name || null,
          created_at: '',
          oc: fc.oc ? {
            id: fc.oc.id,
            name: fc.oc.name,
            slug: fc.oc.slug,
          } as OC : undefined,
        }))
      : [],
    relationships: Array.isArray(fanficData.relationships)
      ? fanficData.relationships.map((fr: FanficRelationshipResponse): FanficRelationship => ({
          id: fr.id,
          fanfic_id: fanficData.id,
          relationship_text: fr.relationship_text,
          relationship_type: fr.relationship_type || null,
          created_at: '',
        }))
      : [],
    tags: Array.isArray(fanficData.tags)
      ? fanficData.tags
          .map((ft: FanficTagResponse) => ft.tag)
          .filter((t: Tag | null): t is Tag => t !== null && t !== undefined)
      : [],
    chapters: Array.isArray(fanficData.chapters)
      ? fanficData.chapters
          .filter((c: FanficChapterResponse) => c !== null && c !== undefined && c.is_published)
          .map((c: FanficChapterResponse): FanficChapter => ({
            id: c.id,
            fanfic_id: fanficData.id,
            chapter_number: c.chapter_number,
            title: c.title || null,
            content: c.content || null,
            word_count: c.word_count || null,
            image_url: c.image_url || null,
            is_published: c.is_published,
            published_at: c.published_at || null,
            created_at: c.created_at,
            updated_at: c.updated_at,
          }))
          .sort((a: FanficChapter, b: FanficChapter) => a.chapter_number - b.chapter_number)
      : [],
  };

  // Calculate total word count from chapters
  const totalWordCount = fanfic.chapters?.reduce((sum, ch) => sum + (ch.word_count || 0), 0) || 0;

  // Generate structured data for fanfic article
  const config = await getSiteConfig();
  const baseUrl = config.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
  const imageUrl = fanfic.image_url ? getAbsoluteUrl(convertGoogleDriveUrl(fanfic.image_url), baseUrl) : null;
  const authorSchema = generatePersonSchema(config.authorName);
  
  const articleSchema = generateArticleSchema(fanfic.title, {
    description: fanfic.summary || undefined,
    image: imageUrl ? [imageUrl] : undefined,
    datePublished: fanfic.created_at,
    dateModified: fanfic.updated_at,
    author: authorSchema,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
    <div>
      <PageHeader
        title={fanfic.title}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Fanfics', href: '/fanfics' },
          { label: fanfic.title },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section with Image */}
        {fanfic.image_url && (
          <div className="mb-8 rounded-xl overflow-hidden shadow-2xl">
            <img
              src={fanfic.image_url}
              alt={fanfic.title}
              className="w-full h-[250px] object-cover object-center"
            />
          </div>
        )}

        {/* Title Section */}
        <div className="mb-10">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-100 mb-4 leading-tight tracking-tight">
            {fanfic.title}
          </h1>
          
          {fanfic.alternative_titles && fanfic.alternative_titles.length > 0 && (
            <p className="text-lg text-gray-400 italic mb-4">
              {fanfic.alternative_titles.join(', ')}
            </p>
          )}

          {fanfic.author && (
            <p className="text-lg text-gray-300 mb-6">
              by <span className="text-gray-100 font-semibold">{fanfic.author}</span>
            </p>
          )}

          {/* Rating and Metadata Row */}
          <div className="flex flex-wrap items-center gap-4 mb-8 pb-6 border-b border-gray-700/50">
            {fanfic.rating && (
              <span className={`inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg border ${getRatingColorClasses(fanfic.rating)}`}>
                {fanfic.rating}
              </span>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <i className="fas fa-calendar-alt"></i>
              <span>Updated: {formatLastUpdated(fanfic.updated_at)}</span>
            </div>
            {totalWordCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <i className="fas fa-font"></i>
                <span>{totalWordCount.toLocaleString()} words</span>
              </div>
            )}
            {fanfic.chapters && fanfic.chapters.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <i className="fas fa-book-open"></i>
                <span>{fanfic.chapters.length} {fanfic.chapters.length === 1 ? 'chapter' : 'chapters'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Summary */}
            {fanfic.summary && (
              <div className="wiki-card p-8 rounded-xl">
                <h2 className="text-2xl font-bold text-gray-100 mb-6 pb-3 border-b-2 border-purple-500/30">
                  <i className="fas fa-align-left mr-3 text-purple-400"></i>
                  Summary
                </h2>
                <div className="prose prose-invert prose-lg max-w-none text-gray-300 leading-relaxed">
                  <Markdown content={fanfic.summary} />
                </div>
              </div>
            )}

            {/* External Link */}
            {fanfic.external_link && (
              <div className="wiki-card p-6 rounded-xl bg-gradient-to-r from-purple-600/20 to-purple-700/20 border-2 border-purple-500/30">
                <a
                  href={fanfic.external_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all font-semibold shadow-lg hover:shadow-purple-500/50"
                >
                  <i className="fas fa-external-link-alt"></i>
                  Read on External Site
                </a>
              </div>
            )}

            {/* Chapters */}
            {fanfic.chapters && fanfic.chapters.length > 0 && (
              <ChapterList
                chapters={fanfic.chapters}
                fanficSlug={fanfic.slug}
              />
            )}
          </div>

          {/* Sidebar Metadata */}
          <div className="lg:col-span-1">
            <div className="wiki-card p-6 rounded-xl space-y-6 sticky top-4">
              {/* World/Fandom */}
              {fanfic.world && (
                <div className="pb-6 border-b border-gray-700/50">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <i className="fas fa-globe text-purple-400"></i>
                    Fandom
                  </h3>
                  <Link
                    href={`/worlds/${fanfic.world.slug}`}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600/20 text-purple-300 border border-purple-600/30 rounded-lg hover:bg-purple-600/30 hover:border-purple-500/50 transition-all"
                  >
                    <i className="fas fa-link text-xs"></i>
                    {fanfic.world.name}
                  </Link>
                </div>
              )}

              {/* Story Alias */}
              {fanfic.story_alias && (
                <div className="pb-6 border-b border-gray-700/50">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <i className="fas fa-book text-purple-400"></i>
                    Story
                  </h3>
                  <Link
                    href={fanfic.story_alias.world ? `/worlds/${fanfic.story_alias.world.slug}` : '#'}
                    className="text-sm text-purple-400 hover:text-purple-300 font-medium transition-colors"
                  >
                    {fanfic.story_alias.name}
                  </Link>
                </div>
              )}

              {/* Characters */}
              {fanfic.characters && fanfic.characters.length > 0 && (
                <div className="pb-6 border-b border-gray-700/50">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <i className="fas fa-users text-purple-400"></i>
                    Characters
                  </h3>
                  <div className="space-y-2">
                    {fanfic.characters.map((fc) => (
                      <div key={fc.id || fc.oc_id || fc.name}>
                        {fc.oc ? (
                          <Link
                            href={`/ocs/${fc.oc.slug}`}
                            className="text-sm text-purple-400 hover:text-purple-300 block py-1 transition-colors"
                          >
                            {fc.oc.name}
                          </Link>
                        ) : fc.name ? (
                          <span className="text-sm text-gray-300 block py-1">{fc.name}</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Relationships & Pairings */}
              {fanfic.relationships && fanfic.relationships.length > 0 && (
                <div className="pb-6 border-b border-gray-700/50">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <i className="fas fa-heart text-purple-400"></i>
                    Relationships
                  </h3>
                  <div className="space-y-3">
                    {fanfic.relationships.map((rel) => (
                      <div key={rel.id} className="flex flex-col gap-2">
                        <span className="text-sm text-gray-300 font-medium">{rel.relationship_text}</span>
                        {rel.relationship_type && rel.relationship_type !== 'other' && (
                          <span className={`inline-flex items-center w-fit px-2.5 py-1 text-xs font-semibold rounded ${
                            rel.relationship_type === 'romantic' 
                              ? 'bg-pink-900/50 text-pink-300 border border-pink-700'
                              : 'bg-blue-900/50 text-blue-300 border border-blue-700'
                          }`}>
                            {rel.relationship_type === 'romantic' ? 'Romantic' : 'Platonic'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {fanfic.tags && fanfic.tags.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <i className="fas fa-tags text-purple-400"></i>
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {fanfic.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-block px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-700/50 border border-gray-600/50 rounded-lg hover:bg-gray-700/70 transition-colors"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

