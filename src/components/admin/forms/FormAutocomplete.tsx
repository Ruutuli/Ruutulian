'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { UseFormRegisterReturn, ControllerRenderProps } from 'react-hook-form';
import { useDropdownOptions } from '@/hooks/useDropdownOptions';
import { useDropdownPosition } from '@/hooks/useDropdownPosition';
import { logger } from '@/lib/logger';

interface FormAutocompleteProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'onBlur' | 'onKeyDown'> {
  register?: UseFormRegisterReturn;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  error?: string;
  helpText?: string;
  options?: string[];
  optionsSource?: string;
  placeholder?: string;
  allowCustom?: boolean; // Allow adding custom values not in the options list
}

export const FormAutocomplete = React.forwardRef<HTMLInputElement, FormAutocompleteProps>(
  ({
    register,
    error,
    helpText,
    options,
    optionsSource,
    placeholder = 'Type to search...',
    className = '',
    disabled,
    value,
    onChange,
    onBlur,
    allowCustom, // Don't default - will be set based on optionsSource below
    ...props
  }, ref) => {
    // Default allowCustom to true when optionsSource is provided (unless explicitly set to false)
    const finalAllowCustom = allowCustom !== undefined ? allowCustom : (optionsSource ? true : false);
    // Handle both register and Controller field props
    let registerOnChange: ((e: React.ChangeEvent<HTMLInputElement>) => void) | undefined;
    let registerOnBlur: ((e: React.FocusEvent<HTMLInputElement>) => void) | undefined;
    let registerRef: React.Ref<HTMLInputElement> | undefined;
    let fieldName: string | undefined;
    let finalRef: React.Ref<HTMLInputElement>;
    let otherRegisterProps: any = {};
    
    if (register) {
      const { ref: regRef, onChange: regOnChange, onBlur: regOnBlur, name: regName, ...regProps } = register;
      registerOnChange = regOnChange;
      registerOnBlur = regOnBlur;
      registerRef = regRef;
      fieldName = regName;
      otherRegisterProps = regProps;
      finalRef = registerRef || ref;
    } else {
      // Using Controller field props
      registerOnChange = onChange;
      registerOnBlur = onBlur;
      finalRef = ref;
    }
    
    const [inputValue, setInputValue] = useState(value || '');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLUListElement>(null);
    const blurTimeoutRef = useRef<number | null>(null);

    // Fetch options from database first, fallback to generated file
    // The hook already handles the fallback, so we can use it directly
    const { options: dbOptions, isLoading, error: hookError } = useDropdownOptions(optionsSource);

    // Get options: use provided options, then database/generated file from hook
    const availableOptions = useMemo(() => {
      if (options) {
        return options;
      }
      if (optionsSource) {
        // Hook already provides database options or fallback to generated file
        const opts = dbOptions || [];
        
        // Debug logging in development
        if (process.env.NODE_ENV === 'development' && isLoading === false) {
          if (opts.length === 0 && !hookError) {
            logger.warn('Component', `FormAutocomplete: No options found for field "${optionsSource}"`);
          }
        }
        
        return opts;
      }
      return [];
    }, [options, optionsSource, dbOptions, isLoading, hookError]);

    // Filter suggestions based on input
    const filteredSuggestions = useMemo(() => {
      if (!inputValue.trim()) {
        return availableOptions.slice(0, 10); // Show first 10 when empty
      }
      const lowerInput = inputValue.toLowerCase();
      const matching = availableOptions
        .filter(option => option.toLowerCase().includes(lowerInput))
        .slice(0, 10); // Limit to 10 suggestions
      
      // If allowCustom is true and input doesn't exactly match any option, add "Add [value]" option
      if (finalAllowCustom && inputValue.trim()) {
        const exactMatch = availableOptions.some(opt => opt.toLowerCase() === lowerInput);
        if (!exactMatch) {
          return [...matching, `Add "${inputValue.trim()}"`];
        }
      }
      
      return matching;
    }, [inputValue, availableOptions, finalAllowCustom]);

    // Calculate dropdown position (above or below)
    const showAbove = useDropdownPosition({
      inputRef,
      isVisible: showSuggestions,
      dropdownHeight: 240,
      dependencies: [filteredSuggestions.length],
    });

    // Sync with external value prop (from Controller field)
    useEffect(() => {
      if (value !== undefined && value !== inputValue) {
        setInputValue(value);
      }
    }, [value, inputValue]);

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      setShowSuggestions(true);
      setHighlightedIndex(-1);
      
      // Call register's onChange if it exists
      if (registerOnChange) {
        registerOnChange(e);
      }
    };

    // Handle suggestion selection
    const handleSelectSuggestion = (suggestion: string) => {
      // If it's a "Add [value]" option, extract the actual value
      let finalValue = suggestion;
      if (finalAllowCustom && suggestion.startsWith('Add "') && suggestion.endsWith('"')) {
        finalValue = suggestion.slice(5, -1); // Remove 'Add "' prefix and '"' suffix
      }
      
      setInputValue(finalValue);
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      
      // Create a synthetic event for react-hook-form
      const syntheticEvent = {
        target: { value: finalValue, name: fieldName || '' },
        type: 'change',
      } as React.ChangeEvent<HTMLInputElement>;
      
      if (registerOnChange) {
        registerOnChange(syntheticEvent);
      }
    };

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions || filteredSuggestions.length === 0) {
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex(prev => 
            prev < filteredSuggestions.length - 1 ? prev + 1 : prev
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
          } else if (finalAllowCustom && inputValue.trim()) {
            // If no suggestion is highlighted but allowCustom is true, use the input value
            const exactMatch = availableOptions.some(opt => opt.toLowerCase() === inputValue.toLowerCase());
            if (!exactMatch) {
              handleSelectSuggestion(inputValue.trim());
            }
          }
          break;
        case 'Escape':
          setShowSuggestions(false);
          setHighlightedIndex(-1);
          break;
      }
    };
    
    // Handle blur
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Delay to allow click on suggestion to register
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
      blurTimeoutRef.current = window.setTimeout(() => {
        setShowSuggestions(false);
        if (registerOnBlur) {
          registerOnBlur(e);
        }
        blurTimeoutRef.current = null;
      }, 200);
    };

    // Prevent blur timers from firing after unmount
    useEffect(() => {
      return () => {
        if (blurTimeoutRef.current) {
          clearTimeout(blurTimeoutRef.current);
          blurTimeoutRef.current = null;
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

    const baseClasses = 'w-full px-4 py-2.5 bg-gray-900/60 border border-gray-500/60 rounded-lg text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/70 focus:border-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed';

    // Merge refs to track input element for positioning
    const setInputRefs = (node: HTMLInputElement | null) => {
      if (inputRef) {
        (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
      }
      if (typeof finalRef === 'function') {
        finalRef(node);
      } else if (finalRef && 'current' in finalRef) {
        (finalRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
      }
    };

    return (
      <div ref={containerRef} className="relative">
        <input
          {...otherRegisterProps}
          {...props}
          ref={setInputRefs}
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
          placeholder={placeholder}
          className={`${baseClasses} ${className}`}
          autoComplete="off"
        />
        
        {showSuggestions && filteredSuggestions.length > 0 && (
          <ul
            ref={suggestionsRef}
            className={`absolute z-[99999] w-full max-h-60 overflow-auto bg-gray-800 border border-gray-600 rounded-lg shadow-lg ${
              showAbove ? 'bottom-full mb-1' : 'top-full mt-1'
            }`}
          >
            {filteredSuggestions.map((suggestion, index) => {
              const isAddOption = finalAllowCustom && suggestion.startsWith('Add "');
              return (
                <li
                  key={suggestion}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`px-4 py-2 cursor-pointer transition-colors ${
                    index === highlightedIndex
                      ? 'bg-purple-600/50 text-white'
                      : 'text-gray-200 hover:bg-gray-700'
                  } ${isAddOption ? 'italic text-purple-300' : ''}`}
                >
                  {suggestion}
                </li>
              );
            })}
          </ul>
        )}
        
        {error && (
          <p className="mt-1.5 text-sm text-red-400 font-medium">{error}</p>
        )}
        {helpText && !error && (
          <p className="mt-1.5 text-xs text-gray-400/80">{helpText}</p>
        )}
      </div>
    );
  }
);

FormAutocomplete.displayName = 'FormAutocomplete';

