import { createAdminClient } from '@/lib/supabase/server';
import { errorResponse, successResponse, handleError } from '@/lib/api/route-helpers';
import { checkAuth } from '@/lib/auth/require-auth';
import { NextResponse } from 'next/server';
import { getSiteConfig } from '@/lib/config/site-config';

// Ensure runtime is set to nodejs for proper route handler execution
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('current_projects')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" - return default if not found
      console.error('[GET /api/admin/current-projects] Error fetching:', {
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
    console.error('[GET /api/admin/current-projects] Request failed:', {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return handleError(error, 'Failed to fetch current projects');
  }
}

export async function PUT(request: Request) {
  try {
    const user = await checkAuth();
    
    if (!user) {
      console.warn('[PUT /api/admin/current-projects] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const body = await request.json();
    const { description, project_items } = body;

    // Validate required fields
    const missingFields = [];
    if (description === undefined) missingFields.push('description');
    if (project_items === undefined) missingFields.push('project_items');
    
    if (missingFields.length > 0) {
      console.error('[PUT /api/admin/current-projects] Missing required fields:', missingFields);
      return errorResponse(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Check if a row exists
    const { data: existing, error: checkError } = await supabase
      .from('current_projects')
      .select('id')
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[PUT /api/admin/current-projects] Error checking existing row:', {
        code: checkError.code,
        message: checkError.message,
      });
    }

    let result;
    if (existing) {
      // Update existing row
      const updateData = {
        description,
        project_items,
        updated_at: new Date().toISOString(),
      };
      
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
        });
        return errorResponse(error.message);
      }

      result = data;
    } else {
      // Insert new row
      const insertData = {
        description,
        project_items,
      };
      
      const { data, error } = await supabase
        .from('current_projects')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('[PUT /api/admin/current-projects] Insert error:', {
          code: error.code,
          message: error.message,
        });
        return errorResponse(error.message);
      }

      result = data;
    }

    return successResponse(result);
  } catch (error) {
    console.error('[PUT /api/admin/current-projects] Request failed:', {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return handleError(error, 'Failed to update current projects');
  }
}












