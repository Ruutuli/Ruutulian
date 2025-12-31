import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth/require-auth';
import { logger } from '@/lib/logger';

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

    if (!id) {
      return NextResponse.json({ error: 'Lore entry ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { timeline_event_id } = body;

    if (!timeline_event_id) {
      return NextResponse.json({ error: 'timeline_event_id is required' }, { status: 400 });
    }

    // Insert association
    const { data, error } = await supabase
      .from('world_lore_timeline_events')
      .insert({
        world_lore_id: id,
        timeline_event_id,
      })
      .select(`
        *,
        event:timeline_events(id, title)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error('API', 'Error adding timeline event to lore entry', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
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
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('timeline_event_id');

    if (!id) {
      return NextResponse.json({ error: 'Lore entry ID is required' }, { status: 400 });
    }

    if (!eventId) {
      return NextResponse.json(
        { error: 'timeline_event_id query parameter is required' },
        { status: 400 }
      );
    }

    // Delete association
    const { error } = await supabase
      .from('world_lore_timeline_events')
      .delete()
      .eq('world_lore_id', id)
      .eq('timeline_event_id', eventId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('API', 'Error removing timeline event from lore entry', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

