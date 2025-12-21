import { createAdminClient } from '@/lib/supabase/server';
import { validateRequiredFields, errorResponse, successResponse, handleError } from '@/lib/api/route-helpers';
import { checkAuth } from '@/lib/auth/require-auth';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client to bypass RLS for admin operations
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);

    // Extract filter parameters
    const worldId = searchParams.get('world_id');
    const storyAliasId = searchParams.get('story_alias_id');

    // Build query
    let query = supabase
      .from('world_races')
      .select('*')
      .order('position', { ascending: true });

    // Apply filters
    if (worldId) {
      query = query.eq('world_id', worldId);
    }

    if (storyAliasId) {
      query = query.eq('story_alias_id', storyAliasId);
    } else if (worldId) {
      // If world_id is provided but story_alias_id is not, get base races (null story_alias_id)
      query = query.is('story_alias_id', null);
    }

    const { data, error } = await query;

    if (error) {
      return errorResponse(error.message);
    }

    return successResponse(data || []);
  } catch (error) {
    return handleError(error, 'Failed to fetch world races');
  }
}

export async function POST(request: Request) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client to bypass RLS for admin operations
    const supabase = createAdminClient();

    const body = await request.json();
    const {
      world_id,
      story_alias_id,
      name,
      info,
      picture_url,
      lifespan_development,
      appearance_dress,
      position,
    } = body;

    // Validate required fields
    const validationError = validateRequiredFields(body, ['world_id', 'name']);
    if (validationError) {
      return validationError;
    }

    // Verify world exists
    const { data: world, error: worldError } = await supabase
      .from('worlds')
      .select('id')
      .eq('id', world_id)
      .single();

    if (worldError || !world) {
      return errorResponse('World not found', 404);
    }

    // If story_alias_id is provided, verify it exists and belongs to the world
    if (story_alias_id) {
      const { data: storyAlias, error: storyAliasError } = await supabase
        .from('story_aliases')
        .select('id, world_id')
        .eq('id', story_alias_id)
        .single();

      if (storyAliasError || !storyAlias) {
        return errorResponse('Story alias not found', 404);
      }

      if (storyAlias.world_id !== world_id) {
        return errorResponse('Story alias does not belong to this world', 400);
      }
    }

    // Insert race
    const { data: race, error: insertError } = await supabase
      .from('world_races')
      .insert({
        world_id,
        story_alias_id: story_alias_id || null,
        name,
        info: info || null,
        picture_url: picture_url || null,
        lifespan_development: lifespan_development || null,
        appearance_dress: appearance_dress || null,
        position: position ?? 0,
      })
      .select()
      .single();

    if (insertError) {
      return errorResponse(insertError.message);
    }

    return successResponse(race);
  } catch (error) {
    return handleError(error, 'Failed to create world race');
  }
}

