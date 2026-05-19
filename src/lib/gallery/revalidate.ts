import { revalidatePath, revalidateTag } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { GALLERY_FACETS_REVALIDATE_TAG } from '@/lib/gallery/constants';
import { logger } from '@/lib/logger';

/** Invalidate public gallery facets and OC profile pages after admin gallery changes. */
export function revalidateGalleryCaches() {
  try {
    revalidateTag('site-config');
    revalidateTag(GALLERY_FACETS_REVALIDATE_TAG);
    revalidatePath('/gallery');
  } catch {
    /* ignore */
  }
}

/** Revalidate `/ocs/[slug]` for characters whose linked gallery changed. */
export async function revalidateOcPages(
  supabase: SupabaseClient,
  ocIds: string[]
): Promise<void> {
  const unique = [...new Set(ocIds.filter((id) => typeof id === 'string' && id.length > 0))];
  if (unique.length === 0) return;

  const { data: rows } = await supabase.from('ocs').select('slug').in('id', unique);
  for (const row of rows ?? []) {
    if (row.slug) {
      try {
        revalidatePath(`/ocs/${row.slug}`);
      } catch {
        /* ignore */
      }
    }
  }
}

/** Publish gallery items so they are visible on public OC pages and pass RLS. */
export async function publishGalleryItems(
  supabase: SupabaseClient,
  itemIds: string[]
): Promise<boolean> {
  const unique = [...new Set(itemIds.filter((id) => typeof id === 'string' && id.length > 0))];
  if (unique.length === 0) return true;

  const { error } = await supabase.from('gallery_items').update({ published: true }).in('id', unique);
  if (error) {
    logger.error('GalleryPublish', 'Failed to publish gallery items', error);
    return false;
  }
  return true;
}
