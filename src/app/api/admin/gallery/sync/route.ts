import { createAdminClient } from '@/lib/supabase/server';
import { checkAuth } from '@/lib/auth/require-auth';
import { handleError } from '@/lib/api/route-helpers';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  createGalleryDriveClient,
  listImageFilesInFolderWithClient,
} from '@/lib/google-drive/galleryDrive';
import { DEFAULT_GALLERY_DRIVE_FOLDER_IDS } from '@/lib/gallery/constants';
import { revalidateTag } from 'next/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: settingsRow, error: settingsError } = await supabase
      .from('site_settings')
      .select('gallery_drive_folder_ids')
      .maybeSingle();

    if (settingsError && settingsError.code !== 'PGRST116') {
      logger.error('GallerySync', 'Failed to read site_settings', settingsError);
      return NextResponse.json({ success: false, error: settingsError.message }, { status: 400 });
    }

    const rawFolderIds = settingsRow?.gallery_drive_folder_ids as string[] | undefined;
    const folderIds =
      Array.isArray(rawFolderIds) &&
      rawFolderIds.length > 0 &&
      rawFolderIds.every((id) => typeof id === 'string' && id.trim())
        ? rawFolderIds.map((id) => id.trim())
        : [...DEFAULT_GALLERY_DRIVE_FOLDER_IDS];

    const drive = await createGalleryDriveClient();
    const now = new Date().toISOString();
    let synced = 0;
    const errors: string[] = [];

    for (const folderId of folderIds) {
      const trimmed = folderId.trim();
      try {
        const files = await listImageFilesInFolderWithClient(drive, trimmed);
        for (const file of files) {
          const { error: rpcError } = await supabase.rpc('upsert_gallery_item_from_sync', {
            p_drive_file_id: file.id,
            p_name: file.name ?? '',
            p_mime_type: file.mimeType,
            p_folder_id: trimmed,
            p_last_synced_at: now,
          });

          if (rpcError) {
            logger.error('GallerySync', 'RPC upsert failed', {
              fileId: file.id,
              message: rpcError.message,
            });
            errors.push(`${file.id}: ${rpcError.message}`);
          } else {
            synced += 1;
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.error('GallerySync', 'Folder list failed', { folderId: trimmed, msg });
        errors.push(`folder ${trimmed}: ${msg}`);
      }
    }

    try {
      revalidateTag('site-config');
    } catch {
      /* ignore */
    }

    return NextResponse.json({
      success: errors.length === 0,
      synced,
      errors,
      folders: folderIds.length,
    });
  } catch (error) {
    logger.error('GallerySync', 'Request failed', error);
    return handleError(error, 'Gallery sync failed');
  }
}
