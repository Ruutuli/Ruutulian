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
      `
      )
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (publishedOnly) {
      query = query.eq('published', true);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('GalleryItems', 'Select failed', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (error) {
    logger.error('GalleryItems', 'Request failed', error);
    return handleError(error, 'Failed to load gallery items');
  }
}
