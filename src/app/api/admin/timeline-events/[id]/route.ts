import { createAdminClient } from '@/lib/supabase/server';
import { errorResponse, successResponse, handleError } from '@/lib/api/route-helpers';
import { checkAuth } from '@/lib/auth/require-auth';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('timeline_events')
      .select(`
        *,
        world:worlds(id, name, slug),
        story_alias:story_aliases(id, name, slug, description),
        characters:timeline_event_characters(
          *,
          oc:ocs(id, name, slug, date_of_birth)
        ),
        timelines:timeline_event_timelines(
          *,
          timeline:timelines(id, name)
        )
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      return errorResponse(error.message);
    }

    return successResponse(data);
  } catch (error) {
    return handleError(error, 'Failed to fetch timeline event');
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const body = await request.json();
  const {
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
    characters, // Array of { oc_id, role } - will replace all existing
    story_alias_id,
  } = body;

  // Get current event to validate story_alias_id
  const { data: currentEvent } = await supabase
    .from('timeline_events')
    .select('world_id')
    .eq('id', params.id)
    .single();

  if (currentEvent && story_alias_id) {
    const { data: storyAlias, error: aliasError } = await supabase
      .from('story_aliases')
      .select('id, world_id')
      .eq('id', story_alias_id)
      .single();

    if (aliasError || !storyAlias) {
      return errorResponse('Invalid story_alias_id provided');
    }

    if (storyAlias.world_id !== currentEvent.world_id) {
      return errorResponse('Story alias must belong to the same world as the timeline event');
    }
  }

  // Update event
  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (description_markdown !== undefined) updateData.description_markdown = description_markdown;
  if (date_data !== undefined) updateData.date_data = date_data;
  if (date_text !== undefined) updateData.date_text = date_text;
  if (year !== undefined) updateData.year = year;
  if (month !== undefined) updateData.month = month;
  if (day !== undefined) updateData.day = day;
  if (categories !== undefined) updateData.categories = categories;
  if (is_key_event !== undefined) updateData.is_key_event = is_key_event;
  if (location !== undefined) updateData.location = location;
  if (image_url !== undefined) updateData.image_url = image_url;
  if (story_alias_id !== undefined) updateData.story_alias_id = story_alias_id || null;

  const { error: updateError } = await supabase
    .from('timeline_events')
    .update(updateData)
    .eq('id', params.id);

    if (updateError) {
      return errorResponse(updateError.message);
    }

    // Update character associations if provided
    if (characters !== undefined) {
      // Delete existing associations
      await supabase
        .from('timeline_event_characters')
        .delete()
        .eq('timeline_event_id', params.id);

      // Insert new associations
      if (Array.isArray(characters) && characters.length > 0) {
        const characterInserts = characters
          .filter((char: { oc_id?: string | null; custom_name?: string | null }) => 
            char.oc_id || char.custom_name
          )
          .map((char: { oc_id?: string | null; custom_name?: string | null; role?: string }) => ({
            timeline_event_id: params.id,
            oc_id: char.oc_id || null,
            custom_name: char.custom_name || null,
            role: char.role || null,
          }));

        const { error: charError } = await supabase
          .from('timeline_event_characters')
          .insert(characterInserts);

        if (charError) {
          logger.error('API', 'Failed to update character associations', charError);
        }
      }
    }

    // Fetch the complete updated event
    const { data: updatedEvent, error: fetchError } = await supabase
      .from('timeline_events')
      .select(`
        *,
        world:worlds(id, name, slug),
        story_alias:story_aliases(id, name, slug, description),
        characters:timeline_event_characters(
          *,
          oc:ocs(id, name, slug, date_of_birth)
        ),
        timelines:timeline_event_timelines(
          *,
          timeline:timelines(id, name)
        )
      `)
      .eq('id', params.id)
      .single();

    if (fetchError) {
      return errorResponse(fetchError.message);
    }

    return successResponse(updatedEvent);
  } catch (error) {
    return handleError(error, 'Failed to update timeline event');
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Delete all related records first to ensure complete removal
    // Delete character associations
    await supabase
      .from('timeline_event_characters')
      .delete()
      .eq('timeline_event_id', params.id);

    // Delete timeline associations (junction table)
    await supabase
      .from('timeline_event_timelines')
      .delete()
      .eq('timeline_event_id', params.id);

    // Delete the event itself (cascade should handle this, but explicit is safer)
    const { error } = await supabase
      .from('timeline_events')
      .delete()
      .eq('id', params.id);

    if (error) {
      return errorResponse(error.message);
    }

    return successResponse({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to delete timeline event');
  }
}

