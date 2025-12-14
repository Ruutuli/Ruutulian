import { NextResponse } from 'next/server';
import { fetchTemplates } from '@/lib/templates/ocTemplates.server';
import { checkAuth } from '@/lib/auth/require-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/templates
 * Returns templates aggregated from all worlds' oc_templates fields.
 * Templates are stored per-world in the worlds.oc_templates JSONB field.
 */
export async function GET() {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const templates = await fetchTemplates();
    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}


