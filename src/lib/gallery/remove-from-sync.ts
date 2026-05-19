import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

const MAX_REMOVE = 200;

export type RemoveGalleryItemsResult = {
  removed: number;
  driveFileIds: string[];
  linkedOcIds: string[];
};

/** Delete gallery rows and block those Drive files from reappearing on sync. */
export async function removeGalleryItemsFromSync(
  supabase: SupabaseClient,
  itemIds: string[]
): Promise<RemoveGalleryItemsResult> {
  const unique = [...new Set(itemIds.filter((id) => typeof id === 'string' && id.length > 0))];
  if (unique.length === 0) {
    return { removed: 0, driveFileIds: [], linkedOcIds: [] };
  }
  if (unique.length > MAX_REMOVE) {
    throw new Error(`Too many items (max ${MAX_REMOVE} per batch)`);
  }

  const { data: rows, error: fetchError } = await supabase
    .from('gallery_items')
    .select(
      `
      id,
      drive_file_id,
      gallery_item_ocs ( oc_id )
    `
    )
    .in('id', unique);

  if (fetchError) {
    logger.error('GalleryRemove', 'Item lookup failed', fetchError);
    throw new Error(fetchError.message);
  }

  const items = rows ?? [];
  if (items.length === 0) {
    return { removed: 0, driveFileIds: [], linkedOcIds: [] };
  }

  const driveFileIds = items
    .map((r) => r.drive_file_id as string)
    .filter((id) => typeof id === 'string' && id.length > 0);
  const linkedOcIds = [
    ...new Set(
      items.flatMap((item) =>
        ((item.gallery_item_ocs as { oc_id: string }[] | null) ?? []).map((link) => link.oc_id)
      )
    ),
  ];

  const idsToDelete = items.map((r) => r.id as string);

  const { error: deleteError } = await supabase.from('gallery_items').delete().in('id', idsToDelete);
  if (deleteError) {
    logger.error('GalleryRemove', 'Delete failed', deleteError);
    throw new Error(deleteError.message);
  }

  if (driveFileIds.length > 0) {
    const exclusionRows = driveFileIds.map((drive_file_id) => ({ drive_file_id }));
    const { error: exclusionError } = await supabase
      .from('gallery_sync_exclusions')
      .upsert(exclusionRows, { onConflict: 'drive_file_id', ignoreDuplicates: false });

    if (exclusionError) {
      logger.error('GalleryRemove', 'Exclusion upsert failed', exclusionError);
      throw new Error(exclusionError.message);
    }
  }

  return { removed: idsToDelete.length, driveFileIds, linkedOcIds };
}
