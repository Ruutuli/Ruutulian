import { createAdminClient } from '@/lib/supabase/server';
import { validateRequiredFields, errorResponse, successResponse, handleError } from '@/lib/api/route-helpers';
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
    const category = searchParams.get('category');
    const characterId = searchParams.get('character_id');
    const search = searchParams.get('search');

    // Build query
    let query = supabase
      .from('timeline_events')
      .select(`
        *,
        world:worlds(id, name, slug),
        story_alias:story_aliases(id, name, slug, description),
        characters:timeline_event_characters(
          *,
          oc:ocs(id, name, slug, date_of_birth)
        )
      `);

    // Apply filters
    if (worldId) {
      query = query.eq('world_id', worldId);
    }

    if (category) {
      query = query.contains('categories', [category]);
    }

    if (characterId) {
      query = query.eq('timeline_event_characters.oc_id', characterId);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,description_markdown.ilike.%${search}%`);
    }

    // Order by year, then month, then day, then created_at
    query = query.order('year', { ascending: true, nullsFirst: false });
    query = query.order('month', { ascending: true, nullsFirst: true });
    query = query.order('day', { ascending: true, nullsFirst: true });
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      return errorResponse(error.message);
    }

    return successResponse(data || []);
  } catch (error) {
    return handleError(error, 'Failed to fetch timeline events');
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
      title,
      description,
      description_markdown,
      date_data,
      date_text,
      year,
      month,
      day,
      categories,
      is_key_event,
      location,
      image_url,
      characters, // Array of { oc_id, role }
      story_alias_id,
    } = body;

    // Validate required fields
    const validationError = validateRequiredFields(body, ['world_id', 'title']);
    if (validationError) {
      return validationError;
    }

    // Validate story_alias_id if provided
    if (story_alias_id) {
      const { data: storyAlias, error: aliasError } = await supabase
        .from('story_aliases')
        .select('id, world_id')
        .eq('id', story_alias_id)
        .single();

      if (aliasError || !storyAlias) {
        return errorResponse('Invalid story_alias_id provided');
      }

      if (storyAlias.world_id !== world_id) {
        return errorResponse('Story alias must belong to the same world as the timeline event');
      }
    }

  // Insert event
  const { data: event, error: eventError } = await supabase
    .from('timeline_events')
    .insert({
      world_id,
      title,
      description,
      description_markdown,
      date_data,
      date_text,
      year,
      month,
      day,
      categories: categories || [],
      is_key_event: is_key_event || false,
      location,
      image_url,
      story_alias_id: story_alias_id || null,
    })
    .select()
    .single();

    if (eventError) {
      return errorResponse(eventError.message);
    }

    // Insert character associations if provided
    if (characters && Array.isArray(characters) && characters.length > 0) {
      const characterInserts = characters
        .filter((char: { oc_id?: string | null; custom_name?: string | null }) => 
          char.oc_id || char.custom_name
        )
        .map((char: { oc_id?: string | null; custom_name?: string | null; role?: string }) => ({
          timeline_event_id: event.id,
          oc_id: char.oc_id || null,
          custom_name: char.custom_name || null,
          role: char.role || null,
        }));

      const { error: charError } = await supabase
        .from('timeline_event_characters')
        .insert(characterInserts);

      if (charError) {
        // Event was created, but character associations failed
        // We'll still return the event, but log the error
        logger.error('API', 'Failed to associate characters', charError);
      }
    }

    // Fetch the complete event with relationships
    const { data: completeEvent, error: fetchError } = await supabase
      .from('timeline_events')
      .select(`
        *,
        world:worlds(id, name, slug),
        story_alias:story_aliases(id, name, slug, description),
        characters:timeline_event_characters(
          *,
          oc:ocs(id, name, slug, date_of_birth)
        )
      `)
      .eq('id', event.id)
      .single();

    if (fetchError) {
      return errorResponse(fetchError.message);
    }

    return successResponse(completeEvent);
  } catch (error) {
    return handleError(error, 'Failed to create timeline event');
  }
}

