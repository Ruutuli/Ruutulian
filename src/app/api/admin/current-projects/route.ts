import { createAdminClient } from '@/lib/supabase/server';
import { errorResponse, successResponse, handleError } from '@/lib/api/route-helpers';
import { checkAuth } from '@/lib/auth/require-auth';
import { NextResponse } from 'next/server';
import { getSiteConfig } from '@/lib/config/site-config';

// Ensure runtime is set to nodejs for proper route handler execution
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const startTime = Date.now();
  console.log('[GET /api/admin/current-projects] Request received:', {
    method: 'GET',
    url: request.url,
    timestamp: new Date().toISOString(),
  });

  try {
    console.log('[GET /api/admin/current-projects] Creating Supabase client...');
    const supabase = createAdminClient();

    console.log('[GET /api/admin/current-projects] Fetching current_projects...');
    const { data, error } = await supabase
      .from('current_projects')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" - return default if not found
      console.error('[GET /api/admin/current-projects] Error fetching:', {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      return errorResponse(error.message);
    }

    // If no data exists, return default structure
    if (!data) {
      console.log('[GET /api/admin/current-projects] No data found, using default structure');
      const config = await getSiteConfig();
      const duration = Date.now() - startTime;
      console.log('[GET /api/admin/current-projects] Request completed in', duration, 'ms (using default)');
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

    const duration = Date.now() - startTime;
    console.log('[GET /api/admin/current-projects] Request completed in', duration, 'ms (using database)');
    return successResponse(data);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[GET /api/admin/current-projects] Request failed after', duration, 'ms:', {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    return handleError(error, 'Failed to fetch current projects');
  }
}

export async function PUT(request: Request) {
  const startTime = Date.now();
  const requestUrl = request.url;
  const requestMethod = request.method;
  
  console.log('[PUT /api/admin/current-projects] Request received:', {
    method: requestMethod,
    url: requestUrl,
    headers: Object.fromEntries(request.headers.entries()),
    timestamp: new Date().toISOString(),
  });

  try {
    console.log('[PUT /api/admin/current-projects] Checking authentication...');
    const user = await checkAuth();
    console.log('[PUT /api/admin/current-projects] Auth check result:', {
      authenticated: !!user,
      userId: user?.id || null,
    });
    
    if (!user) {
      console.warn('[PUT /api/admin/current-projects] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[PUT /api/admin/current-projects] Creating Supabase client...');
    const supabase = createAdminClient();

    console.log('[PUT /api/admin/current-projects] Parsing request body...');
    const body = await request.json();
    console.log('[PUT /api/admin/current-projects] Request body received:', {
      description: body.description?.substring(0, 100) + '...',
      project_items_count: Array.isArray(body.project_items) ? body.project_items.length : 'not an array',
      project_items: body.project_items,
    });
    
    const { description, project_items } = body;

    // Validate required fields
    console.log('[PUT /api/admin/current-projects] Validating required fields...');
    const missingFields = [];
    if (description === undefined) missingFields.push('description');
    if (project_items === undefined) missingFields.push('project_items');
    
    if (missingFields.length > 0) {
      console.error('[PUT /api/admin/current-projects] Missing required fields:', missingFields);
      return errorResponse(`Missing required fields: ${missingFields.join(', ')}`);
    }
    console.log('[PUT /api/admin/current-projects] All required fields present');

    // Check if a row exists
    console.log('[PUT /api/admin/current-projects] Checking for existing current_projects row...');
    const { data: existing, error: checkError } = await supabase
      .from('current_projects')
      .select('id')
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[PUT /api/admin/current-projects] Error checking existing row:', {
        code: checkError.code,
        message: checkError.message,
        details: checkError.details,
      });
    } else {
      console.log('[PUT /api/admin/current-projects] Existing row check:', {
        exists: !!existing,
        id: existing?.id || null,
      });
    }

    let result;
    if (existing) {
      // Update existing row
      console.log('[PUT /api/admin/current-projects] Updating existing row with id:', existing.id);
      const updateData = {
        description,
        project_items,
        updated_at: new Date().toISOString(),
      };
      console.log('[PUT /api/admin/current-projects] Update data:', {
        description: updateData.description.substring(0, 100) + '...',
        project_items_count: Array.isArray(updateData.project_items) ? updateData.project_items.length : 'not an array',
      });
      
      const { data, error } = await supabase
        .from('current_projects')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('[PUT /api/admin/current-projects] Update error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        return errorResponse(error.message);
      }

      console.log('[PUT /api/admin/current-projects] Update successful:', { id: data?.id });
      result = data;
    } else {
      // Insert new row
      console.log('[PUT /api/admin/current-projects] Inserting new row');
      const insertData = {
        description,
        project_items,
      };
      console.log('[PUT /api/admin/current-projects] Insert data:', {
        description: insertData.description.substring(0, 100) + '...',
        project_items_count: Array.isArray(insertData.project_items) ? insertData.project_items.length : 'not an array',
      });
      
      const { data, error } = await supabase
        .from('current_projects')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('[PUT /api/admin/current-projects] Insert error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        return errorResponse(error.message);
      }

      console.log('[PUT /api/admin/current-projects] Insert successful:', { id: data?.id });
      result = data;
    }

    const duration = Date.now() - startTime;
    console.log('[PUT /api/admin/current-projects] Request completed successfully in', duration, 'ms');
    return successResponse(result);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[PUT /api/admin/current-projects] Request failed after', duration, 'ms:', {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    return handleError(error, 'Failed to update current projects');
  }
}












