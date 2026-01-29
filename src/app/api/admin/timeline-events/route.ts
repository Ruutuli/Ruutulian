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

    // Fetch story_aliases separately to avoid ambiguous relationship errors
    const eventsWithStoryAliases = await Promise.all(
      (data || []).map(async (event) => {
        if (event.story_alias_id) {
          const { data: storyAlias } = await supabase
            .from('story_aliases')
            .select('id, name, slug, description')
            .eq('id', event.story_alias_id)
            .single();
          
          if (storyAlias) {
            return { ...event, story_alias: storyAlias };
          }
        }
        return event;
      })
    );

    return successResponse(eventsWithStoryAliases);
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
      timeline_ids, // Array of timeline IDs this event belongs to
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
        .map((char: { oc_id?: string | null; custom_name?: string | null; role?: string; age?: number | null }) => ({
          timeline_event_id: event.id,
          oc_id: char.oc_id || null,
          custom_name: char.custom_name ? char.custom_name.trim() : null, // Normalize custom names by trimming
          role: char.role || null,
          age: char.age || null,
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

    // Associate event with timelines if provided
    if (timeline_ids && Array.isArray(timeline_ids) && timeline_ids.length > 0) {
      // Validate that all timelines belong to the same world
      const { data: timelines, error: timelineCheckError } = await supabase
        .from('timelines')
        .select('id, world_id')
        .in('id', timeline_ids);

      if (timelineCheckError) {
        logger.error('API', 'Failed to validate timelines', timelineCheckError);
      } else if (timelines) {
        // Check all timelines belong to the same world
        const invalidTimelines = timelines.filter(t => t.world_id !== world_id);
        if (invalidTimelines.length > 0) {
          logger.warn('API', 'Some timelines do not belong to the event world', invalidTimelines);
        }

        // Calculate chronological position for each timeline
        const timelineInserts = await Promise.all(
          timelines.map(async (timeline) => {
            // Get all events in this timeline with their dates for chronological sorting
            const { data: existingAssociations } = await supabase
              .from('timeline_event_timelines')
              .select(`
                timeline_event_id,
                position
              `)
              .eq('timeline_id', timeline.id)
              .order('position', { ascending: true });

            // Get the actual event data for date comparison
            const eventIds = existingAssociations?.map((a: any) => a.timeline_event_id) || [];
            let existingEvents: Array<{ id: string; year: number | null; month: number | null; day: number | null; position: number }> = [];
            
            if (eventIds.length > 0) {
              const { data: events } = await supabase
                .from('timeline_events')
                .select('id, year, month, day')
                .in('id', eventIds);
              
              // Map events to their positions
              existingEvents = (events || []).map((evt: any) => {
                const assoc = existingAssociations?.find((a: any) => a.timeline_event_id === evt.id);
                return {
                  ...evt,
                  position: assoc?.position ?? 0,
                };
              }).sort((a, b) => a.position - b.position);
            }

            // Calculate position based on chronological order
            const newEventYear = year ?? 0;
            const newEventMonth = month ?? 0;
            const newEventDay = day ?? 0;
            
            let insertPosition = 0;
            
            // Find where this event should be inserted chronologically
            for (let i = 0; i < existingEvents.length; i++) {
              const existingEvent = existingEvents[i];
              const existingYear = existingEvent.year ?? 0;
              const existingMonth = existingEvent.month ?? 0;
              const existingDay = existingEvent.day ?? 0;
              
              // Compare dates: year first, then month, then day
              if (newEventYear < existingYear) {
                insertPosition = existingEvent.position;
                break;
              } else if (newEventYear === existingYear) {
                if (newEventMonth < existingMonth) {
                  insertPosition = existingEvent.position;
                  break;
                } else if (newEventMonth === existingMonth) {
                  if (newEventDay < existingDay) {
                    insertPosition = existingEvent.position;
                    break;
                  } else if (newEventDay === existingDay) {
                    // Same date, insert after
                    insertPosition = existingEvent.position + 1;
                    break;
                  }
                }
              }
              
              // If we've reached the end, insert after the last event
              if (i === existingEvents.length - 1) {
                insertPosition = existingEvent.position + 1;
              }
            }
            
            // Shift all events at or after insertPosition by 1
            if (insertPosition < (existingEvents[existingEvents.length - 1]?.position ?? -1) + 1) {
              const eventsToShift = existingEvents.filter(
                (evt) => evt.position >= insertPosition
              );
              
              // Update positions for events that need to shift
              for (const evtToShift of eventsToShift) {
                await supabase
                  .from('timeline_event_timelines')
                  .update({ position: evtToShift.position + 1 })
                  .eq('timeline_id', timeline.id)
                  .eq('timeline_event_id', evtToShift.id);
              }
            }

            return {
              timeline_id: timeline.id,
              timeline_event_id: event.id,
              position: insertPosition,
            };
          })
        );

        const { error: timelineError } = await supabase
          .from('timeline_event_timelines')
          .insert(timelineInserts);

        if (timelineError) {
          // Event was created, but timeline associations failed
          // We'll still return the event, but log the error
          logger.error('API', 'Failed to associate timelines', timelineError);
        }
      }
    }

    // Fetch the complete event with relationships
    const { data: completeEvent, error: fetchError } = await supabase
      .from('timeline_events')
      .select(`
        *,
        world:worlds(id, name, slug),
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

    // Fetch story_alias separately to avoid ambiguous relationship errors
    if (completeEvent?.story_alias_id) {
      const { data: storyAlias } = await supabase
        .from('story_aliases')
        .select('id, name, slug, description')
        .eq('id', completeEvent.story_alias_id)
        .single();
      
      if (storyAlias) {
        completeEvent.story_alias = storyAlias;
      }
    }

    return successResponse(completeEvent);
  } catch (error) {
    return handleError(error, 'Failed to create timeline event');
  }
}

