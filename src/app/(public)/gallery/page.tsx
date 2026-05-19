import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { generatePageMetadata } from '@/lib/config/metadata-helpers';
import { getSiteConfig } from '@/lib/config/site-config';
import { GalleryFilterLinks } from '@/components/gallery/GalleryFilterLinks';
import { GalleryPublicClient } from '@/components/gallery/GalleryPublicClient';
import type { GalleryPublicItem } from '@/components/gallery/gallery-public-types';
import { GALLERY_PUBLIC_PAGE_SIZE } from '@/lib/gallery/constants';
import {
  getGalleryPublicFacetsCached,
  type GalleryCharacterFacet,
} from '@/lib/gallery/get-public-facets';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

export const dynamic = 'force-dynamic';

interface OcJoinRow {
  oc_id: string;
  oc: { id: string; name: string; slug: string; is_public: boolean } | null;
}

interface GalleryPublicRow {
  id: string;
  drive_file_id: string;
  name: string;
  tags: string[] | null;
  is_nsfw: boolean | null;
  sort_order: number | null;
  gallery_item_ocs: OcJoinRow[] | null;
}

type GalleryFacetRow = Pick<GalleryPublicRow, 'tags' | 'gallery_item_ocs'>;

export async function generateMetadata() {
  const config = await getSiteConfig();
  return generatePageMetadata(
    'Gallery',
    `Art gallery on ${config.websiteName}. Illustrations and visuals.`,
    '/gallery'
  );
}

function collectTags(items: GalleryFacetRow[]): string[] {
  const set = new Set<string>();
  for (const item of items) {
    for (const t of item.tags ?? []) {
      const trimmed = t.trim();
      if (trimmed) set.add(trimmed);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function collectCharacters(items: GalleryFacetRow[]): GalleryCharacterFacet[] {
  const map = new Map<string, { name: string; count: number }>();
  for (const item of items) {
    const countedSlugs = new Set<string>();
    for (const row of item.gallery_item_ocs ?? []) {
      const oc = row.oc;
      if (!oc?.is_public || !oc.slug || countedSlugs.has(oc.slug)) continue;
      countedSlugs.add(oc.slug);
      const existing = map.get(oc.slug);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(oc.slug, { name: oc.name, count: 1 });
      }
    }
  }
  return Array.from(map.entries())
    .map(([slug, { name, count }]) => ({ slug, name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function toPublicItems(items: GalleryPublicRow[]): GalleryPublicItem[] {
  return items.map((item) => ({
    id: item.id,
    fileId: item.drive_file_id,
    title: item.name?.trim() || '',
    tags: [...(item.tags ?? [])].filter(Boolean),
    isNsfw: Boolean(item.is_nsfw),
    characterNames: (item.gallery_item_ocs ?? [])
      .filter((row) => row.oc?.is_public)
      .map((row) => ({
        name: row.oc!.name,
        slug: row.oc!.slug,
        href: `/ocs/${row.oc!.slug}`,
      })),
  }));
}

function galleryQueryString(page: number, tagFilter: string, characterSlug: string): string {
  const sp = new URLSearchParams();
  if (tagFilter) sp.set('tag', tagFilter);
  if (characterSlug) sp.set('character', characterSlug);
  if (page > 1) sp.set('page', String(page));
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

interface GalleryPageProps {
  searchParams: Promise<{ tag?: string; character?: string; page?: string }>;
}

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
  const config = await getSiteConfig();
  const params = await searchParams;
  const tagFilter = typeof params.tag === 'string' ? params.tag.trim() : '';
  const characterSlug = typeof params.character === 'string' ? params.character.trim() : '';
  const pageRaw = typeof params.page === 'string' ? parseInt(params.page, 10) : 1;
  const pageNum = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  return (
    <div>
      <PageHeader
        title="Gallery"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Gallery' },
        ]}
      />
      <p className="text-gray-400 text-sm sm:text-base -mt-4 mb-2 max-w-2xl">
        Browse published artwork. Filter by tag or character, then click any piece to view it full size.
      </p>

      {!config.galleryEnabled ? (
        <section className="wiki-card p-8 mt-8">
          <p className="text-gray-300">
            The gallery is not available right now. Enable it under{' '}
            <span className="text-purple-300">Admin → Site Settings</span>, then publish individual pieces from{' '}
            <span className="text-purple-300">Admin → Gallery</span>.
          </p>
        </section>
      ) : (
        <GalleryEnabledBody
          tagFilter={tagFilter}
          characterSlug={characterSlug}
          pageNum={pageNum}
        />
      )}
    </div>
  );
}

async function GalleryEnabledBody({
  tagFilter,
  characterSlug,
  pageNum,
}: {
  tagFilter: string;
  characterSlug: string;
  pageNum: number;
}) {
  const supabase = await createClient();
  const perPage = GALLERY_PUBLIC_PAGE_SIZE;

  let tagOptions: string[];
  let characterOptions: GalleryCharacterFacet[];

  try {
    const facets = await getGalleryPublicFacetsCached();
    if (facets.publishedCount === 0) {
      return (
        <section className="mt-8 space-y-6">
          <div className="wiki-card p-6 text-gray-400 text-sm">
            No published artwork yet. Use Admin → Gallery to sync from Drive and publish pieces.
          </div>
        </section>
      );
    }
    tagOptions = facets.tags;
    characterOptions = facets.characters;
  } catch {
    const { data: facetRows, error: facetError } = await supabase
      .from('gallery_items')
      .select(
        `
      tags,
      gallery_item_ocs (
        oc_id,
        oc:ocs (slug, name, is_public)
      )
    `
      )
      .eq('published', true);

    if (facetError) {
      return (
        <section className="wiki-card p-6 mt-8 border-red-800/50">
          <p className="text-red-300">Could not load gallery: {facetError.message}</p>
        </section>
      );
    }

    const facetItems = (facetRows ?? []) as unknown as GalleryFacetRow[];
    if (facetItems.length === 0) {
      return (
        <section className="mt-8 space-y-6">
          <div className="wiki-card p-6 text-gray-400 text-sm">
            No published artwork yet. Use Admin → Gallery to sync from Drive and publish pieces.
          </div>
        </section>
      );
    }
    tagOptions = collectTags(facetItems);
    characterOptions = collectCharacters(facetItems);
  }

  let itemIdFilter: string[] | null = null;
  if (characterSlug) {
    const { data: ocRow } = await supabase
      .from('ocs')
      .select('id')
      .eq('slug', characterSlug)
      .eq('is_public', true)
      .maybeSingle();

    if (!ocRow) {
      itemIdFilter = [];
    } else {
      const { data: links } = await supabase
        .from('gallery_item_ocs')
        .select('gallery_item_id')
        .eq('oc_id', ocRow.id);
      itemIdFilter = [...new Set((links ?? []).map((l) => l.gallery_item_id))];
    }
  }

  const activeCharacterName =
    characterOptions.find((c) => c.slug === characterSlug)?.name ?? '';

  if (itemIdFilter !== null && itemIdFilter.length === 0) {
    return (
      <GalleryPageLayout
        tagOptions={tagOptions}
        characterOptions={characterOptions}
        tagFilter={tagFilter}
        characterSlug={characterSlug}
      >
        <div className="wiki-card p-8 text-center text-gray-400 text-sm">
          <i className="fas fa-image text-2xl text-gray-600 mb-3 block" aria-hidden />
          No images match these filters.
        </div>
      </GalleryPageLayout>
    );
  }

  let listQuery = supabase
    .from('gallery_items')
    .select(
      `
      id,
      drive_file_id,
      name,
      tags,
      is_nsfw,
      sort_order,
      gallery_item_ocs (
        oc_id,
        oc:ocs (id, name, slug, is_public)
      )
    `,
      { count: 'exact' }
    )
    .eq('published', true);

  if (tagFilter) {
    listQuery = listQuery.contains('tags', [tagFilter]);
  }

  if (itemIdFilter !== null) {
    listQuery = listQuery.in('id', itemIdFilter);
  }

  const requestedPage = Math.max(1, pageNum);
  const from = (requestedPage - 1) * perPage;

  const { data: pageItems, error, count } = await listQuery
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
    .range(from, from + perPage - 1);

  if (error) {
    return (
      <section className="wiki-card p-6 mt-8 border-red-800/50">
        <p className="text-red-300">Could not load gallery: {error.message}</p>
      </section>
    );
  }

  const filteredTotal = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(filteredTotal / perPage));

  if (filteredTotal > 0 && requestedPage > totalPages) {
    redirect(`/gallery${galleryQueryString(totalPages, tagFilter, characterSlug)}`);
  }

  if (filteredTotal === 0 && requestedPage > 1) {
    redirect(`/gallery${galleryQueryString(1, tagFilter, characterSlug)}`);
  }

  const page = Math.min(requestedPage, totalPages);
  const items = (pageItems ?? []) as unknown as GalleryPublicRow[];

  return (
    <GalleryPageLayout
      tagOptions={tagOptions}
      characterOptions={characterOptions}
      tagFilter={tagFilter}
      characterSlug={characterSlug}
    >
      {filteredTotal === 0 ? (
        <div className="wiki-card p-8 text-center text-gray-400 text-sm">
          <i className="fas fa-image text-2xl text-gray-600 mb-3 block" aria-hidden />
          No images match these filters.
        </div>
      ) : (
        <GalleryPublicClient
          items={toPublicItems(items)}
          page={page}
          perPage={perPage}
          total={filteredTotal}
          tagFilter={tagFilter}
          characterSlug={characterSlug}
          activeCharacterName={activeCharacterName}
        />
      )}
    </GalleryPageLayout>
  );
}

function GalleryPageLayout({
  tagOptions,
  characterOptions,
  tagFilter,
  characterSlug,
  children,
}: {
  tagOptions: string[];
  characterOptions: GalleryCharacterFacet[];
  tagFilter: string;
  characterSlug: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-6 lg:mt-8">
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
        <GalleryFilterLinks
          tags={tagOptions}
          characters={characterOptions}
          activeTag={tagFilter}
          activeCharacter={characterSlug}
          className="w-full lg:w-64 xl:w-72 shrink-0 lg:sticky lg:top-6 z-10"
        />
        <div className="flex-1 min-w-0 w-full">{children}</div>
      </div>
    </section>
  );
}
