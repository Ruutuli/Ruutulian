import { createAdminClient } from '@/lib/supabase/server';
import { checkAuth } from '@/lib/auth/require-auth';
import { NextResponse } from 'next/server';
import { errorResponse, successResponse, handleError } from '@/lib/api/route-helpers';

// PUT - Update an existing chapter
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { id, chapterId } = await params;
    const body = await request.json();

    // Verify fanfic exists
    const { data: fanfic, error: fanficError } = await supabase
      .from('fanfics')
      .select('id')
      .eq('id', id)
      .single();

    if (fanficError || !fanfic) {
      return errorResponse('Fanfic not found', 404);
    }

    // Verify chapter exists
    const { data: existingChapter, error: chapterError } = await supabase
      .from('fanfic_chapters')
      .select('id, is_published, published_at')
      .eq('id', chapterId)
      .eq('fanfic_id', id)
      .single();

    if (chapterError || !existingChapter) {
      return errorResponse('Chapter not found', 404);
    }

    const updateData: any = {
      title: body.title?.trim() || null,
      content: body.content?.trim() || null,
      image_url: body.image_url?.trim() || null,
      is_published: body.is_published || false,
    };

    // Only update published_at if is_published is being set to true and it wasn't already published
    if (body.is_published && !existingChapter.published_at) {
      updateData.published_at = new Date().toISOString();
    } else if (!body.is_published) {
      updateData.published_at = null;
    }

    // Update chapter_number if provided
    if (body.chapter_number !== undefined) {
      updateData.chapter_number = body.chapter_number;
    }

    const { data: chapter, error: updateError } = await supabase
      .from('fanfic_chapters')
      .update(updateData)
      .eq('id', chapterId)
      .select()
      .single();

    if (updateError) {
      return errorResponse(updateError.message || 'Failed to update chapter');
    }

    return successResponse({ chapter });
  } catch (error) {
    return handleError(error, 'Failed to update chapter');
  }
}

// DELETE - Delete a chapter
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { id, chapterId } = await params;

    // Verify chapter exists and belongs to fanfic
    const { data: existingChapter, error: chapterError } = await supabase
      .from('fanfic_chapters')
      .select('id')
      .eq('id', chapterId)
      .eq('fanfic_id', id)
      .single();

    if (chapterError || !existingChapter) {
      return errorResponse('Chapter not found', 404);
    }

    const { error: deleteError } = await supabase
      .from('fanfic_chapters')
      .delete()
      .eq('id', chapterId);

    if (deleteError) {
      return errorResponse(deleteError.message || 'Failed to delete chapter');
    }

    return successResponse({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to delete chapter');
  }
}

