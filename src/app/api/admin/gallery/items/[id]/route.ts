import { createAdminClient } from '@/lib/supabase/server';
import { checkAuth } from '@/lib/auth/require-auth';
import { handleError } from '@/lib/api/route-helpers';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  publishGalleryItems,
  revalidateGalleryCaches,
  revalidateOcPages,
} from '@/lib/gallery/revalidate';
import { assignProfileImagesFromGallery } from '@/lib/gallery/auto-profile-image';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    }

    const body = await request.json();
    const { published, tags, sortOrder, ocIds } = body as {
      published?: boolean;
      tags?: string[];
      sortOrder?: number;
      ocIds?: string[];
    };

    const supabase = createAdminClient();

    let linkedOcIds: string[] = [];
    let newlyLinkedOcIds: string[] = [];
    if (Array.isArray(ocIds)) {
      const { data: prevLinks } = await supabase
        .from('gallery_item_ocs')
        .select('oc_id')
        .eq('gallery_item_id', id);

      const prevOcIds = new Set((prevLinks ?? []).map((r) => r.oc_id as string));

      const { error: delError } = await supabase.from('gallery_item_ocs').delete().eq('gallery_item_id', id);
      if (delError) {
        logger.error('GalleryItemPatch', 'Clear junction failed', delError);
        return NextResponse.json({ success: false, error: delError.message }, { status: 400 });
      }

      linkedOcIds = ocIds.filter((oid) => typeof oid === 'string' && oid.length > 0);
      newlyLinkedOcIds = linkedOcIds.filter((oid) => !prevOcIds.has(oid));
      const rows = linkedOcIds.map((oc_id) => ({ gallery_item_id: id, oc_id }));

      if (rows.length > 0) {
        const { error: insError } = await supabase.from('gallery_item_ocs').insert(rows);
        if (insError) {
          logger.error('GalleryItemPatch', 'Insert junction failed', insError);
          return NextResponse.json({ success: false, error: insError.message }, { status: 400 });
        }
      }
    }

    const hasCharacterLinks = linkedOcIds.length > 0;

    const updates: Record<string, unknown> = {};
    if (typeof published === 'boolean') {
      updates.published = hasCharacterLinks ? true : published;
    } else if (hasCharacterLinks) {
      updates.published = true;
    }
    if (Array.isArray(tags)) {
      updates.tags = tags.map((t) => String(t).trim()).filter(Boolean);
    }
    if (typeof sortOrder === 'number' && Number.isFinite(sortOrder)) {
      updates.sort_order = Math.round(sortOrder);
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase.from('gallery_items').update(updates).eq('id', id);

      if (updateError) {
        logger.error('GalleryItemPatch', 'Update failed', updateError);
        return NextResponse.json({ success: false, error: updateError.message }, { status: 400 });
      }
    }

    if (hasCharacterLinks) {
      const publishedOk = await publishGalleryItems(supabase, [id]);
      if (!publishedOk) {
        return NextResponse.json(
          { success: false, error: 'Character links saved but publishing failed' },
          { status: 500 }
        );
      }
    }

    const { data: row, error: fetchError } = await supabase
      .from('gallery_items')
      .select(
        `
        *,
        gallery_item_ocs (
          oc_id,
          oc:ocs (id, name, slug, image_url)
        )
      `
      )
      .eq('id', id)
      .single();

    if (fetchError) {
      logger.error('GalleryItemPatch', 'Reload failed', fetchError);
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 400 });
    }

    let profileImagesSet: Awaited<ReturnType<typeof assignProfileImagesFromGallery>> = [];
    if (newlyLinkedOcIds.length > 0) {
      profileImagesSet = await assignProfileImagesFromGallery(
        supabase,
        newlyLinkedOcIds.map((ocId) => ({ ocId, galleryItemId: id }))
      );
    }

    revalidateGalleryCaches();
    const revalidateIds = [...new Set([...linkedOcIds, ...profileImagesSet.map((r) => r.ocId)])];
    if (revalidateIds.length > 0) {
      await revalidateOcPages(supabase, revalidateIds);
    }

    return NextResponse.json({ success: true, data: row, profileImagesSet });
  } catch (error) {
    logger.error('GalleryItemPatch', 'Request failed', error);
    return handleError(error, 'Failed to update gallery item');
  }
}
