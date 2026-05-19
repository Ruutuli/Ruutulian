/** Default Google Drive folder IDs for site gallery sync (overridable in Site Settings). */
export const DEFAULT_GALLERY_DRIVE_FOLDER_IDS: string[] = ['1G726cwwPCK2OtbpG_m0R9id5XvV_XL-G'];

/** Extract folder IDs from lines: raw id, or Drive URLs containing /folders/{id} or ?id=. */
export function parseGalleryDriveFolderIds(text: string): string[] {
  const lines = text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const ids: string[] = [];
  for (const line of lines) {
    const fromPath = line.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (fromPath) {
      ids.push(fromPath[1]);
      continue;
    }
    const fromQuery = line.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (fromQuery) {
      ids.push(fromQuery[1]);
      continue;
    }
    ids.push(line);
  }
  return ids;
}

export function driveFileViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

/** Public gallery: images per page (URL ?page=). */
export const GALLERY_PUBLIC_PAGE_SIZE = 48;

/** Admin gallery: default items per page (API offset/limit). */
export const GALLERY_ADMIN_PAGE_SIZE = 48;

/** Admin gallery: allowed page sizes (max 100 on API). */
export const GALLERY_ADMIN_PAGE_SIZES = [24, 48, 96] as const;

/** next/cache tag — call revalidateTag when gallery metadata or items change. */
export const GALLERY_FACETS_REVALIDATE_TAG = 'gallery-facets';
