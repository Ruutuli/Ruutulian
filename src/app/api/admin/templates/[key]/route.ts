import { NextResponse } from 'next/server';
import { fetchTemplates } from '@/lib/templates/ocTemplates.server';
import { checkAuth } from '@/lib/auth/require-auth';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/templates/[key]
 * Returns a single template by key, aggregated from all worlds' oc_templates fields.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { key } = await params;
    const templates = await fetchTemplates();
    
    const template = templates[key];
    
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      template: {
        key,
        name: template.name,
        fields: template.fields,
      }
    });
  } catch (error) {
    logger.error('Templates', 'Failed to fetch template', { error });
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}


