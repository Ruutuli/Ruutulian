/** Default Google Drive folder IDs for site gallery sync (overridable in Site Settings). */
export const DEFAULT_GALLERY_DRIVE_FOLDER_IDS: string[] = [
  '1cNbJyTekBz-72AuUFIK6nq38cWfj212F',
  '0B91YVOBsNxk_VnNteHpZWWE5TGM',
];

/** Extract folder IDs from lines: raw id, or Drive URLs containing /folders/{id} or ?id=. */
export function parseGalleryDriveFolderIds(text: string): string[] {
  const lines = text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const fromPath = line.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (fromPath) {
      const id = fromPath[1];
      if (!seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
      continue;
    }
    const fromQuery = line.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (fromQuery) {
      const id = fromQuery[1];
      if (!seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
      continue;
    }
    if (!seen.has(line)) {
      seen.add(line);
      ids.push(line);
    }
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
