import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth/require-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    const { data: worlds, error } = await supabase
      .from('worlds')
      .select('id, name, slug, series_type, world_fields')
      .order('name');

    if (error) {
      throw error;
    }

    return NextResponse.json({ worlds: worlds || [] });
  } catch (error) {
    console.error('Error fetching world fields:', error);
    return NextResponse.json(
      { error: 'Failed to fetch world fields' },
      { status: 500 }
    );
  }
}

