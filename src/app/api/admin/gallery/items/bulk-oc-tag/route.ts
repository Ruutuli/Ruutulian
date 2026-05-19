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

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type BulkOcTagMode = 'add' | 'remove' | 'replace';

const MAX_ITEMS = 200;

export async function POST(request: Request) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { itemIds, ocIds, mode } = body as {
      itemIds?: string[];
      ocIds?: string[];
      mode?: BulkOcTagMode;
    };

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ success: false, error: 'No gallery items selected' }, { status: 400 });
    }
    if (!Array.isArray(ocIds) || ocIds.length === 0) {
      return NextResponse.json({ success: false, error: 'No characters selected' }, { status: 400 });
    }
    if (mode !== 'add' && mode !== 'remove' && mode !== 'replace') {
      return NextResponse.json({ success: false, error: 'Invalid mode' }, { status: 400 });
    }

    const ids = [...new Set(itemIds.filter((id) => typeof id === 'string' && id.length > 0))];
    const ocs = [...new Set(ocIds.filter((id) => typeof id === 'string' && id.length > 0))];

    if (ids.length === 0 || ocs.length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid item or character ids' }, { status: 400 });
    }
    if (ids.length > MAX_ITEMS) {
      return NextResponse.json(
        { success: false, error: `Too many items (max ${MAX_ITEMS} per batch)` },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: existingItems, error: itemsError } = await supabase
      .from('gallery_items')
      .select('id')
      .in('id', ids);

    if (itemsError) {
      logger.error('GalleryBulkOcTag', 'Item lookup failed', itemsError);
      return NextResponse.json({ success: false, error: itemsError.message }, { status: 400 });
    }

    const validIds = (existingItems ?? []).map((r) => r.id);
    if (validIds.length === 0) {
      return NextResponse.json({ success: false, error: 'No matching gallery items found' }, { status: 400 });
    }

    if (mode === 'remove') {
      const { error: delError } = await supabase
        .from('gallery_item_ocs')
        .delete()
        .in('gallery_item_id', validIds)
        .in('oc_id', ocs);

      if (delError) {
        logger.error('GalleryBulkOcTag', 'Remove failed', delError);
        return NextResponse.json({ success: false, error: delError.message }, { status: 400 });
      }
    } else if (mode === 'replace') {
      const { error: clearError } = await supabase
        .from('gallery_item_ocs')
        .delete()
        .in('gallery_item_id', validIds);

      if (clearError) {
        logger.error('GalleryBulkOcTag', 'Clear failed', clearError);
        return NextResponse.json({ success: false, error: clearError.message }, { status: 400 });
      }

      const rows = validIds.flatMap((gallery_item_id) =>
        ocs.map((oc_id) => ({ gallery_item_id, oc_id }))
      );

      if (rows.length > 0) {
        const { error: insError } = await supabase.from('gallery_item_ocs').insert(rows);
        if (insError) {
          logger.error('GalleryBulkOcTag', 'Replace insert failed', insError);
          return NextResponse.json({ success: false, error: insError.message }, { status: 400 });
        }
      }
    } else {
      const rows = validIds.flatMap((gallery_item_id) =>
        ocs.map((oc_id) => ({ gallery_item_id, oc_id }))
      );

      const { error: upsertError } = await supabase
        .from('gallery_item_ocs')
        .upsert(rows, { onConflict: 'gallery_item_id,oc_id', ignoreDuplicates: true });

      if (upsertError) {
        logger.error('GalleryBulkOcTag', 'Add failed', upsertError);
        return NextResponse.json({ success: false, error: upsertError.message }, { status: 400 });
      }
    }

    // Character pages only show published items (RLS + OC page query).
    if (mode === 'add' || mode === 'replace') {
      const publishedOk = await publishGalleryItems(supabase, validIds);
      if (!publishedOk) {
        return NextResponse.json(
          { success: false, error: 'Character links saved but publishing failed' },
          { status: 500 }
        );
      }
    }

    revalidateGalleryCaches();
    await revalidateOcPages(supabase, ocs);

    return NextResponse.json({
      success: true,
      data: { itemCount: validIds.length, ocCount: ocs.length, mode },
    });
  } catch (error) {
    logger.error('GalleryBulkOcTag', 'Request failed', error);
    return handleError(error, 'Failed to bulk tag gallery items');
  }
}
