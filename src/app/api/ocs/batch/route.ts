import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
    }

    const ids = idsParam.split(',').filter(Boolean);

    if (ids.length === 0) {
      return NextResponse.json({ ocs: [] });
    }

    const { data: ocs, error } = await supabase
      .from('ocs')
      .select('*, world:worlds(id, name, slug, primary_color, accent_color)')
      .in('id', ids)
      .eq('is_public', true);

    if (error) {
      logger.error('API', 'Error fetching OCs', error);
      return NextResponse.json({ error: 'Failed to fetch characters' }, { status: 500 });
    }

    return NextResponse.json({ ocs: ocs || [] });
  } catch (error) {
    logger.error('API', 'Error in batch OCs API', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



