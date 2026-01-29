import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth/require-auth';

// Add event to timeline
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await checkAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  const body = await request.json();
  const { timeline_id, position } = body;

  if (!timeline_id) {
    return NextResponse.json(
      { error: 'timeline_id is required' },
      { status: 400 }
    );
  }

  // Check if association already exists
  const { data: existingAssociation } = await supabase
    .from('timeline_event_timelines')
    .select('*')
    .eq('timeline_id', timeline_id)
    .eq('timeline_event_id', params.id)
    .single();

  // If already associated, return the existing association
  if (existingAssociation) {
    const { data: timeline } = await supabase
      .from('timelines')
      .select('id, name')
      .eq('id', timeline_id)
      .single();

    return NextResponse.json({
      ...existingAssociation,
      timeline: timeline,
    });
  }

  // Calculate chronological position if position not explicitly provided
  let newPosition: number;
  
  if (position !== undefined) {
    // Use provided position
    newPosition = position;
  } else {
    // Get the event being added to get its date
    const { data: eventToAdd } = await supabase
      .from('timeline_events')
      .select('year, month, day')
      .eq('id', params.id)
      .single();
    
    if (!eventToAdd) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    // Get all events in this timeline with their dates
    const { data: existingAssociations } = await supabase
      .from('timeline_event_timelines')
      .select('timeline_event_id, position')
      .eq('timeline_id', timeline_id)
      .order('position', { ascending: true });
    
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
    
    // Calculate chronological position
    const newEventYear = eventToAdd.year ?? 0;
    const newEventMonth = eventToAdd.month ?? 0;
    const newEventDay = eventToAdd.day ?? 0;
    
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
          .eq('timeline_id', timeline_id)
          .eq('timeline_event_id', evtToShift.id);
      }
    }
    
    newPosition = insertPosition;
  }

  const { data, error } = await supabase
    .from('timeline_event_timelines')
    .insert({
      timeline_id,
      timeline_event_id: params.id,
      position: newPosition,
    })
    .select(`
      *,
      timeline:timelines(id, name)
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}

// Remove event from timeline
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await checkAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { searchParams } = new URL(request.url);
  const timeline_id = searchParams.get('timeline_id');

  if (!timeline_id) {
    return NextResponse.json(
      { error: 'timeline_id query parameter is required' },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from('timeline_event_timelines')
    .delete()
    .eq('timeline_id', timeline_id)
    .eq('timeline_event_id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

// Update position in timeline
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await checkAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  const body = await request.json();
  const { timeline_id, position } = body;

  if (!timeline_id || position === undefined) {
    return NextResponse.json(
      { error: 'timeline_id and position are required' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('timeline_event_timelines')
    .update({ position })
    .eq('timeline_id', timeline_id)
    .eq('timeline_event_id', params.id)
    .select(`
      *,
      timeline:timelines(id, name)
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}

