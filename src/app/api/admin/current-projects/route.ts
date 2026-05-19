import { createAdminClient } from '@/lib/supabase/server';
import { errorResponse, successResponse, handleError } from '@/lib/api/route-helpers';
import { checkAuth } from '@/lib/auth/require-auth';
import { NextResponse } from 'next/server';
import { getSiteConfig } from '@/lib/config/site-config';
import { logger } from '@/lib/logger';

// Ensure runtime is set to nodejs for proper route handler execution
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('current_projects')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" - return default if not found
      logger.error('CurrentProjects', 'Error fetching current projects', {
        code: error.code,
        message: error.message,
      });
      return errorResponse(error.message);
    }

    // If no data exists, return default structure
    if (!data) {
      const config = await getSiteConfig();
      return successResponse({
        id: null,
        description: `Welcome to ${config.websiteName}! ${config.websiteDescription}`,
        project_items: [
          {
            title: 'World Building',
            description: 'Creating and expanding unique worlds and universes',
            icon: 'fas fa-globe',
            color: 'purple',
          },
          {
            title: 'Character Development',
            description: 'Developing rich characters with detailed backstories',
            icon: 'fas fa-users',
            color: 'pink',
          },
        ],
      });
    }

    return successResponse(data);
  } catch (error) {
    logger.error('CurrentProjects', 'Request failed', {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return handleError(error, 'Failed to fetch current projects');
  }
}

async function saveCurrentProjects(request: Request) {
  const user = await checkAuth();

  if (!user) {
    logger.warn('CurrentProjects', 'Unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const body = await request.json();
  const { description, project_items } = body;

  const missingFields: string[] = [];
  if (description === undefined) missingFields.push('description');
  if (project_items === undefined) missingFields.push('project_items');

  if (missingFields.length > 0) {
    logger.error('CurrentProjects', 'Missing required fields', missingFields);
    return errorResponse(`Missing required fields: ${missingFields.join(', ')}`);
  }

  const { data: existing, error: checkError } = await supabase
    .from('current_projects')
    .select('id')
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    logger.error('CurrentProjects', 'Error checking existing row', {
      code: checkError.code,
      message: checkError.message,
    });
  }

  let result;
  if (existing) {
    const { data, error } = await supabase
      .from('current_projects')
      .update({
        description,
        project_items,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      logger.error('CurrentProjects', 'Update error', {
        code: error.code,
        message: error.message,
      });
      return errorResponse(error.message);
    }

    result = data;
  } else {
    const { data, error } = await supabase
      .from('current_projects')
      .insert({ description, project_items })
      .select()
      .single();

    if (error) {
      logger.error('CurrentProjects', 'Insert error', {
        code: error.code,
        message: error.message,
      });
      return errorResponse(error.message);
    }

    result = data;
  }

  return NextResponse.json({ success: true, data: result });
}

export async function PUT(request: Request) {
  try {
    return await saveCurrentProjects(request);
  } catch (error) {
    logger.error('CurrentProjects', 'Request failed', {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return handleError(error, 'Failed to update current projects');
  }
}

export async function POST(request: Request) {
  try {
    return await saveCurrentProjects(request);
  } catch (error) {
    logger.error('CurrentProjects', 'Request failed', {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return handleError(error, 'Failed to update current projects');
  }
}







