import fs from 'fs';
import path from 'path';
import type { Readable } from 'stream';
import { google } from 'googleapis';
import type { drive_v3 } from 'googleapis';
import { logger } from '@/lib/logger';

export interface DriveImageFile {
  id: string;
  name: string;
  mimeType: string | null;
}

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
}

function getServiceAccountJsonRaw(): string {
  // Prefer a short path var + file read: large inline JSON in .env is often corrupted when
  // Next.js/webpack embeds process.env.* into server bundles.
  const filePath =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (filePath) {
    const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
    return fs.readFileSync(resolved, 'utf8').trim();
  }

  const inlineKey = ['GOOGLE', 'SERVICE', 'ACCOUNT', 'JSON'].join('_');
  const inline = process.env[inlineKey]?.trim();
  if (inline) return inline;

  throw new Error(
    'Set GOOGLE_SERVICE_ACCOUNT_JSON (inline or base64), or GOOGLE_SERVICE_ACCOUNT_JSON_PATH / GOOGLE_APPLICATION_CREDENTIALS pointing at your service account .json file'
  );
}

/**
 * Some editors / dotenv + very long quoted lines leave credentials JSON over-escaped
 * (e.g. `{\\"type\\":...}` or the whole blob double-wrapped as a JSON string).
 */
function tryParseServiceAccountJson(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim().replace(/^\uFEFF/, '');
  const attempts: string[] = [];

  attempts.push(trimmed);

  if (trimmed.startsWith('"')) {
    try {
      const once = JSON.parse(trimmed);
      if (typeof once === 'string') {
        attempts.push(once);
      }
    } catch {
      /* ignore */
    }
  }

  let stripped = trimmed;
  if (stripped.startsWith('"') && stripped.endsWith('"') && stripped.length > 2) {
    stripped = stripped.slice(1, -1);
    attempts.push(stripped);
    // Dotenv sometimes leaves `\"` sequences where JSON expects `"`.
    if (/^\{\\"/.test(stripped)) {
      attempts.push(stripped.replace(/\\"/g, '"'));
    }
  }

  for (const candidate of attempts) {
    try {
      const o = JSON.parse(candidate) as unknown;
      if (o && typeof o === 'object' && !Array.isArray(o)) {
        return o as Record<string, unknown>;
      }
    } catch {
      /* try next */
    }
  }

  try {
    const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
    const o = JSON.parse(decoded) as unknown;
    if (o && typeof o === 'object' && !Array.isArray(o)) {
      return o as Record<string, unknown>;
    }
  } catch {
    /* ignore */
  }

  return null;
}

/** Supports GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY or legacy flat .env keys (client_email, private_key). */
function getServiceAccountFromFlatEnv(): ServiceAccountCredentials | null {
  const client_email =
    process.env.GOOGLE_CLIENT_EMAIL?.trim() || process.env.client_email?.trim();
  const rawKey =
    process.env.GOOGLE_PRIVATE_KEY?.trim() || process.env.private_key?.trim();
  if (!client_email || !rawKey) return null;
  const private_key = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;
  return { client_email, private_key };
}

function parseServiceAccountCredentials(): ServiceAccountCredentials {
  const flat = getServiceAccountFromFlatEnv();
  if (flat) return flat;

  const raw = getServiceAccountJsonRaw();
  const parsed = tryParseServiceAccountJson(raw);
  if (!parsed) {
    throw new Error('Service account JSON must be valid JSON or base64-encoded JSON');
  }
  const client_email = parsed.client_email;
  const private_key = parsed.private_key;
  if (typeof client_email !== 'string' || typeof private_key !== 'string') {
    throw new Error('Service account JSON must include client_email and private_key');
  }
  return { client_email, private_key };
}

/** Service account email for sharing Drive files (gallery + optional markdown images). */
export function getServiceAccountClientEmail(): string | null {
  try {
    return parseServiceAccountCredentials().client_email;
  } catch {
    return (
      process.env.GOOGLE_CLIENT_EMAIL?.trim() ||
      process.env.client_email?.trim() ||
      null
    );
  }
}

let galleryDriveSingleton: Promise<drive_v3.Drive> | undefined;

export async function createGalleryDriveClient(): Promise<drive_v3.Drive> {
  if (!galleryDriveSingleton) {
    galleryDriveSingleton = (async () => {
      const { client_email, private_key } = parseServiceAccountCredentials();
      const jwt = new google.auth.JWT({
        email: client_email,
        key: private_key,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });
      return google.drive({ version: 'v3', auth: jwt });
    })();
  }
  return galleryDriveSingleton;
}

const DEFAULT_IMAGE_PROXY_MAX_BYTES = 8 * 1024 * 1024;
const ABSOLUTE_IMAGE_PROXY_MAX_BYTES = 32 * 1024 * 1024;

/** Max bytes per proxied image (env `IMAGE_PROXY_MAX_BYTES`, capped at 32MB). */
export function getImageProxyMaxBytes(): number {
  const raw = process.env.IMAGE_PROXY_MAX_BYTES?.trim();
  if (!raw) return DEFAULT_IMAGE_PROXY_MAX_BYTES;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 256 * 1024) return DEFAULT_IMAGE_PROXY_MAX_BYTES;
  return Math.min(n, ABSOLUTE_IMAGE_PROXY_MAX_BYTES);
}

class DriveMediaTooLargeError extends Error {
  constructor(maxBytes: number) {
    super(`Drive media exceeds maxBytes (${maxBytes})`);
    this.name = 'DriveMediaTooLargeError';
  }
}

function collectReadableWithByteLimit(stream: Readable, maxBytes: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    stream.on('data', (chunk: Buffer | string | Uint8Array) => {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buf.length;
      if (total > maxBytes) {
        stream.destroy();
        reject(new DriveMediaTooLargeError(maxBytes));
        return;
      }
      chunks.push(buf);
    });
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

export type DriveFileMediaResult =
  | { status: 'ok'; buffer: Buffer; contentTypeHeader: string | null }
  | { status: 'too_large' }
  | { status: 'error' };

/**
 * Download a link-shared ("Anyone with the link") file using a Google Cloud API key.
 * Does not require the service account to be granted access to the file.
 * @see https://developers.google.com/drive/api/guides/api-specific-auth
 */
export async function fetchPublicDriveFileWithApiKey(
  fileId: string,
  maxBytes: number
): Promise<{ buffer: Buffer } | null> {
  const apiKey = process.env.GOOGLE_API_KEY?.trim();
  if (!apiKey) return null;

  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&key=${encodeURIComponent(apiKey)}`;

  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) {
      logger.warn('GalleryDrive', 'fetchPublicDriveFileWithApiKey HTTP error', {
        fileId,
        status: res.status,
      });
      return null;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length <= 100 || buffer.length > maxBytes) {
      return null;
    }
    return { buffer };
  } catch (err) {
    logger.warn('GalleryDrive', 'fetchPublicDriveFileWithApiKey failed', {
      fileId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Raw file bytes via Drive API (alt=media). Prefer this over public thumbnail URLs when
 * the service account can read the file — avoids CDN responses that decode as corrupt/green frames.
 */
export async function fetchDriveFileMediaBuffer(
  fileId: string,
  maxBytes: number
): Promise<DriveFileMediaResult> {
  let drive: drive_v3.Drive;
  try {
    drive = await createGalleryDriveClient();
  } catch {
    return { status: 'error' };
  }

  try {
    const res = await drive.files.get(
      {
        fileId,
        alt: 'media',
        supportsAllDrives: true,
      },
      { responseType: 'stream' }
    );

    const stream = res.data as Readable;
    const rawCt = res.headers['content-type'];
    const contentTypeHeader =
      typeof rawCt === 'string' ? rawCt : Array.isArray(rawCt) ? rawCt[0] ?? null : null;

    const buffer = await collectReadableWithByteLimit(stream, maxBytes);
    if (buffer.length <= 100) return { status: 'error' };
    return { status: 'ok', buffer, contentTypeHeader };
  } catch (err) {
    if (err instanceof DriveMediaTooLargeError) {
      logger.info('GalleryDrive', 'fetchDriveFileMediaBuffer too large, use thumbnail fallback', {
        fileId,
        maxBytes,
      });
      return { status: 'too_large' };
    }
    logger.warn('GalleryDrive', 'fetchDriveFileMediaBuffer failed', {
      fileId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { status: 'error' };
  }
}

/**
 * Drive-hosted thumbnail when full `alt=media` exceeds the proxy byte cap.
 * Uses the API thumbnailLink (upsized when Google exposes `=sNNN` in the URL).
 */
export async function fetchDriveFileThumbnailBuffer(
  fileId: string,
  maxBytes: number
): Promise<{ buffer: Buffer } | null> {
  let drive: drive_v3.Drive;
  try {
    drive = await createGalleryDriveClient();
  } catch {
    return null;
  }

  try {
    const meta = await drive.files.get({
      fileId,
      fields: 'thumbnailLink',
      supportsAllDrives: true,
    });
    const rawLink = meta.data.thumbnailLink;
    if (!rawLink) return null;

    const thumbnailUrl = rawLink.replace(/=s\d+$/i, '=s1920');
    const res = await fetch(thumbnailUrl, { redirect: 'follow' });
    if (!res.ok) {
      logger.warn('GalleryDrive', 'fetchDriveFileThumbnailBuffer HTTP error', {
        fileId,
        status: res.status,
      });
      return null;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length <= 100 || buffer.length > maxBytes) return null;
    return { buffer };
  } catch (err) {
    logger.warn('GalleryDrive', 'fetchDriveFileThumbnailBuffer failed', {
      fileId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/** Working/source art formats — excluded from gallery sync (not suitable for web display). */
const GALLERY_EXCLUDED_EXTENSIONS = new Set(['psd', 'clip', 'sai', 'sai2']);

const GALLERY_EXCLUDED_MIME_MARKERS = ['photoshop', 'x-photoshop', 'vnd.adobe.photoshop'] as const;

/** True for PSD, Clip Studio (.clip), PaintTool SAI (.sai / .sai2), etc. */
export function isExcludedGallerySourceFile(name: string, mimeType: string | null): boolean {
  const lowerName = name.toLowerCase();
  const dot = lowerName.lastIndexOf('.');
  if (dot >= 0) {
    const ext = lowerName.slice(dot + 1);
    if (GALLERY_EXCLUDED_EXTENSIONS.has(ext)) return true;
  }
  const mt = (mimeType ?? '').toLowerCase();
  return GALLERY_EXCLUDED_MIME_MARKERS.some((marker) => mt.includes(marker));
}

function isGallerySyncableImage(name: string, mimeType: string | null): boolean {
  const mt = mimeType ?? '';
  if (!mt.includes('image/')) return false;
  return !isExcludedGallerySourceFile(name, mimeType);
}

const GOOGLE_DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder';

/** Shared Drive / Team Drive listing; omitting corpora often returns empty children. */
const driveListSharedOpts = {
  supportsAllDrives: true,
  includeItemsFromAllDrives: true,
  corpora: 'allDrives' as const,
};

/**
 * Lists image files directly inside a folder (not recursive).
 */
export async function listImageFilesInFolderWithClient(
  drive: drive_v3.Drive,
  folderId: string
): Promise<DriveImageFile[]> {
  const files: DriveImageFile[] = [];
  let pageToken: string | undefined;
  const trimmedFolder = folderId.trim();
  const q = `'${trimmedFolder}' in parents and mimeType contains 'image/' and trashed = false`;

  do {
    const res = await drive.files.list({
      q,
      fields: 'nextPageToken, files(id, name, mimeType)',
      pageSize: 1000,
      pageToken,
      ...driveListSharedOpts,
    });

    const batch = res.data.files ?? [];
    for (const f of batch) {
      if (f.id && typeof f.name === 'string' && isGallerySyncableImage(f.name, f.mimeType ?? null)) {
        files.push({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType ?? null,
        });
      }
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return files;
}

/**
 * Lists all image files under a folder, including nested subfolders (breadth-first).
 * Logs each folder page (batch size, subfolders, images, shortcuts, sample non-image MIME types).
 */
export async function listImageFilesInFolderTreeWithClient(
  drive: drive_v3.Drive,
  rootFolderId: string
): Promise<DriveImageFile[]> {
  const images: DriveImageFile[] = [];
  const visited = new Set<string>();
  const queue: string[] = [rootFolderId.trim()];

  logger.info('GalleryDrive', 'tree scan start', {
    rootFolderId: rootFolderId.trim(),
    hint: 'If batchSize is always 0, check folder ID and sharing with the service account.',
  });

  while (queue.length > 0) {
    const folderId = queue.shift()!;
    if (visited.has(folderId)) continue;
    visited.add(folderId);

    let pageToken: string | undefined;
    let pageIndex = 0;
    do {
      const q = `'${folderId}' in parents and trashed = false`;
      let batch: drive_v3.Schema$File[];
      let nextPageToken: string | undefined;
      try {
        const apiRes = await drive.files.list({
          q,
          fields: 'nextPageToken, files(id, name, mimeType)',
          pageSize: 1000,
          pageToken,
          ...driveListSharedOpts,
        });
        batch = apiRes.data.files ?? [];
        nextPageToken = apiRes.data.nextPageToken ?? undefined;
      } catch (err) {
        logger.error('GalleryDrive', 'files.list failed', {
          folderId,
          pageIndex,
          q,
          err: err instanceof Error ? { message: err.message, name: err.name } : err,
        });
        throw err;
      }

      let subfolders = 0;
      let imageCount = 0;
      let skippedSourceFiles = 0;
      let shortcuts = 0;
      const otherSamples: Array<{ name: string; mimeType: string }> = [];

      for (const f of batch) {
        if (!f.id || typeof f.name !== 'string') continue;
        const mt = f.mimeType ?? '';
        if (mt === GOOGLE_DRIVE_FOLDER_MIME) {
          subfolders += 1;
          queue.push(f.id);
        } else if (mt === 'application/vnd.google-apps.shortcut') {
          shortcuts += 1;
          if (otherSamples.length < 5) {
            otherSamples.push({ name: f.name, mimeType: mt });
          }
        } else if (isGallerySyncableImage(f.name, mt)) {
          imageCount += 1;
          images.push({ id: f.id, name: f.name, mimeType: f.mimeType ?? null });
        } else if (mt.includes('image/') && isExcludedGallerySourceFile(f.name, mt)) {
          skippedSourceFiles += 1;
        } else if (otherSamples.length < 5) {
          otherSamples.push({ name: f.name, mimeType: mt || '(empty)' });
        }
      }

      logger.info('GalleryDrive', 'folder list page', {
        folderId,
        pageIndex,
        batchSize: batch.length,
        subfoldersAddedToQueue: subfolders,
        imagesFoundThisPage: imageCount,
        skippedSourceFiles,
        shortcuts,
        queueDepth: queue.length,
        foldersVisitedSoFar: visited.size,
        otherSamples: otherSamples.length ? otherSamples : undefined,
      });

      pageToken = nextPageToken;
      pageIndex += 1;
    } while (pageToken);
  }

  logger.info('GalleryDrive', 'tree scan complete', {
    rootFolderId: rootFolderId.trim(),
    foldersVisited: visited.size,
    imagesTotal: images.length,
  });

  return images;
}

/** Convenience: one Drive client per call (includes subfolders). */
export async function listImageFilesInFolder(folderId: string): Promise<DriveImageFile[]> {
  const drive = await createGalleryDriveClient();
  return listImageFilesInFolderTreeWithClient(drive, folderId);
}
