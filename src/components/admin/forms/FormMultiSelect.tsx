'use client';

import React, { useMemo, useState, useRef, forwardRef } from 'react';
import { UseFormRegisterReturn, useFormContext } from 'react-hook-form';
import { csvOptions } from '@/lib/utils/csvOptionsData';
import { useDropdownOptions } from '@/hooks/useDropdownOptions';

interface FormMultiSelectProps {
  register?: UseFormRegisterReturn;
  error?: string;
  helpText?: string;
  options?: Array<{ value: string; label: string }>;
  optionsSource?: keyof typeof csvOptions | string; // Allow string for fields not in csvOptions
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  name?: string;
}

export const FormMultiSelect = forwardRef<HTMLSelectElement, FormMultiSelectProps>(function FormMultiSelect({
  register,
  error,
  helpText,
  options,
  optionsSource,
  placeholder = 'Select options',
  className = '',
  disabled,
  name,
}, ref) {
  const [searchQuery, setSearchQuery] = useState('');
  const [customInput, setCustomInput] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  
  const formContext = useFormContext();
  const fieldName = register?.name || name || '';
  const fieldValue = formContext?.watch(fieldName) || '';

  // Fetch options from database first, fallback to generated file
  // The hook already handles the fallback, so we can use it directly
  const { options: dbOptions, isLoading } = useDropdownOptions(optionsSource);

  // Parse current value (comma-separated string) into array
  const selectedValues = useMemo(() => {
    if (!fieldValue || typeof fieldValue !== 'string') return [];
    return fieldValue.split(',').map(v => v.trim()).filter(Boolean);
  }, [fieldValue]);

  // Get options: use provided options, then database/generated file from hook
  // Also include custom values from selectedValues that aren't in the options
  const selectOptions = useMemo(() => {
    const baseOptions: Array<{ value: string; label: string }> = [];
    
    if (options) {
      // Use provided options prop
      baseOptions.push(...options);
    } else if (optionsSource) {
      // Hook already provides database options or fallback to generated file
      // dbOptions is the result from useDropdownOptions hook
      console.log(`[FormMultiSelect] Building options for "${optionsSource}":`, {
        dbOptionsLength: dbOptions.length,
        isLoading,
        sampleOptions: dbOptions.slice(0, 5),
      });
      baseOptions.push(...dbOptions.map((val) => ({
        value: val,
        label: val,
      })));
    }
    
    // Add custom values from selectedValues that aren't in base options
    const baseValues = new Set(baseOptions.map(opt => opt.value.toLowerCase()));
    selectedValues.forEach(val => {
      if (val && !baseValues.has(val.toLowerCase())) {
        baseOptions.push({
          value: val,
          label: val,
        });
      }
    });
    
    return baseOptions;
  }, [options, optionsSource, dbOptions, selectedValues]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return selectOptions;
    const query = searchQuery.toLowerCase();
    return selectOptions.filter(option =>
      option.label.toLowerCase().includes(query)
    );
  }, [selectOptions, searchQuery]);

  // Handle adding custom trait
  const handleAddCustom = () => {
    if (!customInput.trim() || disabled) return;
    
    const trimmed = customInput.trim();
    // Check if already selected
    if (selectedValues.includes(trimmed)) {
      setCustomInput('');
      return;
    }
    
    // Add to selected values
    const newSelectedValues = [...selectedValues, trimmed];
    const newValue = newSelectedValues.join(',');
    
    // Create a synthetic event for react-hook-form
    const syntheticEvent = {
      target: { 
        value: newValue, 
        name: fieldName,
        type: 'select-multiple',
      },
      type: 'change',
    } as any;
    
    // Call register onChange if provided
    if (register?.onChange) {
      register.onChange(syntheticEvent);
    }
    
    // Also update form value directly
    if (formContext && fieldName) {
      formContext.setValue(fieldName, newValue, { shouldDirty: true });
    }
    
    setCustomInput('');
  };

  // Handle option toggle
  const handleOptionToggle = (value: string) => {
    if (disabled) return;
    
    const newSelectedValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    
    const newValue = newSelectedValues.join(',');
    
    // Create a synthetic event for react-hook-form
    const syntheticEvent = {
      target: { 
        value: newValue, 
        name: fieldName,
        type: 'select-multiple',
      },
      type: 'change',
    } as any;
    
    // Call register onChange if provided
    if (register?.onChange) {
      register.onChange(syntheticEvent);
    }
    
    // Also update form value directly
    if (formContext && fieldName) {
      formContext.setValue(fieldName, newValue, { shouldDirty: true });
    }
  };

  // Handle blur event
  const handleBlur = (e: React.FocusEvent) => {
    // Only trigger blur if focus is leaving the entire component
    if (containerRef.current && !containerRef.current.contains(e.relatedTarget as Node)) {
      if (register?.onBlur) {
        const syntheticEvent = {
          target: { 
            value: fieldValue || '', 
            name: fieldName,
            type: 'select-multiple',
          },
          type: 'blur',
        } as any;
        register.onBlur(syntheticEvent);
      }
    }
  };

  return (
    <div ref={containerRef} onBlur={handleBlur} className={className} tabIndex={-1}>
      {/* Add Custom Trait */}
      <div className="mb-2 flex gap-2">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddCustom();
            }
          }}
          placeholder="Add custom trait..."
          disabled={disabled}
          className="flex-1 px-3 py-2 bg-gray-900/60 border border-gray-500/60 rounded-lg text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/70 focus:border-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          onClick={handleAddCustom}
          disabled={disabled || !customInput.trim()}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Add
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search ${placeholder.toLowerCase()}...`}
          disabled={disabled}
          className="w-full px-3 py-2 bg-gray-900/60 border border-gray-500/60 rounded-lg text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/70 focus:border-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Options List */}
      <div className="w-full bg-gray-900/60 border border-gray-500/60 rounded-lg overflow-hidden">
        <div className="max-h-[240px] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-400 text-sm">
              Loading options...
            </div>
          ) : filteredOptions.length > 0 ? (
            <div className="p-1">
              {filteredOptions.map((option) => {
                const isSelected = selectedValues.includes(option.value);
                return (
                  <div
                    key={option.value}
                    onClick={() => handleOptionToggle(option.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-purple-500/20 text-purple-200'
                        : 'text-gray-200 hover:bg-gray-700/50'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {/* Checkmark */}
                    <div className={`flex-shrink-0 w-5 h-5 flex items-center justify-center rounded border-2 ${
                      isSelected
                        ? 'bg-purple-500 border-purple-500'
                        : 'border-gray-500'
                    }`}>
                      {isSelected && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    {/* Option Label */}
                    <span className="flex-1 text-sm">{option.label}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-400 text-sm">
              No options found
            </div>
          )}
        </div>
      </div>

      {/* Selected count */}
      {selectedValues.length > 0 && (
        <p className="mt-2 text-xs text-gray-400/80">
          Selected: {selectedValues.length} {selectedValues.length === 1 ? 'trait' : 'traits'}
        </p>
      )}

      {/* Error message */}
      {error && (
        <p className="mt-1.5 text-sm text-red-400 font-medium">{error}</p>
      )}

      {/* Help text */}
      {helpText && !error && (
        <p className="mt-1.5 text-xs text-gray-400/80">{helpText}</p>
      )}
    </div>
  );
});

