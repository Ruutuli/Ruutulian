import { createAdminClient } from '@/lib/supabase/server';
import { checkAuth } from '@/lib/auth/require-auth';
import { handleError } from '@/lib/api/route-helpers';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  createGalleryDriveClient,
  listImageFilesInFolderTreeWithClient,
} from '@/lib/google-drive/galleryDrive';
import { DEFAULT_GALLERY_DRIVE_FOLDER_IDS, GALLERY_FACETS_REVALIDATE_TAG } from '@/lib/gallery/constants';
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

    logger.info('GallerySync', 'starting', {
      folderCount: folderIds.length,
      folderIds,
      source:
        Array.isArray(rawFolderIds) &&
        rawFolderIds.length > 0 &&
        rawFolderIds.every((id) => typeof id === 'string' && id.trim())
          ? 'site_settings'
          : 'defaults',
    });

    const { data: exclusionRows, error: exclusionError } = await supabase
      .from('gallery_sync_exclusions')
      .select('drive_file_id');

    if (exclusionError) {
      logger.error('GallerySync', 'Failed to load sync exclusions', exclusionError);
      return NextResponse.json({ success: false, error: exclusionError.message }, { status: 400 });
    }

    const excludedDriveIds = new Set(
      (exclusionRows ?? [])
        .map((r) => r.drive_file_id as string)
        .filter((id) => typeof id === 'string' && id.length > 0)
    );

    const errors: string[] = [];

    if (excludedDriveIds.size > 0) {
      const { error: purgeExcludedError } = await supabase
        .from('gallery_items')
        .delete()
        .in('drive_file_id', [...excludedDriveIds]);

      if (purgeExcludedError) {
        logger.error('GallerySync', 'Failed to purge excluded gallery items', purgeExcludedError);
        errors.push(`cleanup (excluded): ${purgeExcludedError.message}`);
      }
    }

    const drive = await createGalleryDriveClient();
    const syncStartedAt = new Date().toISOString();
    let synced = 0;
    const seenDriveFileIds = new Set<string>();
    let folderListFailures = 0;
    let skippedExcluded = 0;

    for (const folderId of folderIds) {
      const trimmed = folderId.trim();
      try {
        const files = await listImageFilesInFolderTreeWithClient(drive, trimmed);
        logger.info('GallerySync', 'Drive tree listed for root', {
          rootFolderId: trimmed,
          fileCount: files.length,
        });

        const RPC_BATCH = 20;
        for (let i = 0; i < files.length; i += RPC_BATCH) {
          const batch = files.slice(i, i + RPC_BATCH);
          skippedExcluded += batch.filter((f) => excludedDriveIds.has(f.id)).length;
          const chunk = batch.filter((f) => !excludedDriveIds.has(f.id));
          if (chunk.length === 0) continue;

          const results = await Promise.all(
            chunk.map((file) =>
              supabase.rpc('upsert_gallery_item_from_sync', {
                p_drive_file_id: file.id,
                p_name: file.name ?? '',
                p_mime_type: file.mimeType,
                p_folder_id: trimmed,
                p_last_synced_at: syncStartedAt,
              })
            )
          );
          for (let j = 0; j < chunk.length; j++) {
            const file = chunk[j]!;
            const { error: rpcError } = results[j]!;
            if (rpcError) {
              logger.error('GallerySync', 'RPC upsert failed', {
                fileId: file.id,
                message: rpcError.message,
              });
              errors.push(`${file.id}: ${rpcError.message}`);
            } else {
              synced += 1;
              seenDriveFileIds.add(file.id);
            }
          }
        }
      } catch (e) {
        folderListFailures += 1;
        const msg = e instanceof Error ? e.message : String(e);
        logger.error('GallerySync', 'Folder list failed', { folderId: trimmed, msg });
        errors.push(`folder ${trimmed}: ${msg}`);
      }
    }

    let removedFromOldFolders = 0;
    let removedStale = 0;

    if (folderIds.length > 0) {
      const folderList = `(${folderIds.join(',')})`;

      const { data: oldFolderRows, error: oldFolderError } = await supabase
        .from('gallery_items')
        .delete()
        .not('folder_id', 'in', folderList)
        .select('id');

      if (oldFolderError) {
        logger.error('GallerySync', 'Failed to remove items from unconfigured folders', oldFolderError);
        errors.push(`cleanup (old folders): ${oldFolderError.message}`);
      } else {
        removedFromOldFolders = oldFolderRows?.length ?? 0;
      }

      // Only prune configured folders when every root folder was listed successfully.
      if (folderListFailures === 0) {
        if (seenDriveFileIds.size > 0) {
          const seenList = `(${[...seenDriveFileIds].join(',')})`;
          const { data: staleRows, error: staleError } = await supabase
            .from('gallery_items')
            .delete()
            .in('folder_id', folderIds)
            .not('drive_file_id', 'in', seenList)
            .select('id');

          if (staleError) {
            logger.error('GallerySync', 'Failed to remove stale items from configured folders', staleError);
            errors.push(`cleanup (stale): ${staleError.message}`);
          } else {
            removedStale = staleRows?.length ?? 0;
          }
        } else {
          const { data: emptyFolderRows, error: emptyFolderError } = await supabase
            .from('gallery_items')
            .delete()
            .in('folder_id', folderIds)
            .select('id');

          if (emptyFolderError) {
            logger.error('GallerySync', 'Failed to clear empty configured folders', emptyFolderError);
            errors.push(`cleanup (empty folders): ${emptyFolderError.message}`);
          } else {
            removedStale = emptyFolderRows?.length ?? 0;
          }
        }
      } else {
        logger.warn('GallerySync', 'Skipped stale cleanup because one or more folders failed to list', {
          folderListFailures,
        });
      }
    }

    try {
      revalidateTag('site-config');
      revalidateTag(GALLERY_FACETS_REVALIDATE_TAG);
    } catch {
      /* ignore */
    }

    logger.info('GallerySync', 'finished', {
      synced,
      removedFromOldFolders,
      removedStale,
      errorCount: errors.length,
      folders: folderIds.length,
      folderIds,
      errorsPreview: errors.length ? errors.slice(0, 20) : undefined,
      moreErrors: errors.length > 20 ? errors.length - 20 : 0,
    });

    return NextResponse.json({
      success: errors.length === 0,
      synced,
      removedFromOldFolders,
      removedStale,
      removed: removedFromOldFolders + removedStale,
      errors,
      folders: folderIds.length,
    });
  } catch (error) {
    logger.error('GallerySync', 'Request failed', error);
    return handleError(error, 'Gallery sync failed');
  }
}
