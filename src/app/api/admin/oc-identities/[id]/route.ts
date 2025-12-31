import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth/require-auth';
import { logger } from '@/lib/logger';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Identity ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('oc_identities')
      .select(`
        *,
        versions:ocs(
          *,
          world:worlds(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      logger.error('API', 'Supabase error fetching identity', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch identity' },
        { status: 400 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: 'Identity not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error('API', 'Error fetching identity', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
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

    const supabase = await createClient();
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Identity ID is required' }, { status: 400 });
    }

    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('oc_identities')
      .update({ name: body.name })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('API', 'Supabase error updating identity', error);
      return NextResponse.json(
        { error: error.message || 'Failed to update identity' },
        { status: 400 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: 'Identity not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error('API', 'Error updating identity', error);
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

    const supabase = await createClient();
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Identity ID is required' }, { status: 400 });
    }

    // Check if identity has versions
    const { data: versions, error: checkError } = await supabase
      .from('ocs')
      .select('id')
      .eq('identity_id', id)
      .limit(1);

    if (checkError) {
      logger.error('API', 'Supabase error checking identity versions', checkError);
      return NextResponse.json(
        { error: checkError.message || 'Failed to check identity versions' },
        { status: 400 }
      );
    }

    if (versions && versions.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete identity with existing versions. Delete all versions first.' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('oc_identities')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('API', 'Supabase error deleting identity', error);
      return NextResponse.json(
        { error: error.message || 'Failed to delete identity' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('API', 'Error deleting identity', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

