import { createAdminClient } from '@/lib/supabase/server';
import { validateRequiredFields, checkSlugUniqueness, errorResponse, successResponse, handleError } from '@/lib/api/route-helpers';

import { checkAuth } from '@/lib/auth/require-auth';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

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

  // Build query (with optional story_aliases; fallback if relationship missing in schema)
  const selectWithStoryAlias = `
    *,
    world:worlds(id, name, slug),
    story_alias:story_aliases!fk_world_lore_story_alias_id(id, name, slug, description),
    related_ocs:world_lore_ocs(
      *,
      oc:ocs(id, name, slug)
    ),
    related_events:world_lore_timeline_events(
      *,
      event:timeline_events(id, title, slug)
    )
  `;
  const selectWithoutStoryAlias = `
    *,
    world:worlds(id, name, slug),
    related_ocs:world_lore_ocs(
      *,
      oc:ocs(id, name, slug)
    ),
    related_events:world_lore_timeline_events(
      *,
      event:timeline_events(id, title, slug)
    )
  `;

  let query = supabase.from('world_lore').select(selectWithStoryAlias);

  if (worldId) {
    query = query.eq('world_id', worldId);
  }
  if (loreType) {
    query = query.eq('lore_type', loreType);
  }
  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,description_markdown.ilike.%${search}%`);
  }
  query = query.order('name', { ascending: true });

  let { data, error } = await query;

  if (error && (error.message?.includes('story_aliases') || error.message?.includes('relationship'))) {
    query = supabase.from('world_lore').select(selectWithoutStoryAlias);
    if (worldId) query = query.eq('world_id', worldId);
    if (loreType) query = query.eq('lore_type', loreType);
    if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,description_markdown.ilike.%${search}%`);
    query = query.order('name', { ascending: true });
    const retry = await query;
    data = retry.data;
    error = retry.error;
    if (!error && data?.length) {
      const storyAliasIds = [...new Set(data.map((l: { story_alias_id?: string }) => l.story_alias_id).filter(Boolean) as string[])];
      if (storyAliasIds.length > 0) {
        const { data: storyAliases } = await supabase
          .from('story_aliases')
          .select('id, name, slug, description')
          .in('id', storyAliasIds);
        if (storyAliases) {
          const map = new Map(storyAliases.map((sa: { id: string }) => [sa.id, sa]));
          data.forEach((lore: { story_alias_id?: string; story_alias?: unknown }) => {
            if (lore.story_alias_id) lore.story_alias = map.get(lore.story_alias_id) ?? null;
          });
        }
      }
    }
  }

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
      logger.error('API', 'Failed to associate OCs', ocError);
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
      logger.error('API', 'Failed to associate timeline events', eventError);
    }
  }

  // Fetch the complete lore entry with relationships (fallback if world_lore/story_aliases relationship missing)
  const selectWithStoryAlias = `
    *,
    world:worlds(id, name, slug),
    story_alias:story_aliases!fk_world_lore_story_alias_id(id, name, slug, description),
    related_ocs:world_lore_ocs(
      *,
      oc:ocs(id, name, slug)
    ),
    related_events:world_lore_timeline_events(
      *,
      event:timeline_events(id, title)
    )
  `;
  const selectWithoutStoryAlias = `
    *,
    world:worlds(id, name, slug),
    related_ocs:world_lore_ocs(
      *,
      oc:ocs(id, name, slug)
    ),
    related_events:world_lore_timeline_events(
      *,
      event:timeline_events(id, title)
    )
  `;
  let { data: completeLore, error: fetchError } = await supabase
    .from('world_lore')
    .select(selectWithStoryAlias)
    .eq('id', loreEntry.id)
    .single();

  if (fetchError && (fetchError.message?.includes('story_aliases') || fetchError.message?.includes('relationship'))) {
    const retry = await supabase
      .from('world_lore')
      .select(selectWithoutStoryAlias)
      .eq('id', loreEntry.id)
      .single();
    completeLore = retry.data;
    fetchError = retry.error;
    if (!fetchError && completeLore?.story_alias_id) {
      const { data: storyAlias } = await supabase
        .from('story_aliases')
        .select('id, name, slug, description')
        .eq('id', completeLore.story_alias_id)
        .single();
      if (storyAlias) completeLore.story_alias = storyAlias;
    }
  }

  if (fetchError) {
    return errorResponse(fetchError.message);
  }

  return successResponse(completeLore);
  } catch (error) {
    return handleError(error, 'Failed to create world lore');
  }
}

