import { createAdminClient } from '@/lib/supabase/server';
import { checkAuth } from '@/lib/auth/require-auth';
import { handleError } from '@/lib/api/route-helpers';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { driveFileViewUrl } from '@/lib/gallery/constants';
import { revalidateGalleryCaches, revalidateOcPages } from '@/lib/gallery/revalidate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: galleryItemId } = await params;
    if (!galleryItemId) {
      return NextResponse.json({ success: false, error: 'Missing gallery item id' }, { status: 400 });
    }

    const body = await request.json();
    const ocId = typeof body.ocId === 'string' ? body.ocId.trim() : '';
    if (!ocId) {
      return NextResponse.json({ success: false, error: 'ocId is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: galleryItem, error: itemError } = await supabase
      .from('gallery_items')
      .select('id, drive_file_id, name')
      .eq('id', galleryItemId)
      .single();

    if (itemError || !galleryItem) {
      return NextResponse.json({ success: false, error: 'Gallery item not found' }, { status: 404 });
    }

    const { data: oc, error: ocError } = await supabase
      .from('ocs')
      .select('id, name, slug, image_url')
      .eq('id', ocId)
      .single();

    if (ocError || !oc) {
      return NextResponse.json({ success: false, error: 'Character not found' }, { status: 404 });
    }

    const imageUrl = driveFileViewUrl(galleryItem.drive_file_id);

    const { error: updateError } = await supabase
      .from('ocs')
      .update({ image_url: imageUrl })
      .eq('id', ocId);

    if (updateError) {
      logger.error('GallerySetMainImage', 'OC update failed', updateError);
      return NextResponse.json({ success: false, error: updateError.message }, { status: 400 });
    }

    const { data: existingLink } = await supabase
      .from('gallery_item_ocs')
      .select('gallery_item_id')
      .eq('gallery_item_id', galleryItemId)
      .eq('oc_id', ocId)
      .maybeSingle();

    if (!existingLink) {
      const { error: linkError } = await supabase
        .from('gallery_item_ocs')
        .insert({ gallery_item_id: galleryItemId, oc_id: ocId });

      if (linkError) {
        logger.warn('GallerySetMainImage', 'Link insert failed (image still updated)', linkError);
      }
    }

    revalidateGalleryCaches();
    await revalidateOcPages(supabase, [ocId]);

    return NextResponse.json({
      success: true,
      data: {
        ocId: oc.id,
        ocName: oc.name,
        ocSlug: oc.slug,
        image_url: imageUrl,
        previous_image_url: oc.image_url,
      },
    });
  } catch (error) {
    logger.error('GallerySetMainImage', 'Request failed', error);
    return handleError(error, 'Failed to set main image');
  }
}
