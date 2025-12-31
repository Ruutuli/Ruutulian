import { createAdminClient } from '@/lib/supabase/server';
import { checkAuth } from '@/lib/auth/require-auth';
import { NextResponse } from 'next/server';
import { errorResponse, successResponse, handleError } from '@/lib/api/route-helpers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { id } = await params;

    const { data: chapters, error } = await supabase
      .from('fanfic_chapters')
      .select('*')
      .eq('fanfic_id', id)
      .order('chapter_number', { ascending: true });

    if (error) {
      return errorResponse(error.message);
    }

    return successResponse({ chapters: chapters || [] });
  } catch (error) {
    return handleError(error, 'Failed to fetch chapters');
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { id } = await params;
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

    // Get the next chapter number
    const { data: existingChapters } = await supabase
      .from('fanfic_chapters')
      .select('chapter_number')
      .eq('fanfic_id', id)
      .order('chapter_number', { ascending: false })
      .limit(1);

    const nextChapterNumber = existingChapters && existingChapters.length > 0
      ? existingChapters[0].chapter_number + 1
      : 1;

    const chapterData = {
      fanfic_id: id,
      chapter_number: body.chapter_number || nextChapterNumber,
      title: body.title?.trim() || null,
      content: body.content?.trim() || null,
      image_url: body.image_url?.trim() || null,
      is_published: body.is_published || false,
      published_at: body.is_published ? new Date().toISOString() : null,
    };

    const { data: chapter, error: insertError } = await supabase
      .from('fanfic_chapters')
      .insert(chapterData)
      .select()
      .single();

    if (insertError) {
      return errorResponse(insertError.message || 'Failed to create chapter');
    }

    return successResponse({ chapter });
  } catch (error) {
    return handleError(error, 'Failed to create chapter');
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { id } = await params;
    const body = await request.json();
    const { chapters } = body;

    if (!Array.isArray(chapters)) {
      return errorResponse('Chapters must be an array');
    }

    // Verify fanfic exists
    const { data: fanfic, error: fanficError } = await supabase
      .from('fanfics')
      .select('id')
      .eq('id', id)
      .single();

    if (fanficError || !fanfic) {
      return errorResponse('Fanfic not found', 404);
    }

    // Delete all existing chapters
    const { error: deleteError } = await supabase
      .from('fanfic_chapters')
      .delete()
      .eq('fanfic_id', id);

    if (deleteError) {
      return errorResponse(deleteError.message || 'Failed to delete existing chapters');
    }

    // Insert new chapters
    if (chapters.length > 0) {
      const chapterRecords = chapters.map((chapter: { chapter_number: number; title?: string | null; content?: string | null; image_url?: string | null; is_published?: boolean }) => ({
        fanfic_id: id,
        chapter_number: chapter.chapter_number,
        title: chapter.title?.trim() || null,
        content: chapter.content?.trim() || null,
        image_url: chapter.image_url?.trim() || null,
        is_published: chapter.is_published || false,
        published_at: chapter.is_published ? new Date().toISOString() : null,
      }));

      const { error: insertError } = await supabase
        .from('fanfic_chapters')
        .insert(chapterRecords);

      if (insertError) {
        return errorResponse(insertError.message || 'Failed to save chapters');
      }
    }

    // Fetch updated chapters
    const { data: updatedChapters, error: fetchError } = await supabase
      .from('fanfic_chapters')
      .select('*')
      .eq('fanfic_id', id)
      .order('chapter_number', { ascending: true });

    if (fetchError) {
      return errorResponse(fetchError.message || 'Failed to fetch updated chapters');
    }

    return successResponse({ chapters: updatedChapters || [] });
  } catch (error) {
    return handleError(error, 'Failed to update chapters');
  }
}

