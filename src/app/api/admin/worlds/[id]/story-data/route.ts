import { createClient, createAdminClient } from '@/lib/supabase/server';
import { errorResponse, successResponse, handleError } from '@/lib/api/route-helpers';
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

    const supabase = createAdminClient();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const storyAliasId = searchParams.get('story_alias_id');

    if (!id) {
      return errorResponse('World ID is required');
    }

    // Verify world exists
    const { data: world, error: worldError } = await supabase
      .from('worlds')
      .select('id, series_type')
      .eq('id', id)
      .single();

    if (worldError || !world) {
      return errorResponse('World not found', 404);
    }

    // Build query - fetch story data for specific story alias or base (null)
    let query = supabase
      .from('world_story_data')
      .select(`
        *,
        story_alias:story_aliases(
          id,
          name,
          slug,
          description
        )
      `)
      .eq('world_id', id);

    // If story_alias_id is provided, fetch that specific version
    // If null or empty string, fetch base world data (story_alias_id IS NULL)
    if (storyAliasId === null || storyAliasId === '') {
      query = query.is('story_alias_id', null);
    } else {
      // Validate story alias belongs to this world
      const { data: storyAlias, error: aliasError } = await supabase
        .from('story_aliases')
        .select('id, world_id')
        .eq('id', storyAliasId)
        .single();

      if (aliasError || !storyAlias) {
        return errorResponse('Story alias not found', 404);
      }

      if (storyAlias.world_id !== id) {
        return errorResponse('Story alias does not belong to this world', 400);
      }

      query = query.eq('story_alias_id', storyAliasId);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found - return null to indicate no story-specific data exists
        return successResponse(null);
      }
      return errorResponse(error.message);
    }

    return successResponse(data);
  } catch (error) {
    return handleError(error, 'Failed to fetch world story data');
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return errorResponse('World ID is required');
    }

    // Verify world exists
    const { data: world, error: worldError } = await supabase
      .from('worlds')
      .select('id, series_type')
      .eq('id', id)
      .single();

    if (worldError || !world) {
      return errorResponse('World not found', 404);
    }

    // Validate story_alias_id if provided
    let storyAliasId: string | null = body.story_alias_id || null;
    if (storyAliasId) {
      const { data: storyAlias, error: aliasError } = await supabase
        .from('story_aliases')
        .select('id, world_id')
        .eq('id', storyAliasId)
        .single();

      if (aliasError || !storyAlias) {
        return errorResponse('Invalid story_alias_id provided');
      }

      if (storyAlias.world_id !== id) {
        return errorResponse('Story alias must belong to the same world');
      }
    }

    // Check if entry already exists
    const existingQuery = supabase
      .from('world_story_data')
      .select('id')
      .eq('world_id', id);

    if (storyAliasId) {
      existingQuery.eq('story_alias_id', storyAliasId);
    } else {
      existingQuery.is('story_alias_id', null);
    }

    const { data: existing } = await existingQuery.single();

    // Prepare data for insert/update
    const storyData = {
      world_id: id,
      story_alias_id: storyAliasId,
      setting: body.setting || null,
      lore: body.lore || null,
      the_world_society: body.the_world_society || null,
      culture: body.culture || null,
      politics: body.politics || null,
      technology: body.technology || null,
      environment: body.environment || null,
      races_species: body.races_species || null,
      power_systems: body.power_systems || null,
      religion: body.religion || null,
      government: body.government || null,
      important_factions: body.important_factions || null,
      notable_figures: body.notable_figures || null,
      languages: body.languages || null,
      trade_economy: body.trade_economy || null,
      travel_transport: body.travel_transport || null,
      themes: body.themes || null,
      inspirations: body.inspirations || null,
      current_era_status: body.current_era_status || null,
      notes: body.notes || null,
      canon_status: body.canon_status || null,
      timeline_era: body.timeline_era || null,
      power_source: body.power_source || null,
      central_conflicts: body.central_conflicts || null,
      world_rules_limitations: body.world_rules_limitations || null,
      oc_integration_notes: body.oc_integration_notes || null,
      modular_fields: body.modular_fields || {},
    };

    let result;
    if (existing) {
      // Update existing entry
      const { data, error } = await supabase
        .from('world_story_data')
        .update(storyData)
        .eq('id', existing.id)
        .select(`
          *,
          story_alias:story_aliases(
            id,
            name,
            slug,
            description
          )
        `)
        .single();

      if (error) {
        return errorResponse(error.message);
      }
      result = data;
    } else {
      // Create new entry
      const { data, error } = await supabase
        .from('world_story_data')
        .insert(storyData)
        .select(`
          *,
          story_alias:story_aliases(
            id,
            name,
            slug,
            description
          )
        `)
        .single();

      if (error) {
        return errorResponse(error.message);
      }
      result = data;
    }

    return successResponse(result);
  } catch (error) {
    return handleError(error, 'Failed to save world story data');
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // PUT is same as POST (upsert behavior)
  return POST(request, { params });
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

    const supabase = createAdminClient();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const storyAliasId = searchParams.get('story_alias_id');

    if (!id) {
      return errorResponse('World ID is required');
    }

    // Build query to find the entry
    let query = supabase
      .from('world_story_data')
      .select('id')
      .eq('world_id', id);

    if (storyAliasId === null || storyAliasId === '') {
      query = query.is('story_alias_id', null);
    } else {
      query = query.eq('story_alias_id', storyAliasId);
    }

    const { data: existing, error: findError } = await query.single();

    if (findError || !existing) {
      return errorResponse('World story data not found', 404);
    }

    const { error } = await supabase
      .from('world_story_data')
      .delete()
      .eq('id', existing.id);

    if (error) {
      return errorResponse(error.message);
    }

    return successResponse({ message: 'World story data deleted successfully' });
  } catch (error) {
    return handleError(error, 'Failed to delete world story data');
  }
}


