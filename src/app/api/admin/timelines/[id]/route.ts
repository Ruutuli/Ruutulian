import { createClient, createAdminClient } from '@/lib/supabase/server';
import { errorResponse, successResponse, handleError } from '@/lib/api/route-helpers';
import { checkAuth } from '@/lib/auth/require-auth';
import { NextResponse } from 'next/server';

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
    const { data, error } = await supabase
      .from('timelines')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return errorResponse(error.message);
    }

    return successResponse(data);
  } catch (error) {
    return handleError(error, 'Failed to update timeline');
  }
}

export async function DELETE(
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

    if (!id) {
      return errorResponse('Timeline ID is required');
    }

    // Delete all related records first to ensure complete removal
    // Delete timeline-event associations (junction table)
    await supabase
      .from('timeline_event_timelines')
      .delete()
      .eq('timeline_id', id);

    // Delete the timeline itself (cascade should handle this, but explicit is safer)
    const { error } = await supabase
      .from('timelines')
      .delete()
      .eq('id', id);

    if (error) {
      return errorResponse(error.message || 'Failed to delete timeline');
    }

    return successResponse({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to delete timeline');
  }
}
