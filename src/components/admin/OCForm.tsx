'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller, type UseFormSetValue, type UseFormWatch, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { OC, TemplateType, World, RelationshipType } from '@/types/oc';
import { RELATIONSHIP_TYPES } from '@/lib/relationships/relationshipTypes';
import { getTemplates, type TemplateField, type TemplateDefinition } from '@/lib/templates/ocTemplates';
import { createClient } from '@/lib/supabase/client';
import { getTemplateTypeFromWorldSlug } from '@/lib/templates/worldTemplateMap';
import { getEffectiveFieldDefinitions, getWorldFieldDefinitions } from '@/lib/fields/worldFields';
import { WorldFieldsSection } from './WorldFieldsSection';
import { FormProvider } from 'react-hook-form';
import { OCVersionSwitcher } from './OCVersionSwitcher';
import { FormSection } from './forms/FormSection';
import { FormLabel } from './forms/FormLabel';
import { FormInput } from './forms/FormInput';
import { FormSelect } from './forms/FormSelect';
import { FormMultiSelect } from './forms/FormMultiSelect';
import { FormAutocomplete } from './forms/FormAutocomplete';
import { FormTextarea } from './forms/FormTextarea';
import { FormButton } from './forms/FormButton';
import { FormMessage } from './forms/FormMessage';
import { FormColorSelect } from './forms/FormColorSelect';
import { StoryAliasSelector } from './StoryAliasSelector';
import { QuotesFormSection } from './QuotesFormSection';
import { TagsFormSection } from './TagsFormSection';
import { StorySnippetsFormSection } from './StorySnippetsFormSection';
import { DevelopmentLogFormSection } from './DevelopmentLogFormSection';
import { optionalUuid, optionalUrl } from '@/lib/utils/zodSchemas';
import { useDropdownPosition } from '@/hooks/useDropdownPosition';
import { getGoogleDriveImageUrls } from '@/lib/utils/googleDriveImage';
import { slugify } from '@/lib/utils/slugify';
import { autoCreateOptions, autoCreateTemplateOptions, autoCreateWorldFieldOptions } from '@/lib/utils/autoCreateOptions';
import { DropdownOptionsProvider } from '@/contexts/DropdownOptionsContext';
import { logger } from '@/lib/logger';

// Component to preview images from URLs
function ImagePreview({ url, maxHeight = '200px', className = '' }: { url: string; maxHeight?: string; className?: string }) {
  const [imageError, setImageError] = useState(false);
  const [isValidUrl, setIsValidUrl] = useState(false);
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  useEffect(() => {
    // Reset error state when URL changes
    setImageError(false);
    setCurrentUrlIndex(0);
    // Check if URL is valid
    try {
      const urlObj = new URL(url);
      const isValid = urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
      setIsValidUrl(isValid);
      
      if (isValid) {
        // Get multiple URL formats for Google Drive images (with fallbacks)
        if (url.includes('drive.google.com')) {
          const urls = getGoogleDriveImageUrls(url);
          setImageUrls(urls);
        } else {
          setImageUrls([url]);
        }
      } else {
        setImageUrls([]);
      }
    } catch {
      setIsValidUrl(false);
      setImageUrls([]);
    }
  }, [url]);

  if (!url || !isValidUrl || imageUrls.length === 0) {
    return null;
  }

  const currentUrl = imageUrls[currentUrlIndex];

  const handleError = () => {
    if (currentUrlIndex < imageUrls.length - 1) {
      // Try next URL format
      setCurrentUrlIndex(currentUrlIndex + 1);
      setImageError(false);
    } else {
      // All URLs failed
      setImageError(true);
    }
  };

  const handleLoad = () => {
    setImageError(false);
  };

  return (
    <div className={`mt-2 ${className}`}>
      <img
        src={currentUrl}
        alt="Preview"
        className="rounded-lg border border-gray-600/60 max-w-full"
        style={{ maxHeight }}
        onError={handleError}
        onLoad={handleLoad}
      />
      {imageError && (
        <p className="text-sm text-red-400 mt-1">Failed to load image. Please check the URL.</p>
      )}
    </div>
  );
}

// Component to render template-specific fields from oc_templates
// These are saved to modular_fields to match the display logic
function TemplateFieldsSection({
  template,
  templateType,
  control,
  register,
  watch,
  isSubmitting,
}: {
  template: { name: string; fields: TemplateField[] };
  templateType: string;
  control: any;
  register: any;
  watch: any;
  isSubmitting: boolean;
}) {
  const modularFields = watch('modular_fields') || {};
  
  return (
    <FormSection 
      title={`${template.name} - Character Template Fields`} 
      icon="template" 
      accentColor="content" 
      defaultOpen={true}
    >
      <div className="space-y-4">
        {template.fields.map((field) => {
          const fieldPath = `modular_fields.${field.key}`;
          const fieldValue = modularFields[field.key];
          
          if (field.type === 'array') {
            return (
              <ArrayFieldInput
                key={field.key}
                field={field}
                fieldPath={fieldPath}
                control={control}
                register={register}
                defaultValue={Array.isArray(fieldValue) ? fieldValue : (fieldValue ? [fieldValue] : [])}
                isSubmitting={isSubmitting}
              />
            );
          } else if (field.type === 'number') {
            return (
              <div key={field.key}>
                <FormLabel htmlFor={fieldPath}>
                  {field.label}
                </FormLabel>
                <FormInput
                  type="number"
                  {...register(fieldPath, { valueAsNumber: true })}
                  defaultValue={fieldValue || ''}
                  disabled={isSubmitting}
                />
              </div>
            );
          } else {
            // Default to text input
            // If field has options property, use autocomplete with custom values allowed
            if (field.options) {
              return (
                <div key={field.key}>
                  <FormLabel htmlFor={fieldPath}>
                    {field.label}
                  </FormLabel>
                  <Controller
                    name={fieldPath}
                    control={control}
                    defaultValue={fieldValue || ''}
                    render={({ field: controllerField }) => (
                      <FormAutocomplete
                        {...controllerField}
                        optionsSource={field.options}
                        allowCustom={true}
                        placeholder={`Type ${field.label.toLowerCase()}...`}
                        disabled={isSubmitting}
                      />
                    )}
                  />
                </div>
              );
            }
            
            // If multiline is enabled, use textarea
            if (field.multiline) {
              return (
                <div key={field.key}>
                  <FormLabel htmlFor={fieldPath}>
                    {field.label}
                  </FormLabel>
                  <FormTextarea
                    {...register(fieldPath)}
                    defaultValue={fieldValue || ''}
                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                    disabled={isSubmitting}
                    rows={4}
                  />
                </div>
              );
            }
            
            return (
              <div key={field.key}>
                <FormLabel htmlFor={fieldPath}>
                  {field.label}
                </FormLabel>
                <FormInput
                  {...register(fieldPath)}
                  defaultValue={fieldValue || ''}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                  disabled={isSubmitting}
                />
              </div>
            );
          }
        })}
      </div>
    </FormSection>
  );
}

// Component for array-type fields
function ArrayFieldInput({
  field,
  fieldPath,
  control,
  register,
  defaultValue,
  isSubmitting,
}: {
  field: { key: string; label: string; type: 'text' | 'array' | 'number' };
  fieldPath: string;
  control: any;
  register: any;
  defaultValue: string[];
  isSubmitting: boolean;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: fieldPath,
  });
  
  // Initialize array fields if they're empty but we have default values
  // This handles the case where the form loads with existing data
  useEffect(() => {
    if (fields.length === 0 && defaultValue && defaultValue.length > 0) {
      defaultValue.forEach((val) => {
        if (val !== null && val !== undefined && val !== '') {
          append(val);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount
  
  return (
    <div>
      <FormLabel htmlFor={fieldPath}>
        {field.label}
      </FormLabel>
      <div className="space-y-2">
        {fields.map((item, index) => (
          <div key={item.id} className="flex flex-col sm:flex-row gap-2">
            <FormInput
              {...register(`${fieldPath}.${index}`)}
              placeholder={`${field.label} item`}
              disabled={isSubmitting}
              className="flex-1"
            />
            <FormButton
              type="button"
              variant="secondary"
              onClick={() => remove(index)}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Remove
            </FormButton>
          </div>
        ))}
        <FormButton
          type="button"
          variant="secondary"
          onClick={() => append('')}
          disabled={isSubmitting}
        >
          Add {field.label}
        </FormButton>
      </div>
    </div>
  );
}

// Name Autocomplete component for first_name and last_name fields
function NameAutocompleteInput({
  fieldName,
  setValue,
  watch,
  isSubmitting,
  currentOCId,
}: {
  fieldName: 'first_name' | 'last_name';
  setValue: UseFormSetValue<OCFormData>;
  watch: UseFormWatch<OCFormData>;
  isSubmitting: boolean;
  currentOCId?: string;
}) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string; icon_url?: string | null }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLUListElement>(null);
  const fieldValue = watch(fieldName);

  // Calculate dropdown position (above or below)
  const showAbove = useDropdownPosition({
    inputRef,
    isVisible: showSuggestions,
    dropdownHeight: 240,
    dependencies: [suggestions.length],
  });

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && suggestionsRef.current) {
      const highlightedElement = suggestionsRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  // Sync input value with form value
  useEffect(() => {
    if (fieldValue !== inputValue) {
      setInputValue(fieldValue || '');
    }
  }, [fieldValue]);

  // Fetch OCs from database when input changes
  useEffect(() => {
    const fetchOCs = async () => {
      if (!inputValue.trim() || inputValue.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const supabase = createClient();
        let query = supabase
          .from('ocs')
          .select('id, name, icon_url')
          .ilike('name', `%${inputValue}%`)
          .order('name', { ascending: true })
          .limit(15);
        
        // Only exclude current OC if we have a valid ID
        if (currentOCId) {
          query = query.neq('id', currentOCId);
        }
        
        const { data, error } = await query;

        if (error) {
          logger.error('OCForm', 'Error fetching OCs', error);
          setSuggestions([]);
        } else {
          setSuggestions(data || []);
        }
      } catch (err) {
        logger.error('OCForm', 'Error fetching OCs', err);
        setSuggestions([]);
      }
    };

    const debounceTimer = setTimeout(fetchOCs, 300);
    return () => clearTimeout(debounceTimer);
  }, [inputValue, currentOCId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setShowSuggestions(true);
    setHighlightedIndex(-1);
    setValue(fieldName, newValue);
  };

  const handleSelectOC = (oc: { id: string; name: string; icon_url?: string | null }) => {
    // Parse name into first_name and last_name
    const nameParts = oc.name.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    // Set the appropriate field based on which input this is
    if (fieldName === 'first_name') {
      setValue('first_name', firstName);
      // If single name, leave last_name empty; otherwise set it
      if (lastName) {
        setValue('last_name', lastName);
      } else {
        // Single name character - ensure last_name is empty
        setValue('last_name', '');
      }
    } else {
      // If selecting from last_name field, only set last_name
      // (first_name should already be set or user will set it)
      setValue('last_name', lastName || firstName);
    }

    // Populate icon_url only if available and not empty
    if (oc.icon_url && oc.icon_url.trim()) {
      setValue('icon_url', oc.icon_url.trim());
    }

    setInputValue(fieldName === 'first_name' ? firstName : (lastName || firstName));
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => prev < suggestions.length - 1 ? prev + 1 : prev);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelectOC(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={() => {
          if (inputValue.length >= 2) {
            setShowSuggestions(true);
          }
        }}
        disabled={isSubmitting}
        placeholder={fieldName === 'first_name' ? 'Type first name...' : 'Type last name...'}
        className="w-full px-4 py-2.5 bg-gray-900/60 border border-gray-500/60 rounded-lg text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/70 focus:border-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        autoComplete="off"
      />
      {showSuggestions && suggestions.length > 0 && (
        <ul
          ref={suggestionsRef}
          className={`absolute z-[99999] w-full max-h-60 overflow-auto bg-gray-800 border border-gray-600 rounded-lg shadow-lg ${
            showAbove ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {suggestions.map((oc, idx) => (
            <li
              key={oc.id}
              onClick={() => handleSelectOC(oc)}
              onMouseEnter={() => setHighlightedIndex(idx)}
              className={`px-4 py-2 cursor-pointer transition-colors ${
                idx === highlightedIndex
                  ? 'bg-purple-600/50 text-white'
                  : 'text-gray-200 hover:bg-gray-700'
              }`}
            >
              {oc.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// OC Autocomplete component for relationship entries
function OCAutocompleteInput({
  fieldPath,
  index,
  control,
  setValue,
  watch,
  isSubmitting,
  currentOCId,
  reverseRelationships,
}: {
  fieldPath: string;
  index: number;
  control: Control<OCFormData>;
  setValue: UseFormSetValue<OCFormData>;
  watch: UseFormWatch<OCFormData>;
  isSubmitting: boolean;
  currentOCId?: string;
  reverseRelationships?: ReverseRelationships;
}) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string; slug: string; isLinked?: boolean }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLUListElement>(null);
  const nameValue = watch(`${fieldPath}.${index}.name` as any);
  const ocIdValue = watch(`${fieldPath}.${index}.oc_id` as any);

  // Get all characters that already link to the current character
  const getLinkedCharacterIds = useCallback(() => {
    if (!reverseRelationships || !currentOCId) return new Set<string>();
    const linkedIds = new Set<string>();
    const allRelationships = [
      ...reverseRelationships.family,
      ...reverseRelationships.friends_allies,
      ...reverseRelationships.rivals_enemies,
      ...reverseRelationships.romantic,
      ...reverseRelationships.other_relationships,
    ];
    allRelationships.forEach(rel => {
      if (rel.oc_id) {
        linkedIds.add(rel.oc_id);
      }
    });
    return linkedIds;
  }, [reverseRelationships, currentOCId]);

  // Calculate dropdown position (above or below)
  const showAbove = useDropdownPosition({
    inputRef,
    isVisible: showSuggestions,
    dropdownHeight: 240,
    dependencies: [suggestions.length],
  });

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && suggestionsRef.current) {
      const highlightedElement = suggestionsRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  // Sync input value with form value
  useEffect(() => {
    if (nameValue !== inputValue) {
      setInputValue(nameValue || '');
    }
  }, [nameValue]);

  // Fetch OCs from database when input changes
  useEffect(() => {
    const fetchOCs = async () => {
      if (!inputValue.trim() || inputValue.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const supabase = createClient();
        let query = supabase
          .from('ocs')
          .select('id, name, slug')
          .ilike('name', `%${inputValue}%`)
          .order('name', { ascending: true })
          .limit(15);
        
        // Only exclude current OC if we have a valid ID
        if (currentOCId) {
          query = query.neq('id', currentOCId);
        }
        
        const { data, error } = await query;

        if (error) {
          logger.error('OCForm', 'Error fetching OCs', error);
          setSuggestions([]);
        } else {
          const linkedIds = getLinkedCharacterIds();
          // Mark linked characters and sort: linked ones first
          const suggestionsWithLinked = (data || []).map(oc => ({
            ...oc,
            isLinked: linkedIds.has(oc.id),
          }));
          
          // Sort: linked characters first, then by name
          suggestionsWithLinked.sort((a, b) => {
            if (a.isLinked && !b.isLinked) return -1;
            if (!a.isLinked && b.isLinked) return 1;
            return a.name.localeCompare(b.name);
          });

          setSuggestions(suggestionsWithLinked);
        }
      } catch (err) {
        logger.error('OCForm', 'Error fetching OCs', err);
        setSuggestions([]);
      }
    };

    const debounceTimer = setTimeout(fetchOCs, 300);
    return () => clearTimeout(debounceTimer);
  }, [inputValue, currentOCId, getLinkedCharacterIds]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setShowSuggestions(true);
    setHighlightedIndex(-1);
    setValue(`${fieldPath}.${index}.name` as any, newValue);
    // Clear OC link if name is manually changed
    if (ocIdValue) {
      setValue(`${fieldPath}.${index}.oc_id` as any, '');
      setValue(`${fieldPath}.${index}.oc_slug` as any, '');
    }
  };

  const handleSelectOC = (oc: { id: string; name: string; slug: string }) => {
    setInputValue(oc.name);
    setShowSuggestions(false);
    setValue(`${fieldPath}.${index}.name` as any, oc.name);
    setValue(`${fieldPath}.${index}.oc_id` as any, oc.id);
    setValue(`${fieldPath}.${index}.oc_slug` as any, oc.slug);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => prev < suggestions.length - 1 ? prev + 1 : prev);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelectOC(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={() => setShowSuggestions(true)}
        disabled={isSubmitting}
        placeholder="Type to search existing OCs..."
        className="w-full px-4 py-2.5 bg-gray-900/60 border border-gray-500/60 rounded-lg text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/70 focus:border-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        autoComplete="off"
      />
      {ocIdValue && (
        <p className="mt-1 text-xs text-green-400">
          <i className="fas fa-link mr-1"></i>
          Linked to existing OC
        </p>
      )}
      {showSuggestions && suggestions.length > 0 && (
        <ul
          ref={suggestionsRef}
          className={`absolute z-[99999] w-full max-h-60 overflow-auto bg-gray-800 border border-gray-600 rounded-lg shadow-lg ${
            showAbove ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {suggestions.map((oc, idx) => (
            <li
              key={oc.id}
              onClick={() => handleSelectOC(oc)}
              onMouseEnter={() => setHighlightedIndex(idx)}
              className={`px-4 py-2 cursor-pointer transition-colors flex items-center justify-between ${
                idx === highlightedIndex
                  ? 'bg-purple-600/50 text-white'
                  : 'text-gray-200 hover:bg-gray-700'
              }`}
            >
              <span>{oc.name}</span>
              {oc.isLinked && (
                <span className="ml-2 text-xs text-green-400 flex items-center gap-1">
                  <i className="fas fa-link"></i>
                  <span>Linked</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Component for relationship entries (name, relationship, description)
function RelationshipEntryInput({
  fieldPath,
  control,
  register,
  setValue,
  watch,
  defaultValue,
  isSubmitting,
  label,
  enableOCAutocomplete = false,
  currentOCId,
  reverseRelationships,
}: {
  fieldPath: string;
  control: any;
  register: any;
  setValue: any;
  watch: any;
  defaultValue: Array<{ name: string; relationship?: string; description?: string; oc_id?: string; oc_slug?: string; relationship_type?: RelationshipType; image_url?: string }>;
  isSubmitting: boolean;
  label: string;
  enableOCAutocomplete?: boolean;
  currentOCId?: string;
  reverseRelationships?: ReverseRelationships;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: fieldPath,
  });
  
  // Initialize fields from default values
  // This runs when the component mounts and when defaultValue changes
  useEffect(() => {
    if (!defaultValue || defaultValue.length === 0) {
      logger.debug('OCForm', `RelationshipEntryInput [${fieldPath}]: No default values to initialize`);
      return;
    }
    
    // Get current values from the form to avoid duplicates
    const currentValues = fields.map((field: any, idx: number) => {
      const name = watch(`${fieldPath}.${idx}.name` as any);
      const ocId = watch(`${fieldPath}.${idx}.oc_id` as any);
      return { name, ocId };
    }).filter(v => v.name);
    
    const existingNames = new Set(currentValues.map(v => v.name?.toLowerCase().trim()).filter(Boolean));
    const existingIds = new Set(currentValues.map(v => v.ocId).filter(Boolean));
    
    logger.debug('OCForm', `RelationshipEntryInput [${fieldPath}]: Initializing with ${defaultValue.length} items. Current fields: ${fields.length}`);
    
    // Add any default values that aren't already in the form
    let addedCount = 0;
    defaultValue.forEach((val) => {
      if (!val || !val.name) return;
      
      const valNameLower = val.name.toLowerCase().trim();
      const alreadyExists = 
        (val.oc_id && existingIds.has(val.oc_id)) ||
        (!val.oc_id && existingNames.has(valNameLower));
      
      if (!alreadyExists) {
        append({ 
          name: val.name || '', 
          relationship: val.relationship || '', 
          description: val.description || '',
          oc_id: val.oc_id || '',
          oc_slug: val.oc_slug || '',
          image_url: val.image_url || '',
        });
        addedCount++;
        logger.debug('OCForm', `RelationshipEntryInput [${fieldPath}]: Added ${val.name} ${val.oc_id ? `(linked: ${val.oc_id})` : '(unlinked)'}`);
      }
    });
    
    if (addedCount > 0) {
      logger.debug('OCForm', `RelationshipEntryInput [${fieldPath}]: Added ${addedCount} new relationship(s)`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValue]); // Re-run when defaultValue changes
  
  return (
    <div>
      <FormLabel htmlFor={fieldPath}>
        {label}
      </FormLabel>
      <div className="space-y-4">
        {fields.map((item, index) => (
          <div key={item.id} className="p-3 sm:p-4 border border-gray-600/60 rounded-lg bg-gray-800/30 space-y-3">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-2">
              <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <FormLabel htmlFor={`${fieldPath}.${index}.name`} required>
                    Name {enableOCAutocomplete && <span className="text-xs text-gray-400">(search existing OCs)</span>}
                  </FormLabel>
                  {enableOCAutocomplete ? (
                    <>
                      <OCAutocompleteInput
                        fieldPath={fieldPath}
                        index={index}
                        control={control}
                        setValue={setValue}
                        watch={watch}
                        isSubmitting={isSubmitting}
                        currentOCId={currentOCId}
                        reverseRelationships={reverseRelationships}
                      />
                      {/* Hidden fields for OC link */}
                      <input type="hidden" {...register(`${fieldPath}.${index}.oc_id`)} />
                      <input type="hidden" {...register(`${fieldPath}.${index}.oc_slug`)} />
                    </>
                  ) : (
                    <FormInput
                      {...register(`${fieldPath}.${index}.name`)}
                      placeholder="Person's name"
                      disabled={isSubmitting}
                    />
                  )}
                </div>
                <div>
                  <FormLabel htmlFor={`${fieldPath}.${index}.relationship_type`}>
                    Relationship Type
                  </FormLabel>
                  <Controller
                    name={`${fieldPath}.${index}.relationship_type`}
                    control={control}
                    render={({ field }) => (
                      <div className="relative">
                        <select
                          {...field}
                          value={field.value || ''}
                          disabled={isSubmitting}
                          className="w-full px-4 py-2.5 bg-gray-900/60 border border-gray-500/60 rounded-lg text-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500/70 focus:border-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed appearance-none pr-10"
                        >
                          <option value="">Select type...</option>
                          {RELATIONSHIP_TYPES.map((type) => (
                            <option key={type.value} value={type.value} className="bg-gray-800">
                              {type.label}
                            </option>
                          ))}
                        </select>
                        {field.value && (() => {
                          const config = RELATIONSHIP_TYPES.find(t => t.value === field.value);
                          return config ? (
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              <i className={`${config.icon}`} style={{ color: config.color }}></i>
                            </div>
                          ) : null;
                        })()}
                        {!field.value && (
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg
                              className="w-5 h-5 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    )}
                  />
                </div>
                <div>
                  <FormLabel htmlFor={`${fieldPath}.${index}.relationship`}>
                    Relationship
                  </FormLabel>
                  <FormInput
                    {...register(`${fieldPath}.${index}.relationship`)}
                    placeholder="e.g., Brother, Friend, Rival"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <FormButton
                type="button"
                variant="secondary"
                onClick={() => remove(index)}
                disabled={isSubmitting}
                className="mt-0 sm:mt-6 w-full sm:w-auto"
              >
                <i className="fas fa-trash"></i>
              </FormButton>
            </div>
            <div>
              <FormLabel htmlFor={`${fieldPath}.${index}.description`}>
                Description
              </FormLabel>
              <FormTextarea
                {...register(`${fieldPath}.${index}.description`)}
                rows={2}
                placeholder="Additional details about this relationship"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <FormLabel htmlFor={`${fieldPath}.${index}.image_url`}>
                Image URL
              </FormLabel>
              <FormInput
                {...register(`${fieldPath}.${index}.image_url`)}
                placeholder="https://example.com/image.jpg"
                disabled={isSubmitting}
              />
              {watch(`${fieldPath}.${index}.image_url` as any) && (
                <ImagePreview 
                  url={watch(`${fieldPath}.${index}.image_url` as any)} 
                  maxHeight="150px"
                  className="mt-2"
                />
              )}
            </div>
          </div>
        ))}
        <FormButton
          type="button"
          variant="secondary"
          onClick={() => append({ name: '', relationship: '', description: '', oc_id: '', oc_slug: '', relationship_type: undefined, image_url: '' })}
          disabled={isSubmitting}
        >
          <i className="fas fa-plus mr-2"></i>
          Add {label} Entry
        </FormButton>
      </div>
    </div>
  );
}

// Helper to parse relationship data (handles both old string format and new array format)
function parseRelationshipData(value: string | null | undefined): Array<{ name: string; relationship?: string; description?: string; oc_id?: string; oc_slug?: string; relationship_type?: RelationshipType; image_url?: string }> {
  if (!value) return [];
  
  // Try to parse as JSON array first (new format)
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter(item => item && item.name).map(item => ({
        name: item.name || '',
        relationship: item.relationship || undefined,
        description: item.description || undefined,
        oc_id: item.oc_id?.trim() || undefined, // Don't use empty strings
        oc_slug: item.oc_slug?.trim() || undefined,
        relationship_type: item.relationship_type || undefined,
        image_url: item.image_url?.trim() || undefined,
      }));
    }
  } catch {
    // Not JSON, continue to check if it's a string
  }
  
  // If it's a string (old format), return empty array (user will need to re-enter)
  // Or we could try to parse it, but for now we'll just return empty
  return [];
}

const ocSchema = z.object({
  // System fields
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  world_id: optionalUuid,
  series_type: z.enum(['canon', 'original']).optional(),
  template_type: z.enum([
    'naruto',
    'ff7',
    'inuyasha',
    'shaman-king',
    'zelda',
    'dragonball',
    'pokemon',
    'nier',
    'original',
    'none',
  ]),
  status: z.enum(['alive', 'deceased', 'missing', 'unknown', 'au-only']),
  is_public: z.boolean(),
  extra_fields: z.record(z.any()).default({}),
  modular_fields: z.record(z.any()).optional(),
  story_alias_id: optionalUuid,
  
  // Overview
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().optional(),
  aliases: z.string().optional(),
  species: z.string().optional(),
  sex: z.string().optional(),
  gender: z.string().optional(),
  pronouns: z.string().optional(),
  age: z.number().int().positive().optional().or(z.literal('')),
  date_of_birth: z.string().optional(),
  occupation: z.string().optional(),
  affiliations: z.string().optional(),
  romantic_orientation: z.string().optional(),
  sexual_orientation: z.string().optional(),
  star_sign: z.string().optional(),
  
  // Identity Background
  ethnicity: z.string().optional(),
  place_of_origin: z.string().optional(),
  current_residence: z.string().optional(),
  languages: z.array(z.string()).optional(),
  
  // Personality Overview
  personality_summary: z.string().optional(),
  alignment: z.string().optional(),
  
  // Personality Metrics (1-10)
  sociability: z.number().int().min(1).max(10).optional().or(z.literal('')),
  communication_style: z.number().int().min(1).max(10).optional().or(z.literal('')),
  judgment: z.number().int().min(1).max(10).optional().or(z.literal('')),
  emotional_resilience: z.number().int().min(1).max(10).optional().or(z.literal('')),
  courage: z.number().int().min(1).max(10).optional().or(z.literal('')),
  risk_behavior: z.number().int().min(1).max(10).optional().or(z.literal('')),
  honesty: z.number().int().min(1).max(10).optional().or(z.literal('')),
  discipline: z.number().int().min(1).max(10).optional().or(z.literal('')),
  temperament: z.number().int().min(1).max(10).optional().or(z.literal('')),
  humor: z.number().int().min(1).max(10).optional().or(z.literal('')),
  
  // Personality Traits
  positive_traits: z.string().optional(),
  neutral_traits: z.string().optional(),
  negative_traits: z.string().optional(),
  
  // Abilities
  abilities: z.string().optional(),
  skills: z.string().optional(),
  aptitudes: z.string().optional(),
  strengths: z.string().optional(),
  limits: z.string().optional(),
  conditions: z.string().optional(),
  
  // Appearance
  standard_look: z.string().optional(),
  alternate_looks: z.string().optional(),
  accessories: z.string().optional(),
  visual_motifs: z.string().optional(),
  appearance_changes: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  build: z.string().optional(),
  eye_color: z.string().optional(),
  hair_color: z.string().optional(),
  skin_tone: z.string().optional(),
  features: z.string().optional(),
  appearance_summary: z.string().optional(),
  
  // Relationships - structured entries
  family: z.preprocess(
    (val) => {
      if (!Array.isArray(val)) return val;
      return val
        .filter((item: any) => item?.name?.trim())
        .map((item: any) => ({
          ...item,
          oc_id: item.oc_id?.trim() || undefined, // Convert empty strings to undefined
          oc_slug: item.oc_slug?.trim() || undefined,
          relationship_type: item.relationship_type || undefined,
          image_url: item.image_url?.trim() || undefined,
        }));
    },
    z.array(z.object({
      name: z.string().min(1, 'Name is required'),
      relationship: z.string().optional(),
      description: z.string().optional(),
      oc_id: z.string().uuid().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
      oc_slug: z.string().optional(),
      relationship_type: z.enum(['lovers', 'crush', 'close_friend', 'friend', 'acquaintance', 'dislike', 'hate', 'neutral', 'family', 'rival', 'admire', 'other']).optional(),
      image_url: optionalUrl,
    })).optional()
  ),
  friends_allies: z.preprocess(
    (val) => {
      if (!Array.isArray(val)) return val;
      return val
        .filter((item: any) => item?.name?.trim())
        .map((item: any) => ({
          ...item,
          oc_id: item.oc_id?.trim() || undefined,
          oc_slug: item.oc_slug?.trim() || undefined,
          relationship_type: item.relationship_type || undefined,
          image_url: item.image_url?.trim() || undefined,
        }));
    },
    z.array(z.object({
      name: z.string().min(1, 'Name is required'),
      relationship: z.string().optional(),
      description: z.string().optional(),
      oc_id: z.string().uuid().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
      oc_slug: z.string().optional(),
      relationship_type: z.enum(['lovers', 'crush', 'close_friend', 'friend', 'acquaintance', 'dislike', 'hate', 'neutral', 'family', 'rival', 'admire', 'other']).optional(),
      image_url: optionalUrl,
    })).optional()
  ),
  rivals_enemies: z.preprocess(
    (val) => {
      if (!Array.isArray(val)) return val;
      return val
        .filter((item: any) => item?.name?.trim())
        .map((item: any) => ({
          ...item,
          oc_id: item.oc_id?.trim() || undefined,
          oc_slug: item.oc_slug?.trim() || undefined,
          relationship_type: item.relationship_type || undefined,
          image_url: item.image_url?.trim() || undefined,
        }));
    },
    z.array(z.object({
      name: z.string().min(1, 'Name is required'),
      relationship: z.string().optional(),
      description: z.string().optional(),
      oc_id: z.string().uuid().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
      oc_slug: z.string().optional(),
      relationship_type: z.enum(['lovers', 'crush', 'close_friend', 'friend', 'acquaintance', 'dislike', 'hate', 'neutral', 'family', 'rival', 'admire', 'other']).optional(),
      image_url: optionalUrl,
    })).optional()
  ),
  romantic: z.preprocess(
    (val) => {
      if (!Array.isArray(val)) return val;
      return val
        .filter((item: any) => item?.name?.trim())
        .map((item: any) => ({
          ...item,
          oc_id: item.oc_id?.trim() || undefined,
          oc_slug: item.oc_slug?.trim() || undefined,
          relationship_type: item.relationship_type || undefined,
          image_url: item.image_url?.trim() || undefined,
        }));
    },
    z.array(z.object({
      name: z.string().min(1, 'Name is required'),
      relationship: z.string().optional(),
      description: z.string().optional(),
      oc_id: z.string().uuid().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
      oc_slug: z.string().optional(),
      relationship_type: z.enum(['lovers', 'crush', 'close_friend', 'friend', 'acquaintance', 'dislike', 'hate', 'neutral', 'family', 'rival', 'admire', 'other']).optional(),
      image_url: optionalUrl,
    })).optional()
  ),
  other_relationships: z.preprocess(
    (val) => {
      if (!Array.isArray(val)) return val;
      return val
        .filter((item: any) => item?.name?.trim())
        .map((item: any) => ({
          ...item,
          oc_id: item.oc_id?.trim() || undefined,
          oc_slug: item.oc_slug?.trim() || undefined,
          relationship_type: item.relationship_type || undefined,
          image_url: item.image_url?.trim() || undefined,
        }));
    },
    z.array(z.object({
      name: z.string().min(1, 'Name is required'),
      relationship: z.string().optional(),
      description: z.string().optional(),
      oc_id: z.string().uuid().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
      oc_slug: z.string().optional(),
      relationship_type: z.enum(['lovers', 'crush', 'close_friend', 'friend', 'acquaintance', 'dislike', 'hate', 'neutral', 'family', 'rival', 'admire', 'other']).optional(),
      image_url: optionalUrl,
    })).optional()
  ),
  
  // History
  origin: z.string().optional(),
  formative_years: z.string().optional(),
  major_life_events: z.string().optional(),
  history_summary: z.string().optional(),
  
  // Preferences & Habits
  likes: z.string().optional(),
  dislikes: z.string().optional(),
  
  // Media
  gallery: z.array(z.string()).optional(),
  image_url: optionalUrl,
  icon_url: optionalUrl,
  seiyuu: z.string().optional(),
  voice_actor: z.string().optional(),
  theme_song: z.string().optional(),
  pinterest_board: z.string().optional(),
  inspirations: z.string().optional(),
  design_notes: z.string().optional(),
  name_meaning_etymology: z.string().optional(),
  creator_notes: z.string().optional(),
  
  // Trivia
  trivia: z.string().optional(),
  
  // Development
  development_status: z.string().optional(),
  
  // D&D-like Stats
  stat_strength: z.preprocess(
    (val) => (val === '' || val === null || (typeof val === 'number' && isNaN(val)) ? undefined : val),
    z.number().int().min(1).max(30).optional()
  ),
  stat_dexterity: z.preprocess(
    (val) => (val === '' || val === null || (typeof val === 'number' && isNaN(val)) ? undefined : val),
    z.number().int().min(1).max(30).optional()
  ),
  stat_constitution: z.preprocess(
    (val) => (val === '' || val === null || (typeof val === 'number' && isNaN(val)) ? undefined : val),
    z.number().int().min(1).max(30).optional()
  ),
  stat_intelligence: z.preprocess(
    (val) => (val === '' || val === null || (typeof val === 'number' && isNaN(val)) ? undefined : val),
    z.number().int().min(1).max(30).optional()
  ),
  stat_wisdom: z.preprocess(
    (val) => (val === '' || val === null || (typeof val === 'number' && isNaN(val)) ? undefined : val),
    z.number().int().min(1).max(30).optional()
  ),
  stat_charisma: z.preprocess(
    (val) => (val === '' || val === null || (typeof val === 'number' && isNaN(val)) ? undefined : val),
    z.number().int().min(1).max(30).optional()
  ),
  stat_hit_points_current: z.preprocess(
    (val) => (val === '' || val === null || (typeof val === 'number' && isNaN(val)) ? undefined : val),
    z.number().int().min(0).optional()
  ),
  stat_hit_points_max: z.preprocess(
    (val) => (val === '' || val === null || (typeof val === 'number' && isNaN(val)) ? undefined : val),
    z.number().int().min(1).optional()
  ),
  stat_armor_class: z.preprocess(
    (val) => (val === '' || val === null || (typeof val === 'number' && isNaN(val)) ? undefined : val),
    z.number().int().min(0).optional()
  ),
  stat_speed: z.preprocess(
    (val) => (val === '' || val === null || (typeof val === 'number' && isNaN(val)) ? undefined : val),
    z.number().int().min(0).optional()
  ),
  stat_level: z.preprocess(
    (val) => (val === '' || val === null || (typeof val === 'number' && isNaN(val)) ? undefined : val),
    z.number().int().min(1).max(20).optional()
  ),
  stat_class: z.string().optional().nullable(),
  stat_subclass: z.string().optional().nullable(),
  stat_initiative: z.preprocess(
    (val) => (val === '' || val === null || (typeof val === 'number' && isNaN(val)) ? undefined : val),
    z.number().int().optional()
  ),
  stat_notes: z.string().optional().nullable(),
});

type OCFormData = z.infer<typeof ocSchema>;

interface ReverseRelationships {
  family: Array<{ name: string; relationship?: string; description?: string; oc_id?: string; oc_slug?: string; relationship_type?: RelationshipType; image_url?: string }>;
  friends_allies: Array<{ name: string; relationship?: string; description?: string; oc_id?: string; oc_slug?: string; relationship_type?: RelationshipType; image_url?: string }>;
  rivals_enemies: Array<{ name: string; relationship?: string; description?: string; oc_id?: string; oc_slug?: string; relationship_type?: RelationshipType; image_url?: string }>;
  romantic: Array<{ name: string; relationship?: string; description?: string; oc_id?: string; oc_slug?: string; relationship_type?: RelationshipType; image_url?: string }>;
  other_relationships: Array<{ name: string; relationship?: string; description?: string; oc_id?: string; oc_slug?: string; relationship_type?: RelationshipType; image_url?: string }>;
}

interface OCFormProps {
  oc?: OC;
  identityId?: string; // For linking new version to existing identity
  reverseRelationships?: ReverseRelationships; // Relationships where other OCs have this OC
}

// Helper function to merge relationships, avoiding duplicates and preserving existing data
function mergeRelationships(
  existing: Array<{ name: string; relationship?: string; description?: string; oc_id?: string; oc_slug?: string; relationship_type?: RelationshipType; image_url?: string }>,
  reverse: Array<{ name: string; relationship?: string; description?: string; oc_id?: string; oc_slug?: string; relationship_type?: RelationshipType; image_url?: string }>
): Array<{ name: string; relationship?: string; description?: string; oc_id?: string; oc_slug?: string; relationship_type?: RelationshipType; image_url?: string }> {
  const merged = [...existing];

  // Process reverse relationships
  for (const reverseRel of reverse) {
    // Find matching existing relationship
    // Priority: oc_id > oc_slug > name (case-insensitive)
    const existingIndex = merged.findIndex(existingRel => {
      // First check: exact oc_id match (most reliable)
      if (reverseRel.oc_id && existingRel.oc_id && reverseRel.oc_id === existingRel.oc_id) {
        return true;
      }
      // Second check: exact oc_slug match
      if (reverseRel.oc_slug && existingRel.oc_slug && reverseRel.oc_slug === existingRel.oc_slug) {
        return true;
      }
      // Third check: name match (only if both have names and neither has oc_id/oc_slug to avoid false matches)
      if (reverseRel.name && existingRel.name) {
        const reverseName = reverseRel.name.toLowerCase().trim();
        const existingName = existingRel.name.toLowerCase().trim();
        // Only match by name if names are identical AND neither has a reliable identifier
        // (to avoid matching different people with the same name)
        if (reverseName === existingName) {
          // If either has an oc_id or oc_slug, don't match by name alone (they're different people)
          const reverseHasId = !!(reverseRel.oc_id || reverseRel.oc_slug);
          const existingHasId = !!(existingRel.oc_id || existingRel.oc_slug);
          // Only match by name if both lack identifiers, or if they have matching identifiers
          return !reverseHasId && !existingHasId;
        }
      }
      return false;
    });

    if (existingIndex >= 0) {
      // Merge: preserve existing values for relationship, description, and relationship_type
      // Only update if the existing value is empty/undefined and reverse has a value
      const existingRel = merged[existingIndex];
      merged[existingIndex] = {
        ...existingRel,
        // Preserve existing values - only fill in if missing
        relationship: existingRel.relationship || reverseRel.relationship,
        description: existingRel.description || reverseRel.description,
        relationship_type: existingRel.relationship_type || reverseRel.relationship_type,
        // Update oc_id/oc_slug if missing in existing
        oc_id: existingRel.oc_id || reverseRel.oc_id,
        oc_slug: existingRel.oc_slug || reverseRel.oc_slug,
        // Update image_url if missing in existing
        image_url: existingRel.image_url || reverseRel.image_url,
      };
    } else {
      // No existing match, add the reverse relationship
      merged.push(reverseRel);
    }
  }

  // Final deduplication pass to ensure no duplicates remain
  // Use a Map to track seen relationships by their unique identifiers
  const seen = new Map<string, number>();
  const deduplicated: typeof merged = [];
  
  for (let i = 0; i < merged.length; i++) {
    const rel = merged[i];
    // Create a unique key - prioritize oc_id, then oc_slug, then name
    const key = rel.oc_id || rel.oc_slug || rel.name?.toLowerCase().trim() || `unnamed-${i}`;
    
    if (seen.has(key)) {
      // Duplicate found - merge with the existing one, preserving data
      const existingIndex = seen.get(key)!;
      const existingRel = deduplicated[existingIndex];
      deduplicated[existingIndex] = {
        ...existingRel,
        // Preserve existing values, only fill in if missing
        relationship: existingRel.relationship || rel.relationship,
        description: existingRel.description || rel.description,
        relationship_type: existingRel.relationship_type || rel.relationship_type,
        oc_id: existingRel.oc_id || rel.oc_id,
        oc_slug: existingRel.oc_slug || rel.oc_slug,
        image_url: existingRel.image_url || rel.image_url,
      };
    } else {
      // New relationship, add it
      seen.set(key, deduplicated.length);
      deduplicated.push(rel);
    }
  }

  return deduplicated;
}

// Helper function to get default values from OC
function getDefaultValues(oc?: OC, reverseRelationships?: ReverseRelationships): OCFormData {
  if (!oc) {
    return {
      name: '',
      slug: '',
      world_id: '',
      series_type: undefined,
      template_type: 'none',
      status: 'alive',
      is_public: true,
      extra_fields: {},
      modular_fields: {},
      story_alias_id: null,
      // Overview
      first_name: '',
      last_name: '',
      aliases: '',
      species: '',
      sex: '',
      gender: '',
      pronouns: '',
      age: '',
      date_of_birth: '',
      occupation: '',
      affiliations: '',
      romantic_orientation: '',
      sexual_orientation: '',
      star_sign: '',
      // Identity Background
      ethnicity: '',
      place_of_origin: '',
      current_residence: '',
      languages: [],
      // Personality Overview
      personality_summary: '',
      alignment: '',
      // Personality Metrics
      sociability: '',
      communication_style: '',
      judgment: '',
      emotional_resilience: '',
      courage: '',
      risk_behavior: '',
      honesty: '',
      discipline: '',
      temperament: '',
      humor: '',
      // Personality Traits
      positive_traits: '',
      neutral_traits: '',
      negative_traits: '',
      // Abilities
      abilities: '',
      skills: '',
      aptitudes: '',
      strengths: '',
      limits: '',
      conditions: '',
      // Appearance
      standard_look: '',
      alternate_looks: '',
      accessories: '',
      visual_motifs: '',
      appearance_changes: '',
      height: '',
      weight: '',
      build: '',
      eye_color: '',
      hair_color: '',
      skin_tone: '',
      features: '',
      appearance_summary: '',
      // Relationships
      family: [],
      friends_allies: [],
      rivals_enemies: [],
      romantic: [],
      other_relationships: [],
      // History
      origin: '',
      formative_years: '',
      major_life_events: '',
      history_summary: '',
      // Preferences & Habits
      likes: '',
      dislikes: '',
      // Media
      gallery: [],
      image_url: '',
      icon_url: '',
      seiyuu: '',
      voice_actor: '',
      theme_song: '',
      pinterest_board: '',
      inspirations: '',
      design_notes: '',
      name_meaning_etymology: '',
      creator_notes: '',
      // Trivia
      trivia: '',
      // Development
      development_status: '',
      // D&D-like Stats
      stat_strength: undefined,
      stat_dexterity: undefined,
      stat_constitution: undefined,
      stat_intelligence: undefined,
      stat_wisdom: undefined,
      stat_charisma: undefined,
      stat_hit_points_current: undefined,
      stat_hit_points_max: undefined,
      stat_armor_class: undefined,
      stat_speed: undefined,
      stat_level: undefined,
      stat_class: '',
      stat_subclass: '',
      stat_initiative: undefined,
      stat_notes: '',
    };
  }

  // If editing and first_name/last_name exist, use them; otherwise try to parse from name
  let firstName = oc.first_name ?? '';
  let lastName = oc.last_name ?? '';
  
  // If first_name/last_name are empty but name exists, try to split name
  if (!firstName && !lastName && oc.name) {
    const nameParts = oc.name.trim().split(/\s+/);
    if (nameParts.length >= 2) {
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(' ');
    } else {
      firstName = oc.name;
      lastName = '';
    }
  }

  // Determine template_type from world if available, otherwise use stored value
  let templateType = oc.template_type;
  if (oc.world && typeof oc.world === 'object' && 'slug' in oc.world) {
    templateType = getTemplateTypeFromWorldSlug(oc.world.slug as string, oc.world as World) as TemplateType;
  }

  return {
    name: oc.name,
    slug: oc.slug,
    world_id: oc.world_id,
    series_type: oc.series_type ?? undefined,
    template_type: templateType,
    status: oc.status,
    is_public: oc.is_public,
    extra_fields: oc.extra_fields || {},
    modular_fields: oc.modular_fields || {},
    story_alias_id: oc.story_alias_id ?? null,
    // Overview
    first_name: firstName,
    last_name: lastName,
    aliases: oc.aliases ?? '',
    species: oc.species ?? '',
    sex: oc.sex ?? '',
    gender: oc.gender ?? '',
    pronouns: oc.pronouns ?? '',
    age: oc.age || '',
    date_of_birth: oc.date_of_birth ?? '',
    occupation: oc.occupation ?? '',
    affiliations: oc.affiliations ?? '',
    romantic_orientation: oc.romantic_orientation ?? '',
    sexual_orientation: oc.sexual_orientation ?? '',
    star_sign: oc.star_sign ?? '',
    // Identity Background
    ethnicity: oc.ethnicity ?? '',
    place_of_origin: oc.place_of_origin ?? '',
    current_residence: oc.current_residence ?? '',
    languages: oc.languages ?? [],
    // Personality Overview
    personality_summary: oc.personality_summary ?? '',
    alignment: oc.alignment ?? '',
    // Personality Metrics
    sociability: oc.sociability || '',
    communication_style: oc.communication_style || '',
    judgment: oc.judgment || '',
    emotional_resilience: oc.emotional_resilience || '',
    courage: oc.courage || '',
    risk_behavior: oc.risk_behavior || '',
    honesty: oc.honesty || '',
    discipline: oc.discipline || '',
    temperament: oc.temperament || '',
    humor: oc.humor || '',
    // Personality Traits
    positive_traits: oc.positive_traits ?? '',
    neutral_traits: oc.neutral_traits ?? '',
    negative_traits: oc.negative_traits ?? '',
    // Abilities
    abilities: oc.abilities ?? '',
    skills: oc.skills ?? '',
    aptitudes: oc.aptitudes ?? '',
    strengths: oc.strengths ?? '',
    limits: oc.limits ?? '',
    conditions: oc.conditions ?? '',
    // Appearance
    standard_look: oc.standard_look ?? '',
    alternate_looks: oc.alternate_looks ?? '',
    accessories: oc.accessories ?? '',
    visual_motifs: oc.visual_motifs ?? '',
    appearance_changes: oc.appearance_changes ?? '',
    height: oc.height ?? '',
    weight: oc.weight ?? '',
    build: oc.build ?? '',
    eye_color: oc.eye_color ?? '',
    hair_color: oc.hair_color ?? '',
    skin_tone: oc.skin_tone ?? '',
    features: oc.features ?? '',
    appearance_summary: oc.appearance_summary ?? '',
    // Relationships - combine all into one unified section
    // Merge all relationship categories into other_relationships for unified display
    family: [],
    friends_allies: [],
    rivals_enemies: [],
    romantic: [],
    other_relationships: (() => {
      const family = reverseRelationships 
        ? mergeRelationships(parseRelationshipData(oc.family), reverseRelationships.family)
        : parseRelationshipData(oc.family);
      const friends_allies = reverseRelationships
        ? mergeRelationships(parseRelationshipData(oc.friends_allies), reverseRelationships.friends_allies)
        : parseRelationshipData(oc.friends_allies);
      const rivals_enemies = reverseRelationships
        ? mergeRelationships(parseRelationshipData(oc.rivals_enemies), reverseRelationships.rivals_enemies)
        : parseRelationshipData(oc.rivals_enemies);
      const romantic = reverseRelationships
        ? mergeRelationships(parseRelationshipData(oc.romantic), reverseRelationships.romantic)
        : parseRelationshipData(oc.romantic);
      const other_relationships = reverseRelationships
        ? mergeRelationships(parseRelationshipData(oc.other_relationships), reverseRelationships.other_relationships)
        : parseRelationshipData(oc.other_relationships);
      
      // Combine all relationships into one array
      return [...family, ...friends_allies, ...rivals_enemies, ...romantic, ...other_relationships];
    })(),
    // History
    origin: oc.origin ?? '',
    formative_years: oc.formative_years ?? '',
    major_life_events: oc.major_life_events ?? '',
    history_summary: oc.history_summary ?? '',
    // Preferences & Habits
    likes: oc.likes ?? '',
    dislikes: oc.dislikes ?? '',
    // Media
    gallery: oc.gallery ?? [],
    image_url: oc.image_url || '',
    icon_url: oc.icon_url || '',
    seiyuu: oc.seiyuu ?? '',
    voice_actor: oc.voice_actor ?? '',
    theme_song: oc.theme_song ?? '',
    pinterest_board: oc.pinterest_board ?? '',
    inspirations: oc.inspirations ?? '',
    design_notes: oc.design_notes ?? '',
    name_meaning_etymology: oc.name_meaning_etymology ?? '',
    creator_notes: oc.creator_notes ?? '',
    // Trivia
    trivia: oc.trivia ?? '',
    // Development
    development_status: oc.development_status ?? '',
    // D&D-like Stats
    stat_strength: oc.stat_strength ?? undefined,
    stat_dexterity: oc.stat_dexterity ?? undefined,
    stat_constitution: oc.stat_constitution ?? undefined,
    stat_intelligence: oc.stat_intelligence ?? undefined,
    stat_wisdom: oc.stat_wisdom ?? undefined,
    stat_charisma: oc.stat_charisma ?? undefined,
    stat_hit_points_current: oc.stat_hit_points_current ?? undefined,
    stat_hit_points_max: oc.stat_hit_points_max ?? undefined,
    stat_armor_class: oc.stat_armor_class ?? undefined,
    stat_speed: oc.stat_speed ?? undefined,
    stat_level: oc.stat_level ?? undefined,
    stat_class: oc.stat_class ?? '',
    stat_subclass: oc.stat_subclass ?? '',
    stat_initiative: oc.stat_initiative ?? undefined,
    stat_notes: oc.stat_notes ?? '',
  };
}


export function OCForm({ oc, identityId, reverseRelationships }: OCFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const shouldNavigateAfterSaveRef = useRef(false);
  const [worlds, setWorlds] = useState<Array<{ id: string; name: string; slug: string; series_type?: 'canon' | 'original' }>>([]);
  const [selectedWorld, setSelectedWorld] = useState<World | null>(null);
  const [lastSavedWorldId, setLastSavedWorldId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Record<string, TemplateDefinition>>({});
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const defaultValues = getDefaultValues(oc, reverseRelationships);
  
  // Debug: Log default values including relationships
  useEffect(() => {
    if (oc) {
      logger.debug('OCForm', `OC Form Default Values for ${oc.name}`, {
        other_relationships: defaultValues.other_relationships,
        reverseRelationships: reverseRelationships,
      });
    }
  }, [oc?.name, defaultValues.other_relationships, reverseRelationships]);

  const methods = useForm<OCFormData>({
    resolver: zodResolver(ocSchema),
    defaultValues,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
    control,
    reset,
    getValues,
  } = methods;

  const templateType = watch('template_type');
  const nameValue = watch('name');
  const worldId = watch('world_id');
  
  // Template type is managed by world selection
  const firstName = watch('first_name');
  const lastName = watch('last_name');
  const dateOfBirth = watch('date_of_birth');

  // Watch image fields for previews
  const imageUrl = watch('image_url');
  const iconUrl = watch('icon_url');
  const gallery = watch('gallery') || [];

  // Field arrays for languages and gallery
  const {
    fields: languageFields,
    append: appendLanguage,
    remove: removeLanguage,
  } = useFieldArray({
    control,
    // @ts-ignore - react-hook-form type inference issue with optional arrays
    name: 'languages',
  });

  const {
    fields: galleryFields,
    append: appendGallery,
    remove: removeGallery,
  } = useFieldArray({
    control,
    // @ts-ignore - react-hook-form type inference issue with optional arrays
    name: 'gallery',
  });

  // Reset form when OC prop changes
  useEffect(() => {
    if (oc) {
      const defaultValues = getDefaultValues(oc, reverseRelationships);
      reset(defaultValues);
      // Ensure world_id is set if it exists - use a small delay to ensure worlds list is loaded
      if (oc.world_id) {
        // Set immediately
        setValue('world_id', oc.world_id, { shouldDirty: false });
        // Also set after a brief delay to ensure it sticks
        const timeout = setTimeout(() => {
          setValue('world_id', oc.world_id, { shouldDirty: false });
        }, 100);
        return () => clearTimeout(timeout);
      }
    }
  }, [oc?.id, oc?.world_id, reset, setValue, reverseRelationships]);

  // Fetch templates
  useEffect(() => {
    async function loadTemplates() {
      const fetchedTemplates = await getTemplates();
      setTemplates(fetchedTemplates);
    }
    loadTemplates();
  }, []);

  // Handle mounted state for portal (SSR safety)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle scroll to top button visibility
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setShowScrollToTop(true);
      } else {
        setShowScrollToTop(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  // Fetch worlds
  useEffect(() => {
    async function fetchWorlds() {
      const supabase = createClient();
      const { data } = await supabase.from('worlds').select('id, name, slug, series_type').order('name');
      if (data) {
        setWorlds(data as Array<{ id: string; name: string; slug: string; series_type: 'canon' | 'original' }>);
        // If editing and world_id is set but form is empty, initialize it
        // Don't override if user has already selected a different world
        const targetWorldId = oc?.world_id || lastSavedWorldId;
        if (targetWorldId && (!worldId || worldId === '')) {
          setValue('world_id', targetWorldId, { shouldDirty: false });
        }
      }
    }
    fetchWorlds();
  }, [oc?.world_id, lastSavedWorldId, setValue]);

  // Load world data when worldId changes (for world custom fields)
  useEffect(() => {
    async function loadWorld() {
      if (!worldId) {
        setSelectedWorld(null);
        return;
      }

      // If editing and OC has world data, use it
      if (oc?.world) {
        setSelectedWorld(oc.world);
        const templateType = getTemplateTypeFromWorldSlug(oc.world.slug, oc.world) as TemplateType;
        setValue('template_type', templateType, { shouldDirty: false });
        return;
      }

      // Immediately update selectedWorld with basic info from worlds array if available
      const worldFromList = worlds.find(w => w.id === worldId);
      if (worldFromList) {
        // Create a partial World object for template type lookup
        const worldForTemplate: Partial<World> = {
          slug: worldFromList.slug,
          series_type: worldFromList.series_type,
        };
        const templateType = getTemplateTypeFromWorldSlug(worldFromList.slug, worldForTemplate as World) as TemplateType;
        setValue('template_type', templateType, { shouldDirty: !oc });
        setValue('series_type', worldFromList.series_type || 'original', { shouldDirty: !oc });
        
        setSelectedWorld(prev => {
          if (!prev || prev.id !== worldId) {
            return {
              id: worldFromList.id,
              name: worldFromList.name,
              slug: worldFromList.slug,
              series_type: worldFromList.series_type || 'original',
            } as World;
          }
          return prev;
        });
      }

      // Fetch the full world data including oc_templates
      const supabase = createClient();
      const { data } = await supabase
        .from('worlds')
        .select('*')
        .eq('id', worldId)
        .single();
      if (data) {
        const worldData = data as World;
        const templateType = getTemplateTypeFromWorldSlug(worldData.slug, worldData) as TemplateType;
        setSelectedWorld(worldData);
        setValue('template_type', templateType, { shouldDirty: false });
        setValue('series_type', worldData.series_type, { shouldDirty: false });
      } else {
        logger.error('OCForm', 'Failed to fetch world data');
      }
    }
    loadWorld();
  }, [worldId, oc, setValue, worlds]);

  // Auto-set template_type and series_type when world changes (both create and edit mode)
  useEffect(() => {
    if (worldId) {
      // Use selectedWorld state if available (has full world data), otherwise fall back to worlds array
      const worldToUse = selectedWorld?.id === worldId ? selectedWorld : worlds.find(w => w.id === worldId);
      if (worldToUse) {
        const templateType = getTemplateTypeFromWorldSlug(worldToUse.slug, worldToUse as Partial<World>) as TemplateType;
        setValue('template_type', templateType, { shouldDirty: !oc });
        setValue('series_type', worldToUse.series_type || 'original', { shouldDirty: !oc });
      }
    } else {
      // No world selected (None), set template_type to 'none'
      setValue('template_type', 'none', { shouldDirty: !oc });
      setValue('story_alias_id', null, { shouldDirty: !oc });
    }
  }, [worldId, worlds, selectedWorld, oc, setValue]);

  // Auto-combine first_name + last_name into name (always)
  useEffect(() => {
    if (firstName && lastName) {
      const combinedName = `${firstName.trim()} ${lastName.trim()}`.trim();
      setValue('name', combinedName, { shouldDirty: false }); // Don't mark as dirty for auto-updates
    } else if (firstName || lastName) {
      // If only one is provided, use that as the name temporarily
      const partialName = (firstName ?? lastName ?? '').trim();
      if (partialName) {
        setValue('name', partialName, { shouldDirty: false });
      }
    }
  }, [firstName, lastName, setValue]);

  // Auto-generate slug from name (works in both create and edit mode)
  // Include world slug in the slug to ensure uniqueness per world
  useEffect(() => {
    if (nameValue) {
      const selectedWorld = worldId ? worlds.find(w => w.id === worldId) : null;
      const baseSlug = slugify(nameValue);
      
      if (selectedWorld) {
        // Append world slug to ensure uniqueness per world
        const slug = `${baseSlug}-${selectedWorld.slug}`;
        setValue('slug', slug);
      } else {
        // No world selected, use base slug
        setValue('slug', baseSlug);
      }
    }
  }, [nameValue, worldId, worlds, setValue]);

  // Auto-calculate star sign from date of birth
  useEffect(() => {
    if (dateOfBirth && dateOfBirth.trim()) {
      // Parse date of birth (format: MM/DD or MM-DD - only month and day, no year)
      let month = 0;
      let day = 0;
      
      const trimmed = dateOfBirth.trim();
      if (trimmed.includes('/')) {
        // MM/DD format
        const parts = trimmed.split('/').map(p => p.trim());
        month = parseInt(parts[0], 10);
        day = parseInt(parts[1], 10);
      } else if (trimmed.includes('-')) {
        // MM-DD format
        const parts = trimmed.split('-').map(p => p.trim());
        month = parseInt(parts[0], 10);
        day = parseInt(parts[1], 10);
      }
      
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        let starSign = '';
        
        // Calculate zodiac sign
        if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) {
          starSign = 'Aries';
        } else if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) {
          starSign = 'Taurus';
        } else if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) {
          starSign = 'Gemini';
        } else if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) {
          starSign = 'Cancer';
        } else if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) {
          starSign = 'Leo';
        } else if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) {
          starSign = 'Virgo';
        } else if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) {
          starSign = 'Libra';
        } else if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) {
          starSign = 'Scorpio';
        } else if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) {
          starSign = 'Sagittarius';
        } else if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) {
          starSign = 'Capricorn';
        } else if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) {
          starSign = 'Aquarius';
        } else if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) {
          starSign = 'Pisces';
        }
        
        if (starSign) {
          setValue('star_sign', starSign, { shouldDirty: false });
        }
      }
    }
  }, [dateOfBirth, setValue]);

  // Unsaved changes protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Keyboard shortcut for save (Ctrl+S or Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSubmit(onSubmit)();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const onSubmit = async (data: OCFormData) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      // Auto-create dropdown options for custom values before form submission
      try {
        // Create options for standard form fields
        const createdOptions = await autoCreateOptions(data);
        
        // Create options for template fields (if template is selected)
        if (data.template_type && data.template_type !== 'none' && selectedWorld?.oc_templates) {
          const worldTemplates = selectedWorld.oc_templates as Record<string, { name?: string; fields?: TemplateField[] }>;
          const template = worldTemplates[data.template_type];
          if (template?.fields && data.modular_fields) {
            const templateFields = template.fields.filter(f => f.options);
            if (templateFields.length > 0) {
              await autoCreateTemplateOptions(data.modular_fields, templateFields);
            }
          }
        }
        
        // Create options for world custom fields
        if (selectedWorld && data.modular_fields) {
          const worldFieldDefinitions = getWorldFieldDefinitions(selectedWorld);
          const fieldsWithOptions = worldFieldDefinitions.filter(f => f.options);
          if (fieldsWithOptions.length > 0) {
            await autoCreateWorldFieldOptions(data.modular_fields, fieldsWithOptions);
          }
        }
        
        if (createdOptions.length > 0) {
          logger.info('OCForm', 'Auto-created options', createdOptions);
        }
      } catch (error) {
        // Log but don't block form submission if option creation fails
        logger.warn('OCForm', 'Failed to auto-create some options', error);
      }

      // Validate slug uniqueness per world (only when creating)
      if (!oc) {
        const supabase = createClient();
        const { data: existingOC } = await supabase
          .from('ocs')
          .select('id')
          .eq('slug', data.slug)
          .eq('world_id', data.world_id)
          .single();

        if (existingOC) {
          setError(`A character with slug "${data.slug}" already exists in this world. Please use a different slug.`);
          setIsSubmitting(false);
          return;
        }
      }

      // Ensure template_type is set based on the current world
      let finalTemplateType = data.template_type;
      if (data.world_id) {
        // Use selectedWorld state if available and matches, otherwise try worlds array
        const worldToUse = selectedWorld?.id === data.world_id 
          ? selectedWorld 
          : worlds.find(w => w.id === data.world_id);
        if (worldToUse) {
          finalTemplateType = getTemplateTypeFromWorldSlug(worldToUse.slug, worldToUse as Partial<World>) as TemplateType;
        }
      }

      // Clean up empty strings and convert to null
      const cleanedData = {
        ...data,
        template_type: finalTemplateType,
        // Overview
        first_name: data.first_name || null,
        last_name: data.last_name || null,
        aliases: data.aliases || null,
        species: data.species || null,
        sex: data.sex || null,
        gender: data.gender || null,
        pronouns: data.pronouns || null,
        age: data.age === '' ? null : Number(data.age),
        date_of_birth: data.date_of_birth || null,
        occupation: data.occupation || null,
        affiliations: data.affiliations || null,
        romantic_orientation: data.romantic_orientation || null,
        sexual_orientation: data.sexual_orientation || null,
        star_sign: data.star_sign || null,
        // Identity Background
        ethnicity: data.ethnicity || null,
        place_of_origin: data.place_of_origin || null,
        current_residence: data.current_residence || null,
        languages: data.languages && data.languages.length > 0 ? data.languages : null,
        // Personality Overview
        personality_summary: data.personality_summary || null,
        alignment: data.alignment || null,
        // Personality Metrics
        sociability: data.sociability === '' ? null : Number(data.sociability),
        communication_style: data.communication_style === '' ? null : Number(data.communication_style),
        judgment: data.judgment === '' ? null : Number(data.judgment),
        emotional_resilience: data.emotional_resilience === '' ? null : Number(data.emotional_resilience),
        courage: data.courage === '' ? null : Number(data.courage),
        risk_behavior: data.risk_behavior === '' ? null : Number(data.risk_behavior),
        honesty: data.honesty === '' ? null : Number(data.honesty),
        discipline: data.discipline === '' ? null : Number(data.discipline),
        temperament: data.temperament === '' ? null : Number(data.temperament),
        humor: data.humor === '' ? null : Number(data.humor),
        // Personality Traits
        positive_traits: data.positive_traits || null,
        neutral_traits: data.neutral_traits || null,
        negative_traits: data.negative_traits || null,
        // Abilities
        abilities: data.abilities || null,
        skills: data.skills || null,
        aptitudes: data.aptitudes || null,
        strengths: data.strengths || null,
        limits: data.limits || null,
        conditions: data.conditions || null,
        // Appearance
        standard_look: data.standard_look || null,
        alternate_looks: data.alternate_looks || null,
        accessories: data.accessories || null,
        visual_motifs: data.visual_motifs || null,
        appearance_changes: data.appearance_changes || null,
        height: data.height || null,
        weight: data.weight || null,
        build: data.build || null,
        eye_color: data.eye_color || null,
        hair_color: data.hair_color || null,
        skin_tone: data.skin_tone || null,
        features: data.features || null,
        appearance_summary: data.appearance_summary || null,
        // Relationships - all relationships are now saved to other_relationships
        // Clear the old category-specific fields since we're using relationship_type instead
        family: null,
        friends_allies: null,
        rivals_enemies: null,
        romantic: null,
        other_relationships: data.other_relationships && data.other_relationships.length > 0 ? JSON.stringify(data.other_relationships.map((item: any) => ({
          name: item.name,
          relationship: item.relationship || undefined,
          description: item.description || undefined,
          oc_id: item.oc_id?.trim() || undefined,
          oc_slug: item.oc_slug?.trim() || undefined,
          relationship_type: item.relationship_type || undefined,
          image_url: item.image_url?.trim() || undefined,
        })).filter((item: any) => item.name?.trim())) : null,
        // History
        origin: data.origin || null,
        formative_years: data.formative_years || null,
        major_life_events: data.major_life_events || null,
        history_summary: data.history_summary || null,
        // Preferences & Habits
        likes: data.likes || null,
        dislikes: data.dislikes || null,
        // Media
        gallery: data.gallery && data.gallery.length > 0 ? data.gallery : null,
        image_url: data.image_url || null,
        icon_url: data.icon_url || null,
        seiyuu: data.seiyuu || null,
        voice_actor: data.voice_actor || null,
        theme_song: data.theme_song || null,
        pinterest_board: data.pinterest_board || null,
        inspirations: data.inspirations || null,
        design_notes: data.design_notes || null,
        name_meaning_etymology: data.name_meaning_etymology || null,
        creator_notes: data.creator_notes || null,
        // Trivia
        trivia: data.trivia || null,
        // Development
        development_status: data.development_status || null,
        // D&D-like Stats
        stat_strength: data.stat_strength === undefined || data.stat_strength === null || (typeof data.stat_strength === 'number' && isNaN(data.stat_strength)) ? null : Number(data.stat_strength),
        stat_dexterity: data.stat_dexterity === undefined || data.stat_dexterity === null || (typeof data.stat_dexterity === 'number' && isNaN(data.stat_dexterity)) ? null : Number(data.stat_dexterity),
        stat_constitution: data.stat_constitution === undefined || data.stat_constitution === null || (typeof data.stat_constitution === 'number' && isNaN(data.stat_constitution)) ? null : Number(data.stat_constitution),
        stat_intelligence: data.stat_intelligence === undefined || data.stat_intelligence === null || (typeof data.stat_intelligence === 'number' && isNaN(data.stat_intelligence)) ? null : Number(data.stat_intelligence),
        stat_wisdom: data.stat_wisdom === undefined || data.stat_wisdom === null || (typeof data.stat_wisdom === 'number' && isNaN(data.stat_wisdom)) ? null : Number(data.stat_wisdom),
        stat_charisma: data.stat_charisma === undefined || data.stat_charisma === null || (typeof data.stat_charisma === 'number' && isNaN(data.stat_charisma)) ? null : Number(data.stat_charisma),
        stat_hit_points_current: data.stat_hit_points_current === undefined || data.stat_hit_points_current === null || (typeof data.stat_hit_points_current === 'number' && isNaN(data.stat_hit_points_current)) ? null : Number(data.stat_hit_points_current),
        stat_hit_points_max: data.stat_hit_points_max === undefined || data.stat_hit_points_max === null || (typeof data.stat_hit_points_max === 'number' && isNaN(data.stat_hit_points_max)) ? null : Number(data.stat_hit_points_max),
        stat_armor_class: data.stat_armor_class === undefined || data.stat_armor_class === null || (typeof data.stat_armor_class === 'number' && isNaN(data.stat_armor_class)) ? null : Number(data.stat_armor_class),
        stat_speed: data.stat_speed === undefined || data.stat_speed === null || (typeof data.stat_speed === 'number' && isNaN(data.stat_speed)) ? null : Number(data.stat_speed),
        stat_level: data.stat_level === undefined || data.stat_level === null || (typeof data.stat_level === 'number' && isNaN(data.stat_level)) ? null : Number(data.stat_level),
        stat_class: data.stat_class || null,
        stat_subclass: data.stat_subclass || null,
        stat_initiative: data.stat_initiative === undefined || data.stat_initiative === null || (typeof data.stat_initiative === 'number' && isNaN(data.stat_initiative)) ? null : Number(data.stat_initiative),
        stat_notes: data.stat_notes || null,
        // System
        series_type: data.series_type || null,
        story_alias_id: data.story_alias_id === '' || data.story_alias_id === null ? null : data.story_alias_id,
        extra_fields: data.extra_fields || {},
        modular_fields: data.modular_fields || {},
      };

      const url = oc ? `/api/admin/ocs/${oc.id}` : '/api/admin/ocs';
      const method = oc ? 'PUT' : 'POST';

      // Include identity_id: in create mode if provided, in edit mode preserve existing
      const requestBody = oc 
        ? { ...cleanedData, ...(oc.identity_id && { identity_id: oc.identity_id }) }
        : { ...cleanedData, ...(identityId && { identity_id: identityId }) };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('OCForm', 'Response error', errorData);
        throw new Error(errorData.error || `Failed to save OC: ${response.statusText}`);
      }

      const savedData = await response.json();
      
      // Check if the response has a data property (some APIs wrap responses)
      const ocData = (savedData as any).data || savedData;
      
      setSuccess(true);

      // If creating a new character, redirect to the list after showing success message
      // If updating, navigate if shouldNavigateAfterSaveRef.current is true, otherwise stay on the edit page
      if (!oc) {
        setTimeout(() => {
          router.push('/admin/ocs');
          router.refresh();
        }, 1000);
      } else if (shouldNavigateAfterSaveRef.current) {
        // Navigate back to list after save
        setTimeout(() => {
          router.push('/admin/ocs');
          router.refresh();
        }, 500);
      } else {
        // Update the form with the saved data to reflect changes immediately
        if (ocData) {
          const defaultValues = getDefaultValues(ocData as OC);
          reset(defaultValues, { keepDefaultValues: false, keepDirty: false });
          // Explicitly set world_id to ensure it's selected
          if (ocData.world_id) {
            setLastSavedWorldId(ocData.world_id);
            // Set multiple times to ensure it sticks
            setValue('world_id', ocData.world_id, { shouldDirty: false });
            setTimeout(() => {
              setValue('world_id', ocData.world_id, { shouldDirty: false });
            }, 50);
            setTimeout(() => {
              setValue('world_id', ocData.world_id, { shouldDirty: false });
            }, 200);
            
            // Also set template_type based on the world
            if (ocData.world && typeof ocData.world === 'object' && 'slug' in ocData.world) {
              const templateType = getTemplateTypeFromWorldSlug(ocData.world.slug as string, ocData.world as World) as TemplateType;
              setValue('template_type', templateType, { shouldDirty: false });
            } else if (worlds.length > 0) {
              // Fallback: find world in worlds list
              const world = worlds.find(w => w.id === ocData.world_id);
              if (world) {
                // Use selectedWorld state if available and matches, otherwise use worlds array entry
                const worldToUse = selectedWorld?.id === world.id ? selectedWorld : world;
                const templateType = getTemplateTypeFromWorldSlug(worldToUse.slug, worldToUse as Partial<World>) as TemplateType;
                setValue('template_type', templateType, { shouldDirty: false });
              }
            }
          }
          // Explicitly set story_alias_id to ensure it's selected
          if (ocData.story_alias_id !== undefined) {
            setValue('story_alias_id', ocData.story_alias_id || null, { shouldDirty: false });
            setTimeout(() => {
              setValue('story_alias_id', ocData.story_alias_id || null, { shouldDirty: false });
            }, 50);
          }
        }
        // Note: We don't call router.refresh() here because it can cause the form to reset
        // with potentially stale data. The form is already updated with the saved data above.
      }
    } catch (err) {
      logger.error('OCForm', 'Error saving OC', err);
      setError(err instanceof Error ? err.message : 'Failed to save OC. Please try again.');
    } finally {
      setIsSubmitting(false);
      shouldNavigateAfterSaveRef.current = false; // Reset flag after submission completes
    }
  };

  const handleCancel = useCallback(() => {
    if (isDirty) {
      if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
        return;
      }
    }
    router.back();
  }, [isDirty, router]);

  // Get effective field definitions from world (for display purposes - includes both world custom fields and character template fields)
  const effectiveFieldDefinitions = getEffectiveFieldDefinitions(selectedWorld, oc);

  // Get world field definitions only (from world_fields.field_sets, excludes character template fields)
  // This is used for the World-Specific Fields section to avoid duplication with Character Template Fields
  const worldFieldDefinitions = getWorldFieldDefinitions(selectedWorld, templateType);

  // Helper function to get effective template (uses only world's oc_templates)
  const getEffectiveTemplate = (templateType: string): TemplateDefinition => {
    // Ensure selectedWorld matches the current worldId to avoid using stale data
    if (!selectedWorld || selectedWorld.id !== worldId) {
      return { name: templateType, fields: [] };
    }
    
    // Only use world's oc_templates - no global templates
    if (selectedWorld?.oc_templates && typeof selectedWorld.oc_templates === 'object') {
      const worldTemplates = selectedWorld.oc_templates as Record<string, { name?: string; fields?: TemplateField[] }>;
      
      // Try to find template by templateType first, then by world slug as fallback
      let worldTemplate = worldTemplates[templateType];
      
      // If not found by templateType, try the world slug
      if (!worldTemplate && selectedWorld.slug) {
        worldTemplate = worldTemplates[selectedWorld.slug];
      }
      
      // If still not found, try other common variations
      if (!worldTemplate && templateType === 'dragonball') {
        const variations = ['dragon-ball-z', 'dragon-ball', 'dragonball'];
        for (const variation of variations) {
          if (worldTemplates[variation]) {
            worldTemplate = worldTemplates[variation];
            break;
          }
        }
      }
      
      if (worldTemplate?.fields && Array.isArray(worldTemplate.fields)) {
        return {
          name: worldTemplate.name || templateType,
          fields: worldTemplate.fields,
        };
      }
    }
    
    // Return empty template if world doesn't have oc_templates for this type
    return { name: templateType, fields: [] };
  };

  // Get the effective template for the current template type
  const effectiveTemplate = templateType && templateType !== 'none' ? getEffectiveTemplate(templateType) : null;

  // Add handler for form submission errors (validation errors)
  const onError = (errors: any) => {
    logger.error('OCForm', 'FORM VALIDATION ERRORS', errors);
    // Avoid JSON.stringify on errors object as it may contain circular references
    
    // Build a detailed error message
    const errorMessages: string[] = [];
    Object.entries(errors).forEach(([field, error]) => {
      if (Array.isArray(error)) {
        error.forEach((item, index) => {
          if (item && typeof item === 'object') {
            Object.entries(item).forEach(([subField, subError]) => {
              if (subError && typeof subError === 'object' && 'message' in subError && typeof (subError as any).message === 'string') {
                errorMessages.push(`${field}[${index}].${subField}: ${(subError as any).message}`);
              }
            });
          }
        });
      } else if (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
        errorMessages.push(`${field}: ${(error as any).message}`);
      }
    });
    
    setError(errorMessages.length > 0 
      ? `Please fix the following errors:\n${errorMessages.join('\n')}`
      : 'Please fix the form errors before submitting.');
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

  return (
    <DropdownOptionsProvider>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-4 md:space-y-6 w-full max-w-5xl">
      {error && <FormMessage type="error" message={error} />}
      {success && <FormMessage type="success" message="Character saved successfully!" />}
      {Object.keys(errors).length > 0 && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-400 font-semibold mb-2">Form Validation Errors:</p>
          <ul className="list-disc list-inside text-red-300 text-sm">
            {Object.entries(errors).map(([key, error]: [string, any]) => {
              let errorText = error?.message;
              if (!errorText && error) {
                try {
                  errorText = JSON.stringify(error);
                } catch {
                  errorText = String(error);
                }
              }
              return (
                <li key={key}>
                  {key}: {errorText || 'Unknown error'}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Version Switcher - Show when editing an OC with multiple versions */}
      {oc?.identity && oc.id && (
        <OCVersionSwitcher identity={oc.identity} currentVersionId={oc.id} />
      )}

      <FormSection title="Core Identity" icon="core-identity" accentColor="core-identity" defaultOpen={true}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FormLabel htmlFor="first_name" required>
              First Name
            </FormLabel>
            <NameAutocompleteInput
              fieldName="first_name"
              setValue={setValue}
              watch={watch}
              isSubmitting={isSubmitting}
              currentOCId={oc?.id}
            />
            {errors.first_name?.message && (
              <p className="mt-1 text-sm text-red-400">{errors.first_name.message}</p>
            )}
          </div>
          <div>
            <FormLabel htmlFor="last_name">
              Last Name
            </FormLabel>
            <NameAutocompleteInput
              fieldName="last_name"
              setValue={setValue}
              watch={watch}
              isSubmitting={isSubmitting}
              currentOCId={oc?.id}
            />
            {errors.last_name?.message && (
              <p className="mt-1 text-sm text-red-400">{errors.last_name.message}</p>
            )}
          </div>
        </div>

        <div>
          <FormLabel htmlFor="name" optional>
            Full Name (Auto-generated)
          </FormLabel>
          <FormInput
            {...register('name')}
            disabled={true}
            className="bg-gray-800/80 border-gray-600/50 text-gray-400 cursor-not-allowed"
            helpText="Automatically generated from first and last name. This is the name that will be displayed."
          />
        </div>

        <div>
          <FormLabel htmlFor="aliases">
            Aliases
          </FormLabel>
          <FormTextarea
            {...register('aliases')}
            rows={2}
            placeholder="Alternate names, titles, or nicknames (supports markdown)"
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FormLabel htmlFor="slug" required>
              Slug
            </FormLabel>
            <FormInput
              {...register('slug')}
              error={errors.slug?.message}
              disabled={isSubmitting}
              helpText="Auto-generated from name. Can be edited manually."
            />
          </div>

          <div>
            <FormLabel htmlFor="world_id">
              World
            </FormLabel>
            <Controller
              name="world_id"
              control={control}
              render={({ field }) => (
                <FormSelect
                  {...field}
                  value={field.value || ''}
                  key={`world-select-${worlds.length}-${field.value || 'empty'}`}
                  options={[
                    { value: '', label: 'None' },
                    ...worlds.map((w) => ({ value: w.id, label: w.name }))
                  ]}
                  placeholder="Select a world"
                  error={errors.world_id?.message}
                  disabled={isSubmitting}
                  onChange={(e) => {
                    const newWorldId = e.target.value;
                    // Convert empty string to null for optional field
                    const value = newWorldId === '' ? null : newWorldId;
                    field.onChange(value);
                    
                    // When "None" is selected, also clear template_type and story_alias_id
                    if (newWorldId === '') {
                      setValue('template_type', 'none');
                      setValue('story_alias_id', null);
                    }
                  }}
                />
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Controller
              name="story_alias_id"
              control={control}
              render={({ field }) => (
                <StoryAliasSelector
                  worldId={worldId}
                  value={field.value === null || field.value === undefined ? '' : field.value}
                  onChange={(e) => {
                    // Convert empty string to null for the form
                    const newValue = e.target.value === '' ? null : e.target.value;
                    field.onChange(newValue);
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                  error={errors.story_alias_id?.message}
                  disabled={isSubmitting}
                />
              )}
            />
          </div>

          <div>
            <FormLabel htmlFor="template_type" optional>
              Template Type (Auto-set from World)
            </FormLabel>
            <FormInput
              type="text"
              value={effectiveTemplate?.name || templates[templateType as TemplateType]?.name || templateType || 'None'}
              disabled
              className="bg-gray-800/80 border-gray-600/50 text-gray-400 cursor-not-allowed"
            />
            <input type="hidden" {...register('template_type')} />
            <div className="text-xs text-gray-500 mt-1">
              Template Type: {templateType || 'none'} | World: {selectedWorld?.name || 'None'}
            </div>
          </div>
        </div>
      </FormSection>

      <FormSection title="Overview" icon="overview" accentColor="overview" defaultOpen={true}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FormLabel htmlFor="age">
              Age
            </FormLabel>
            <FormInput
              type="number"
              {...register('age', { valueAsNumber: true })}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <FormLabel htmlFor="status" required>
              Status
            </FormLabel>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <FormAutocomplete
                  {...field}
                  options={['alive', 'deceased', 'missing', 'unknown', 'au-only']}
                  placeholder="Type status..."
                  disabled={isSubmitting}
                />
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FormLabel htmlFor="pronouns">
              Pronouns
            </FormLabel>
            <Controller
              name="pronouns"
              control={control}
              render={({ field }) => (
                <FormAutocomplete
                  {...field}
                  optionsSource="pronouns"
                  placeholder="Type pronouns..."
                  disabled={isSubmitting}
                  allowCustom={true}
                />
              )}
            />
          </div>

          <div>
            <FormLabel htmlFor="gender">
              Gender
            </FormLabel>
            <Controller
              name="gender"
              control={control}
              render={({ field }) => (
                <FormAutocomplete
                  {...field}
                  optionsSource="gender_identity"
                  placeholder="Type gender..."
                  disabled={isSubmitting}
                  allowCustom={true}
                />
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FormLabel htmlFor="date_of_birth">
              Date of Birth
            </FormLabel>
            <FormInput
              {...register('date_of_birth')}
              placeholder="MM/DD or MM-DD"
              disabled={isSubmitting}
              helpText="Format: MM/DD (e.g., 01/15) or MM-DD (e.g., 01-15). Only month and day required. Star sign will be auto-calculated."
            />
          </div>
          <div>
            <FormLabel htmlFor="occupation">
              Occupation
            </FormLabel>
            <Controller
              name="occupation"
              control={control}
              render={({ field }) => (
                <FormAutocomplete
                  {...field}
                  optionsSource="occupation"
                  placeholder="Type occupation..."
                  disabled={isSubmitting}
                  allowCustom={true}
                />
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FormLabel htmlFor="sex">
              Sex
            </FormLabel>
            <Controller
              name="sex"
              control={control}
              render={({ field }) => (
                <FormAutocomplete
                  {...field}
                  optionsSource="sex"
                  placeholder="Type sex..."
                  disabled={isSubmitting}
                  allowCustom={true}
                />
              )}
            />
          </div>
          <div>
            <FormLabel htmlFor="species">
              Species / Race
            </FormLabel>
            <Controller
              name="species"
              control={control}
              render={({ field }) => (
                <FormAutocomplete
                  {...field}
                  optionsSource="species"
                  placeholder="Type species or race..."
                  disabled={isSubmitting}
                  allowCustom={true}
                />
              )}
            />
          </div>
        </div>

        <div>
          <FormLabel htmlFor="affiliations">
            Affiliations
          </FormLabel>
          <FormTextarea
            {...register('affiliations')}
            rows={2}
            placeholder="Groups, factions, teams, or organizations"
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FormLabel htmlFor="romantic_orientation">
              Romantic Orientation
            </FormLabel>
            <Controller
              name="romantic_orientation"
              control={control}
              render={({ field }) => (
                <FormAutocomplete
                  {...field}
                  optionsSource="romantic"
                  placeholder="Type romantic orientation..."
                  disabled={isSubmitting}
                  allowCustom={true}
                />
              )}
            />
          </div>
          <div>
            <FormLabel htmlFor="sexual_orientation">
              Sexual Orientation
            </FormLabel>
            <Controller
              name="sexual_orientation"
              control={control}
              render={({ field }) => (
                <FormAutocomplete
                  {...field}
                  optionsSource="sexual"
                  placeholder="Type sexual orientation..."
                  disabled={isSubmitting}
                  allowCustom={true}
                />
              )}
            />
          </div>
        </div>

        <div>
          <FormLabel htmlFor="star_sign">
            Star Sign
          </FormLabel>
          <FormInput
            {...register('star_sign')}
            disabled={isSubmitting}
            helpText={dateOfBirth ? 'Auto-calculated from date of birth' : 'Enter star sign or it will be auto-calculated from date of birth'}
          />
        </div>
      </FormSection>

      {/* Tags Section - Early placement for categorization */}
      {oc && (
        <TagsFormSection ocId={oc.id} currentTags={[]} />
      )}

      <FormSection title="Identity Background" icon="identity-background" accentColor="identity-background" defaultOpen={false}>
        <div>
          <FormLabel htmlFor="ethnicity">
            Ethnicity
          </FormLabel>
          <Controller
            name="ethnicity"
            control={control}
            render={({ field }) => (
              <FormAutocomplete
                {...field}
                optionsSource="ethnicity_race"
                placeholder="Type ethnicity or race..."
                disabled={isSubmitting}
                allowCustom={true}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FormLabel htmlFor="place_of_origin">
              Place of Origin
            </FormLabel>
            <FormTextarea
              {...register('place_of_origin')}
              rows={2}
              placeholder="Birthplace or hometown (supports markdown)"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <FormLabel htmlFor="current_residence">
              Current Residence
            </FormLabel>
            <FormTextarea
              {...register('current_residence')}
              rows={2}
              placeholder="Where the character currently lives (supports markdown)"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div>
          <FormLabel htmlFor="languages">
            Languages Spoken
          </FormLabel>
          <div className="space-y-2">
            {languageFields.map((field, index) => (
              <div key={field.id} className="flex flex-col sm:flex-row gap-2">
                <FormInput
                  {...register(`languages.${index}`)}
                  placeholder="Language"
                  disabled={isSubmitting}
                  className="flex-1"
                />
                <FormButton
                  type="button"
                  variant="secondary"
                  onClick={() => removeLanguage(index)}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  Remove
                </FormButton>
              </div>
            ))}
            <FormButton
              type="button"
              variant="secondary"
              onClick={() => appendLanguage('')}
              disabled={isSubmitting}
            >
              Add Language
            </FormButton>
          </div>
        </div>
      </FormSection>

      <FormSection title="Appearance" icon="appearance" accentColor="appearance" defaultOpen={false}>
        <div>
          <FormLabel htmlFor="standard_look">
            Standard Look
          </FormLabel>
          <FormTextarea
            {...register('standard_look')}
            rows={3}
            placeholder="What the character typically wears or how they present"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="alternate_looks">
            Alternate Looks
          </FormLabel>
          <FormTextarea
            {...register('alternate_looks')}
            rows={3}
            placeholder="Other outfits, forms, or disguises"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="accessories">
            Accessories
          </FormLabel>
          <FormTextarea
            {...register('accessories')}
            rows={2}
            placeholder="Commonly worn, carried, or displayed items"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="visual_motifs" optional>
            Visual Motifs
          </FormLabel>
          <FormTextarea
            {...register('visual_motifs')}
            rows={2}
            placeholder="Recurring visual themes or symbols"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="appearance_changes">
            Appearance Changes
          </FormLabel>
          <FormTextarea
            {...register('appearance_changes')}
            rows={2}
            placeholder="Changes by time period, role, or arc"
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FormLabel htmlFor="height">
              Height
            </FormLabel>
            <FormInput
              {...register('height')}
              placeholder="Physical height"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <FormLabel htmlFor="weight">
              Weight
            </FormLabel>
            <FormInput
              {...register('weight')}
              placeholder="Physical weight"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <FormLabel htmlFor="eye_color">
              Eye Color
            </FormLabel>
            <FormColorSelect
              register={register('eye_color') as any}
              setValue={setValue}
              optionsSource="eye_color"
              placeholder="Select or enter eye color..."
              disabled={isSubmitting}
              error={errors.eye_color?.message}
              helpText="You can select from options or enter a custom color"
              name="eye_color"
            />
          </div>
          <div>
            <FormLabel htmlFor="hair_color">
              Hair Color
            </FormLabel>
            <FormColorSelect
              register={register('hair_color') as any}
              setValue={setValue}
              optionsSource="hair_color"
              placeholder="Select or enter hair color..."
              disabled={isSubmitting}
              error={errors.hair_color?.message}
              helpText="You can select from options or enter a custom color"
              name="hair_color"
            />
          </div>
          <div>
            <FormLabel htmlFor="skin_tone">
              Skin Tone
            </FormLabel>
            <FormColorSelect
              register={register('skin_tone') as any}
              setValue={setValue}
              optionsSource="skin_tone"
              placeholder="Select or enter skin tone..."
              disabled={isSubmitting}
              error={errors.skin_tone?.message}
              helpText="You can select from options or enter a custom color"
              name="skin_tone"
            />
          </div>
        </div>

        <div>
          <FormLabel htmlFor="build">
            Build
          </FormLabel>
          <FormInput
            {...register('build')}
            placeholder="Body type or physique"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="features">
            Features
          </FormLabel>
          <FormTextarea
            {...register('features')}
            rows={2}
            placeholder="Distinguishing physical traits"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="appearance_summary">
            Appearance Summary
          </FormLabel>
          <FormTextarea
            {...register('appearance_summary')}
            rows={3}
            placeholder="Short paragraph describing overall look"
            disabled={isSubmitting}
          />
        </div>
      </FormSection>

      <FormSection title="Personality Overview" icon="personality-overview" accentColor="personality-overview" defaultOpen={false}>
        <div>
          <FormLabel htmlFor="personality_summary">
            Personality Summary
          </FormLabel>
          <FormTextarea
            {...register('personality_summary')}
            rows={4}
            placeholder="3-5 sentence overview of personality"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="alignment" optional>
            Alignment
          </FormLabel>
          <FormTextarea
            {...register('alignment')}
            rows={2}
            placeholder="Broad moral outlook or ethical stance (supports markdown)"
            disabled={isSubmitting}
          />
        </div>
      </FormSection>

      <FormSection title="Personality Metrics" icon="personality-metrics" accentColor="personality-metrics" defaultOpen={false}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FormLabel htmlFor="sociability">
                Sociability (Friendly ↔ Reserved)
              </FormLabel>
              <FormInput
                type="number"
                min="1"
                max="10"
                {...register('sociability', { valueAsNumber: true })}
                placeholder="1-10"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <FormLabel htmlFor="communication_style">
                Communication Style (Polite ↔ Blunt)
              </FormLabel>
              <FormInput
                type="number"
                min="1"
                max="10"
                {...register('communication_style', { valueAsNumber: true })}
                placeholder="1-10"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <FormLabel htmlFor="judgment">
                Judgment (Clever ↔ Impulsive)
              </FormLabel>
              <FormInput
                type="number"
                min="1"
                max="10"
                {...register('judgment', { valueAsNumber: true })}
                placeholder="1-10"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <FormLabel htmlFor="emotional_resilience">
                Emotional Resilience (Sensitive ↔ Hardened)
              </FormLabel>
              <FormInput
                type="number"
                min="1"
                max="10"
                {...register('emotional_resilience', { valueAsNumber: true })}
                placeholder="1-10"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <FormLabel htmlFor="courage">
                Courage (Bold ↔ Hesitant)
              </FormLabel>
              <FormInput
                type="number"
                min="1"
                max="10"
                {...register('courage', { valueAsNumber: true })}
                placeholder="1-10"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <FormLabel htmlFor="risk_behavior">
                Risk Behavior (Careful ↔ Reckless)
              </FormLabel>
              <FormInput
                type="number"
                min="1"
                max="10"
                {...register('risk_behavior', { valueAsNumber: true })}
                placeholder="1-10"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <FormLabel htmlFor="honesty">
                Honesty (Sincere ↔ Deceptive)
              </FormLabel>
              <FormInput
                type="number"
                min="1"
                max="10"
                {...register('honesty', { valueAsNumber: true })}
                placeholder="1-10"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <FormLabel htmlFor="discipline">
                Discipline (Diligent ↔ Neglectful)
              </FormLabel>
              <FormInput
                type="number"
                min="1"
                max="10"
                {...register('discipline', { valueAsNumber: true })}
                placeholder="1-10"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <FormLabel htmlFor="temperament">
                Temperament (Calm ↔ Volatile)
              </FormLabel>
              <FormInput
                type="number"
                min="1"
                max="10"
                {...register('temperament', { valueAsNumber: true })}
                placeholder="1-10"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <FormLabel htmlFor="humor">
                Humor (Lighthearted ↔ Serious)
              </FormLabel>
              <FormInput
                type="number"
                min="1"
                max="10"
                {...register('humor', { valueAsNumber: true })}
                placeholder="1-10"
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>
      </FormSection>

      <FormSection title="Personality Traits" icon="personality-traits" accentColor="personality-traits" defaultOpen={false}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <FormLabel htmlFor="positive_traits">
              Positive Traits
            </FormLabel>
            <FormMultiSelect
              {...register('positive_traits')}
              optionsSource="positive_traits"
              placeholder="Select positive traits"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <FormLabel htmlFor="neutral_traits">
              Neutral Traits
            </FormLabel>
            <FormMultiSelect
              {...register('neutral_traits')}
              optionsSource="neutral_traits"
              placeholder="Select neutral traits"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <FormLabel htmlFor="negative_traits">
              Negative Traits
            </FormLabel>
            <FormMultiSelect
              {...register('negative_traits')}
              optionsSource="negative_traits"
              placeholder="Select negative traits"
              disabled={isSubmitting}
            />
          </div>
        </div>
      </FormSection>

      {/* Quotes Section - After Personality Traits for character voice */}
      {oc && (
        <QuotesFormSection ocId={oc.id} />
      )}

      <FormSection title="Abilities" icon="abilities" accentColor="abilities" defaultOpen={false}>
        <div>
          <FormLabel htmlFor="abilities">
            Abilities
          </FormLabel>
          <FormTextarea
            {...register('abilities')}
            rows={3}
            placeholder="Exceptional capabilities, whether supernatural, enhanced, or naturally extreme"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="skills">
            Skills
          </FormLabel>
          <FormTextarea
            {...register('skills')}
            rows={3}
            placeholder="Learned skills, techniques, or areas of expertise"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="aptitudes">
            Aptitudes
          </FormLabel>
          <FormTextarea
            {...register('aptitudes')}
            rows={2}
            placeholder="Inborn strengths, talents, or predispositions"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="strengths">
            Strengths
          </FormLabel>
          <FormTextarea
            {...register('strengths')}
            rows={2}
            placeholder="Areas where the character performs best"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="limits">
            Limits
          </FormLabel>
          <FormTextarea
            {...register('limits')}
            rows={2}
            placeholder="Weaknesses, strain, or consequences tied to ability use"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="conditions" optional>
            Conditions
          </FormLabel>
          <FormTextarea
            {...register('conditions')}
            rows={2}
            placeholder="Situational requirements or restrictions"
            disabled={isSubmitting}
          />
        </div>
      </FormSection>

      <FormSection title="Stats" icon="stats" accentColor="stats" defaultOpen={false}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FormLabel htmlFor="stat_strength">
              Strength (STR)
            </FormLabel>
            <FormInput
              type="number"
              {...register('stat_strength', { valueAsNumber: true })}
              min={1}
              max={30}
              placeholder="1-30"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <FormLabel htmlFor="stat_dexterity">
              Dexterity (DEX)
            </FormLabel>
            <FormInput
              type="number"
              {...register('stat_dexterity', { valueAsNumber: true })}
              min={1}
              max={30}
              placeholder="1-30"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <FormLabel htmlFor="stat_constitution">
              Constitution (CON)
            </FormLabel>
            <FormInput
              type="number"
              {...register('stat_constitution', { valueAsNumber: true })}
              min={1}
              max={30}
              placeholder="1-30"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <FormLabel htmlFor="stat_intelligence">
              Intelligence (INT)
            </FormLabel>
            <FormInput
              type="number"
              {...register('stat_intelligence', { valueAsNumber: true })}
              min={1}
              max={30}
              placeholder="1-30"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <FormLabel htmlFor="stat_wisdom">
              Wisdom (WIS)
            </FormLabel>
            <FormInput
              type="number"
              {...register('stat_wisdom', { valueAsNumber: true })}
              min={1}
              max={30}
              placeholder="1-30"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <FormLabel htmlFor="stat_charisma">
              Charisma (CHA)
            </FormLabel>
            <FormInput
              type="number"
              {...register('stat_charisma', { valueAsNumber: true })}
              min={1}
              max={30}
              placeholder="1-30"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <FormLabel htmlFor="stat_level">
              Level
            </FormLabel>
            <FormInput
              type="number"
              {...register('stat_level', { valueAsNumber: true })}
              min={1}
              max={20}
              placeholder="1-20"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <FormLabel htmlFor="stat_class">
              Class
            </FormLabel>
            <FormInput
              {...register('stat_class')}
              placeholder="e.g., Fighter, Wizard, Rogue"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <FormLabel htmlFor="stat_subclass">
              Subclass
            </FormLabel>
            <FormInput
              {...register('stat_subclass')}
              placeholder="e.g., Champion, Evocation, Thief"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <FormLabel htmlFor="stat_armor_class">
              Armor Class (AC)
            </FormLabel>
            <FormInput
              type="number"
              {...register('stat_armor_class', { valueAsNumber: true })}
              min={0}
              placeholder="0+"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <FormLabel htmlFor="stat_hit_points_max">
              Max Hit Points
            </FormLabel>
            <FormInput
              type="number"
              {...register('stat_hit_points_max', { valueAsNumber: true })}
              min={1}
              placeholder="1+"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <FormLabel htmlFor="stat_hit_points_current">
              Current Hit Points
            </FormLabel>
            <FormInput
              type="number"
              {...register('stat_hit_points_current', { valueAsNumber: true })}
              min={0}
              placeholder="0+"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <FormLabel htmlFor="stat_speed">
              Speed (feet)
            </FormLabel>
            <FormInput
              type="number"
              {...register('stat_speed', { valueAsNumber: true })}
              min={0}
              placeholder="0+"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <FormLabel htmlFor="stat_initiative">
              Initiative
            </FormLabel>
            <FormInput
              type="number"
              {...register('stat_initiative', { valueAsNumber: true })}
              placeholder="Modifier (e.g., +3)"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="mt-4">
          <FormLabel htmlFor="stat_notes" optional>
            Stats Notes
          </FormLabel>
          <FormTextarea
            {...register('stat_notes')}
            rows={3}
            placeholder="Additional notes about stats, modifiers, or special abilities"
            disabled={isSubmitting}
          />
        </div>
      </FormSection>

      <FormSection title="Relationships" icon="relationships" accentColor="relationships" defaultOpen={false}>
        <RelationshipEntryInput
          fieldPath="other_relationships"
          control={control}
          register={register}
          setValue={setValue}
          watch={watch}
          defaultValue={watch('other_relationships') || []}
          isSubmitting={isSubmitting}
          label="Relationships"
          enableOCAutocomplete={true}
          currentOCId={oc?.id}
          reverseRelationships={reverseRelationships}
        />
      </FormSection>

      <FormSection title="History" icon="history" accentColor="history" defaultOpen={false}>
        <div>
          <FormLabel htmlFor="origin">
            Origin
          </FormLabel>
          <FormTextarea
            {...register('origin')}
            rows={3}
            placeholder="Circumstances of birth, creation, or emergence"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="formative_years">
            Formative Years
          </FormLabel>
          <FormTextarea
            {...register('formative_years')}
            rows={3}
            placeholder="Experiences shaping identity or abilities"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="major_life_events">
            Major Life Events
          </FormLabel>
          <FormTextarea
            {...register('major_life_events')}
            rows={4}
            placeholder="Significant milestones or turning points"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="history_summary">
            Summary
          </FormLabel>
          <FormTextarea
            {...register('history_summary')}
            rows={4}
            placeholder="Short biography"
            disabled={isSubmitting}
          />
        </div>
      </FormSection>

      {/* Story Snippets Section - After History for content-related snippets */}
      {oc && (
        <StorySnippetsFormSection ocId={oc.id} />
      )}

      <FormSection title="Preferences & Habits" icon="preferences-habits" accentColor="preferences-habits" defaultOpen={false}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FormLabel htmlFor="likes">
              Likes
            </FormLabel>
            <FormTextarea
              {...register('likes')}
              rows={3}
              placeholder="Things the character enjoys"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <FormLabel htmlFor="dislikes">
              Dislikes
            </FormLabel>
            <FormTextarea
              {...register('dislikes')}
              rows={3}
              placeholder="Things the character dislikes"
              disabled={isSubmitting}
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Media" icon="media" accentColor="media" defaultOpen={false}>
        <div>
          <FormLabel htmlFor="gallery">
            Gallery
          </FormLabel>
          <div className="space-y-2">
            {galleryFields.map((field, index) => (
              <div key={field.id} className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2 items-start">
                  <div className="flex-1 w-full min-w-0">
                    <FormInput
                      {...register(`gallery.${index}`)}
                      type="url"
                      placeholder="Image URL"
                      disabled={isSubmitting}
                      className="w-full"
                    />
                  </div>
                  <FormButton
                    type="button"
                    variant="secondary"
                    onClick={() => removeGallery(index)}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto flex-shrink-0 sm:mt-0"
                  >
                    Remove
                  </FormButton>
                </div>
                <ImagePreview url={gallery[index] || ''} maxHeight="200px" />
              </div>
            ))}
            <FormButton
              type="button"
              variant="secondary"
              onClick={() => appendGallery('')}
              disabled={isSubmitting}
            >
              Add Image URL
            </FormButton>
          </div>
        </div>

        <div>
          <FormLabel htmlFor="image_url">
            Image (Primary)
          </FormLabel>
          <FormInput
            type="url"
            {...register('image_url')}
            placeholder="Primary image URL"
            disabled={isSubmitting}
          />
          <ImagePreview url={imageUrl || ''} maxHeight="300px" />
        </div>

        <div>
          <FormLabel htmlFor="icon_url">
            Icon
          </FormLabel>
          <FormInput
            type="url"
            {...register('icon_url')}
            placeholder="Icon or avatar URL"
            disabled={isSubmitting}
          />
          <ImagePreview url={iconUrl || ''} maxHeight="150px" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FormLabel htmlFor="seiyuu">
              Seiyuu
            </FormLabel>
            <FormInput
              {...register('seiyuu')}
              placeholder="Japanese voice actor"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <FormLabel htmlFor="voice_actor">
              Voice Actor
            </FormLabel>
            <FormInput
              {...register('voice_actor')}
              placeholder="Other voice portrayals"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div>
          <FormLabel htmlFor="theme_song">
            Theme Song(s)
          </FormLabel>
          <FormInput
            {...register('theme_song')}
            type="text"
            placeholder="Song name or link (e.g., https://youtube.com/watch?v=... or Spotify link)"
            disabled={isSubmitting}
            helpText="Enter the song name or paste a link to the song (YouTube, Spotify, SoundCloud, etc.)"
          />
        </div>

        <div>
          <FormLabel htmlFor="pinterest_board">
            Pinterest Board
          </FormLabel>
          <FormInput
            {...register('pinterest_board')}
            type="url"
            placeholder="https://www.pinterest.com/username/board-name/"
            disabled={isSubmitting}
            helpText="Optional Pinterest board URL for this character"
          />
        </div>

        <div>
          <FormLabel htmlFor="inspirations">
            Inspirations
          </FormLabel>
          <FormTextarea
            {...register('inspirations')}
            rows={3}
            placeholder="Real or fictional inspirations"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="design_notes">
            Design Notes
          </FormLabel>
          <FormTextarea
            {...register('design_notes')}
            rows={3}
            placeholder="Notes about visual or concept design"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="name_meaning_etymology">
            Name Meaning / Etymology
          </FormLabel>
          <FormTextarea
            {...register('name_meaning_etymology')}
            rows={2}
            placeholder="Meaning or origin of the name"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="creator_notes">
            Creator Notes
          </FormLabel>
          <FormTextarea
            {...register('creator_notes')}
            rows={3}
            placeholder="Out-of-universe notes"
            disabled={isSubmitting}
          />
        </div>
      </FormSection>

      <FormSection title="Trivia" icon="trivia" accentColor="trivia" defaultOpen={false}>
        <div>
          <FormLabel htmlFor="trivia">
            Trivia
          </FormLabel>
          <FormTextarea
            {...register('trivia')}
            rows={4}
            placeholder="Light or interesting facts"
            disabled={isSubmitting}
          />
        </div>
      </FormSection>

      <FormSection title="Development" icon="development" accentColor="development" defaultOpen={false}>
        <div>
          <FormLabel htmlFor="development_status">
            Development Status
          </FormLabel>
          <FormTextarea
            {...register('development_status')}
            rows={2}
            placeholder="Development status or notes (supports markdown)"
            disabled={isSubmitting}
          />
        </div>
      </FormSection>

      {/* Development Log Section - Within Development section */}
      {oc && (
        <DevelopmentLogFormSection ocId={oc.id} />
      )}

      <FormSection title="Settings" icon="settings" accentColor="settings" defaultOpen={true}>
        <div className="flex items-center">
          <input
            type="checkbox"
            {...register('is_public')}
            disabled={isSubmitting}
            className="h-4 w-4 text-purple-500 focus:ring-purple-500 border-gray-500 rounded bg-gray-800/60 disabled:opacity-50 cursor-pointer"
          />
          <label className="ml-2 block text-sm text-gray-200">
            Public (visible to everyone)
          </label>
        </div>
      </FormSection>

      {/* Template-Specific Fields Section */}
      {effectiveTemplate && effectiveTemplate.fields && effectiveTemplate.fields.length > 0 && (
        <TemplateFieldsSection
          template={effectiveTemplate as TemplateDefinition}
          templateType={templateType}
          control={control}
          register={register}
          watch={watch}
          isSubmitting={isSubmitting}
        />
      )}

      {/* World Custom Fields Section - Inherited from World (only world_fields.field_sets, excludes character template fields) */}
      {worldFieldDefinitions.length > 0 && (
        <WorldFieldsSection
          fieldDefinitions={worldFieldDefinitions}
          fieldPrefix="modular_fields"
          disabled={isSubmitting}
          title="World-Specific Fields"
          defaultOpen={false}
        />
      )}

      {/* Form Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6 mt-6 border-t-2 border-gray-600/50 bg-gray-800/30 rounded-lg p-4 md:p-5">
        <div className="text-sm text-gray-200 w-full sm:w-auto">
          {isDirty && !isSubmitting && (
            <span className="flex items-center text-amber-400">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              You have unsaved changes
            </span>
          )}
          {isSubmitting && (
            <span className="flex items-center text-purple-300">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-purple-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Saving...
            </span>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
          <FormButton
            type="button"
            variant="secondary"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Cancel
          </FormButton>
          {oc ? (
            <>
              <FormButton
                type="button"
                variant="secondary"
                onClick={handleSaveProgress}
                isLoading={isSubmitting}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                Save Progress
              </FormButton>
              <FormButton
                type="button"
                variant="primary"
                onClick={handleSaveAndClose}
                isLoading={isSubmitting}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
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
              className="w-full sm:w-auto"
            >
              Create Character
            </FormButton>
          )}
        </div>
      </div>
      </form>
      </FormProvider>

      {/* Scroll to Top Button - Rendered outside container via portal */}
      {isMounted && showScrollToTop && createPortal(
        <button
          onClick={() => {
            window.scrollTo({
              top: 0,
              behavior: 'smooth',
            });
          }}
          className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-50 p-3 sm:p-4 bg-gradient-to-br from-pink-600/90 to-pink-700/90 hover:from-pink-500/90 hover:to-pink-600/90 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 border-2 border-pink-400/50 backdrop-blur-sm"
          aria-label="Scroll to top"
        >
          <i className="fas fa-arrow-up text-xl"></i>
        </button>,
        document.body
      )}
    </DropdownOptionsProvider>
  );
}
