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
    const { oc_id, role } = body;

    if (!oc_id) {
      return NextResponse.json({ error: 'oc_id is required' }, { status: 400 });
    }

    // Insert association
    const { data, error } = await supabase
      .from('world_lore_ocs')
      .insert({
        world_lore_id: id,
        oc_id,
        role: role || null,
      })
      .select(`
        *,
        oc:ocs(id, name, slug)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error('API', 'Error adding OC to lore entry', error);
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
    const ocId = searchParams.get('oc_id');

    if (!id) {
      return NextResponse.json({ error: 'Lore entry ID is required' }, { status: 400 });
    }

    if (!ocId) {
      return NextResponse.json({ error: 'oc_id query parameter is required' }, { status: 400 });
    }

    // Delete association
    const { error } = await supabase
      .from('world_lore_ocs')
      .delete()
      .eq('world_lore_id', id)
      .eq('oc_id', ocId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('API', 'Error removing OC from lore entry', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

