import { createAdminClient } from '@/lib/supabase/server';
import { checkAuth } from '@/lib/auth/require-auth';
import { handleError } from '@/lib/api/route-helpers';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const publishedOnly = searchParams.get('published') === 'true';
    const limitRaw = parseInt(searchParams.get('limit') ?? '36', 10);
    const offsetRaw = parseInt(searchParams.get('offset') ?? '0', 10);
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 36, 1), 100);
    const offset = Math.max(Number.isFinite(offsetRaw) ? offsetRaw : 0, 0);

    const supabase = createAdminClient();
    let query = supabase
      .from('gallery_items')
      .select(
        `
        *,
        gallery_item_ocs (
          oc_id,
          oc:ocs (id, name, slug)
        )
      `,
        { count: 'exact' }
      )
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (publishedOnly) {
      query = query.eq('published', true);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      logger.error('GalleryItems', 'Select failed', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: data ?? [],
      total: count ?? 0,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('GalleryItems', 'Request failed', error);
    return handleError(error, 'Failed to load gallery items');
  }
}
