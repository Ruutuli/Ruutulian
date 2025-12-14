import { createAdminClient } from '@/lib/supabase/server';
import { validateRequiredFields, checkSlugUniquenessExcluding, errorResponse, successResponse, handleError } from '@/lib/api/route-helpers';
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

    if (!id) {
      return errorResponse('Lore entry ID is required');
    }

    const { data, error } = await supabase
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
      .eq('id', id)
      .single();

    if (error) {
      return errorResponse(error.message);
    }

    if (!data) {
      return errorResponse('Lore entry not found', 404);
    }

    return successResponse(data);
  } catch (error) {
    return handleError(error, 'Failed to fetch world lore');
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

    const supabase = createAdminClient();
    const { id } = await params;

    if (!id) {
      return errorResponse('Lore entry ID is required');
    }

    const body = await request.json();
    const {
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
      story_alias_id,
    } = body;

    // Validate required fields
    const validationError = validateRequiredFields(body, ['name', 'slug', 'lore_type']);
    if (validationError) {
      return validationError;
    }

    // Check if slug is unique per world (excluding current entry)
    const { data: currentLore } = await supabase
      .from('world_lore')
      .select('world_id')
      .eq('id', id)
      .single();

    if (!currentLore) {
      return errorResponse('Lore entry not found', 404);
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

      if (storyAlias.world_id !== currentLore.world_id) {
        return errorResponse('Story alias must belong to the same world as the lore entry');
      }
    }

    const existingLore = await checkSlugUniquenessExcluding(
      supabase,
      'world_lore',
      slug,
      'world_id',
      currentLore.world_id,
      id
    );

    if (existingLore) {
      return errorResponse('A lore entry with this slug already exists in this world');
    }

    // Update lore entry
    const { error: updateError } = await supabase
      .from('world_lore')
      .update({
        name,
        slug,
        lore_type,
        description,
        description_markdown,
        banner_image_url,
        world_fields: world_fields || {},
        modular_fields: modular_fields || {},
        story_alias_id: story_alias_id || null,
      })
      .eq('id', id);

    if (updateError) {
      return errorResponse(updateError.message || 'Failed to update lore entry');
    }

    // Update OC associations if provided
    if (related_ocs !== undefined) {
      // Delete existing associations
      await supabase
        .from('world_lore_ocs')
        .delete()
        .eq('world_lore_id', id);

      // Insert new associations
      if (Array.isArray(related_ocs) && related_ocs.length > 0) {
        const ocInserts = related_ocs.map((rel: { oc_id: string; role?: string }) => ({
          world_lore_id: id,
          oc_id: rel.oc_id,
          role: rel.role || null,
        }));

        const { error: ocError } = await supabase
          .from('world_lore_ocs')
          .insert(ocInserts);

        if (ocError) {
          console.error('Failed to update OC associations:', ocError);
        }
      }
    }

    // Update timeline event associations if provided
    if (related_events !== undefined) {
      // Delete existing associations
      await supabase
        .from('world_lore_timeline_events')
        .delete()
        .eq('world_lore_id', id);

      // Insert new associations
      if (Array.isArray(related_events) && related_events.length > 0) {
        const eventInserts = related_events.map((rel: { timeline_event_id: string }) => ({
          world_lore_id: id,
          timeline_event_id: rel.timeline_event_id,
        }));

        const { error: eventError } = await supabase
          .from('world_lore_timeline_events')
          .insert(eventInserts);

        if (eventError) {
          console.error('Failed to update timeline event associations:', eventError);
        }
      }
    }

    // Fetch the updated lore entry with relationships
    const { data: updatedLore, error: fetchError } = await supabase
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
      .eq('id', id)
      .single();

    if (fetchError) {
      return errorResponse(fetchError.message || 'Failed to fetch updated lore entry');
    }

    return successResponse(updatedLore);
  } catch (error) {
    return handleError(error, 'Failed to update world lore');
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

    const supabase = createAdminClient();
    const { id } = await params;

    if (!id) {
      return errorResponse('Lore entry ID is required');
    }

    // Delete lore entry (cascade will handle junction tables)
    const { error } = await supabase
      .from('world_lore')
      .delete()
      .eq('id', id);

    if (error) {
      return errorResponse(error.message || 'Failed to delete lore entry');
    }

    return successResponse({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to delete world lore');
  }
}

