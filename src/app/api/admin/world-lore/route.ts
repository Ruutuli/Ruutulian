import { createAdminClient } from '@/lib/supabase/server';
import { validateRequiredFields, checkSlugUniqueness, errorResponse, successResponse, handleError } from '@/lib/api/route-helpers';

import { checkAuth } from '@/lib/auth/require-auth';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);

  // Extract filter parameters
  const worldId = searchParams.get('world_id');
  const loreType = searchParams.get('lore_type');
  const search = searchParams.get('search');

  // Build query
  let query = supabase
    .from('world_lore')
    .select(`
      *,
      world:worlds(id, name, slug),
      story_alias:story_aliases(id, name, slug, description),
      related_ocs:world_lore_ocs(
        *,
        oc:ocs(id, name, slug)
      ),
      related_events:world_lore_timeline_events(
        *,
        event:timeline_events(id, title, slug)
      )
    `);

  // Apply filters
  if (worldId) {
    query = query.eq('world_id', worldId);
  }

  if (loreType) {
    query = query.eq('lore_type', loreType);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,description_markdown.ilike.%${search}%`);
  }

    // Order by name
    query = query.order('name', { ascending: true });

    const { data, error } = await query;

    if (error) {
      return errorResponse(error.message);
    }

    return successResponse(data || []);
  } catch (error) {
    return handleError(error, 'Failed to fetch world lore');
  }
}

export async function POST(request: Request) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const body = await request.json();
  const {
    world_id,
    name,
    slug,
    lore_type,
    description,
    description_markdown,
    banner_image_url,
    world_fields,
    modular_fields,
    related_ocs, // Array of { oc_id, role }
    related_events, // Array of { timeline_event_id }
  } = body;

  // Validate required fields
  const validationError = validateRequiredFields(body, ['world_id', 'name', 'slug', 'lore_type']);
  if (validationError) {
    return validationError;
  }

  // Check if slug is unique per world
  const existingLore = await checkSlugUniqueness(supabase, 'world_lore', slug, 'world_id', world_id);
  if (existingLore) {
    return errorResponse('A lore entry with this slug already exists in this world');
  }

  // Validate story_alias_id if provided
  if (body.story_alias_id) {
    const { data: storyAlias, error: aliasError } = await supabase
      .from('story_aliases')
      .select('id, world_id')
      .eq('id', body.story_alias_id)
      .single();

    if (aliasError || !storyAlias) {
      return errorResponse('Invalid story_alias_id provided');
    }

    if (storyAlias.world_id !== world_id) {
      return errorResponse('Story alias must belong to the same world as the lore entry');
    }
  }

  // Insert lore entry
  const { data: loreEntry, error: loreError } = await supabase
    .from('world_lore')
    .insert({
      world_id,
      name,
      slug,
      lore_type,
      description,
      description_markdown,
      banner_image_url,
      world_fields: world_fields || {},
      modular_fields: modular_fields || {},
      story_alias_id: body.story_alias_id || null,
    })
    .select()
    .single();

    if (loreError) {
      return errorResponse(loreError.message);
    }

  // Insert OC associations if provided
  if (related_ocs && Array.isArray(related_ocs) && related_ocs.length > 0) {
    const ocInserts = related_ocs.map((rel: { oc_id: string; role?: string }) => ({
      world_lore_id: loreEntry.id,
      oc_id: rel.oc_id,
      role: rel.role || null,
    }));

    const { error: ocError } = await supabase
      .from('world_lore_ocs')
      .insert(ocInserts);

    if (ocError) {
      console.error('Failed to associate OCs:', ocError);
    }
  }

  // Insert timeline event associations if provided
  if (related_events && Array.isArray(related_events) && related_events.length > 0) {
    const eventInserts = related_events.map((rel: { timeline_event_id: string }) => ({
      world_lore_id: loreEntry.id,
      timeline_event_id: rel.timeline_event_id,
    }));

    const { error: eventError } = await supabase
      .from('world_lore_timeline_events')
      .insert(eventInserts);

    if (eventError) {
      console.error('Failed to associate timeline events:', eventError);
    }
  }

  // Fetch the complete lore entry with relationships
  const { data: completeLore, error: fetchError } = await supabase
    .from('world_lore')
    .select(`
      *,
      world:worlds(id, name, slug),
      story_alias:story_aliases(id, name, slug, description),
      related_ocs:world_lore_ocs(
        *,
        oc:ocs(id, name, slug)
      ),
      related_events:world_lore_timeline_events(
        *,
        event:timeline_events(id, title)
      )
    `)
    .eq('id', loreEntry.id)
    .single();

    if (fetchError) {
      return errorResponse(fetchError.message);
    }

    return successResponse(completeLore);
  } catch (error) {
    return handleError(error, 'Failed to create world lore');
  }
}

