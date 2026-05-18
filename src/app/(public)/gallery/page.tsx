import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { generatePageMetadata } from '@/lib/config/metadata-helpers';
import { getSiteConfig } from '@/lib/config/site-config';
import { GalleryFilterLinks } from '@/components/gallery/GalleryFilterLinks';
import { GalleryImageTile } from '@/components/gallery/GalleryImageTile';
import { GalleryPagination } from '@/components/gallery/GalleryPagination';
import { GALLERY_PUBLIC_PAGE_SIZE } from '@/lib/gallery/constants';
import { getGalleryPublicFacetsCached } from '@/lib/gallery/get-public-facets';
import { redirect } from 'next/navigation';

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

function collectCharacters(items: GalleryFacetRow[]): { slug: string; name: string }[] {
  const map = new Map<string, string>();
  for (const item of items) {
    for (const row of item.gallery_item_ocs ?? []) {
      const oc = row.oc;
      if (oc?.is_public && oc.slug) {
        map.set(oc.slug, oc.name);
      }
    }
  }
  return Array.from(map.entries())
    .map(([slug, name]) => ({ slug, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
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
  let characterOptions: { slug: string; name: string }[];

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

  if (itemIdFilter !== null && itemIdFilter.length === 0) {
    return (
      <section className="mt-8 space-y-6">
        <GalleryFilterLinks
          tags={tagOptions}
          characters={characterOptions}
          activeTag={tagFilter}
          activeCharacter={characterSlug}
        />
        <div className="wiki-card p-6 text-gray-400 text-sm">No images match these filters.</div>
      </section>
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
    <section className="mt-8 space-y-6">
      <GalleryFilterLinks
        tags={tagOptions}
        characters={characterOptions}
        activeTag={tagFilter}
        activeCharacter={characterSlug}
      />
      {filteredTotal === 0 ? (
        <div className="wiki-card p-6 text-gray-400 text-sm">No images match these filters.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => {
              const characterNames = (item.gallery_item_ocs ?? [])
                .filter((row) => row.oc?.is_public)
                .map((row) => ({
                  name: row.oc!.name,
                  slug: row.oc!.slug,
                  href: `/ocs/${row.oc!.slug}`,
                }));
              return (
                <GalleryImageTile
                  key={item.id}
                  fileId={item.drive_file_id}
                  title={item.name?.trim() || ''}
                  tags={[...(item.tags ?? [])].filter(Boolean)}
                  characterNames={characterNames}
                />
              );
            })}
          </div>
          <GalleryPagination
            page={page}
            perPage={perPage}
            total={filteredTotal}
            tagFilter={tagFilter}
            characterSlug={characterSlug}
          />
        </>
      )}
    </section>
  );
}
