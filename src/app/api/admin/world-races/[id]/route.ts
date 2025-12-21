import { createAdminClient } from '@/lib/supabase/server';
import { validateRequiredFields, errorResponse, successResponse, handleError } from '@/lib/api/route-helpers';
import { checkAuth } from '@/lib/auth/require-auth';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client to bypass RLS for admin operations
    const supabase = createAdminClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from('world_races')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse('World race not found', 404);
      }
      return errorResponse(error.message);
    }

    return successResponse(data);
  } catch (error) {
    return handleError(error, 'Failed to fetch world race');
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client to bypass RLS for admin operations
    const supabase = createAdminClient();
    const { id } = await params;

    const body = await request.json();
    const {
      name,
      info,
      picture_url,
      lifespan_development,
      appearance_dress,
      position,
    } = body;

    // Validate required fields if name is being updated
    if (name !== undefined) {
      const validationError = validateRequiredFields({ name }, ['name']);
      if (validationError) {
        return validationError;
      }
    }

    // First, verify the race exists
    const { data: existingRace, error: checkError } = await supabase
      .from('world_races')
      .select('id, world_id, story_alias_id, name')
      .eq('id', id)
      .single();

    if (checkError || !existingRace) {
      return errorResponse('World race not found', 404);
    }

    // If name is being updated, check for uniqueness within the same world/story combination
    if (name && name !== existingRace.name) {
      let query = supabase
        .from('world_races')
        .select('id')
        .eq('world_id', existingRace.world_id)
        .eq('name', name);

      if (existingRace.story_alias_id) {
        query = query.eq('story_alias_id', existingRace.story_alias_id);
      } else {
        query = query.is('story_alias_id', null);
      }

      const { data: existingName, error: nameCheckError } = await query;

      if (nameCheckError) {
        return errorResponse(nameCheckError.message || 'Failed to check name uniqueness');
      }

      if (existingName && existingName.length > 0) {
        return errorResponse('A race with this name already exists in this world/story combination');
      }
    }

    // Build update object (only include fields that are provided)
    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (info !== undefined) updateData.info = info || null;
    if (picture_url !== undefined) updateData.picture_url = picture_url || null;
    if (lifespan_development !== undefined) updateData.lifespan_development = lifespan_development || null;
    if (appearance_dress !== undefined) updateData.appearance_dress = appearance_dress || null;
    if (position !== undefined) updateData.position = position;

    // Perform the update
    const { error: updateError } = await supabase
      .from('world_races')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      return errorResponse(updateError.message || 'Failed to update world race');
    }

    // Fetch the updated race
    const { data: updatedRace, error: fetchError } = await supabase
      .from('world_races')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      return errorResponse(fetchError.message || 'Failed to fetch updated world race');
    }

    return successResponse(updatedRace);
  } catch (error) {
    return handleError(error, 'Failed to update world race');
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client to bypass RLS for admin operations
    const supabase = createAdminClient();
    const { id } = await params;

    // Delete race
    const { error } = await supabase
      .from('world_races')
      .delete()
      .eq('id', id);

    if (error) {
      return errorResponse(error.message || 'Failed to delete world race');
    }

    return successResponse({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to delete world race');
  }
}

