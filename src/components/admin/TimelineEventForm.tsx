'use client';

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { TimelineEvent, OC, EventDateData, Timeline } from '@/types/oc';
import { useWorlds } from '@/lib/hooks/useWorlds';
import { useOCsByWorld } from '@/lib/hooks/useOCsByWorld';
import { useFormSubmission } from '@/lib/hooks/useFormSubmission';
import { useRelatedItems } from '@/hooks/useRelatedItems';
import { DateInput } from './DateInput';
import { CategorySelector } from './CategorySelector';
import { FormMessage } from './forms/FormMessage';
import { FormLabel } from './forms/FormLabel';
import { FormInput } from './forms/FormInput';
import { FormSelect } from './forms/FormSelect';
import { FormTextarea } from './forms/FormTextarea';
import { FormButton } from './forms/FormButton';
import { StoryAliasSelector } from './StoryAliasSelector';
import { optionalUuid, optionalUrl } from '@/lib/utils/zodSchemas';
import { calculateAge } from '@/lib/utils/ageCalculation';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/client';
import { useDropdownPosition } from '@/hooks/useDropdownPosition';

const eventSchema = z.object({
  world_id: z.string().uuid('Invalid world'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  description_markdown: z.string().optional(),
  date_data: z.any().optional().nullable(),
  year: z.number().int().optional().nullable(),
  month: z.number().int().min(1).max(12).optional().nullable(),
  day: z.number().int().min(1).max(31).optional().nullable(),
  categories: z.array(z.string()).default([]),
  is_key_event: z.boolean().default(false),
  location: z.string().optional(),
  image_url: optionalUrl,
  characters: z.array(z.object({
    oc_id: z.string().uuid().optional().nullable(),
    custom_name: z.string().optional().nullable(),
    role: z.string().optional(),
    age: z.number().int().min(0).optional().nullable(),
  }).refine(
    (data) => data.oc_id || data.custom_name,
    { message: "Either select a character or enter a custom name" }
  )).default([]),
  story_alias_id: optionalUuid,
  timeline_ids: z.array(z.string().uuid()).default([]), // Array of timeline IDs this event belongs to
});

type EventFormData = z.infer<typeof eventSchema>;

// Minimal OC type for autocomplete (needs id, name, and date_of_birth for age calculation)
type MinimalOC = {
  id: string;
  name: string;
  date_of_birth?: string | null;
};

// Custom name type for autocomplete
type CustomNameSuggestion = {
  name: string;
  isCustom: true;
};

// Character Autocomplete Component
function CharacterAutocompleteInput({
  value,
  characters,
  customNames,
  onSelect,
  placeholder,
  disabled,
  onInputChange,
  onInputValueChange,
}: {
  value: string;
  characters: MinimalOC[];
  customNames?: CustomNameSuggestion[];
  onSelect: (ocId: string | null, customName: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  onInputChange?: (value: string) => void; // Callback for when input value changes
  onInputValueChange?: (value: string) => void; // Callback to track current input value
}) {
  const [inputValue, setInputValue] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLUListElement>(null);
  const blurTimeoutRef = useRef<number | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  // Combine characters and custom names for filtering
  const allSuggestions = useMemo(() => {
    const ocSuggestions = (characters || []).map(char => ({ ...char, isCustom: false as const }));
    const customSuggestions = (customNames || []).map(custom => ({ 
      id: `custom-${custom.name}`, 
      name: custom.name, 
      isCustom: true as const 
    }));
    return [...ocSuggestions, ...customSuggestions];
  }, [characters, customNames]);

  // Filter suggestions based on input
  const filteredSuggestions = useMemo(() => {
    if (!inputValue.trim()) {
      return allSuggestions.slice(0, 10); // Show first 10 when empty
    }
    const lowerInput = inputValue.toLowerCase();
    return allSuggestions
      .filter(item => item.name.toLowerCase().includes(lowerInput))
      .slice(0, 10); // Limit to 10 suggestions
  }, [inputValue, allSuggestions]);

  // Check if input matches a suggestion exactly
  const exactMatch = useMemo(() => {
    return allSuggestions.find(item => item.name.toLowerCase() === inputValue.toLowerCase());
  }, [inputValue, allSuggestions]);

  // Calculate dropdown position
  const showAbove = useDropdownPosition({
    inputRef,
    isVisible: showSuggestions,
    dropdownHeight: 240,
    dependencies: [filteredSuggestions.length],
  });

  // Sync with external value prop
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setShowSuggestions(true);
    setHighlightedIndex(-1);
    
    // Notify parent of input value change
    if (onInputValueChange) {
      onInputValueChange(newValue);
    }
    
    // Clear any pending save timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    
    // If user is typing a custom name (doesn't match any suggestion), save it after a delay
    if (newValue.trim()) {
      const exactMatch = allSuggestions.find(item => item.name.toLowerCase() === newValue.toLowerCase());
      if (!exactMatch) {
        // Debounce saving custom name
        saveTimeoutRef.current = window.setTimeout(() => {
          // Only save if value hasn't changed and no suggestion was selected
          if (inputValue.trim() === newValue.trim()) {
            onSelect(null, newValue.trim());
          }
          saveTimeoutRef.current = null;
        }, 300);
      }
    }
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (item: { id: string; name: string; isCustom: boolean }) => {
    // Clear any pending timeouts
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    setInputValue(item.name);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    // Immediately update form state
    if (item.isCustom) {
      onSelect(null, item.name);
    } else {
      onSelect(item.id, null);
    }
  };

  // Handle custom name (when user types something that doesn't match)
  const handleCustomName = () => {
    const customName = inputValue.trim();
    if (customName) {
      // Clear any pending timeouts
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      // Immediately update form state
      onSelect(null, customName);
    }
  };

  // Handle blur - if no exact match, treat as custom name
  const handleBlur = () => {
    // Clear any pending save timeout and save immediately
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    blurTimeoutRef.current = window.setTimeout(() => {
      setShowSuggestions(false);
      // Always save the current input value when blurring
      if (inputValue.trim()) {
        const exactMatch = allSuggestions.find(item => item.name.toLowerCase() === inputValue.toLowerCase());
        if (exactMatch) {
          // If it matches exactly, select that suggestion
          handleSelectSuggestion(exactMatch);
        } else {
          // If it doesn't match, treat as custom name
          handleCustomName();
        }
      }
      blurTimeoutRef.current = null;
    }, 150);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const totalSuggestions = filteredSuggestions.length + (inputValue.trim() && !exactMatch ? 1 : 0);
    if (!showSuggestions || totalSuggestions === 0) {
      if (e.key === 'Enter' && inputValue.trim() && !exactMatch) {
        e.preventDefault();
        handleCustomName();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < totalSuggestions - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
          handleSelectSuggestion(filteredSuggestions[highlightedIndex]);
        } else if (highlightedIndex === filteredSuggestions.length && inputValue.trim() && !exactMatch) {
          handleCustomName();
        } else if (inputValue.trim() && !exactMatch) {
          handleCustomName();
        } else if (exactMatch) {
          handleSelectSuggestion(exactMatch);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Prevent timers from firing after unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && suggestionsRef.current) {
      const highlightedElement = suggestionsRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={() => {
          if (blurTimeoutRef.current) {
            clearTimeout(blurTimeoutRef.current);
            blurTimeoutRef.current = null;
          }
          setShowSuggestions(true);
        }}
        disabled={disabled}
        placeholder={placeholder || 'Select character or type custom name...'}
        className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50 transition-all"
        autoComplete="off"
      />
      
      {showSuggestions && (filteredSuggestions.length > 0 || (inputValue.trim() && !exactMatch)) && (
        <ul
          ref={suggestionsRef}
          className={`absolute z-[99999] w-full max-h-60 overflow-auto bg-gray-800 border border-gray-600 rounded-lg shadow-lg ${
            showAbove ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {filteredSuggestions.map((item, index) => (
            <li
              key={item.id}
              onClick={() => handleSelectSuggestion(item)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`px-4 py-2 cursor-pointer transition-colors flex items-center gap-2 ${
                index === highlightedIndex
                  ? 'bg-purple-600/50 text-white'
                  : 'text-gray-200 hover:bg-gray-700'
              }`}
            >
              {item.name}
              {item.isCustom && (
                <span className="text-xs text-gray-400 italic">(custom)</span>
              )}
            </li>
          ))}
          {inputValue.trim() && !exactMatch && (
            <li
              onClick={handleCustomName}
              onMouseEnter={() => setHighlightedIndex(filteredSuggestions.length)}
              className={`px-4 py-2 cursor-pointer transition-colors italic text-purple-300 ${
                highlightedIndex === filteredSuggestions.length
                  ? 'bg-purple-600/50 text-white'
                  : 'hover:bg-gray-700'
              }`}
            >
              Use "{inputValue.trim()}" as custom name
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

interface TimelineEventFormProps {
  event?: TimelineEvent;
  worldId?: string; // Pre-select a world
  lockWorld?: boolean; // If true, hide world field and lock it to worldId
  timelineEra?: string | null; // Era system from timeline (comma-separated, e.g., "BE, SE")
  timelineStoryAliasId?: string | null; // Story alias from timeline - events inherit this
  lockStoryAlias?: boolean; // If true, hide story alias field and lock it to timelineStoryAliasId
  timelineId?: string; // Pre-select a timeline (when creating from a timeline page)
  onSuccess?: (responseData: any) => void | Promise<void>; // Callback after successful creation
  onCancel?: () => void; // Callback when cancel is clicked
  hideCancel?: boolean; // Hide cancel button (useful for inline forms)
}

export function TimelineEventForm({ event, worldId, lockWorld = false, timelineEra, timelineStoryAliasId, lockStoryAlias = false, timelineId, onSuccess, onCancel, hideCancel = false }: TimelineEventFormProps) {
  const router = useRouter();
  const { worlds } = useWorlds();
  const shouldNavigateAfterSaveRef = useRef(false);
  const { isSubmitting, error, submit } = useFormSubmission<EventFormData>({
    apiRoute: '/api/admin/timeline-events',
    entity: event,
    successRoute: (responseData, isUpdate) => {
      // If we're working within a timeline, navigate back to that timeline's events page
      if (timelineId) {
        return `/admin/timelines/${timelineId}/events`;
      }
      // Otherwise, navigate to timelines list (since standalone events pages are being removed)
      return '/admin/timelines';
    },
    shouldNavigateRef: shouldNavigateAfterSaveRef,
    onSuccess: async (responseData, isUpdate) => {
      // Call custom onSuccess callback if provided (for both creates and updates)
      if (onSuccess) {
        await onSuccess(responseData);
      }
      
      // If we're editing within a timeline, don't navigate - let the callback handle closing the form
      if (timelineId) {
        return false;
      }
      
      // If shouldNavigateRef is explicitly set to true, navigate
      if (shouldNavigateAfterSaveRef.current === true) {
        return true;
      }
      
      // Default: don't navigate if we have a custom callback, otherwise navigate
      return !onSuccess;
    },
  });

  // Get world name for display when locked
  const lockedWorld = lockWorld && worldId ? worlds.find(w => w.id === worldId) : null;

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: event ? {
      world_id: event.world_id,
      title: event.title,
      description: event.description || '',
      description_markdown: event.description_markdown || '',
      date_data: event.date_data || null,
      year: event.year || null,
      month: event.month || null,
      day: event.day || null,
      categories: event.categories || [],
      is_key_event: event.is_key_event || false,
      location: event.location || '',
      image_url: event.image_url || '',
      characters: event.characters?.map(c => ({
        oc_id: c.oc_id || null,
        custom_name: c.custom_name || null,
        role: c.role || '',
        age: (c as any).age ?? null,
      })) || [],
      story_alias_id: event.story_alias_id ?? null,
      timeline_ids: [], // Will be populated from existing associations if editing
    } : {
      world_id: worldId || '',
      title: '',
      description: '',
      description_markdown: '',
      date_data: null,
      year: null,
      month: null,
      day: null,
      categories: [],
      is_key_event: false,
      location: '',
      image_url: '',
      characters: [],
      story_alias_id: lockStoryAlias ? (timelineStoryAliasId || null) : null,
      timeline_ids: timelineId ? [timelineId] : [],
    },
  });

  // Ensure world_id is set when locked
  useEffect(() => {
    if (lockWorld && worldId) {
      setValue('world_id', worldId, { shouldValidate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockWorld, worldId]);

  // Ensure story_alias_id is set when locked
  useEffect(() => {
    if (lockStoryAlias && timelineStoryAliasId !== undefined) {
      setValue('story_alias_id', timelineStoryAliasId || null, { shouldValidate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockStoryAlias, timelineStoryAliasId]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = form;

  const watchedWorldId = watch('world_id');
  const watchedDateData = watch('date_data');
  const watchedCategories = watch('categories');
  const watchedTimelineIds = watch('timeline_ids');
  const watchedCharacters = watch('characters');
  
  // Refs to store current input values for each character autocomplete
  const characterInputRefs = useRef<Map<number, string>>(new Map());

  // Fetch timelines for the selected world
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [isLoadingTimelines, setIsLoadingTimelines] = useState(false);

  useEffect(() => {
    async function loadTimelines() {
      if (!watchedWorldId) {
        setTimelines([]);
        return;
      }

      setIsLoadingTimelines(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('timelines')
          .select('id, name, world_id, created_at, updated_at')
          .eq('world_id', watchedWorldId)
          .order('name', { ascending: true });

        if (error) {
          logger.error('Component', 'TimelineEventForm: Error loading timelines', error);
          setTimelines([]);
        } else {
          setTimelines((data || []) as Timeline[]);
        }
      } catch (error) {
        logger.error('Component', 'TimelineEventForm: Error loading timelines', error);
        setTimelines([]);
      } finally {
        setIsLoadingTimelines(false);
      }
    }

    loadTimelines();
  }, [watchedWorldId]);

  // Load existing timeline associations when editing
  useEffect(() => {
    async function loadExistingTimelineAssociations() {
      if (!event?.id) return;

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('timeline_event_timelines')
          .select('timeline_id')
          .eq('timeline_event_id', event.id);

        if (!error && data) {
          const timelineIds = data.map(assoc => assoc.timeline_id);
          setValue('timeline_ids', timelineIds);
        }
      } catch (error) {
        logger.error('Component', 'TimelineEventForm: Error loading timeline associations', error);
      }
    }

    if (event) {
      loadExistingTimelineAssociations();
    }
  }, [event, setValue]);

  const { ocs: characters } = useOCsByWorld(watchedWorldId);
  
  // Fetch previously used custom names for autocomplete
  const [customNames, setCustomNames] = useState<CustomNameSuggestion[]>([]);
  
  useEffect(() => {
    async function fetchCustomNames() {
      if (!watchedWorldId) {
        setCustomNames([]);
        return;
      }
      
      try {
        const supabase = createClient();
        // First get all timeline event IDs for this world
        const { data: events, error: eventsError } = await supabase
          .from('timeline_events')
          .select('id')
          .eq('world_id', watchedWorldId);
        
        if (eventsError || !events) {
          logger.error('Component', 'TimelineEventForm: Error fetching events for custom names', eventsError);
          setCustomNames([]);
          return;
        }
        
        const eventIds = events.map(e => e.id);
        if (eventIds.length === 0) {
          setCustomNames([]);
          return;
        }
        
        // Then get distinct custom names from those events
        const { data, error } = await supabase
          .from('timeline_event_characters')
          .select('custom_name')
          .in('timeline_event_id', eventIds)
          .not('custom_name', 'is', null);
        
        if (error) {
          logger.error('Component', 'TimelineEventForm: Error fetching custom names', error);
          setCustomNames([]);
          return;
        }
        
        // Extract unique custom names (case-insensitive)
        const uniqueNames = new Map<string, string>();
        (data || []).forEach((item: any) => {
          if (item.custom_name) {
            const normalized = item.custom_name.trim();
            const lower = normalized.toLowerCase();
            // Store the first occurrence (most common casing)
            if (!uniqueNames.has(lower)) {
              uniqueNames.set(lower, normalized);
            }
          }
        });
        
        setCustomNames(Array.from(uniqueNames.values()).map(name => ({ name, isCustom: true })));
      } catch (error) {
        logger.error('Component', 'TimelineEventForm: Error fetching custom names', error);
        setCustomNames([]);
      }
    }
    
    fetchCustomNames();
  }, [watchedWorldId]);

  // Helper function to calculate age from date_of_birth for approximate dates
  const calculateAgeFromApproximateDate = useCallback((birthDate: string, eventDate: EventDateData): number | null => {
    if (!birthDate || !eventDate) return null;
    
    // Parse birth date
    const birthMatch = birthDate.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
    if (!birthMatch) return null;
    
    const birthYear = parseInt(birthMatch[1], 10);
    
    // Get event year from different date types
    let eventYear: number | null = null;
    if (eventDate.type === 'exact') {
      eventYear = eventDate.year;
    } else if (eventDate.type === 'approximate' && eventDate.year) {
      eventYear = eventDate.year;
    }
    
    if (eventYear === null) return null;
    
    // Simple year-based calculation for approximate dates
    return eventYear - birthYear;
  }, []);

  // Function to fetch the most recent age and event year for a character (OC) from previous timeline events
  // Returns both age and year, ordered by event date (chronologically most recent)
  const fetchPreviousCharacterAge = useCallback(async (ocId: string): Promise<{ age: number; year: number | null } | null> => {
    if (!ocId) return null;
    
    try {
      const supabase = createClient();
      // Get the most recent timeline event character entry for this OC that has an age set
      // Order by event date (year/month/day) descending to get chronologically most recent event
      const { data, error } = await supabase
        .from('timeline_event_characters')
        .select(`
          age,
          event:timeline_events(
            year,
            month,
            day
          )
        `)
        .eq('oc_id', ocId)
        .not('age', 'is', null)
        .order('id', { ascending: false }); // Temporary ordering, will filter by date in memory

      if (error || !data || data.length === 0) {
        return null;
      }

      // Filter out entries without age and sort by event date
      const validEntries = data
        .filter((entry: any) => entry.age !== null && entry.age !== undefined && entry.event)
        .map((entry: any) => {
          const event = Array.isArray(entry.event) ? entry.event[0] : entry.event;
          return {
            age: entry.age as number,
            year: event?.year ?? null,
            month: event?.month ?? null,
            day: event?.day ?? null,
            id: entry.id,
          };
        })
        .sort((a, b) => {
          // Sort by year DESC, month DESC, day DESC, id DESC
          if (a.year !== null && b.year !== null) {
            if (a.year !== b.year) return b.year - a.year;
          } else if (a.year !== null) return -1;
          else if (b.year !== null) return 1;
          
          if (a.month !== null && b.month !== null) {
            if (a.month !== b.month) return b.month - a.month;
          } else if (a.month !== null) return -1;
          else if (b.month !== null) return 1;
          
          if (a.day !== null && b.day !== null) {
            if (a.day !== b.day) return b.day - a.day;
          } else if (a.day !== null) return -1;
          else if (b.day !== null) return 1;
          
          return 0; // Same date, order doesn't matter
        });

      if (validEntries.length === 0) {
        return null;
      }

      const mostRecent = validEntries[0];
      return {
        age: mostRecent.age,
        year: mostRecent.year,
      };
    } catch (error) {
      logger.error('Component', 'TimelineEventForm: Error fetching previous character age', error);
      return null;
    }
  }, []);

  // Function to fetch the most recent age and event year for a custom name from previous timeline events
  // Returns both age and year, ordered by event date (chronologically most recent)
  const fetchPreviousCustomNameAge = useCallback(async (customName: string): Promise<{ age: number; year: number | null } | null> => {
    if (!customName || !customName.trim()) return null;
    
    try {
      const supabase = createClient();
      // Get the most recent timeline event character entry for this custom name that has an age set
      // Use case-insensitive matching and trim whitespace for consistency
      const normalizedName = customName.trim();
      const { data, error } = await supabase
        .from('timeline_event_characters')
        .select(`
          age,
          event:timeline_events(
            year,
            month,
            day
          )
        `)
        .ilike('custom_name', normalizedName) // Case-insensitive matching
        .not('age', 'is', null)
        .order('id', { ascending: false }); // Temporary ordering, will filter by date in memory

      if (error || !data || data.length === 0) {
        return null;
      }

      // Filter out entries without age and sort by event date
      const validEntries = data
        .filter((entry: any) => entry.age !== null && entry.age !== undefined && entry.event)
        .map((entry: any) => {
          const event = Array.isArray(entry.event) ? entry.event[0] : entry.event;
          return {
            age: entry.age as number,
            year: event?.year ?? null,
            month: event?.month ?? null,
            day: event?.day ?? null,
            id: entry.id,
          };
        })
        .sort((a, b) => {
          // Sort by year DESC, month DESC, day DESC, id DESC
          if (a.year !== null && b.year !== null) {
            if (a.year !== b.year) return b.year - a.year;
          } else if (a.year !== null) return -1;
          else if (b.year !== null) return 1;
          
          if (a.month !== null && b.month !== null) {
            if (a.month !== b.month) return b.month - a.month;
          } else if (a.month !== null) return -1;
          else if (b.month !== null) return 1;
          
          if (a.day !== null && b.day !== null) {
            if (a.day !== b.day) return b.day - a.day;
          } else if (a.day !== null) return -1;
          else if (b.day !== null) return 1;
          
          return 0; // Same date, order doesn't matter
        });

      if (validEntries.length === 0) {
        return null;
      }

      const mostRecent = validEntries[0];
      return {
        age: mostRecent.age,
        year: mostRecent.year,
      };
    } catch (error) {
      logger.error('Component', 'TimelineEventForm: Error fetching previous custom name age', error);
      return null;
    }
  }, []);

  // Helper function to calculate aged-up age based on year difference
  const calculateAgedUpAge = useCallback((
    previousAge: number,
    previousEventYear: number | null,
    currentEventYear: number | null
  ): number | null => {
    if (previousEventYear === null || currentEventYear === null) {
      // Can't calculate difference, return previous age
      return previousAge;
    }
    const yearDifference = currentEventYear - previousEventYear;
    if (yearDifference < 0) {
      // Current event is before previous event - shouldn't happen but handle gracefully
      return previousAge;
    }
    return previousAge + yearDifference;
  }, []);

  // Manage related characters
  const relatedCharacters = useRelatedItems<{
    oc_id: string | null;
    custom_name: string | null;
    role: string;
    age: number | null;
  }>(
    'characters',
    watch,
    setValue,
    () => ({ oc_id: null, custom_name: null, role: '', age: null })
  );

  // Extract year/month/day from date_data for sorting
  useEffect(() => {
    if (watchedDateData) {
      if (watchedDateData.type === 'exact') {
        setValue('year', watchedDateData.year);
        setValue('month', watchedDateData.month);
        setValue('day', watchedDateData.day);
      } else if (watchedDateData.type === 'range') {
        setValue('year', watchedDateData.start?.year);
        setValue('month', watchedDateData.start?.month);
        setValue('day', watchedDateData.start?.day);
      } else if (watchedDateData.type === 'approximate' && watchedDateData.year) {
        setValue('year', watchedDateData.year);
      }
    }
  }, [watchedDateData, setValue]);

  // Auto-calculate age for characters when character or date changes
  useEffect(() => {
    const currentCharacters = watch('characters') || [];
    if (!watchedDateData || currentCharacters.length === 0) return;

    const updatedCharacters = currentCharacters.map((char) => {
      // Auto-calculate if character has oc_id (not custom name)
      // Recalculate even if age was previously set, so it updates when date changes
      if (char.oc_id) {
        const character = characters.find(c => c.id === char.oc_id);
        if (character?.date_of_birth) {
          // Try exact date calculation first
          let calculatedAge = calculateAge(character.date_of_birth, watchedDateData);
          
          // If exact calculation failed and date is approximate, try year-based calculation
          if (calculatedAge === null && watchedDateData.type === 'approximate') {
            calculatedAge = calculateAgeFromApproximateDate(character.date_of_birth, watchedDateData);
          }
          
          // Update age if we got a valid calculation
          if (calculatedAge !== null && calculatedAge !== char.age) {
            return { ...char, age: calculatedAge };
          }
        }
      }
      return char;
    });

    // Only update if there are changes
    const hasChanges = updatedCharacters.some((char, index) => {
      const original = currentCharacters[index];
      return char.age !== original.age;
    });

    if (hasChanges) {
      setValue('characters', updatedCharacters, { shouldDirty: true });
    }
  }, [watchedDateData, characters, watch, setValue, calculateAgeFromApproximateDate]);

  const onSubmitRef = useRef(false); // Prevent infinite loop
  
  const onSubmit = async (data: EventFormData) => {
    logger.debug('Component', 'TimelineEventForm: Form submitted', data);
    
    // Before submitting, ensure any pending custom names from input refs are saved
    if (!onSubmitRef.current) {
      const currentCharacters = watch('characters') || [];
      let needsUpdate = false;
      const updatedCharacters = currentCharacters.map((char, index) => {
        // If character has neither oc_id nor custom_name, check if there's a pending input value
        if (!char.oc_id && !char.custom_name) {
          const pendingInput = characterInputRefs.current.get(index);
          if (pendingInput && pendingInput.trim()) {
            // Check if it matches a character
            const exactMatch = characters.find(c => c.name.toLowerCase() === pendingInput.toLowerCase());
            if (exactMatch) {
              needsUpdate = true;
              return { ...char, oc_id: exactMatch.id, custom_name: null };
            } else {
              // Save as custom name
              needsUpdate = true;
              return { ...char, custom_name: pendingInput.trim() };
            }
          }
        }
        return char;
      });
      
      // Update form state if needed before validation
      if (needsUpdate) {
        onSubmitRef.current = true;
        setValue('characters', updatedCharacters, { shouldValidate: true, shouldDirty: true });
        // Re-trigger validation and submission
        setTimeout(() => {
          onSubmitRef.current = false;
          handleSubmit(onSubmit, onError)();
        }, 0);
        return;
      }
    }
    
    onSubmitRef.current = false;
    
    // When creating/editing within a timeline, don't navigate (let onSuccess handle it)
    // When creating/editing standalone, navigate after save
    // But preserve the "save and close" intent if it was already set
    if (!timelineId) {
      shouldNavigateAfterSaveRef.current = true;
    } else {
      // If we have a timelineId, navigation is handled by onSuccess callback
      // Only set to false if it wasn't already set to true (by "Save and Close" button)
      if (shouldNavigateAfterSaveRef.current !== true) {
        shouldNavigateAfterSaveRef.current = false;
      }
    }
    
    // Ensure world_id is set when lockWorld is true
    if (lockWorld && worldId && !data.world_id) {
      data.world_id = worldId;
    }
    
    // Ensure story_alias_id is set when lockStoryAlias is true
    if (lockStoryAlias && timelineStoryAliasId !== undefined && data.story_alias_id === null) {
      data.story_alias_id = timelineStoryAliasId || null;
    }
    
    await submit(data);
  };

  const onError = (errors: any) => {
    logger.debug('Component', 'TimelineEventForm: Form validation errors', errors);
    // Log validation errors to console for debugging
    console.error('Form validation errors:', errors);
  };

  const handleSaveAndClose = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    shouldNavigateAfterSaveRef.current = true;
    handleSubmit(onSubmit, onError)();
  }, [handleSubmit, onSubmit, onError]);

  const handleSaveProgress = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    shouldNavigateAfterSaveRef.current = false;
    handleSubmit(onSubmit, onError)();
  }, [handleSubmit, onSubmit, onError]);


  // Check if there are any validation errors
  const hasValidationErrors = Object.keys(errors).length > 0;

  return (
    <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
      {error && <FormMessage type="error" message={error} />}
      {hasValidationErrors && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4">
          <p className="text-sm font-medium text-red-300 mb-2">
            Please fix the following errors:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-red-200">
            {errors.world_id && (
              <li>World: {errors.world_id.message}</li>
            )}
            {errors.title && (
              <li>Title: {errors.title.message}</li>
            )}
            {errors.description && (
              <li>Description: {errors.description.message}</li>
            )}
            {errors.description_markdown && (
              <li>Full Description: {errors.description_markdown.message}</li>
            )}
            {errors.year && (
              <li>Year: {errors.year.message}</li>
            )}
            {errors.month && (
              <li>Month: {errors.month.message}</li>
            )}
            {errors.day && (
              <li>Day: {errors.day.message}</li>
            )}
            {errors.categories && (
              <li>Categories: {errors.categories.message}</li>
            )}
            {errors.location && (
              <li>Location: {errors.location.message}</li>
            )}
            {errors.image_url && (
              <li>Image URL: {errors.image_url.message}</li>
            )}
            {errors.characters && (
              <li>Characters: {Array.isArray(errors.characters) 
                ? errors.characters.map((err: any, idx: number) => err?.message || `Character ${idx + 1} has errors`).join(', ')
                : errors.characters.message || 'Invalid character data'}
              </li>
            )}
            {errors.story_alias_id && (
              <li>Story Alias: {errors.story_alias_id.message}</li>
            )}
            {errors.timeline_ids && (
              <li>Timelines: {errors.timeline_ids.message}</li>
            )}
          </ul>
        </div>
      )}

      {lockWorld && lockedWorld ? (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
          <FormLabel>World</FormLabel>
          <div className="text-gray-200 font-medium">{lockedWorld.name}</div>
          <p className="text-xs text-gray-400 mt-1">World is automatically set from timeline context</p>
          <input type="hidden" {...register('world_id')} />
          {errors.world_id && (
            <p className="text-xs text-red-400 mt-1">{errors.world_id.message}</p>
          )}
        </div>
      ) : (
        <div>
          <FormLabel htmlFor="world_id" required>
            World
          </FormLabel>
          <FormSelect
            {...register('world_id')}
            options={worlds.map((world) => ({
              value: world.id,
              label: world.name,
            }))}
            placeholder="Select a world"
            error={errors.world_id?.message}
            disabled={!!event || isSubmitting} // Can't change world after creation
          />
        </div>
      )}

      <div>
        <FormLabel htmlFor="timeline_ids" optional>
          Timelines
        </FormLabel>
        {!watchedWorldId ? (
          <div className="px-3 py-2 bg-gray-700/50 border border-gray-600/70 rounded-md text-gray-400 text-sm">
            Select a world first to see available timelines
          </div>
        ) : isLoadingTimelines ? (
          <div className="px-3 py-2 bg-gray-700/50 border border-gray-600/70 rounded-md text-gray-400 text-sm">
            Loading timelines...
          </div>
        ) : timelines.length === 0 ? (
          <div className="px-3 py-2 bg-gray-700/50 border border-gray-600/70 rounded-md text-gray-400 text-sm">
            No timelines found for this world. Create a timeline first.
          </div>
        ) : (
          <div className="space-y-2">
            {timelines.map((timeline) => {
              const isSelected = watchedTimelineIds?.includes(timeline.id) || false;
              return (
                <label
                  key={timeline.id}
                  className="flex items-center gap-2 p-2 bg-gray-800/50 border border-gray-700 rounded hover:bg-gray-800 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      const currentIds = watchedTimelineIds || [];
                      if (e.target.checked) {
                        setValue('timeline_ids', [...currentIds, timeline.id]);
                      } else {
                        setValue('timeline_ids', currentIds.filter(id => id !== timeline.id));
                      }
                    }}
                    disabled={isSubmitting}
                    className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-700 rounded focus:ring-purple-500"
                  />
                  <span className="text-gray-200">{timeline.name}</span>
                </label>
              );
            })}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-2">
          Select which timeline(s) this event belongs to. You can select multiple timelines.
        </p>
      </div>

      {!lockStoryAlias && (
        <StoryAliasSelector
          worldId={watchedWorldId}
          register={register('story_alias_id')}
          error={errors.story_alias_id?.message}
          disabled={isSubmitting}
        />
      )}

      {lockStoryAlias && timelineStoryAliasId && (
        <div>
          <FormLabel htmlFor="story_alias_locked">
            Story Alias
          </FormLabel>
          <div className="px-3 py-2 bg-gray-700/50 border border-gray-600/70 rounded-md text-gray-300">
            Inherited from timeline (locked)
          </div>
        </div>
      )}

      <div>
        <FormLabel htmlFor="title" required>
          Title
        </FormLabel>
        <FormInput
          {...register('title')}
          error={errors.title?.message}
          disabled={isSubmitting}
        />
      </div>

      <div>
        <FormLabel htmlFor="description" optional>
          Description (Summary)
        </FormLabel>
        <FormTextarea
          {...register('description')}
          rows={3}
          placeholder="Brief summary of the event"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <FormLabel htmlFor="description_markdown" optional>
          Full Description (Markdown)
        </FormLabel>
        <FormTextarea
          {...register('description_markdown')}
          rows={10}
          markdown
          placeholder="Full event description in Markdown"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <FormLabel htmlFor="date_data">
          Date
        </FormLabel>
        <DateInput
          value={watchedDateData}
          onChange={(value) => setValue('date_data', value)}
          availableEras={timelineEra ? timelineEra.split(',').map(e => e.trim()).filter(Boolean) : undefined}
        />
      </div>

      <div>
        <CategorySelector
          value={watchedCategories || []}
          onChange={(categories) => setValue('categories', categories)}
        />
      </div>

      <div>
        <FormLabel htmlFor="location" optional>
          Location
        </FormLabel>
        <FormInput
          {...register('location')}
          placeholder="Where did this event take place?"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <FormLabel htmlFor="image_url" optional>
          Image URL
        </FormLabel>
        <FormInput
          {...register('image_url')}
          type="url"
          placeholder="https://..."
          disabled={isSubmitting}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          {...register('is_key_event')}
          type="checkbox"
          className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-700 rounded focus:ring-purple-500"
        />
        <label className="text-sm font-medium text-gray-300">
          Key Event
        </label>
      </div>

      <div>
        <div className="flex justify-between items-center mb-3">
          <FormLabel htmlFor="characters">
            Characters Involved
          </FormLabel>
          {characters.length > 0 && (
            <button
              type="button"
              onClick={relatedCharacters.addItem}
              className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-sm"
            >
              <i className="fas fa-plus mr-1.5" aria-hidden="true"></i>
              Add Character
            </button>
          )}
        </div>
        {relatedCharacters.items && relatedCharacters.items.length > 0 ? (
          <div className="space-y-3">
            {relatedCharacters.items.map((char, index) => {
              const selectedCharacter = char.oc_id ? characters.find(c => c.id === char.oc_id) : null;
              // Calculate age for display/auto-fill (but use stored age if manually set)
              const calculatedAge = selectedCharacter?.date_of_birth && watchedDateData
                ? calculateAge(selectedCharacter.date_of_birth, watchedDateData)
                : null;
              // Use stored age if set, otherwise use calculated age
              const displayAge = char.age !== null ? char.age : calculatedAge;
              
              // Display name: character name if oc_id exists, otherwise custom_name
              const displayName = selectedCharacter?.name || char.custom_name || '';
              
              return (
                <div 
                  key={`char-${index}-${char.oc_id || char.custom_name || 'new'}`} 
                  className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 hover:border-gray-600/50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-end">
                    <div className="w-full sm:flex-1 min-w-0">
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">
                        Character Name
                      </label>
                      <CharacterAutocompleteInput
                        value={displayName}
                        characters={characters}
                        customNames={customNames || []}
                        onSelect={async (ocId, customName) => {
                          if (ocId) {
                            // Selected an OC - calculate age based on current event date if possible
                            characterInputRefs.current.delete(index);
                            
                            const selectedCharacter = characters.find(c => c.id === ocId);
                            let ageToUse: number | null = null;
                            
                            // Extract current event year from date_data
                            let currentEventYear: number | null = null;
                            if (watchedDateData) {
                              if (watchedDateData.type === 'exact') {
                                currentEventYear = watchedDateData.year;
                              } else if (watchedDateData.type === 'range') {
                                currentEventYear = watchedDateData.start?.year ?? null;
                              } else if (watchedDateData.type === 'approximate') {
                                currentEventYear = watchedDateData.year ?? null;
                              }
                            }
                            
                            // If character has date_of_birth and we have event date, calculate age from that
                            if (selectedCharacter?.date_of_birth && watchedDateData) {
                              // Try exact date calculation first
                              const calculatedAge = calculateAge(selectedCharacter.date_of_birth, watchedDateData);
                              if (calculatedAge !== null) {
                                ageToUse = calculatedAge;
                              } else if (watchedDateData.type === 'approximate') {
                                // Fallback to year-based calculation for approximate dates
                                const approxAge = calculateAgeFromApproximateDate(selectedCharacter.date_of_birth, watchedDateData);
                                if (approxAge !== null) {
                                  ageToUse = approxAge;
                                }
                              }
                            }
                            
                            // If we couldn't calculate from date_of_birth, fetch previous event data and age up
                            if (ageToUse === null) {
                              const previousData = await fetchPreviousCharacterAge(ocId);
                              if (previousData) {
                                // Calculate aged-up age based on year difference
                                ageToUse = calculateAgedUpAge(
                                  previousData.age,
                                  previousData.year,
                                  currentEventYear
                                );
                              }
                            }
                            
                            relatedCharacters.updateItem(index, {
                              oc_id: ocId,
                              custom_name: null,
                              age: ageToUse, // Use calculated age or aged-up previous age
                            });
                          } else if (customName) {
                            // Typed custom name - fetch previous event data and age up
                            characterInputRefs.current.delete(index);
                            
                            // Extract current event year from date_data
                            let currentEventYear: number | null = null;
                            if (watchedDateData) {
                              if (watchedDateData.type === 'exact') {
                                currentEventYear = watchedDateData.year;
                              } else if (watchedDateData.type === 'range') {
                                currentEventYear = watchedDateData.start?.year ?? null;
                              } else if (watchedDateData.type === 'approximate') {
                                currentEventYear = watchedDateData.year ?? null;
                              }
                            }
                            
                            // Fetch the most recent age and year for this custom name from previous events
                            const previousData = await fetchPreviousCustomNameAge(customName);
                            let ageToUse: number | null = null;
                            
                            if (previousData) {
                              // Calculate aged-up age based on year difference
                              ageToUse = calculateAgedUpAge(
                                previousData.age,
                                previousData.year,
                                currentEventYear
                              );
                            }
                            
                            relatedCharacters.updateItem(index, {
                              oc_id: null,
                              custom_name: customName.trim(), // Normalize by trimming whitespace
                              age: ageToUse, // Use aged-up previous age if available, otherwise null
                            });
                          }
                        }}
                        onInputValueChange={(inputValue) => {
                          // Track current input value for this character
                          if (inputValue.trim()) {
                            characterInputRefs.current.set(index, inputValue.trim());
                          } else {
                            characterInputRefs.current.delete(index);
                          }
                        }}
                        placeholder="Select character or type custom name..."
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="w-full sm:w-20 shrink-0">
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">
                        Age
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={displayAge !== null ? displayAge : ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            relatedCharacters.updateItemField(index, 'age', null);
                          } else {
                            const numValue = Number(value);
                            if (!isNaN(numValue) && numValue >= 0) {
                              relatedCharacters.updateItemField(index, 'age', numValue);
                            }
                          }
                        }}
                        placeholder={calculatedAge !== null ? String(calculatedAge) : 'Age'}
                        className="w-full px-2 py-2 bg-gray-900/60 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-center"
                        title={calculatedAge !== null && char.age === null ? `Auto-calculated: ${calculatedAge}` : 'Enter age manually'}
                      />
                    </div>
                    <div className="w-full sm:flex-1 min-w-[120px]">
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">
                        Role (optional)
                      </label>
                      <input
                        type="text"
                        value={char.role || ''}
                        onChange={(e) => relatedCharacters.updateItemField(index, 'role', e.target.value)}
                        placeholder="Role"
                        className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                      />
                    </div>
                    <div className="flex items-end pt-6 sm:pt-0 w-full sm:w-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => relatedCharacters.removeItem(index)}
                        className="w-full sm:w-auto px-4 py-2 bg-red-600/80 text-white rounded-lg hover:bg-red-600 transition-colors font-medium text-sm shadow-sm whitespace-nowrap"
                        title="Remove this character"
                      >
                        <i className="fas fa-trash mr-1.5" aria-hidden="true"></i>
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-gray-800/30 border border-gray-700/50 border-dashed rounded-lg p-6 text-center">
            <button
              type="button"
              onClick={relatedCharacters.addItem}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium mb-3"
            >
              <i className="fas fa-plus mr-1.5" aria-hidden="true"></i>
              Add Character
            </button>
            <p className="text-sm text-gray-400">
              {watchedWorldId
                ? 'Click "Add Character" to add characters from the database or enter custom names.'
                : 'Select a world first, then you can add characters.'}
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        {!hideCancel && (
          <FormButton
            type="button"
            variant="secondary"
            onClick={() => {
              if (onCancel) {
                onCancel();
              } else {
                router.back();
              }
            }}
            disabled={isSubmitting}
          >
            Cancel
          </FormButton>
        )}
        {event ? (
          <>
            <FormButton
              type="button"
              variant="secondary"
              onClick={handleSaveProgress}
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              Save Progress
            </FormButton>
            <FormButton
              type="button"
              variant="primary"
              onClick={handleSaveAndClose}
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              Save and Close
            </FormButton>
          </>
        ) : (
          <FormButton
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            Create Event
          </FormButton>
        )}
      </div>
    </form>
  );
}

