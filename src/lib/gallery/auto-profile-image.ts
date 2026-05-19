import type { SupabaseClient } from '@supabase/supabase-js';
import { driveFileViewUrl } from '@/lib/gallery/constants';
import { logger } from '@/lib/logger';

export type ProfileImageAssignment = {
  ocId: string;
  galleryItemId: string;
};

export type ProfileImageAssignmentResult = {
  ocId: string;
  ocName: string;
  image_url: string;
};

export function ocHasProfileImage(imageUrl: string | null | undefined): boolean {
  return typeof imageUrl === 'string' && imageUrl.trim().length > 0;
}

/**
 * Sets profile images for characters that have none yet.
 * When multiple gallery items are provided for one character, the first assignment wins.
 */
export async function assignProfileImagesFromGallery(
  supabase: SupabaseClient,
  assignments: ProfileImageAssignment[]
): Promise<ProfileImageAssignmentResult[]> {
  if (assignments.length === 0) return [];

  const galleryItemByOc = new Map<string, string>();
  for (const { ocId, galleryItemId } of assignments) {
    if (!galleryItemByOc.has(ocId)) galleryItemByOc.set(ocId, galleryItemId);
  }

  const ocIds = [...galleryItemByOc.keys()];
  const galleryItemIds = [...new Set(galleryItemByOc.values())];

  const [{ data: ocs, error: ocsError }, { data: items, error: itemsError }] = await Promise.all([
    supabase.from('ocs').select('id, name, image_url').in('id', ocIds),
    supabase.from('gallery_items').select('id, drive_file_id').in('id', galleryItemIds),
  ]);

  if (ocsError) {
    logger.error('GalleryAutoProfileImage', 'OC lookup failed', ocsError);
    return [];
  }
  if (itemsError) {
    logger.error('GalleryAutoProfileImage', 'Gallery item lookup failed', itemsError);
    return [];
  }

  const itemById = new Map((items ?? []).map((item) => [item.id, item]));
  const results: ProfileImageAssignmentResult[] = [];

  for (const oc of ocs ?? []) {
    if (ocHasProfileImage(oc.image_url)) continue;

    const galleryItemId = galleryItemByOc.get(oc.id);
    const galleryItem = galleryItemId ? itemById.get(galleryItemId) : undefined;
    if (!galleryItem?.drive_file_id) continue;

    const imageUrl = driveFileViewUrl(galleryItem.drive_file_id);
    const { error: updateError } = await supabase
      .from('ocs')
      .update({ image_url: imageUrl })
      .eq('id', oc.id);

    if (updateError) {
      logger.warn('GalleryAutoProfileImage', 'OC update failed', { ocId: oc.id, updateError });
      continue;
    }

    results.push({ ocId: oc.id, ocName: oc.name, image_url: imageUrl });
  }

  return results;
}
