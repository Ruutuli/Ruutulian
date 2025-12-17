'use client';

import { useState, useEffect, useMemo } from 'react';
import { csvOptions } from '@/lib/utils/csvOptionsData';

// Import colorHexCodes with fallback (may not exist until generate script runs)
let colorHexCodes: Record<string, Record<string, string>> = {};
try {
  const colorHexCodesModule = require('@/lib/utils/csvOptionsData');
  colorHexCodes = colorHexCodesModule.colorHexCodes || {};
} catch {
  // Fallback if colorHexCodes doesn't exist yet
  colorHexCodes = {};
}

type DropdownField = keyof typeof csvOptions | string; // Allow string for fields not in csvOptions

interface UseDropdownOptionsResult {
  options: string[];
  hexCodes: Record<string, string>; // option -> hex_code
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch dropdown options from database first, with fallback to generated file
 * This ensures form components always have the latest data
 */
export function useDropdownOptions(field: DropdownField | undefined): UseDropdownOptionsResult {
  // Initialize with hardcoded options immediately for instant availability
  const getInitialOptions = (): string[] => {
    if (field && csvOptions[field]) {
      return csvOptions[field];
    }
    return [];
  };

  const getInitialHexCodes = (): Record<string, string> => {
    if (field && colorHexCodes && colorHexCodes[field]) {
      return colorHexCodes[field];
    }
    return {};
  };

  const [dbOptions, setDbOptions] = useState<string[] | null>(null);
  const [dbHexCodes, setDbHexCodes] = useState<Record<string, string> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!field) {
      setDbOptions(null);
      setDbHexCodes(null);
      setIsLoading(false);
      return;
    }

    // Fetch from database in the background
    // Hardcoded options are already available, so this is just an update
    setIsLoading(true);
    setError(null);
    
    fetch('/api/admin/dropdown-options')
      .then(res => {
        if (!res.ok) {
          // Don't throw for 401/403 - just use fallback silently
          if (res.status === 401 || res.status === 403) {
            setDbOptions(null);
            setDbHexCodes(null);
            setIsLoading(false);
            return null;
          }
          throw new Error(`Failed to fetch options: ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        if (!data) return; // Handled auth error above
        
        // Debug logging
        console.log(`[useDropdownOptions] Field: "${field}"`, {
          hasData: !!data,
          hasOptions: !!data.options,
          allFields: data.options ? Object.keys(data.options) : [],
          fieldExists: data.options && field in data.options,
          fieldValue: data.options?.[field],
          fieldValueLength: data.options?.[field]?.length || 0,
        });
        
        // Check if field exists (with case-insensitive fallback)
        let fieldData: string[] | undefined = data.options?.[field];
        let hexCodeData: Record<string, string> | undefined = data.hexCodes?.[field];
        
        if (!fieldData && data.options) {
          // Try case-insensitive match
          const fieldKeys = Object.keys(data.options);
          const matchingKey = fieldKeys.find(k => k.toLowerCase() === field.toLowerCase());
          if (matchingKey) {
            console.log(`[useDropdownOptions] Found case-insensitive match: "${matchingKey}" for "${field}"`);
            fieldData = data.options[matchingKey];
            hexCodeData = data.hexCodes?.[matchingKey];
          }
        }
        
        if (fieldData && Array.isArray(fieldData)) {
          console.log(`[useDropdownOptions] Updating with ${fieldData.length} options from database for "${field}"`);
          setDbOptions(fieldData);
          setDbHexCodes(hexCodeData || {});
        } else {
          console.warn(`[useDropdownOptions] Field "${field}" not found in database, keeping hardcoded fallback`);
          // Field not found in database, keep using hardcoded fallback
          setDbOptions(null);
          setDbHexCodes(null);
        }
        setIsLoading(false);
      })
      .catch(err => {
        setError(err);
        // On error, keep using hardcoded fallback (don't clear dbOptions to null)
        // This way the hardcoded options remain available
        setDbOptions(null);
        setDbHexCodes(null);
        setIsLoading(false);
      });
  }, [field]);

  // Return database options if available, otherwise use hardcoded fallback immediately
  // This ensures options are always available right away
  const options = useMemo(() => {
    // If we have database options (not null), use them (even if empty array)
    // This handles the case where field exists in DB but has no options yet
    if (dbOptions !== null) {
      return dbOptions;
    }
    // Use hardcoded options immediately (preloaded for instant availability)
    return getInitialOptions();
  }, [dbOptions, field]);

  // Return hex codes from database or fallback to hardcoded file
  const hexCodes = useMemo(() => {
    if (dbHexCodes !== null) {
      return dbHexCodes;
    }
    // Use hardcoded hex codes immediately
    return getInitialHexCodes();
  }, [dbHexCodes, field]);

  return {
    options,
    hexCodes,
    isLoading,
    error,
  };
}


