import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import type { drive_v3 } from 'googleapis';

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
  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (inline) return inline;

  const filePath =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (filePath) {
    const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
    return fs.readFileSync(resolved, 'utf8').trim();
  }

  throw new Error(
    'Set GOOGLE_SERVICE_ACCOUNT_JSON (inline or base64), or GOOGLE_SERVICE_ACCOUNT_JSON_PATH / GOOGLE_APPLICATION_CREDENTIALS pointing at your service account .json file'
  );
}

function parseServiceAccountCredentials(): ServiceAccountCredentials {
  const raw = getServiceAccountJsonRaw();
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    try {
      const decoded = Buffer.from(raw, 'base64').toString('utf8');
      parsed = JSON.parse(decoded) as Record<string, unknown>;
    } catch {
      throw new Error('Service account JSON must be valid JSON or base64-encoded JSON');
    }
  }
  const client_email = parsed.client_email;
  const private_key = parsed.private_key;
  if (typeof client_email !== 'string' || typeof private_key !== 'string') {
    throw new Error('Service account JSON must include client_email and private_key');
  }
  return { client_email, private_key };
}

export async function createGalleryDriveClient(): Promise<drive_v3.Drive> {
  const { client_email, private_key } = parseServiceAccountCredentials();
  const jwt = new google.auth.JWT({
    email: client_email,
    key: private_key,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  return google.drive({ version: 'v3', auth: jwt });
}

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
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
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

/** Convenience: one Drive client per call (prefer batching with createGalleryDriveClient + listImageFilesInFolderWithClient). */
export async function listImageFilesInFolder(folderId: string): Promise<DriveImageFile[]> {
  const drive = await createGalleryDriveClient();
  return listImageFilesInFolderWithClient(drive, folderId);
}
