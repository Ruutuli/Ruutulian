import { createAdminClient } from '@/lib/supabase/server';
import { checkAuth } from '@/lib/auth/require-auth';
import { handleError } from '@/lib/api/route-helpers';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { GALLERY_MANUAL_LINK_FOLDER_ID } from '@/lib/gallery/constants';
import { parseGalleryDriveFileId, splitGalleryLinkInput } from '@/lib/gallery/parse-drive-link';
import { revalidateGalleryCaches } from '@/lib/gallery/revalidate';
import { createGalleryDriveClient } from '@/lib/google-drive/galleryDrive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GALLERY_ITEM_SELECT = `
  *,
  gallery_item_ocs (
    oc_id,
    oc:ocs (id, name, slug, image_url)
  )
`;

async function fetchDriveFileName(fileId: string): Promise<{ name: string; mimeType: string | null }> {
  try {
    const drive = await createGalleryDriveClient();
    const meta = await drive.files.get({
      fileId,
      fields: 'name,mimeType',
      supportsAllDrives: true,
    });
    return {
      name: typeof meta.data.name === 'string' ? meta.data.name : '',
      mimeType: typeof meta.data.mimeType === 'string' ? meta.data.mimeType : null,
    };
  } catch (e) {
    logger.warn('GalleryAddByLink', 'Drive metadata lookup failed', {
      fileId,
      error: e instanceof Error ? e.message : String(e),
    });
    return { name: '', mimeType: null };
  }
}

export async function POST(request: Request) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const rawLinks: string[] = [];
    if (typeof body?.url === 'string' && body.url.trim()) {
      rawLinks.push(body.url.trim());
    }
    if (typeof body?.urls === 'string' && body.urls.trim()) {
      rawLinks.push(...splitGalleryLinkInput(body.urls));
    }
    if (Array.isArray(body?.urls)) {
      for (const u of body.urls) {
        if (typeof u === 'string' && u.trim()) rawLinks.push(u.trim());
      }
    }

    const lines = [...new Set(rawLinks)];
    if (lines.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Paste at least one Google Drive file link or file ID.' },
        { status: 400 }
      );
    }

    if (lines.length > 20) {
      return NextResponse.json(
        { success: false, error: 'Add at most 20 links at a time.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const added: unknown[] = [];
    const existing: { id: string; drive_file_id: string }[] = [];
    const failed: { input: string; error: string }[] = [];

    for (const input of lines) {
      const fileId = parseGalleryDriveFileId(input);
      if (!fileId) {
        failed.push({ input, error: 'Not a valid Google Drive file link or file ID.' });
        continue;
      }

      const { data: prev } = await supabase
        .from('gallery_items')
        .select('id, drive_file_id')
        .eq('drive_file_id', fileId)
        .maybeSingle();

      if (prev?.id) {
        existing.push({ id: prev.id as string, drive_file_id: fileId });
        continue;
      }

      const { name, mimeType } = await fetchDriveFileName(fileId);
      const now = new Date().toISOString();

      const { data: row, error: insertError } = await supabase
        .from('gallery_items')
        .insert({
          drive_file_id: fileId,
          name: name || '',
          mime_type: mimeType,
          folder_id: GALLERY_MANUAL_LINK_FOLDER_ID,
          last_synced_at: now,
          published: false,
        })
        .select(GALLERY_ITEM_SELECT)
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          const { data: dup } = await supabase
            .from('gallery_items')
            .select('id, drive_file_id')
            .eq('drive_file_id', fileId)
            .maybeSingle();
          if (dup?.id) {
            existing.push({ id: dup.id as string, drive_file_id: fileId });
            continue;
          }
        }
        logger.error('GalleryAddByLink', 'Insert failed', { fileId, message: insertError.message });
        failed.push({ input, error: insertError.message });
        continue;
      }

      added.push(row);
    }

    if (added.length > 0) {
      revalidateGalleryCaches();
    }

    const success = added.length > 0 || existing.length > 0;

    return NextResponse.json({
      success,
      data: { added, existing, failed },
      error:
        !success && failed.length > 0
          ? failed.map((f) => f.error).join(' ')
          : undefined,
    });
  } catch (error) {
    logger.error('GalleryAddByLink', 'Request failed', error);
    return handleError(error, 'Failed to add gallery item by link');
  }
}
