import { getGoogleDriveFileId } from '@/lib/utils/googleDriveImage';

/** Parse a pasted Google Drive file URL or raw file ID. */
export function parseGalleryDriveFileId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const fromUrl = getGoogleDriveFileId(trimmed);
  if (fromUrl) return fromUrl;

  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed;

  return null;
}

/** Split textarea / comma-separated input into non-empty lines. */
export function splitGalleryLinkInput(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
