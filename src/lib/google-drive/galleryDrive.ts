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

function parseServiceAccountCredentials(): ServiceAccountCredentials {
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

function collectReadableWithByteLimit(stream: Readable, maxBytes: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    stream.on('data', (chunk: Buffer | string | Uint8Array) => {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buf.length;
      if (total > maxBytes) {
        stream.destroy();
        reject(new Error(`Drive media exceeds maxBytes (${maxBytes})`));
        return;
      }
      chunks.push(buf);
    });
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

/**
 * Raw file bytes via Drive API (alt=media). Prefer this over public thumbnail URLs when
 * the service account can read the file — avoids CDN responses that decode as corrupt/green frames.
 */
export async function fetchDriveFileMediaBuffer(
  fileId: string,
  maxBytes: number
): Promise<{ buffer: Buffer; contentTypeHeader: string | null } | null> {
  let drive: drive_v3.Drive;
  try {
    drive = await createGalleryDriveClient();
  } catch {
    return null;
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
    if (buffer.length <= 100) return null;
    return { buffer, contentTypeHeader };
  } catch (err) {
    logger.warn('GalleryDrive', 'fetchDriveFileMediaBuffer failed', {
      fileId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
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
      if (f.id && typeof f.name === 'string') {
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
        } else if (mt.includes('image/')) {
          imageCount += 1;
          images.push({ id: f.id, name: f.name, mimeType: f.mimeType ?? null });
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
