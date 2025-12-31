import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth/require-auth';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const includeVersions = searchParams.get('include_versions') === 'true';

    let query = supabase
      .from('oc_identities')
      .select('*')
      .order('name', { ascending: true });

    if (includeVersions) {
      query = query.select(`
        *,
        versions:ocs(
          *,
          world:worlds(*)
        )
      `);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('API', 'Supabase error fetching identities', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch identities' },
        { status: 400 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    logger.error('API', 'Error fetching identities', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('oc_identities')
      .insert({ name: body.name })
      .select()
      .single();

    if (error) {
      logger.error('API', 'Supabase error creating identity', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create identity' },
        { status: 400 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: 'Failed to create identity' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error('API', 'Error creating identity', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

