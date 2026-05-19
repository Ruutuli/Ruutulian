import { createAdminClient } from '@/lib/supabase/server';
import { checkAuth } from '@/lib/auth/require-auth';
import { handleError } from '@/lib/api/route-helpers';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { GALLERY_ADMIN_PAGE_SIZE } from '@/lib/gallery/constants';
import { buildGallerySearchOrFilter, GALLERY_SEARCH_MIN_LEN } from '@/lib/gallery/admin-search';

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
    const publishedFilter = searchParams.get('publishedFilter'); // all | published | unpublished
    const searchRaw = (searchParams.get('search') ?? '').trim();
    const ocId = (searchParams.get('ocId') ?? '').trim();
    const sort = searchParams.get('sort') ?? 'sort_order';
    const limitRaw = parseInt(searchParams.get('limit') ?? String(GALLERY_ADMIN_PAGE_SIZE), 10);
    const offsetRaw = parseInt(searchParams.get('offset') ?? '0', 10);
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : GALLERY_ADMIN_PAGE_SIZE, 1), 100);
    const offset = Math.max(Number.isFinite(offsetRaw) ? offsetRaw : 0, 0);

    const supabase = createAdminClient();

    const statsPromise = Promise.all([
      supabase.from('gallery_items').select('*', { count: 'exact', head: true }),
      supabase.from('gallery_items').select('*', { count: 'exact', head: true }).eq('published', true),
    ]);

    let galleryItemIdsForOc: string[] | null = null;
    if (ocId) {
      const { data: links, error: linkError } = await supabase
        .from('gallery_item_ocs')
        .select('gallery_item_id')
        .eq('oc_id', ocId);

      if (linkError) {
        logger.error('GalleryItems', 'OC filter failed', linkError);
        return NextResponse.json({ success: false, error: linkError.message }, { status: 400 });
      }

      galleryItemIdsForOc = (links ?? []).map((r) => r.gallery_item_id);
      if (galleryItemIdsForOc.length === 0) {
        const [[allRes, publishedRes]] = await Promise.all([statsPromise]);
        return NextResponse.json({
          success: true,
          data: [],
          total: 0,
          limit,
          offset,
          stats: {
            total: allRes.count ?? 0,
            published: publishedRes.count ?? 0,
            unpublished: Math.max(0, (allRes.count ?? 0) - (publishedRes.count ?? 0)),
          },
        });
      }
    }

    let query = supabase
      .from('gallery_items')
      .select(
        `
        *,
        gallery_item_ocs (
          oc_id,
          oc:ocs (id, name, slug, image_url)
        )
      `,
        { count: 'exact' }
      );

    if (publishedOnly) {
      query = query.eq('published', true);
    } else if (publishedFilter === 'published') {
      query = query.eq('published', true);
    } else if (publishedFilter === 'unpublished') {
      query = query.eq('published', false);
    }

    if (searchRaw.length >= GALLERY_SEARCH_MIN_LEN) {
      const searchOr = await buildGallerySearchOrFilter(supabase, searchRaw);
      if (searchOr) {
        query = query.or(searchOr);
      }
    }

    if (galleryItemIdsForOc) {
      if (galleryItemIdsForOc.length === 0) {
        const [[allRes, publishedRes]] = await Promise.all([statsPromise]);
        return NextResponse.json({
          success: true,
          data: [],
          total: 0,
          limit,
          offset,
          stats: {
            total: allRes.count ?? 0,
            published: publishedRes.count ?? 0,
            unpublished: Math.max(0, (allRes.count ?? 0) - (publishedRes.count ?? 0)),
          },
        });
      }
      query = query.in('id', galleryItemIdsForOc);
    }

    switch (sort) {
      case 'name':
        query = query.order('name', { ascending: true }).order('created_at', { ascending: false });
        break;
      case 'created':
        query = query.order('created_at', { ascending: false });
        break;
      case 'updated':
        query = query.order('updated_at', { ascending: false });
        break;
      case 'live_first':
        query = query
          .order('published', { ascending: false })
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false });
        break;
      case 'draft_first':
        query = query
          .order('published', { ascending: true })
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false });
        break;
      case 'sort_order':
      default:
        query = query.order('sort_order', { ascending: true }).order('created_at', { ascending: false });
        break;
    }

    const [{ data, error, count }, [allRes, publishedRes]] = await Promise.all([
      query.range(offset, offset + limit - 1),
      statsPromise,
    ]);

    if (error) {
      logger.error('GalleryItems', 'Select failed', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    const totalAll = allRes.count ?? 0;
    const totalPublished = publishedRes.count ?? 0;

    return NextResponse.json({
      success: true,
      data: data ?? [],
      total: count ?? 0,
      limit,
      offset,
      stats: {
        total: totalAll,
        published: totalPublished,
        unpublished: Math.max(0, totalAll - totalPublished),
      },
    });
  } catch (error) {
    logger.error('GalleryItems', 'Request failed', error);
    return handleError(error, 'Failed to load gallery items');
  }
}
