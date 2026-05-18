import { createAdminClient } from '@/lib/supabase/server';
import { checkAuth } from '@/lib/auth/require-auth';
import { handleError } from '@/lib/api/route-helpers';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { GALLERY_FACETS_REVALIDATE_TAG } from '@/lib/gallery/constants';
import { revalidateTag } from 'next/cache';

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

    const updates: Record<string, unknown> = {};
    if (typeof published === 'boolean') updates.published = published;
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

    if (Array.isArray(ocIds)) {
      const { error: delError } = await supabase.from('gallery_item_ocs').delete().eq('gallery_item_id', id);
      if (delError) {
        logger.error('GalleryItemPatch', 'Clear junction failed', delError);
        return NextResponse.json({ success: false, error: delError.message }, { status: 400 });
      }

      const rows = ocIds
        .filter((oid) => typeof oid === 'string' && oid.length > 0)
        .map((oc_id) => ({ gallery_item_id: id, oc_id }));

      if (rows.length > 0) {
        const { error: insError } = await supabase.from('gallery_item_ocs').insert(rows);
        if (insError) {
          logger.error('GalleryItemPatch', 'Insert junction failed', insError);
          return NextResponse.json({ success: false, error: insError.message }, { status: 400 });
        }
      }
    }

    const { data: row, error: fetchError } = await supabase
      .from('gallery_items')
      .select(
        `
        *,
        gallery_item_ocs (
          oc_id,
          oc:ocs (id, name, slug)
        )
      `
      )
      .eq('id', id)
      .single();

    if (fetchError) {
      logger.error('GalleryItemPatch', 'Reload failed', fetchError);
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 400 });
    }

    try {
      revalidateTag('site-config');
      revalidateTag(GALLERY_FACETS_REVALIDATE_TAG);
    } catch {
      /* ignore */
    }

    return NextResponse.json({ success: true, data: row });
  } catch (error) {
    logger.error('GalleryItemPatch', 'Request failed', error);
    return handleError(error, 'Failed to update gallery item');
  }
}
