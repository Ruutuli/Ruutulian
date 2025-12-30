'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { TimelineEvent, OC, Timeline } from '@/types/oc';
import { createClient } from '@/lib/supabase/client';
import { TimelineEventForm } from './TimelineEventForm';
import { getCategoryColorClasses } from '@/lib/utils/categoryColors';
import { calculateAge } from '@/lib/utils/ageCalculation';

interface TimelineEventsManagerProps {
  timelineId: string;
}

export function TimelineEventsManager({ timelineId }: TimelineEventsManagerProps) {
  const router = useRouter();
  const [timelineEvents, setTimelineEvents] = useState<Array<TimelineEvent & { position: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [worldId, setWorldId] = useState<string | null>(null);
  const [timelineEra, setTimelineEra] = useState<string | null>(null);
  const [timelineStoryAliasId, setTimelineStoryAliasId] = useState<string | null>(null);
  const [showCreateEventForm, setShowCreateEventForm] = useState(false);

  useEffect(() => {
    loadTimelineAndEvents();
  }, [timelineId]);

  async function loadTimelineAndEvents() {
    setIsLoading(true);
    const supabase = createClient();
    
    // Get timeline to find world_id, era, and story_alias_id
    const { data: timeline } = await supabase
      .from('timelines')
      .select('world_id, era, story_alias_id')
      .eq('id', timelineId)
      .single();
    
    if (!timeline) {
      setIsLoading(false);
      return;
    }

    setWorldId(timeline.world_id);
    setTimelineEra(timeline.era);
    setTimelineStoryAliasId(timeline.story_alias_id);

    // Load events associated with this timeline via junction table
    const { data: associations } = await supabase
      .from('timeline_event_timelines')
      .select(`
        *,
        event:timeline_events(
          *,
          world:worlds(id, name, slug),
        characters:timeline_event_characters(
          *,
          oc:ocs(id, name, slug, date_of_birth)
        )
        )
      `)
      .eq('timeline_id', timelineId)
      .order('position', { ascending: true });

    if (associations) {
      const events = associations
        .map((assoc: any) => ({
          ...assoc.event,
          position: assoc.position,
        }))
        .filter((e: any) => e.id); // Filter out any null events
      setTimelineEvents(events);
    }

    setIsLoading(false);
  }

  async function addEventToTimeline(eventId: string) {
    setIsSaving(true);
    const supabase = createClient();

    // Get the highest position
    const { data: existing } = await supabase
      .from('timeline_event_timelines')
      .select('position')
      .eq('timeline_id', timelineId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const newPosition = (existing?.position ?? -1) + 1;

    const { error } = await supabase
      .from('timeline_event_timelines')
      .insert({
        timeline_id: timelineId,
        timeline_event_id: eventId,
        position: newPosition,
      });

    if (error) {
      console.error('Error adding event to timeline:', error);
      alert('Failed to add event to timeline');
    } else {
      await loadTimelineAndEvents();
    }
    setIsSaving(false);
  }

  async function handleEventCreated(responseData: any) {
    if (responseData?.id && worldId) {
      // Automatically add the new event to the timeline
      await addEventToTimeline(responseData.id);
      // Hide the form
      setShowCreateEventForm(false);
    }
  }

  async function removeEventFromTimeline(eventId: string) {
    if (!confirm('Remove this event from this timeline? (The event itself will not be deleted)')) {
      return;
    }

    setIsSaving(true);
    const supabase = createClient();

    const { error } = await supabase
      .from('timeline_event_timelines')
      .delete()
      .eq('timeline_id', timelineId)
      .eq('timeline_event_id', eventId);

    if (error) {
      console.error('Error removing event from timeline:', error);
      alert('Failed to remove event from timeline');
    } else {
      await loadTimelineAndEvents();
    }
    setIsSaving(false);
  }

  async function updateEventPosition(eventId: string, newPosition: number) {
    setIsSaving(true);
    const supabase = createClient();

    const { error } = await supabase
      .from('timeline_event_timelines')
      .update({ position: newPosition })
      .eq('timeline_id', timelineId)
      .eq('timeline_event_id', eventId);

    if (error) {
      console.error('Error updating position:', error);
      alert('Failed to update event position');
    } else {
      await loadTimelineAndEvents();
    }
    setIsSaving(false);
  }

  function moveEvent(index: number, direction: 'up' | 'down') {
    const newEvents = [...timelineEvents];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newEvents.length) return;

    const event = newEvents[index];
    const targetEvent = newEvents[newIndex];

    // Swap positions
    updateEventPosition(event.id, targetEvent.position);
    updateEventPosition(targetEvent.id, event.position);
  }

  if (isLoading) {
    return <div className="text-center py-8 text-gray-300">Loading events...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-gray-100">Timeline Events</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateEventForm(!showCreateEventForm)}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            {showCreateEventForm ? 'Cancel' : 'Create New Event'}
          </button>
        </div>
      </div>

      {showCreateEventForm && worldId && (
        <div className="border border-gray-600/70 rounded-lg p-6 bg-gray-700/60">
          <h4 className="text-lg font-semibold text-gray-100 mb-4">Create New Event</h4>
          <TimelineEventForm
            key={showCreateEventForm ? 'create-event-form' : undefined}
            worldId={worldId}
            lockWorld={true}
            timelineEra={timelineEra}
            timelineStoryAliasId={timelineStoryAliasId}
            lockStoryAlias={true}
            onSuccess={handleEventCreated}
            onCancel={() => setShowCreateEventForm(false)}
            hideCancel={false}
          />
        </div>
      )}

      {timelineEvents.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No events in this timeline yet. Create events to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {timelineEvents.map((event, index) => (
            <div
              key={event.id}
              className="border border-gray-600/70 rounded-lg p-6 bg-gray-700/60"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm text-gray-400 font-mono">#{index + 1}</span>
                    <h4 className="text-lg font-semibold text-gray-100">{event.title}</h4>
                    {event.is_key_event && (
                      <span className="px-2 py-1 bg-yellow-600/30 text-yellow-300 rounded text-xs font-semibold">
                        KEY EVENT
                      </span>
                    )}
                  </div>
                  {event.date_text && (
                    <div className="text-sm text-gray-300 mb-2">{event.date_text}</div>
                  )}
                  {event.categories && event.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {event.categories.map((cat) => (
                        <span
                          key={cat}
                          className={`text-xs px-2 py-0.5 rounded border ${getCategoryColorClasses(cat)}`}
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  )}
                  {event.description && (
                    <p className="text-sm text-gray-300 mb-2">{event.description}</p>
                  )}
                  {event.location && (
                    <p className="text-sm text-gray-400 italic">📍 {event.location}</p>
                  )}
                  {event.characters && event.characters.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-400 mb-1">
                        Characters:{' '}
                        {event.characters.map((char, index) => {
                          const age = char.oc?.date_of_birth && event.date_data
                            ? calculateAge(char.oc.date_of_birth, event.date_data)
                            : null;
                          
                          return (
                            <span key={char.id}>
                              {char.oc?.name}
                              {age !== null && ` (${age})`}
                              {index < event.characters.length - 1 && ', '}
                            </span>
                          );
                        })}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => moveEvent(index, 'up')}
                    disabled={index === 0 || isSaving}
                    className="px-3 py-1 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 disabled:opacity-50"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveEvent(index, 'down')}
                    disabled={index === timelineEvents.length - 1 || isSaving}
                    className="px-3 py-1 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 disabled:opacity-50"
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => router.push(`/admin/timeline-events/${event.id}`)}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removeEventFromTimeline(event.id)}
                    disabled={isSaving}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

