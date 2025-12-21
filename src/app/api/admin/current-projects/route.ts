import { createAdminClient } from '@/lib/supabase/server';
import { errorResponse, successResponse, handleError } from '@/lib/api/route-helpers';
import { checkAuth } from '@/lib/auth/require-auth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('current_projects')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" - return default if not found
      return errorResponse(error.message);
    }

    // If no data exists, return default structure
    if (!data) {
      return successResponse({
        id: null,
        description: 'Welcome to Ruutulian! Ruu\'s personal OC wiki for organizing and storing information on her original characters, worlds, lore, and timelines across various universes.',
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
    return handleError(error, 'Failed to fetch current projects');
  }
}

export async function PUT(request: Request) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const body = await request.json();
    const { description, project_items } = body;

    // Validate required fields
    if (description === undefined || project_items === undefined) {
      return errorResponse('Missing required fields: description, project_items');
    }

    // Check if a row exists
    const { data: existing } = await supabase
      .from('current_projects')
      .select('id')
      .single();

    let result;
    if (existing) {
      // Update existing row
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
        return errorResponse(error.message);
      }

      result = data;
    } else {
      // Insert new row
      const { data, error } = await supabase
        .from('current_projects')
        .insert({
          description,
          project_items,
        })
        .select()
        .single();

      if (error) {
        return errorResponse(error.message);
      }

      result = data;
    }

    return successResponse(result);
  } catch (error) {
    return handleError(error, 'Failed to update current projects');
  }
}












