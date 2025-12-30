'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { UseFormRegisterReturn, UseFormSetValue, useFormContext } from 'react-hook-form';
import { useDropdownOptions } from '@/hooks/useDropdownOptions';

interface FormColorSelectProps {
  register: UseFormRegisterReturn;
  setValue: UseFormSetValue<any>;
  error?: string;
  helpText?: string;
  optionsSource?: string;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
  name: string;
}

// Helper function to check if a string is a valid hex color
function isValidHexColor(str: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(str);
}

// Helper function to calculate relative luminance (brightness) of a hex color
// Returns a value between 0 (dark) and 1 (light)
function getLuminance(hex: string): number {
  // Remove # if present
  const cleanHex = hex.replace('#', '');
  
  // Handle 3-digit hex
  const r = cleanHex.length === 3 
    ? parseInt(cleanHex[0] + cleanHex[0], 16) 
    : parseInt(cleanHex.substring(0, 2), 16);
  const g = cleanHex.length === 3 
    ? parseInt(cleanHex[1] + cleanHex[1], 16) 
    : parseInt(cleanHex.substring(2, 4), 16);
  const b = cleanHex.length === 3 
    ? parseInt(cleanHex[2] + cleanHex[2], 16) 
    : parseInt(cleanHex.substring(4, 6), 16);
  
  // Calculate relative luminance using WCAG formula
  const [rs, gs, bs] = [r, g, b].map(val => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Helper function to determine if text should be dark or light based on background
function getTextColor(hex: string): string {
  if (!isValidHexColor(hex)) return 'text-gray-50';
  const luminance = getLuminance(hex);
  // If background is light (luminance > 0.5), use dark text; otherwise use light text
  return luminance > 0.5 ? 'text-gray-900' : 'text-gray-50';
}

export function FormColorSelect({
  register,
  setValue,
  error,
  helpText,
  optionsSource,
  options,
  placeholder = 'Select or enter color',
  disabled,
  name,
}: FormColorSelectProps) {
  const { watch } = useFormContext();
  const [inputValue, setInputValue] = useState('');
  const [selectedHex, setSelectedHex] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [originalColorName, setOriginalColorName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  // Watch the current value from the form
  const currentValue = watch(name);

  // Get options and hex codes from database/JSON
  const { options: dbOptions, hexCodes } = useDropdownOptions(optionsSource || name);

  // Helper to get hex code for a color name
  const getColorHex = (colorName: string): string | null => {
    return hexCodes[colorName] || null;
  };

  // Helper to check if color has hex code
  const hasColorHex = (colorName: string): boolean => {
    return colorName in hexCodes;
  };

  // Get options from database/JSON, filtered by field type
  const selectOptions = useMemo(() => {
    if (options) {
      return options;
    }
    
    // Filter options based on field type
    const filtered = dbOptions.filter((colorName) => {
      if (name === 'eye_color' || name === 'hair_color') {
        // For eye/hair colors, include entries with semicolons (e.g., "Red; Dark", "Blue; Cobalt")
        return colorName.includes(';');
      } else if (name === 'skin_tone') {
        // For skin tones, include entries without semicolons
        return !colorName.includes(';');
      }
      return true;
    });
    
    // Convert to array and map to option format
    return filtered
      .sort()
      .map((value) => ({
        value,
        label: value,
      }));
  }, [options, dbOptions, name]);

  // Initialize input value from form
  useEffect(() => {
    const value = currentValue || '';
    
    // Check if value is in "Color Name|#hex" format
    if (value.includes('|')) {
      const [colorName, hex] = value.split('|');
      if (colorName && hex && isValidHexColor(hex.trim())) {
        setInputValue(colorName.trim());
        setSelectedHex(hex.trim());
        setOriginalColorName(colorName.trim());
        return;
      }
    }
    
    // Check if value is in "#hex Color Name" format (hex at beginning)
    const hexAtStartMatch = value.match(/^(#[0-9A-Fa-f]{6})\s+(.+)$/i);
    if (hexAtStartMatch) {
      const hex = hexAtStartMatch[1];
      const colorName = hexAtStartMatch[2].trim();
      setInputValue(colorName);
      setSelectedHex(hex);
      setOriginalColorName(colorName);
      return;
    }
    
    setInputValue(value);
    
    // If current value is a hex color, set it
    if (isValidHexColor(value)) {
      setSelectedHex(value);
      setOriginalColorName(''); // Clear original name if it's a hex
    } else if (value && hasColorHex(value)) {
      // If it's a color name, set both the name and its hex
      const hex = getColorHex(value);
      if (hex) {
        setSelectedHex(hex);
        setOriginalColorName(value);
      } else {
        setSelectedHex('');
        setOriginalColorName(value);
      }
    } else {
      // It's a custom text value (not a recognized color name)
      setSelectedHex('');
      setOriginalColorName('');
    }
  }, [currentValue]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setOriginalColorName(value);
    
    // If it's a recognized color name, auto-fill the hex
    if (value && hasColorHex(value)) {
      const hex = getColorHex(value);
      if (hex) {
        setSelectedHex(hex);
        // Store as "Color Name|#hex" format to save hex code with the color name
        setValue(name, `${value}|${hex}`, { shouldValidate: true });
      } else {
        setSelectedHex('');
        setValue(name, value, { shouldValidate: true });
      }
    } else {
      // Not a recognized color name, just set the value
      setSelectedHex('');
      setValue(name, value, { shouldValidate: true });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setSearchQuery(value); // Update search query for autocomplete
    setShowDropdown(true); // Show dropdown when typing
    
    // Check if it's a recognized color name
    if (value && hasColorHex(value)) {
      const hex = getColorHex(value);
      if (hex) {
        setSelectedHex(hex);
        setOriginalColorName(value);
        // Store as "Color Name|#hex" format
        setValue(name, `${value}|${hex}`, { shouldValidate: true });
      } else {
        setSelectedHex('');
        setOriginalColorName(value);
        setValue(name, value, { shouldValidate: true });
      }
    } else if (value.trim()) {
      // Custom text value - keep the name, preserve hex if we have one
      setOriginalColorName(value);
      // If we have a hex, store as "Color Name|#hex", otherwise just the name
      if (selectedHex && isValidHexColor(selectedHex)) {
        setValue(name, `${value}|${selectedHex}`, { shouldValidate: true });
      } else {
        setValue(name, value, { shouldValidate: true });
      }
    } else {
      // Empty value
      setSelectedHex('');
      setOriginalColorName('');
      setValue(name, '', { shouldValidate: true });
    }
  };

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setSelectedHex(hex);
    // If we have a color name (from inputValue), store as "Color Name|#hex"
    // Otherwise, store just the hex
    if (inputValue.trim()) {
      // Store as "Color Name|#hex" format to preserve both
      setValue(name, `${inputValue.trim()}|${hex}`, { shouldValidate: true });
    } else {
      // No color name, store just the hex
      setValue(name, hex, { shouldValidate: true });
    }
  };

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Add # if user types without it and it looks like a hex
    if (value && !value.startsWith('#') && /^[0-9A-Fa-f]{3,6}$/.test(value)) {
      value = '#' + value;
    }
    
    setSelectedHex(value);
    
    // If we have a color name (from inputValue), store as "Color Name|#hex"
    // Otherwise, if it's a valid hex, store just the hex
    if (inputValue.trim() && isValidHexColor(value)) {
      // Store as "Color Name|#hex" format to preserve both
      setValue(name, `${inputValue.trim()}|${value}`, { shouldValidate: true });
    } else if (isValidHexColor(value)) {
      // Just hex, no color name
      setValue(name, value, { shouldValidate: true });
    } else if (inputValue.trim()) {
      // Invalid hex but we have a color name, store just the name
      setValue(name, inputValue.trim(), { shouldValidate: true });
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showDropdown) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showDropdown]);

  // Get hex color for an option
  const getOptionHex = (optionValue: string): string | null => {
    return getColorHex(optionValue) || (isValidHexColor(optionValue) ? optionValue : null);
  };

  // Filter options based on search query (use inputValue if searchQuery is empty)
  const filteredOptions = useMemo(() => {
    const query = (searchQuery || inputValue || '').toLowerCase().trim();
    if (!query) return selectOptions;
    
    return selectOptions.filter(option => {
      const optionHex = getColorHex(option.value) || (isValidHexColor(option.value) ? option.value : null);
      return (
        option.label.toLowerCase().includes(query) ||
        (optionHex && optionHex.toLowerCase().includes(query))
      );
    });
  }, [selectOptions, searchQuery, inputValue]);

  const baseClasses = 'w-full px-4 py-2.5 bg-gray-900/60 border border-gray-500/60 rounded-lg text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/70 focus:border-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed';

  // Check if we should show color swatch
  const displayHex = selectedHex || getOptionHex(inputValue);
  const hasColorSwatch = displayHex && isValidHexColor(displayHex);

  return (
    <div className="space-y-2" ref={containerRef}>
      {/* Editable input with autocomplete dropdown */}
      <div className="relative">
        <div className="relative flex items-center">
          {/* Color swatch indicator */}
          {hasColorSwatch && (
            <div 
              className="absolute left-3 w-5 h-5 rounded border-2 border-gray-600 pointer-events-none z-10"
              style={{ backgroundColor: displayHex }}
            />
          )}
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setShowDropdown(true)}
            placeholder={placeholder}
            disabled={disabled}
            className={`${baseClasses} pr-10 ${hasColorSwatch ? 'pl-10' : ''}`}
          />
          {/* Dropdown arrow button */}
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            disabled={disabled}
            className="absolute right-2 p-1 text-gray-400 hover:text-gray-300 transition-colors"
          >
            <svg
              className={`w-5 h-5 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
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
          </button>
        </div>
        
        {/* Autocomplete dropdown menu with color swatches */}
        {showDropdown && filteredOptions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-96 overflow-auto">
            <div className="py-1">
              {filteredOptions.map((option) => {
                const optionHex = getOptionHex(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      handleSelectChange({ target: { value: option.value } } as React.ChangeEvent<HTMLSelectElement>);
                      setShowDropdown(false);
                      setSearchQuery('');
                    }}
                    className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-gray-700 transition-colors text-gray-200"
                  >
                    {optionHex && isValidHexColor(optionHex) ? (
                      <>
                        <div 
                          className="w-6 h-6 rounded border-2 border-gray-500 flex-shrink-0"
                          style={{ backgroundColor: optionHex }}
                        />
                        <span className="flex-1">{option.label}</span>
                        <span className="text-xs text-gray-400 font-mono flex-shrink-0">{optionHex}</span>
                      </>
                    ) : (
                      <span className="flex-1">{option.label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Hex code input and color picker */}
      <div className="flex gap-2">
        <input
          type="text"
          value={selectedHex}
          onChange={handleHexInputChange}
          placeholder="Hex color (e.g., #FF5733) - optional"
          disabled={disabled}
          style={{
            backgroundColor: selectedHex && isValidHexColor(selectedHex) ? selectedHex : undefined,
          }}
          className={`${baseClasses} flex-1 font-mono ${selectedHex && isValidHexColor(selectedHex) ? getTextColor(selectedHex) : ''}`}
        />
        {/* Color picker button */}
        <button
          type="button"
          onClick={() => setShowColorPicker(!showColorPicker)}
          disabled={disabled}
          className="px-4 py-2.5 bg-gray-800/60 border border-gray-500/60 rounded-lg text-gray-50 hover:bg-gray-700/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          title="Open color picker"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
            />
          </svg>
        </button>
      </div>

      {/* Color picker and hex input (shown when picker is open) */}
      {showColorPicker && (
        <div className="p-4 bg-gray-800/60 border border-gray-500/60 rounded-lg space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-200 whitespace-nowrap">
              Color Picker:
            </label>
            <input
              type="color"
              value={selectedHex || '#000000'}
              onChange={handleColorPickerChange}
              disabled={disabled}
              className="h-10 w-20 cursor-pointer rounded border border-gray-500/60"
            />
            <div className="flex-1">
              <input
                type="text"
                value={selectedHex}
                onChange={handleHexInputChange}
                placeholder="#000000"
                disabled={disabled}
                className={`${baseClasses} text-sm font-mono`}
                maxLength={7}
              />
            </div>
          </div>
          {selectedHex && isValidHexColor(selectedHex) && (
            <div className="text-xs text-gray-400">
              Selected: <span className="font-mono text-gray-300">{selectedHex}</span>
            </div>
          )}
        </div>
      )}

      {/* Hidden input for form registration */}
      <input type="hidden" {...register} />

      {error && (
        <p className="mt-1.5 text-sm text-red-400 font-medium">{error}</p>
      )}
      {helpText && !error && (
        <p className="mt-1.5 text-xs text-gray-400/80">{helpText}</p>
      )}
    </div>
  );
}

