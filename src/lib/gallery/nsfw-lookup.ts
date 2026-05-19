import { getGoogleDriveFileId } from '@/lib/utils/googleDriveImage';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function getNsfwFlagsByDriveFileIds(
  supabase: SupabaseClient,
  fileIds: string[]
): Promise<Map<string, boolean>> {
  const unique = [...new Set(fileIds.filter(Boolean))];
  const map = new Map<string, boolean>();
  if (unique.length === 0) return map;

  const { data } = await supabase
    .from('gallery_items')
    .select('drive_file_id, is_nsfw')
    .in('drive_file_id', unique);

  for (const row of data ?? []) {
    if (row.drive_file_id) {
      map.set(String(row.drive_file_id), Boolean(row.is_nsfw));
    }
  }
  return map;
}

export async function isGalleryImageNsfw(
  supabase: SupabaseClient,
  imageUrl: string | null | undefined
): Promise<boolean> {
  const fileId = getGoogleDriveFileId(imageUrl);
  if (!fileId) return false;
  const flags = await getNsfwFlagsByDriveFileIds(supabase, [fileId]);
  return flags.get(fileId) ?? false;
}

export async function attachImageNsfwFlags<T extends { image_url?: string | null }>(
  supabase: SupabaseClient,
  items: T[]
): Promise<(T & { image_is_nsfw?: boolean })[]> {
  const fileIds = items
    .map((item) => getGoogleDriveFileId(item.image_url))
    .filter((id): id is string => Boolean(id));
  const flags = await getNsfwFlagsByDriveFileIds(supabase, fileIds);
  return items.map((item) => {
    const fileId = getGoogleDriveFileId(item.image_url);
    return {
      ...item,
      image_is_nsfw: fileId ? Boolean(flags.get(fileId)) : false,
    };
  });
}
