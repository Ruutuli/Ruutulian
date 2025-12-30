import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { Markdown } from '@/lib/utils/markdown';
import { TagList } from '@/components/wiki/TagList';
import { formatLastUpdated } from '@/lib/utils/dateFormat';
import { getSiteConfig } from '@/lib/config/site-config';
import type { Fanfic } from '@/types/oc';

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
  const baseUrl = config.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
  const url = `${baseUrl}/fanfics/${resolvedParams.slug}`;
  const description = fanfic.summary
    ? fanfic.summary.substring(0, 155).replace(/\n/g, ' ').replace(/[#*`]/g, '').trim() + (fanfic.summary.length > 155 ? '...' : '')
    : `${fanfic.title} - Fanfiction on ${config.websiteName}`;

  return {
    title: fanfic.title,
    description,
    keywords: [fanfic.title, 'fanfiction', 'fanfic', config.websiteName].filter(Boolean),
    openGraph: {
      title: `${fanfic.title} | ${config.websiteName}`,
      description,
      url,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${fanfic.title} | ${config.websiteName}`,
      description,
    },
    alternates: {
      canonical: url,
    },
  };
}

export const revalidate = 300;

export default async function FanficDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const supabase = await createClient();

  const { data: fanficData, error } = await supabase
    .from('fanfics')
    .select(`
      *,
      world:worlds(id, name, slug, is_public),
      story_alias:story_aliases(id, name, slug, world_id),
      characters:fanfic_characters(id, oc_id, name, oc:ocs(id, name, slug)),
      relationships:fanfic_relationships(id, relationship_text, relationship_type),
      tags:fanfic_tags(tag:tags(id, name))
    `)
    .eq('slug', resolvedParams.slug)
    .eq('is_public', true)
    .single();

  if (error || !fanficData) {
    notFound();
  }

  // Transform the data
  const fanfic: Fanfic = {
    ...fanficData,
    characters: Array.isArray(fanficData.characters)
      ? fanficData.characters.map((fc: any) => ({
          id: fc.id,
          fanfic_id: fanficData.id,
          oc_id: fc.oc_id || null,
          name: fc.name || null,
          created_at: '',
          oc: fc.oc || undefined,
        }))
      : [],
    relationships: Array.isArray(fanficData.relationships)
      ? fanficData.relationships.map((fr: any) => ({
          id: fr.id,
          fanfic_id: fanficData.id,
          relationship_text: fr.relationship_text,
          relationship_type: fr.relationship_type || null,
          created_at: '',
        }))
      : [],
    tags: Array.isArray(fanficData.tags)
      ? fanficData.tags
          .map((ft: any) => ft.tag)
          .filter((t: any) => t !== null && t !== undefined)
          .flat()
      : [],
  };

  const getRatingColor = (rating?: string | null) => {
    switch (rating) {
      case 'G': return 'bg-green-900/70 text-green-200 border-green-700';
      case 'PG': return 'bg-blue-900/70 text-blue-200 border-blue-700';
      case 'PG-13': return 'bg-yellow-900/70 text-yellow-200 border-yellow-700';
      case 'R': return 'bg-orange-900/70 text-orange-200 border-orange-700';
      case 'M': return 'bg-red-900/70 text-red-200 border-red-700';
      default: return 'bg-gray-800/70 text-gray-300 border-gray-700';
    }
  };

  return (
    <div>
      <PageHeader
        title={fanfic.title}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Fanfics', href: '/fanfics' },
          { label: fanfic.title },
        ]}
      />

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="wiki-card p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-100 mb-2">{fanfic.title}</h1>
              {fanfic.alternative_titles && fanfic.alternative_titles.length > 0 && (
                <p className="text-gray-400 italic mb-2">
                  Also known as: {fanfic.alternative_titles.join(', ')}
                </p>
              )}
              {fanfic.author && (
                <p className="text-gray-300 mb-2">
                  By: <span className="font-medium">{fanfic.author}</span>
                </p>
              )}
              {fanfic.rating && (
                <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full border ${getRatingColor(fanfic.rating)}`}>
                  {fanfic.rating}
                </span>
              )}
            </div>
          </div>

          {fanfic.summary && (
            <div className="prose prose-invert max-w-none mb-4">
              <Markdown content={fanfic.summary} />
            </div>
          )}

          {fanfic.external_link && (
            <div className="mt-4">
              <a
                href={fanfic.external_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <i className="fas fa-external-link-alt"></i>
                Read on External Site
              </a>
            </div>
          )}

          <div className="mt-4 text-sm text-gray-400">
            Last updated: {formatLastUpdated(fanfic.updated_at)}
          </div>
        </div>

        {/* World */}
        {fanfic.world && (
          <div className="wiki-card p-6">
            <h2 className="text-2xl font-bold text-gray-100 mb-4">World/Fandom</h2>
            <Link
              href={`/worlds/${fanfic.world.slug}`}
              className="px-3 py-1 bg-purple-600/80 hover:bg-purple-700 text-white rounded-lg transition-colors inline-block"
            >
              {fanfic.world.name}
            </Link>
          </div>
        )}

        {/* Story Alias */}
        {fanfic.story_alias && (
          <div className="wiki-card p-6">
            <h2 className="text-2xl font-bold text-gray-100 mb-2">Story Alias</h2>
            <Link
              href={fanfic.story_alias.world ? `/worlds/${fanfic.story_alias.world.slug}` : '#'}
              className="text-purple-400 hover:text-purple-300"
            >
              {fanfic.story_alias.name}
            </Link>
          </div>
        )}

        {/* Characters */}
        {fanfic.characters && fanfic.characters.length > 0 && (
          <div className="wiki-card p-6">
            <h2 className="text-2xl font-bold text-gray-100 mb-4">Characters</h2>
            <div className="space-y-2">
              {fanfic.characters.map((fc) => (
                <div key={fc.id || fc.oc_id || fc.name}>
                  {fc.oc ? (
                    <Link
                      href={`/ocs/${fc.oc.slug}`}
                      className="text-purple-400 hover:text-purple-300 font-medium"
                    >
                      {fc.oc.name}
                    </Link>
                  ) : fc.name ? (
                    <span className="text-gray-300 font-medium">{fc.name}</span>
                  ) : (
                    <span className="text-gray-400 italic">Unknown Character</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Relationships & Pairings */}
        {fanfic.relationships && fanfic.relationships.length > 0 && (
          <div className="wiki-card p-6">
            <h2 className="text-2xl font-bold text-gray-100 mb-4">Relationships & Pairings</h2>
            <div className="space-y-2">
              {fanfic.relationships.map((rel) => (
                <div key={rel.id} className="flex items-center gap-2">
                  <span className="text-gray-300">{rel.relationship_text}</span>
                  {rel.relationship_type && rel.relationship_type !== 'other' && (
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
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
          <div className="wiki-card p-6">
            <h2 className="text-2xl font-bold text-gray-100 mb-4">Tags</h2>
            <TagList tags={fanfic.tags.map(t => t.name)} />
          </div>
        )}
      </div>
    </div>
  );
}

