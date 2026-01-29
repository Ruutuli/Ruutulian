'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { TimelineEvent, OC, Timeline, EventDateData } from '@/types/oc';
import { createClient } from '@/lib/supabase/client';
import { TimelineEventForm } from './TimelineEventForm';
import { getCategoryColorClasses } from '@/lib/utils/categoryColors';
import { calculateAge } from '@/lib/utils/ageCalculation';
import { logger } from '@/lib/logger';

// Helper function to format date data for display
function formatDateData(dateData: EventDateData | null | undefined): string {
  if (!dateData) return '';
  
  // Handle case where dateData might be a string (invalid JSON from DB)
  if (typeof dateData === 'string') {
    return dateData;
  }
  
  // Ensure dateData has a type property
  if (typeof dateData !== 'object' || !('type' in dateData)) {
    return '';
  }
  
  switch (dateData.type) {
    case 'exact':
      const exact = dateData as any;
      const eraPrefix = exact.era ? `${exact.era} ` : '';
      const yearStr = exact.year.toString().padStart(4, '0');
      const approximateSuffix = exact.approximate ? ' ~' : '';
      
      if (exact.month && exact.day) {
        const monthStr = exact.month.toString().padStart(2, '0');
        const dayStr = exact.day.toString().padStart(2, '0');
        return `${eraPrefix}${yearStr}-${monthStr}-${dayStr}${approximateSuffix}`;
      }
      return `${eraPrefix}${yearStr}${approximateSuffix}`;
    case 'approximate':
      const approx = dateData as any;
      const periodPrefix = approx.period ? `${approx.period} ` : '';
      if (approx.year !== undefined) {
        const eraPrefix = approx.era ? `${approx.era} ` : '';
        const yearStr = approx.year.toString().padStart(4, '0');
        return `~${periodPrefix}${eraPrefix}${yearStr}`;
      }
      if (approx.year_range && Array.isArray(approx.year_range) && approx.year_range.length === 2) {
        const eraPrefix = approx.era ? `${approx.era} ` : '';
        const startYear = approx.year_range[0].toString().padStart(4, '0');
        const endYear = approx.year_range[1].toString().padStart(4, '0');
        return `~${periodPrefix}${eraPrefix}${startYear}-${endYear}`;
      }
      return approx.text || 'Approximate date';
    case 'range':
      const range = dateData as any;
      const startEra = range.start?.era ? `${range.start.era} ` : '';
      const endEra = range.end?.era ? `${range.end.era} ` : '';
      const startParts = [range.start.year.toString().padStart(4, '0')];
      if (range.start.month) startParts.push(range.start.month.toString().padStart(2, '0'));
      if (range.start.day) startParts.push(range.start.day.toString().padStart(2, '0'));
      const endParts = [range.end.year.toString().padStart(4, '0')];
      if (range.end.month) endParts.push(range.end.month.toString().padStart(2, '0'));
      if (range.end.day) endParts.push(range.end.day.toString().padStart(2, '0'));
      const separator = range.start?.era && range.end?.era && range.start.era === range.end.era ? '–' : ' to ';
      return `${startEra}${startParts.join('-')}${separator}${endEra}${endParts.join('-')}${range.text ? ` (${range.text})` : ''}`;
    case 'relative':
      const relative = dateData as any;
      return relative.text || 'Relative date';
    case 'unknown':
      return (dateData as any).text || 'Date unknown';
    default:
      return '';
  }
}

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
  const [showAddExistingEvent, setShowAddExistingEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [availableEvents, setAvailableEvents] = useState<TimelineEvent[]>([]);
  const [isLoadingAvailableEvents, setIsLoadingAvailableEvents] = useState(false);
  const [sortChronologically, setSortChronologically] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Scroll to top when editing an event
  useEffect(() => {
    if (editingEventId) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [editingEventId]);

  const cancelledRef = useRef(false);

  async function loadTimelineAndEvents() {
    if (cancelledRef.current) return;
    
    setIsLoading(true);
    const supabase = createClient();
    
    // Get timeline to find world_id, era, and story_alias_id
    const { data: timeline } = await supabase
      .from('timelines')
      .select('world_id, era, story_alias_id')
      .eq('id', timelineId)
      .single();
    
    if (cancelledRef.current) return;

    if (!timeline) {
      if (!cancelledRef.current) {
        setIsLoading(false);
      }
      return;
    }

    if (!cancelledRef.current) {
      setWorldId(timeline.world_id);
      setTimelineEra(timeline.era);
      setTimelineStoryAliasId(timeline.story_alias_id);
    }

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

    if (cancelledRef.current) return;

    if (associations) {
      const events = associations
        .map((assoc: any) => {
          // Handle both single object and array cases from Supabase
          const event = Array.isArray(assoc.event) ? assoc.event[0] : assoc.event;
          if (!event || !event.id) return null;
          return {
            ...event,
            position: assoc.position,
          };
        })
        .filter((e: any): e is TimelineEvent & { position: number } => e !== null);
      if (!cancelledRef.current) {
        setTimelineEvents(events);
      }
    } else {
      // If no associations, clear the events list
      if (!cancelledRef.current) {
        setTimelineEvents([]);
      }
    }

    if (!cancelledRef.current) {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    cancelledRef.current = false;
    loadTimelineAndEvents();

    return () => {
      cancelledRef.current = true;
      // Abort any pending Supabase queries if possible
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [timelineId]);

  async function addEventToTimeline(eventId: string) {
    setIsSaving(true);

    try {
      const response = await fetch(`/api/admin/timeline-events/${eventId}/timelines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeline_id: timelineId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to add event to timeline' }));
        throw new Error(errorData.error || 'Failed to add event to timeline');
      }

      await loadTimelineAndEvents();
    } catch (error) {
      logger.error('Component', 'TimelineEventsManager: Error adding event to timeline', error);
      alert(error instanceof Error ? error.message : 'Failed to add event to timeline');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEventCreated(responseData: any) {
    if (responseData?.id && worldId) {
      // Check if the event was already added to this timeline via timeline_ids
      // The event creation API should have already associated it if timelineId was in timeline_ids
      // So we only need to add it if it wasn't already associated
      try {
        const supabase = createClient();
        const { data: existing } = await supabase
          .from('timeline_event_timelines')
          .select('id')
          .eq('timeline_id', timelineId)
          .eq('timeline_event_id', responseData.id)
          .single();

        // Only add if not already associated
        if (!existing) {
          await addEventToTimeline(responseData.id);
        } else {
          // Event is already associated, just reload the list to show it
          await loadTimelineAndEvents();
        }
      } catch (error) {
        // If check fails, try to add anyway (will be handled gracefully by API)
        await addEventToTimeline(responseData.id);
      }
      // Hide the form
      setShowCreateEventForm(false);
    }
  }

  async function handleEventUpdated(responseData: any) {
    if (responseData?.id) {
      // Reload the events list to show updated event
      await loadTimelineAndEvents();
      // Hide the edit form
      setEditingEventId(null);
    }
  }

  async function removeEventFromTimeline(eventId: string) {
    if (!confirm('Remove this event from this timeline? (The event itself will not be deleted)')) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/admin/timeline-events/${eventId}/timelines?timeline_id=${timelineId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to remove event from timeline' }));
        throw new Error(errorData.error || 'Failed to remove event from timeline');
      }

      await loadTimelineAndEvents();
    } catch (error) {
      logger.error('Component', 'TimelineEventsManager: Error removing event from timeline', error);
      alert(error instanceof Error ? error.message : 'Failed to remove event from timeline');
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteEvent(eventId: string) {
    if (!confirm('Are you sure you want to delete this timeline event? This action cannot be undone and will remove the event from all timelines.')) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/admin/timeline-events/${eventId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete event' }));
        throw new Error(errorData.error || 'Failed to delete event');
      }

      await loadTimelineAndEvents();
    } catch (error) {
      logger.error('Component', 'TimelineEventsManager: Error deleting event', error);
      alert(error instanceof Error ? error.message : 'Failed to delete event');
    } finally {
      setIsSaving(false);
    }
  }

  async function updateEventPosition(eventId: string, newPosition: number) {
    setIsSaving(true);

    try {
      const response = await fetch(`/api/admin/timeline-events/${eventId}/timelines`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeline_id: timelineId, position: newPosition }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update event position' }));
        throw new Error(errorData.error || 'Failed to update event position');
      }

      await loadTimelineAndEvents();
    } catch (error) {
      logger.error('Component', 'TimelineEventsManager: Error updating position', error);
      alert(error instanceof Error ? error.message : 'Failed to update event position');
    } finally {
      setIsSaving(false);
    }
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

  async function loadAvailableEvents() {
    if (!worldId) return;

    setIsLoadingAvailableEvents(true);
    try {
      const supabase = createClient();
      
      // Get all events for this world
      const { data: allEvents } = await supabase
        .from('timeline_events')
        .select('*')
        .eq('world_id', worldId)
        .order('year', { ascending: true, nullsFirst: false })
        .order('month', { ascending: true, nullsFirst: true })
        .order('day', { ascending: true, nullsFirst: true });

      if (!allEvents) {
        setAvailableEvents([]);
        return;
      }

      // Get IDs of events already in this timeline
      const eventIdsInTimeline = new Set(timelineEvents.map(e => e.id));

      // Filter out events that are already in the timeline
      const available = allEvents.filter(event => !eventIdsInTimeline.has(event.id));
      setAvailableEvents(available);
    } catch (error) {
      logger.error('Component', 'TimelineEventsManager: Error loading available events', error);
      alert('Failed to load available events');
    } finally {
      setIsLoadingAvailableEvents(false);
    }
  }

  async function handleAddExistingEvent(eventId: string) {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/timeline-events/${eventId}/timelines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeline_id: timelineId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to add event to timeline' }));
        throw new Error(errorData.error || 'Failed to add event to timeline');
      }

      // Reload timeline events first
      await loadTimelineAndEvents();
      // Then reload available events to remove the one we just added
      await loadAvailableEvents();
    } catch (error) {
      logger.error('Component', 'TimelineEventsManager: Error adding existing event to timeline', error);
      alert(error instanceof Error ? error.message : 'Failed to add event to timeline');
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    if (showAddExistingEvent && worldId) {
      loadAvailableEvents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddExistingEvent, worldId, timelineEvents.length]);

  // Helper function to get period sort value (early=1, mid=2, late=3, null=2 for middle of year)
  function getPeriodSortValue(period: 'early' | 'mid' | 'late' | null | undefined): number {
    if (period === 'early') return 1;
    if (period === 'mid') return 2;
    if (period === 'late') return 3;
    return 2; // Default to mid if no period specified
  }

  // Helper function to extract sortable date values from an event
  function getEventSortDate(event: TimelineEvent & { position: number }): { 
    year: number | null; 
    month: number | null; 
    day: number | null;
    period: number | null; // Period sort value for approximate dates
  } {
    // First try to get from date_data
    if (event.date_data) {
      if (typeof event.date_data === 'object' && 'type' in event.date_data) {
        const dateData = event.date_data as any;
        if (dateData.type === 'exact') {
          return {
            year: dateData.year ?? null,
            month: dateData.month ?? null,
            day: dateData.day ?? null,
            period: null,
          };
        } else if (dateData.type === 'range') {
          // Use start date for sorting
          return {
            year: dateData.start?.year ?? null,
            month: dateData.start?.month ?? null,
            day: dateData.start?.day ?? null,
            period: null,
          };
        } else if (dateData.type === 'approximate') {
          // Use year if available, and include period for sorting
          return {
            year: dateData.year ?? (dateData.year_range?.[0] ?? null),
            month: null,
            day: null,
            period: getPeriodSortValue(dateData.period),
          };
        }
      }
    }
    
    // Fallback to year/month/day fields
    return {
      year: event.year ?? null,
      month: event.month ?? null,
      day: event.day ?? null,
      period: null,
    };
  }

  // Sort events chronologically
  const sortedEvents = sortChronologically
    ? [...timelineEvents].sort((a, b) => {
        const dateA = getEventSortDate(a);
        const dateB = getEventSortDate(b);
        
        // Events without years go to the end
        if (dateA.year === null && dateB.year === null) {
          return a.position - b.position; // Maintain original order for events without dates
        }
        if (dateA.year === null) return 1;
        if (dateB.year === null) return -1;
        
        // Compare years
        if (dateA.year !== dateB.year) {
          return dateA.year - dateB.year;
        }
        
        // Same year, compare months or periods
        // If both have periods but no months, compare periods directly
        if (dateA.month === null && dateB.month === null && dateA.period !== null && dateB.period !== null) {
          return dateA.period - dateB.period; // early (1) < mid (2) < late (3)
        }
        
        // Convert periods to approximate month values for comparison with actual months
        // early ≈ months 1-4 (use 2), mid ≈ months 5-8 (use 6), late ≈ months 9-12 (use 12 to ensure it comes after all dates)
        const periodToMonth = (period: number | null): number | null => {
          if (period === 1) return 2;  // early
          if (period === 2) return 6;  // mid
          if (period === 3) return 12; // late (use 12 so it comes after all specific dates in the year)
          return null;
        };
        
        const monthA = dateA.month ?? periodToMonth(dateA.period);
        const monthB = dateB.month ?? periodToMonth(dateB.period);
        
        if (monthA === null && monthB === null) {
          return a.position - b.position;
        }
        if (monthA === null) return 1;
        if (monthB === null) return -1;
        
        // Compare months
        if (monthA !== monthB) {
          return monthA - monthB;
        }
        
        // Same approximate month - if one is exact and one is period-based, exact comes first
        // (e.g., "July 7, 1977" should come before "late 1977" even though late ≈ month 11)
        const aHasExactMonth = dateA.month !== null;
        const bHasExactMonth = dateB.month !== null;
        const aHasPeriod = dateA.period !== null;
        const bHasPeriod = dateB.period !== null;
        
        // If both have exact months, continue to day comparison below
        // If one has exact month and other has period, exact comes first
        if (aHasExactMonth && !bHasExactMonth && bHasPeriod) {
          return -1; // Exact date comes before period-based date
        }
        if (bHasExactMonth && !aHasExactMonth && aHasPeriod) {
          return 1; // Exact date comes before period-based date
        }
        
        // If both are period-based with same month value, compare periods directly
        if (!aHasExactMonth && !bHasExactMonth && aHasPeriod && bHasPeriod) {
          return dateA.period! - dateB.period!;
        }
        
        // Same year and month, compare days
        // If one has a period (approximate date) and the other has an exact day, the exact date comes first
        // (e.g., "July 7, 1977" should come before "late 1977")
        if (dateA.period !== null && dateB.day !== null) {
          // A is period-based, B has exact day - exact comes first
          return 1;
        }
        if (dateB.period !== null && dateA.day !== null) {
          // B is period-based, A has exact day - exact comes first
          return -1;
        }
        
        // Both have days or both don't have days
        if (dateA.day === null && dateB.day === null) {
          // If both are period-based, compare periods
          if (dateA.period !== null && dateB.period !== null) {
            return dateA.period - dateB.period;
          }
          return a.position - b.position;
        }
        if (dateA.day === null) return 1;
        if (dateB.day === null) return -1;
        if (dateA.day !== dateB.day) {
          return dateA.day - dateB.day;
        }
        
        // Same date, maintain original order
        return a.position - b.position;
      })
    : timelineEvents;

  if (isLoading) {
    return <div className="text-center py-8 text-gray-300">Loading events...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-gray-100">Timeline Events</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setSortChronologically(!sortChronologically)}
            className={`px-4 py-2 rounded-md transition-colors ${
              sortChronologically
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-600 text-gray-200 hover:bg-gray-700'
            }`}
            title={sortChronologically ? 'Click to sort by timeline position (order added)' : 'Click to sort chronologically by date'}
          >
            {sortChronologically ? '📅 By Date (Chronological)' : '📅 By Position'}
          </button>
          <button
            onClick={() => {
              setShowAddExistingEvent(!showAddExistingEvent);
              setShowCreateEventForm(false);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            {showAddExistingEvent ? 'Cancel' : 'Add Existing Event'}
          </button>
          <button
            onClick={() => {
              setShowCreateEventForm(!showCreateEventForm);
              setShowAddExistingEvent(false);
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            {showCreateEventForm ? 'Cancel' : 'Create New Event'}
          </button>
        </div>
      </div>

      {showAddExistingEvent && worldId && (
        <div className="border border-gray-600/70 rounded-lg p-6 bg-gray-700/60">
          <h4 className="text-lg font-semibold text-gray-100 mb-4">Add Existing Event</h4>
          {isLoadingAvailableEvents ? (
            <div className="text-center py-4 text-gray-300">Loading available events...</div>
          ) : availableEvents.length === 0 ? (
            <div className="text-center py-4 text-gray-400">
              No available events found. All events from this world are already in this timeline, or there are no events yet.
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {availableEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 bg-gray-800/50 rounded border border-gray-700 hover:bg-gray-800"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h5 className="text-sm font-medium text-gray-100">{event.title}</h5>
                      {event.is_key_event && (
                        <span className="px-2 py-0.5 bg-yellow-600/30 text-yellow-300 rounded text-xs">
                          KEY
                        </span>
                      )}
                    </div>
                    {event.date_text && (
                      <div className="text-xs text-gray-400 mt-1">{event.date_text}</div>
                    )}
                    {event.description && (
                      <div className="text-xs text-gray-500 mt-1 line-clamp-1">{event.description}</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleAddExistingEvent(event.id)}
                    disabled={isSaving}
                    className="ml-4 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
            timelineId={timelineId}
            onSuccess={handleEventCreated}
            onCancel={() => setShowCreateEventForm(false)}
            hideCancel={false}
          />
        </div>
      )}

      {editingEventId && worldId && (() => {
        const eventToEdit = timelineEvents.find(e => e.id === editingEventId);
        if (!eventToEdit) return null;
        return (
          <div className="border border-gray-600/70 rounded-lg p-6 bg-gray-700/60 mb-4">
            <h4 className="text-lg font-semibold text-gray-100 mb-4">Edit Event: {eventToEdit.title}</h4>
            <TimelineEventForm
              key={`edit-event-form-${editingEventId}`}
              event={eventToEdit}
              worldId={worldId}
              lockWorld={true}
              timelineEra={timelineEra}
              timelineStoryAliasId={timelineStoryAliasId}
              lockStoryAlias={true}
              timelineId={timelineId}
              onSuccess={handleEventUpdated}
              onCancel={() => setEditingEventId(null)}
              hideCancel={false}
            />
          </div>
        );
      })()}

      {timelineEvents.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No events in this timeline yet. Create events to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {sortedEvents.map((event, index) => (
            editingEventId === event.id ? null : (
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
                  {(event.date_data || event.date_text) && (
                    <div className="text-sm text-gray-300 mb-2 font-medium">
                      📅 {formatDateData(event.date_data) || event.date_text}
                    </div>
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
                        {event.characters.map((char, index, arr) => {
                          const characterName = char.custom_name || char.oc?.name;
                          const age = char.oc?.date_of_birth && event.date_data
                            ? calculateAge(char.oc.date_of_birth, event.date_data)
                            : null;
                          
                          return (
                            <span key={char.id}>
                              {characterName}
                              {age !== null && ` (${age})`}
                              {index < arr.length - 1 && ', '}
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
                    onClick={() => setEditingEventId(event.id)}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removeEventFromTimeline(event.id)}
                    disabled={isSaving}
                    className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
                    title="Remove from timeline"
                  >
                    Remove
                  </button>
                  <button
                    onClick={() => deleteEvent(event.id)}
                    disabled={isSaving}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    title="Delete permanently"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}

