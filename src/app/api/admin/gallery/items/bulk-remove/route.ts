import { createAdminClient } from '@/lib/supabase/server';
import { checkAuth } from '@/lib/auth/require-auth';
import { handleError } from '@/lib/api/route-helpers';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { revalidateGalleryCaches, revalidateOcPages } from '@/lib/gallery/revalidate';
import { removeGalleryItemsFromSync } from '@/lib/gallery/remove-from-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { itemIds } = body as { itemIds?: string[] };

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ success: false, error: 'No gallery items selected' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { removed, linkedOcIds } = await removeGalleryItemsFromSync(supabase, itemIds);

    if (removed === 0) {
      return NextResponse.json({ success: false, error: 'No matching gallery items found' }, { status: 400 });
    }

    revalidateGalleryCaches();
    if (linkedOcIds.length > 0) {
      await revalidateOcPages(supabase, linkedOcIds);
    }

    return NextResponse.json({ success: true, data: { removed } });
  } catch (error) {
    logger.error('GalleryBulkRemove', 'Request failed', error);
    const message = error instanceof Error ? error.message : 'Failed to remove gallery items';
    if (message.startsWith('Too many items')) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    return handleError(error, 'Failed to remove gallery items');
  }
}
