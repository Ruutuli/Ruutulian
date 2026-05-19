import { createClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import { GALLERY_FACETS_REVALIDATE_TAG } from '@/lib/gallery/constants';

export type GalleryCharacterFacet = {
  slug: string;
  name: string;
  count: number;
};

export type GalleryPublicFacets = {
  publishedCount: number;
  tags: string[];
  characters: GalleryCharacterFacet[];
};

function createAnonReadClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return createClient(url, key);
}

function parseFacetsPayload(data: unknown): GalleryPublicFacets {
  if (!data || typeof data !== 'object') {
    return { publishedCount: 0, tags: [], characters: [] };
  }
  const o = data as Record<string, unknown>;
  const publishedCount =
    typeof o.published_count === 'number' && Number.isFinite(o.published_count)
      ? Math.max(0, Math.floor(o.published_count))
      : 0;
  const tags = Array.isArray(o.tags)
    ? o.tags.map((t) => (typeof t === 'string' ? t : JSON.stringify(t))).filter(Boolean)
    : [];
  const charsRaw = Array.isArray(o.characters) ? o.characters : [];
  const characters = charsRaw
    .map((c) => {
      if (!c || typeof c !== 'object') return null;
      const r = c as Record<string, unknown>;
      const slug = typeof r.slug === 'string' ? r.slug : '';
      const name = typeof r.name === 'string' ? r.name : '';
      const countRaw = r.count;
      const count =
        typeof countRaw === 'number' && Number.isFinite(countRaw)
          ? Math.max(0, Math.floor(countRaw))
          : 0;
      if (!slug) return null;
      return { slug, name, count };
    })
    .filter((x): x is GalleryCharacterFacet => x !== null);
  return { publishedCount, tags, characters };
}

async function loadGalleryPublicFacetsFromDb(): Promise<GalleryPublicFacets> {
  const supabase = createAnonReadClient();
  const { data, error } = await supabase.rpc('get_gallery_public_facets');
  if (error) {
    throw new Error(error.message);
  }
  return parseFacetsPayload(data);
}

const getGalleryPublicFacetsCachedInner = unstable_cache(
  loadGalleryPublicFacetsFromDb,
  ['gallery-public-facets-v2'],
  { tags: [GALLERY_FACETS_REVALIDATE_TAG], revalidate: 600 }
);

/**
 * Distinct tags + public characters linked to published items. Cached (no cookies) so it stays fast at scale.
 */
export function getGalleryPublicFacetsCached(): Promise<GalleryPublicFacets> {
  return getGalleryPublicFacetsCachedInner();
}
