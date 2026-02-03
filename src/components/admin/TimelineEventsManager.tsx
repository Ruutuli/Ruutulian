'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { TimelineEvent, OC, Timeline, EventDateData } from '@/types/oc';
import { PREDEFINED_EVENT_CATEGORIES } from '@/types/oc';
import { createClient } from '@/lib/supabase/client';
import { TimelineEventForm } from './TimelineEventForm';
import { DateInput } from './DateInput';
import { getCategoryColorClasses } from '@/lib/utils/categoryColors';
import { calculateAge, parseEraConfig } from '@/lib/utils/ageCalculation';
import { logger } from '@/lib/logger';
import { useOCsByWorld } from '@/lib/hooks/useOCsByWorld';
import { useDropdownPosition } from '@/hooks/useDropdownPosition';
import { compareEventDates } from '@/lib/utils/dateSorting';

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

// Minimal OC type for autocomplete
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

// Character Autocomplete Component (simplified version for modal)
function CharacterAutocompleteInput({
  value,
  characters,
  customNames,
  onSelect,
  placeholder,
  disabled,
  onInputValueChange,
}: {
  value: string;
  characters: MinimalOC[];
  customNames?: CustomNameSuggestion[];
  onSelect: (ocId: string | null, customName: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  onInputValueChange?: (value: string) => void;
}) {
  const [inputValue, setInputValue] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLUListElement>(null);
  const blurTimeoutRef = useRef<number | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  const allSuggestions = useMemo(() => {
    const ocSuggestions = (characters || []).map(char => ({ ...char, isCustom: false as const }));
    const customSuggestions = (customNames || []).map(custom => ({ 
      id: `custom-${custom.name}`, 
      name: custom.name, 
      isCustom: true as const 
    }));
    return [...ocSuggestions, ...customSuggestions];
  }, [characters, customNames]);

  const filteredSuggestions = useMemo(() => {
    if (!inputValue.trim()) {
      return allSuggestions.slice(0, 10);
    }
    const lowerInput = inputValue.toLowerCase();
    return allSuggestions
      .filter(item => item.name.toLowerCase().includes(lowerInput))
      .slice(0, 10);
  }, [inputValue, allSuggestions]);

  const exactMatch = useMemo(() => {
    return allSuggestions.find(item => item.name.toLowerCase() === inputValue.toLowerCase());
  }, [inputValue, allSuggestions]);

  const showAbove = useDropdownPosition({
    inputRef,
    isVisible: showSuggestions,
    dropdownHeight: 240,
    dependencies: [filteredSuggestions.length],
  });

  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setShowSuggestions(true);
    setHighlightedIndex(-1);
    
    if (onInputValueChange) {
      onInputValueChange(newValue);
    }
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    
    if (newValue.trim()) {
      const exactMatch = allSuggestions.find(item => item.name.toLowerCase() === newValue.toLowerCase());
      if (!exactMatch) {
        saveTimeoutRef.current = window.setTimeout(() => {
          if (inputValue.trim() === newValue.trim()) {
            onSelect(null, newValue.trim());
          }
          saveTimeoutRef.current = null;
        }, 300);
      }
    }
  };

  const handleSelectSuggestion = (item: { id: string; name: string; isCustom: boolean }) => {
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
    if (item.isCustom) {
      onSelect(null, item.name);
    } else {
      onSelect(item.id, null);
    }
  };

  const handleCustomName = () => {
    const customName = inputValue.trim();
    if (customName) {
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
      onSelect(null, customName);
    }
  };

  const handleBlur = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    blurTimeoutRef.current = window.setTimeout(() => {
      setShowSuggestions(false);
      if (inputValue.trim()) {
        const exactMatch = allSuggestions.find(item => item.name.toLowerCase() === inputValue.toLowerCase());
        if (exactMatch) {
          handleSelectSuggestion(exactMatch);
        } else {
          handleCustomName();
        }
      }
      blurTimeoutRef.current = null;
    }, 150);
  };

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

// Characters Edit Modal Component
function CharactersEditModal({
  event,
  worldId,
  timelineEra,
  onClose,
  onSave,
}: {
  event: TimelineEvent & { position: number };
  worldId: string | null;
  timelineEra: string | null;
  onClose: () => void;
  onSave: (characters: Array<{ oc_id: string | null; custom_name: string | null; role?: string | null; age: number | null }>) => Promise<void>;
}) {
  const { ocs: characters } = useOCsByWorld(worldId || undefined);
  const [customNames, setCustomNames] = useState<CustomNameSuggestion[]>([]);
  const characterInputRefs = useRef<Map<number, string>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  
  // Parse era config for age calculation
  const eraConfig = timelineEra ? parseEraConfig(timelineEra) : undefined;

  // Initialize characters from event
  const initialCharacters = event.characters || [];
  const [charactersList, setCharactersList] = useState<Array<{
    oc_id: string | null;
    custom_name: string | null;
    role?: string | null;
    age: number | null;
  }>>(initialCharacters.map(char => ({
    oc_id: char.oc_id || null,
    custom_name: char.custom_name || null,
    role: char.role || null,
    age: char.age ?? null,
  })));

  const addCharacter = () => {
    setCharactersList([...charactersList, { oc_id: null, custom_name: null, role: null, age: null }]);
  };

  const removeCharacter = (index: number) => {
    setCharactersList(charactersList.filter((_, i) => i !== index));
  };

  const updateCharacter = (index: number, updates: Partial<{
    oc_id: string | null;
    custom_name: string | null;
    role?: string | null;
    age: number | null;
  }>) => {
    const updated = [...charactersList];
    updated[index] = { ...updated[index], ...updates };
    setCharactersList(updated);
  };

  const updateCharacterField = <K extends keyof typeof charactersList[0]>(index: number, field: K, value: typeof charactersList[0][K]) => {
    const updated = [...charactersList];
    updated[index] = { ...updated[index], [field]: value };
    setCharactersList(updated);
  };

  // Fetch custom names
  useEffect(() => {
    async function fetchCustomNames() {
      if (!worldId) {
        setCustomNames([]);
        return;
      }
      
      try {
        const supabase = createClient();
        const { data: events, error: eventsError } = await supabase
          .from('timeline_events')
          .select('id')
          .eq('world_id', worldId);
        
        if (eventsError || !events) {
          logger.error('Component', 'CharactersEditModal: Error fetching events for custom names', eventsError);
          setCustomNames([]);
          return;
        }
        
        const eventIds = events.map(e => e.id);
        if (eventIds.length === 0) {
          setCustomNames([]);
          return;
        }
        
        const { data, error } = await supabase
          .from('timeline_event_characters')
          .select('custom_name')
          .in('timeline_event_id', eventIds)
          .not('custom_name', 'is', null);
        
        if (error) {
          logger.error('Component', 'CharactersEditModal: Error fetching custom names', error);
          setCustomNames([]);
          return;
        }
        
        const uniqueNames = new Map<string, string>();
        (data || []).forEach((item: any) => {
          if (item.custom_name) {
            const normalized = item.custom_name.trim();
            const lower = normalized.toLowerCase();
            if (!uniqueNames.has(lower)) {
              uniqueNames.set(lower, normalized);
            }
          }
        });
        
        setCustomNames(Array.from(uniqueNames.values()).map(name => ({ name, isCustom: true as const })));
      } catch (error) {
        logger.error('Component', 'CharactersEditModal: Error in fetchCustomNames', error);
        setCustomNames([]);
      }
    }
    
    fetchCustomNames();
  }, [worldId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(charactersList);
      onClose();
    } catch (error) {
      logger.error('Component', 'CharactersEditModal: Error saving characters', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate age for display
  const getDisplayAge = (char: { oc_id: string | null; custom_name: string | null; age: number | null }, index: number) => {
    if (char.age !== null) return char.age;
    if (char.oc_id) {
      const character = characters.find(c => c.id === char.oc_id);
      if (character?.date_of_birth && event.date_data) {
        return calculateAge(character.date_of_birth, event.date_data, eraConfig);
      }
    }
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex justify-between items-center">
          <h4 className="text-lg font-semibold text-gray-100">Edit Characters: {event.title}</h4>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-3 mb-4">
          {charactersList && charactersList.length > 0 ? (
            charactersList.map((char, index) => {
              const selectedCharacter = char.oc_id ? characters.find(c => c.id === char.oc_id) : null;
              const calculatedAge = selectedCharacter?.date_of_birth && event.date_data
                ? calculateAge(selectedCharacter.date_of_birth, event.date_data, eraConfig)
                : null;
              const displayAge = char.age !== null ? char.age : calculatedAge;
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
                        customNames={customNames}
                        onSelect={async (ocId, customName) => {
                          if (ocId) {
                            characterInputRefs.current.delete(index);
                            const selectedCharacter = characters.find(c => c.id === ocId);
                            let ageToUse: number | null = null;
                            
                            if (selectedCharacter?.date_of_birth && event.date_data) {
                              const calculatedAge = calculateAge(selectedCharacter.date_of_birth, event.date_data, eraConfig);
                              if (calculatedAge !== null) {
                                ageToUse = calculatedAge;
                              }
                            }
                            
                            updateCharacter(index, {
                              oc_id: ocId,
                              custom_name: null,
                              age: ageToUse,
                            });
                          } else if (customName) {
                            characterInputRefs.current.delete(index);
                            updateCharacter(index, {
                              oc_id: null,
                              custom_name: customName.trim(),
                              age: null,
                            });
                          }
                        }}
                        onInputValueChange={(inputValue) => {
                          if (inputValue.trim()) {
                            characterInputRefs.current.set(index, inputValue.trim());
                          } else {
                            characterInputRefs.current.delete(index);
                          }
                        }}
                        placeholder="Select character or type custom name..."
                        disabled={isSaving}
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
                            updateCharacterField(index, 'age', null);
                          } else {
                            const numValue = Number(value);
                            if (!isNaN(numValue) && numValue >= 0) {
                              updateCharacterField(index, 'age', numValue);
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
                        onChange={(e) => updateCharacterField(index, 'role', e.target.value)}
                        placeholder="Role"
                        className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                      />
                    </div>
                    <div className="flex items-end pt-6 sm:pt-0 w-full sm:w-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => removeCharacter(index)}
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
            })
          ) : (
            <div className="bg-gray-800/30 border border-gray-700/50 border-dashed rounded-lg p-6 text-center">
              <p className="text-sm text-gray-400 mb-3">
                No characters added yet.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={addCharacter}
            className="px-4 py-2 text-sm bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-medium shadow-sm"
          >
            <i className="fas fa-plus mr-1.5" aria-hidden="true"></i>
            Add Character
          </button>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Characters'}
          </button>
        </div>
      </div>
    </div>
  );
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
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Table view state
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [sortOrder, setSortOrder] = useState<'chronological' | 'list'>('chronological');
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [editedEvents, setEditedEvents] = useState<Map<string, Partial<TimelineEvent>>>(new Map());
  const [editingDateEventId, setEditingDateEventId] = useState<string | null>(null);
  const [editingCategoryEventId, setEditingCategoryEventId] = useState<string | null>(null);
  const [editingTitleEventId, setEditingTitleEventId] = useState<string | null>(null);
  const [editingLocationEventId, setEditingLocationEventId] = useState<string | null>(null);
  const [editingDescriptionEventId, setEditingDescriptionEventId] = useState<string | null>(null);
  const [editingCharactersEventId, setEditingCharactersEventId] = useState<string | null>(null);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditValues, setBulkEditValues] = useState<{
    title?: string;
    location?: string;
    is_key_event?: boolean;
    categories?: string[];
  }>({});
  
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
    
    // Get timeline to find world_id, era, story_alias_id
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

  async function moveEvent(sortedList: Array<TimelineEvent & { position: number }>, index: number, direction: 'up' | 'down') {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sortedList.length) return;

    // Build new order: remove item at index, insert at newIndex
    const reordered = [...sortedList];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);

    // Persist new order: assign positions 0..n-1 to match display order
    const updates = reordered
      .map((event, i) => (event.position !== i ? { eventId: event.id, position: i } : null))
      .filter((u): u is { eventId: string; position: number } => u !== null);
    if (updates.length === 0) return;

    setIsSaving(true);
    try {
      const responses = await Promise.all(
        updates.map(({ eventId, position }) =>
          fetch(`/api/admin/timeline-events/${eventId}/timelines`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ timeline_id: timelineId, position }),
          })
        )
      );
      const allOk = responses.every((r) => r.ok);
      if (!allOk) throw new Error('Failed to update event position(s)');
      setSortOrder('list'); // show list order so the move is visible
      await loadTimelineAndEvents();
    } catch (error) {
      logger.error('Component', 'TimelineEventsManager: Error moving event', error);
      alert(error instanceof Error ? error.message : 'Failed to move event');
    } finally {
      setIsSaving(false);
    }
  }

  /** Persist current chronological order to the server (update positions to match date order). */
  async function saveChronologicalOrder() {
    if (timelineEvents.length === 0) return;
    const order = timelineEra
      ? parseEraConfig(timelineEra).map((c) => c.name).filter(Boolean)
      : undefined;
    const chronoSorted = [...timelineEvents].sort((a, b) => {
      const dateCmp = compareEventDates(a.date_data ?? null, b.date_data ?? null, order);
      if (dateCmp !== 0) return dateCmp;
      return a.position - b.position;
    });
    const updates = chronoSorted
      .map((event, index) => (event.position !== index ? { eventId: event.id, position: index } : null))
      .filter((u): u is { eventId: string; position: number } => u !== null);
    if (updates.length === 0) return;
    setIsSaving(true);
    try {
      const responses = await Promise.all(
        updates.map(({ eventId, position }) =>
          fetch(`/api/admin/timeline-events/${eventId}/timelines`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ timeline_id: timelineId, position }),
          })
        )
      );
      const allOk = responses.every((r) => r.ok);
      if (!allOk) throw new Error('Failed to update some positions');
      await loadTimelineAndEvents();
    } catch (error) {
      logger.error('Component', 'TimelineEventsManager: Error saving chronological order', error);
      alert(error instanceof Error ? error.message : 'Failed to save chronological order');
    } finally {
      setIsSaving(false);
    }
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

  // Close category editor when clicking outside
  useEffect(() => {
    if (!editingCategoryEventId) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('td')) {
        setEditingCategoryEventId(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editingCategoryEventId]);

  // Close date editor when clicking outside
  useEffect(() => {
    if (!editingDateEventId) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Close if clicking outside the modal
      if (!target.closest('.bg-gray-800.border')) {
        setEditingDateEventId(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editingDateEventId]);

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

  // Inline editing handlers
  const handleInlineFieldChange = (eventId: string, field: keyof TimelineEvent, value: any) => {
    setEditedEvents((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(eventId) || {};
      newMap.set(eventId, { ...existing, [field]: value });
      return newMap;
    });
  };

  const saveRowChanges = async (eventId: string) => {
    const changes = editedEvents.get(eventId);
    if (!changes) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/timeline-events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to save changes' }));
        throw new Error(errorData.error || 'Failed to save changes');
      }

      // Remove from edited events map
      setEditedEvents((prev) => {
        const newMap = new Map(prev);
        newMap.delete(eventId);
        return newMap;
      });

      await loadTimelineAndEvents();
    } catch (error) {
      logger.error('Component', 'TimelineEventsManager: Error saving row changes', error);
      alert(error instanceof Error ? error.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const saveAllChanges = async () => {
    if (editedEvents.size === 0) return;

    setIsSaving(true);
    try {
      const savePromises = Array.from(editedEvents.entries()).map(([eventId, changes]) =>
        fetch(`/api/admin/timeline-events/${eventId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(changes),
        }).then((res) => {
          if (!res.ok) {
            return res.json().then((data) => {
              throw new Error(data.error || 'Failed to save changes');
            });
          }
          return res.json();
        })
      );

      await Promise.all(savePromises);
      setEditedEvents(new Map());
      await loadTimelineAndEvents();
    } catch (error) {
      logger.error('Component', 'TimelineEventsManager: Error saving all changes', error);
      alert(error instanceof Error ? error.message : 'Failed to save all changes');
    } finally {
      setIsSaving(false);
    }
  };

  // Row selection handlers
  const toggleRowSelection = (eventId: string) => {
    setSelectedEventIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  // Bulk operations
  const handleBulkEdit = async () => {
    if (selectedEventIds.size === 0) return;

    setIsSaving(true);
    try {
      const updates: Record<string, any> = {};
      if (bulkEditValues.title !== undefined) updates.title = bulkEditValues.title;
      if (bulkEditValues.location !== undefined) updates.location = bulkEditValues.location;
      if (bulkEditValues.is_key_event !== undefined) updates.is_key_event = bulkEditValues.is_key_event;
      if (bulkEditValues.categories !== undefined) updates.categories = bulkEditValues.categories;

      const savePromises = Array.from(selectedEventIds).map((eventId) =>
        fetch(`/api/admin/timeline-events/${eventId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }).then((res) => {
          if (!res.ok) {
            return res.json().then((data) => {
              throw new Error(data.error || 'Failed to update event');
            });
          }
          return res.json();
        })
      );

      await Promise.all(savePromises);
      setSelectedEventIds(new Set());
      setShowBulkEditModal(false);
      setBulkEditValues({});
      await loadTimelineAndEvents();
    } catch (error) {
      logger.error('Component', 'TimelineEventsManager: Error bulk editing', error);
      alert(error instanceof Error ? error.message : 'Failed to bulk edit events');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedEventIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedEventIds.size} event(s)? This action cannot be undone.`)) {
      return;
    }

    setIsSaving(true);
    try {
      const deletePromises = Array.from(selectedEventIds).map((eventId) =>
        fetch(`/api/admin/timeline-events/${eventId}`, {
          method: 'DELETE',
        }).then((res) => {
          if (!res.ok) {
            return res.json().then((data) => {
              throw new Error(data.error || 'Failed to delete event');
            });
          }
          return res.json();
        })
      );

      await Promise.all(deletePromises);
      setSelectedEventIds(new Set());
      await loadTimelineAndEvents();
    } catch (error) {
      logger.error('Component', 'TimelineEventsManager: Error bulk deleting', error);
      alert(error instanceof Error ? error.message : 'Failed to bulk delete events');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkRemove = async () => {
    if (selectedEventIds.size === 0) return;
    if (!confirm(`Remove ${selectedEventIds.size} event(s) from this timeline? (The events themselves will not be deleted)`)) {
      return;
    }

    setIsSaving(true);
    try {
      const removePromises = Array.from(selectedEventIds).map((eventId) =>
        fetch(`/api/admin/timeline-events/${eventId}/timelines?timeline_id=${timelineId}`, {
          method: 'DELETE',
        }).then((res) => {
          if (!res.ok) {
            return res.json().then((data) => {
              throw new Error(data.error || 'Failed to remove event');
            });
          }
          return res.json();
        })
      );

      await Promise.all(removePromises);
      setSelectedEventIds(new Set());
      await loadTimelineAndEvents();
    } catch (error) {
      logger.error('Component', 'TimelineEventsManager: Error bulk removing', error);
      alert(error instanceof Error ? error.message : 'Failed to bulk remove events');
    } finally {
      setIsSaving(false);
    }
  };

  // Always sort chronologically using era order if available; position is tiebreaker for same-date events (user can move to reorder)
  // Parse era names for sorting (handles both JSON and comma-separated format)
  const eraOrder = timelineEra
    ? parseEraConfig(timelineEra).map((c) => c.name).filter(Boolean)
    : undefined;
  
  // Parse era config for age calculation
  const eraConfig = timelineEra ? parseEraConfig(timelineEra) : undefined;
  
  const sortedEvents = useMemo(() => {
    if (sortOrder === 'list') {
      return [...timelineEvents].sort((a, b) => a.position - b.position);
    }
    return [...timelineEvents].sort((a, b) => {
      const dateCmp = compareEventDates(a.date_data ?? null, b.date_data ?? null, eraOrder);
      if (dateCmp !== 0) return dateCmp;
      return a.position - b.position;
    });
  }, [timelineEvents, sortOrder, eraOrder]);

  const toggleSelectAll = () => {
    if (selectedEventIds.size === sortedEvents.length) {
      setSelectedEventIds(new Set());
    } else {
      setSelectedEventIds(new Set(sortedEvents.map((e) => e.id)));
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-300">Loading events...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h3 className="text-xl font-semibold text-gray-100">Timeline Events</h3>
        <div className="flex gap-2 flex-wrap">
          {/* Sort order: By date / As listed */}
          {timelineEvents.length > 1 && (
            <div className="flex gap-1 bg-gray-800 rounded-md p-1">
              <button
                type="button"
                onClick={() => {
                  setSortOrder('chronological');
                  saveChronologicalOrder();
                }}
                className={`px-3 py-1 rounded text-sm transition-colors flex items-center gap-1.5 ${
                  sortOrder === 'chronological'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
                title="Sort by date and save this order"
              >
                <i className="fas fa-sort-amount-down-alt text-xs" aria-hidden="true"></i>
                By date
              </button>
              <button
                type="button"
                onClick={() => setSortOrder('list')}
                className={`px-3 py-1 rounded text-sm transition-colors flex items-center gap-1.5 ${
                  sortOrder === 'list'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
                title="Show in timeline list order"
              >
                <i className="fas fa-list text-xs" aria-hidden="true"></i>
                As listed
              </button>
            </div>
          )}
          {/* View mode toggle */}
          <div className="flex gap-1 bg-gray-800 rounded-md p-1">
            <button
              onClick={() => {
                setViewMode('cards');
                // Clear editing states when switching views
                setEditingDateEventId(null);
                setEditingCategoryEventId(null);
                setEditingTitleEventId(null);
                setEditingLocationEventId(null);
                setEditingDescriptionEventId(null);
              }}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                viewMode === 'cards'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => {
                setViewMode('table');
                // Clear editing states when switching views
                setEditingDateEventId(null);
                setEditingCategoryEventId(null);
                setEditingTitleEventId(null);
                setEditingLocationEventId(null);
                setEditingDescriptionEventId(null);
              }}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                viewMode === 'table'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Table
            </button>
          </div>
          
          {/* Bulk operations buttons (only in table view) */}
          {viewMode === 'table' && selectedEventIds.size > 0 && (
            <>
              <button
                onClick={() => setShowBulkEditModal(true)}
                disabled={isSaving}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                Bulk Edit ({selectedEventIds.size})
              </button>
              <button
                onClick={handleBulkRemove}
                disabled={isSaving}
                className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                Bulk Remove ({selectedEventIds.size})
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isSaving}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                Bulk Delete ({selectedEventIds.size})
              </button>
            </>
          )}
          
          {/* Save all changes button (only in table view with unsaved changes) */}
          {viewMode === 'table' && editedEvents.size > 0 && (
            <button
              onClick={saveAllChanges}
              disabled={isSaving}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors disabled:opacity-50"
            >
              Save All Changes ({editedEvents.size})
            </button>
          )}
          
          <button
            onClick={() => {
              setShowAddExistingEvent(!showAddExistingEvent);
              setShowCreateEventForm(false);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {showAddExistingEvent ? 'Cancel' : 'Add Existing Event'}
          </button>
          <button
            onClick={() => {
              setShowCreateEventForm(!showCreateEventForm);
              setShowAddExistingEvent(false);
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
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

      {/* Bulk Edit Modal */}
      {showBulkEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <h4 className="text-lg font-semibold text-gray-100 mb-4">
              Bulk Edit {selectedEventIds.size} Event(s)
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={bulkEditValues.title || ''}
                  onChange={(e) => setBulkEditValues({ ...bulkEditValues, title: e.target.value })}
                  placeholder="Leave empty to not change"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Location</label>
                <input
                  type="text"
                  value={bulkEditValues.location || ''}
                  onChange={(e) => setBulkEditValues({ ...bulkEditValues, location: e.target.value })}
                  placeholder="Leave empty to not change"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-gray-100"
                />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={bulkEditValues.is_key_event ?? false}
                    onChange={(e) => setBulkEditValues({ ...bulkEditValues, is_key_event: e.target.checked })}
                    className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-700 rounded"
                  />
                  <span className="text-sm font-medium text-gray-300">Key Event</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Categories</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {PREDEFINED_EVENT_CATEGORIES.map((category) => {
                    const isSelected = bulkEditValues.categories?.includes(category) ?? false;
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => {
                          const current = bulkEditValues.categories || [];
                          if (isSelected) {
                            setBulkEditValues({ ...bulkEditValues, categories: current.filter(c => c !== category) });
                          } else {
                            setBulkEditValues({ ...bulkEditValues, categories: [...current, category] });
                          }
                        }}
                        className={`px-2 py-1 rounded text-xs border transition-colors ${
                          isSelected
                            ? getCategoryColorClasses(category)
                            : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                        }`}
                      >
                        {category}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400">Selected categories will replace existing ones</p>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowBulkEditModal(false);
                  setBulkEditValues({});
                }}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkEdit}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Characters Editing Modal */}
      {editingCharactersEventId && (() => {
        const eventToEdit = timelineEvents.find(e => e.id === editingCharactersEventId);
        if (!eventToEdit) return null;
        
        return (
          <CharactersEditModal
            event={eventToEdit}
            worldId={worldId}
            timelineEra={timelineEra}
            onClose={() => setEditingCharactersEventId(null)}
            onSave={async (characters) => {
              // Save characters immediately
              setIsSaving(true);
              try {
                const response = await fetch(`/api/admin/timeline-events/${editingCharactersEventId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ characters }),
                });

                if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.error || 'Failed to save characters');
                }

                // Refresh events
                await loadTimelineAndEvents();
                setEditingCharactersEventId(null);
              } catch (error) {
                logger.error('Component', 'TimelineEventsManager: Error saving characters', error);
                alert('Failed to save characters. Please try again.');
              } finally {
                setIsSaving(false);
              }
            }}
          />
        );
      })()}

      {timelineEvents.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No events in this timeline yet. Create events to get started.
        </div>
      ) : (
        viewMode === 'table' ? (
        // Table View
        <div className="border border-gray-700 rounded-lg overflow-hidden bg-gray-900/50">
          <div className="overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
            <table className="w-full border-collapse min-w-[1600px]">
              <thead className="sticky top-0 z-10 bg-gray-800 shadow-md">
                <tr className="border-b-2 border-gray-700">
                  <th className="p-3 text-left sticky left-0 bg-gray-800 z-30 border-r border-gray-700 shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
                    <input
                      type="checkbox"
                      checked={selectedEventIds.size === sortedEvents.length && sortedEvents.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-700 rounded cursor-pointer"
                    />
                  </th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-300 sticky left-12 bg-gray-800 z-30 border-r border-gray-700 min-w-[50px] shadow-[2px_0_4px_rgba(0,0,0,0.1)]">#</th>
                  <th className="p-3 text-center text-sm font-semibold text-gray-300 min-w-[80px]">Order</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-300 min-w-[200px]">Title</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-300 min-w-[150px]">Date</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-300 min-w-[180px]">Categories</th>
                  <th className="p-3 text-center text-sm font-semibold text-gray-300 min-w-[60px]">Key</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-300 min-w-[150px]">Location</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-300 min-w-[250px]">Characters</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-300 min-w-[120px]">Description</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-300 min-w-[200px]">Actions</th>
                </tr>
              </thead>
            <tbody>
              {sortedEvents.map((event, index) => {
                if (editingEventId === event.id) return null;
                const edited = editedEvents.get(event.id);
                const isSelected = selectedEventIds.has(event.id);
                const hasUnsavedChanges = edited !== undefined;
                const displayEvent = edited ? { ...event, ...edited } : event;
                
                return (
                  <tr
                    key={event.id}
                    className={`border-b border-gray-700/50 ${
                      isSelected ? 'bg-purple-900/20' : hasUnsavedChanges ? 'bg-yellow-900/10' : 'bg-gray-800/30'
                    } hover:bg-gray-700/30 transition-colors`}
                  >
                    <td className="p-3 sticky left-0 bg-inherit z-20 border-r border-gray-700/50 shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRowSelection(event.id)}
                        className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-700 rounded cursor-pointer"
                      />
                    </td>
                    <td className="p-3 text-sm text-gray-400 font-mono sticky left-12 bg-inherit z-20 border-r border-gray-700/50 text-center shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
                      {index + 1}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex flex-col gap-1 items-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveEvent(sortedEvents, index, 'up');
                          }}
                          disabled={index === 0 || isSaving}
                          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Move up"
                        >
                          <i className="fas fa-chevron-up text-xs" aria-hidden="true"></i>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveEvent(sortedEvents, index, 'down');
                          }}
                          disabled={index === sortedEvents.length - 1 || isSaving}
                          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Move down"
                        >
                          <i className="fas fa-chevron-down text-xs" aria-hidden="true"></i>
                        </button>
                      </div>
                    </td>
                    <td 
                      className="p-3 cursor-pointer hover:bg-gray-700/30 transition-colors"
                      onClick={() => {
                        if (editingTitleEventId !== event.id) {
                          setEditingTitleEventId(event.id);
                        }
                      }}
                    >
                      {editingTitleEventId === event.id ? (
                        <input
                          type="text"
                          value={displayEvent.title || ''}
                          onChange={(e) => handleInlineFieldChange(event.id, 'title', e.target.value)}
                          onBlur={() => setEditingTitleEventId(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Escape') {
                              setEditingTitleEventId(null);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-2 py-1.5 bg-gray-900 border border-purple-500 rounded text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          autoFocus
                        />
                      ) : (
                        <div className="text-gray-100 font-medium min-h-[28px] flex items-center">
                          {displayEvent.title}
                        </div>
                      )}
                    </td>
                    <td 
                      className="p-3 relative cursor-pointer hover:bg-gray-700/30 transition-colors"
                      onClick={() => {
                        if (editingDateEventId !== event.id) {
                          setEditingDateEventId(event.id);
                        }
                      }}
                    >
                      {editingDateEventId === event.id && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingDateEventId(null)}>
                          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
                            <div className="mb-4 flex justify-between items-center">
                              <h4 className="text-lg font-semibold text-gray-100">Edit Date</h4>
                              <button
                                onClick={() => setEditingDateEventId(null)}
                                className="text-gray-400 hover:text-white text-xl"
                              >
                                ×
                              </button>
                            </div>
                            <DateInput
                              value={displayEvent.date_data || null}
                              onChange={(value) => {
                                handleInlineFieldChange(event.id, 'date_data', value);
                                // Also update year/month/day if available
                                if (value && typeof value === 'object' && 'type' in value) {
                                  const dateData = value as any;
                                  if (dateData.type === 'exact') {
                                    handleInlineFieldChange(event.id, 'year', dateData.year);
                                    handleInlineFieldChange(event.id, 'month', dateData.month);
                                    handleInlineFieldChange(event.id, 'day', dateData.day);
                                  }
                                }
                              }}
                              availableEras={timelineEra ? parseEraConfig(timelineEra).map((e) => e.name).filter(Boolean) : undefined}
                            />
                            <div className="mt-4 flex gap-2">
                              <button
                                onClick={() => setEditingDateEventId(null)}
                                className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
                              >
                                Done
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="text-sm text-gray-300 min-h-[28px] flex items-center">
                        {formatDateData(displayEvent.date_data) || displayEvent.date_text || '—'}
                      </div>
                    </td>
                    <td 
                      className="p-3 relative cursor-pointer hover:bg-gray-700/30 transition-colors"
                      onClick={() => {
                        if (editingCategoryEventId !== event.id) {
                          setEditingCategoryEventId(event.id);
                        }
                      }}
                    >
                      {editingCategoryEventId === event.id ? (
                        <div className="relative">
                          <div className="absolute z-10 bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg max-h-64 overflow-y-auto min-w-[250px]">
                            <div className="flex flex-wrap gap-1 mb-2">
                              {PREDEFINED_EVENT_CATEGORIES.map((category) => {
                                const currentCategories = displayEvent.categories || [];
                                const isSelected = currentCategories.includes(category);
                                return (
                                  <button
                                    key={category}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newCategories = isSelected
                                        ? currentCategories.filter(c => c !== category)
                                        : [...currentCategories, category];
                                      handleInlineFieldChange(event.id, 'categories', newCategories);
                                    }}
                                    className={`px-2 py-0.5 rounded text-xs border transition-colors ${
                                      isSelected
                                        ? getCategoryColorClasses(category)
                                        : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                                    }`}
                                  >
                                    {category}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="flex gap-2 mt-2 pt-2 border-t border-gray-700">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingCategoryEventId(null);
                                }}
                                className="flex-1 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                              >
                                Done
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInlineFieldChange(event.id, 'categories', []);
                                  setEditingCategoryEventId(null);
                                }}
                                className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                              >
                                Clear
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="min-h-[28px] flex items-center gap-1 flex-wrap">
                          {displayEvent.categories && displayEvent.categories.length > 0 ? (
                            <>
                              {displayEvent.categories.map((cat) => (
                                <span
                                  key={cat}
                                  className={`text-xs px-1.5 py-0.5 rounded border ${getCategoryColorClasses(cat)}`}
                                >
                                  {cat}
                                </span>
                              ))}
                            </>
                          ) : (
                            <span className="text-xs text-gray-500 italic">Click to add categories</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td 
                      className="p-3 text-center cursor-pointer hover:bg-gray-700/30 transition-colors"
                      onClick={(e) => {
                        if (e.target instanceof HTMLInputElement) return;
                        const checkbox = e.currentTarget.querySelector('input[type="checkbox"]') as HTMLInputElement;
                        if (checkbox) {
                          checkbox.click();
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={displayEvent.is_key_event || false}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleInlineFieldChange(event.id, 'is_key_event', e.target.checked);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-700 rounded cursor-pointer"
                      />
                    </td>
                    <td 
                      className="p-3 cursor-pointer hover:bg-gray-700/30 transition-colors"
                      onClick={() => {
                        if (editingLocationEventId !== event.id) {
                          setEditingLocationEventId(event.id);
                        }
                      }}
                    >
                      {editingLocationEventId === event.id ? (
                        <input
                          type="text"
                          value={displayEvent.location || ''}
                          onChange={(e) => handleInlineFieldChange(event.id, 'location', e.target.value)}
                          onBlur={() => setEditingLocationEventId(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Escape') {
                              setEditingLocationEventId(null);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-2 py-1.5 bg-gray-900 border border-purple-500 rounded text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          autoFocus
                        />
                      ) : (
                        <div className="text-sm text-gray-300 min-h-[28px] flex items-center">
                          {displayEvent.location || <span className="text-gray-500 italic">Click to add location</span>}
                        </div>
                      )}
                    </td>
                    <td 
                      className="p-3 cursor-pointer hover:bg-gray-700/30 transition-colors"
                      onClick={() => {
                        if (editingCharactersEventId !== event.id) {
                          setEditingCharactersEventId(event.id);
                        }
                      }}
                      title="Click to edit characters"
                    >
                      <div className="text-xs text-gray-300 space-y-1">
                        {displayEvent.characters && displayEvent.characters.length > 0 ? (
                          displayEvent.characters.map((char) => {
                            const characterName = char.custom_name || char.oc?.name;
                            let age: number | null = null;
                            if (char.age !== null && char.age !== undefined) {
                              age = char.age;
                            } else if (char.oc?.date_of_birth && displayEvent.date_data) {
                              age = calculateAge(char.oc.date_of_birth, displayEvent.date_data, eraConfig);
                            }
                            return (
                              <div key={char.id} className="flex items-center gap-1">
                                <span className="font-medium">{characterName}</span>
                                {age !== null && (
                                  <span className="text-gray-500">({age})</span>
                                )}
                                {char.role && (
                                  <span className="text-gray-500 text-[10px]">• {char.role}</span>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <span className="text-gray-500 italic">Click to add characters</span>
                        )}
                      </div>
                    </td>
                    <td 
                      className="p-3 cursor-pointer hover:bg-gray-700/30 transition-colors"
                      onClick={() => {
                        if (editingDescriptionEventId !== event.id) {
                          setEditingDescriptionEventId(event.id);
                        }
                      }}
                    >
                      {editingDescriptionEventId === event.id ? (
                        <textarea
                          value={displayEvent.description || ''}
                          onChange={(e) => handleInlineFieldChange(event.id, 'description', e.target.value)}
                          onBlur={() => setEditingDescriptionEventId(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              setEditingDescriptionEventId(null);
                            }
                            if (e.key === 'Enter' && e.ctrlKey) {
                              setEditingDescriptionEventId(null);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-2 py-1.5 bg-gray-900 border border-purple-500 rounded text-gray-100 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                          rows={3}
                          autoFocus
                        />
                      ) : (
                        <div className="text-xs text-gray-400 min-h-[50px] flex items-start">
                          {displayEvent.description ? (
                            <span className="line-clamp-3">{displayEvent.description}</span>
                          ) : (
                            <span className="text-gray-500 italic">Click to add description</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 flex-wrap">
                        {hasUnsavedChanges && (
                          <button
                            onClick={() => saveRowChanges(event.id)}
                            disabled={isSaving}
                            className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                            title="Save changes"
                          >
                            💾
                          </button>
                        )}
                        <button
                          onClick={() => setEditingEventId(event.id)}
                          className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                          title="Full edit"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => removeEventFromTimeline(event.id)}
                          disabled={isSaving}
                          className="px-2 py-1 bg-orange-500 text-white rounded text-xs hover:bg-orange-600 disabled:opacity-50"
                          title="Remove"
                        >
                          Remove
                        </button>
                        <button
                          onClick={() => deleteEvent(event.id)}
                          disabled={isSaving}
                          className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50"
                          title="Delete"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
        ) : (
          // Card View
          <div className="space-y-4">
            {sortedEvents.map((event, index) => 
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
                            ? calculateAge(char.oc.date_of_birth, event.date_data, eraConfig)
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
                    onClick={() => moveEvent(sortedEvents, index, 'up')}
                    disabled={index === 0 || isSaving}
                    className="px-3 py-1 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 disabled:opacity-50"
                    title="Move earlier (e.g. same-day order)"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveEvent(sortedEvents, index, 'down')}
                    disabled={index === sortedEvents.length - 1 || isSaving}
                    className="px-3 py-1 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 disabled:opacity-50"
                    title="Move later (e.g. same-day order)"
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
            )}
          </div>
        )
      )}
    </div>
  );
}

