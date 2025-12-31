import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const publicOnly = searchParams.get('public') === 'true';

    let query = supabase
      .from('ocs')
      .select('*, world:worlds(id, name, slug, primary_color, accent_color)');

    if (publicOnly) {
      query = query.eq('is_public', true);
    }

    const { data: ocs, error } = await query.order('name');

    if (error) {
      logger.error('API', 'Error fetching OCs', error);
      return NextResponse.json({ error: 'Failed to fetch characters' }, { status: 500 });
    }

    return NextResponse.json({ ocs: ocs || [] });
  } catch (error) {
    logger.error('API', 'Error in OCs API', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



