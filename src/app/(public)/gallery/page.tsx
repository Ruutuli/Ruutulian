import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { generatePageMetadata } from '@/lib/config/metadata-helpers';
import { getSiteConfig } from '@/lib/config/site-config';
import { GalleryFilterLinks } from '@/components/gallery/GalleryFilterLinks';
import { GalleryImageTile } from '@/components/gallery/GalleryImageTile';

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

export async function generateMetadata() {
  const config = await getSiteConfig();
  return generatePageMetadata(
    'Gallery',
    `Art gallery on ${config.websiteName}. Illustrations and visuals.`,
    '/gallery'
  );
}

function collectTags(items: GalleryPublicRow[]): string[] {
  const set = new Set<string>();
  for (const item of items) {
    for (const t of item.tags ?? []) {
      const trimmed = t.trim();
      if (trimmed) set.add(trimmed);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function collectCharacters(items: GalleryPublicRow[]): { slug: string; name: string }[] {
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

function filterItems(
  items: GalleryPublicRow[],
  tagFilter: string,
  characterSlug: string
): GalleryPublicRow[] {
  return items.filter((item) => {
    if (tagFilter) {
      const lower = tagFilter.toLowerCase();
      const hasTag = (item.tags ?? []).some((t) => t.trim().toLowerCase() === lower);
      if (!hasTag) return false;
    }
    if (characterSlug) {
      const hasChar = (item.gallery_item_ocs ?? []).some(
        (row) => row.oc?.slug === characterSlug && row.oc?.is_public
      );
      if (!hasChar) return false;
    }
    return true;
  });
}

interface GalleryPageProps {
  searchParams: Promise<{ tag?: string; character?: string }>;
}

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
  const config = await getSiteConfig();
  const params = await searchParams;
  const tagFilter = typeof params.tag === 'string' ? params.tag.trim() : '';
  const characterSlug = typeof params.character === 'string' ? params.character.trim() : '';

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
        <GalleryEnabledBody tagFilter={tagFilter} characterSlug={characterSlug} />
      )}
    </div>
  );
}

async function GalleryEnabledBody({
  tagFilter,
  characterSlug,
}: {
  tagFilter: string;
  characterSlug: string;
}) {
  const supabase = await createClient();
  const { data: rawItems, error } = await supabase
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
    `
    )
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <section className="wiki-card p-6 mt-8 border-red-800/50">
        <p className="text-red-300">Could not load gallery: {error.message}</p>
      </section>
    );
  }

  const items = (rawItems ?? []) as unknown as GalleryPublicRow[];
  const tagOptions = collectTags(items);
  const characterOptions = collectCharacters(items);
  const filtered = filterItems(items, tagFilter, characterSlug);

  return (
    <section className="mt-8 space-y-6">
      {items.length === 0 ? (
        <div className="wiki-card p-6 text-gray-400 text-sm">
          No published artwork yet. Use Admin → Gallery to sync from Drive and publish pieces.
        </div>
      ) : (
        <>
          <GalleryFilterLinks
            tags={tagOptions}
            characters={characterOptions}
            activeTag={tagFilter}
            activeCharacter={characterSlug}
          />
          {filtered.length === 0 ? (
            <div className="wiki-card p-6 text-gray-400 text-sm">No images match these filters.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map((item) => {
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
          )}
        </>
      )}
    </section>
  );
}
