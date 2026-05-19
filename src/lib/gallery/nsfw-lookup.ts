import { getGoogleDriveFileId } from '@/lib/utils/googleDriveImage';
import type { SupabaseClient } from '@supabase/supabase-js';

export type GalleryUrlEntry = { url: string; isNsfw?: boolean };

/** Merge gallery URLs by Drive file id and apply NSFW flags from gallery_items. */
export async function mergeGalleryEntriesWithNsfw(
  supabase: SupabaseClient,
  entries: GalleryUrlEntry[]
): Promise<{ url: string; isNsfw: boolean }[]> {
  if (entries.length === 0) return [];

  const fileIds = entries
    .map((e) => getGoogleDriveFileId(e.url))
    .filter((id): id is string => Boolean(id));
  const flags = await getNsfwFlagsByDriveFileIds(supabase, fileIds);

  const byKey = new Map<string, { url: string; isNsfw: boolean }>();

  for (const entry of entries) {
    const fileId = getGoogleDriveFileId(entry.url);
    const key = fileId ?? entry.url.trim();
    if (!key) continue;

    const fromDb = fileId ? Boolean(flags.get(fileId)) : false;
    const isNsfw = Boolean(entry.isNsfw) || fromDb;
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, { url: entry.url, isNsfw });
      continue;
    }

    byKey.set(key, {
      url: existing.url,
      isNsfw: existing.isNsfw || isNsfw,
    });
  }

  return Array.from(byKey.values());
}

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
