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
  const [dbOptions, setDbOptions] = useState<string[] | null>(null);
  const [dbHexCodes, setDbHexCodes] = useState<Record<string, string> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!field) {
      setDbOptions(null);
      return;
    }

    // Fetch from database
    setIsLoading(true);
    setError(null);
    
    fetch('/api/admin/dropdown-options')
      .then(res => {
        if (!res.ok) {
          // Don't throw for 401/403 - just use fallback silently
          if (res.status === 401 || res.status === 403) {
            setDbOptions(null);
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
          console.log(`[useDropdownOptions] Setting ${fieldData.length} options for "${field}"`);
          setDbOptions(fieldData);
          setDbHexCodes(hexCodeData || {});
        } else {
          console.warn(`[useDropdownOptions] Field "${field}" not found, using fallback`);
          // Field not found in database, will use fallback
          setDbOptions(null);
          setDbHexCodes(null);
        }
        setIsLoading(false);
      })
      .catch(err => {
        setError(err);
        setDbOptions(null);
        setDbHexCodes(null);
        setIsLoading(false);
      });
  }, [field]);

  // Return database options if available, otherwise fallback to generated file
  // Always provide fallback immediately so components work while fetching
  const options = useMemo(() => {
    // If we have database options (not null), use them (even if empty array)
    // This handles the case where field exists in DB but has no options yet
    if (dbOptions !== null) {
      return dbOptions;
    }
    // Fallback to generated file (always available, even while fetching)
    if (field && csvOptions[field]) {
      return csvOptions[field];
    }
    // If field is not in csvOptions, return empty array but keep loading state
    // This allows the component to show loading or wait for database fetch
    return [];
  }, [dbOptions, field]);

  // Return hex codes from database or fallback to generated file
  const hexCodes = useMemo(() => {
    if (dbHexCodes !== null) {
      return dbHexCodes;
    }
    // Fallback to generated file
    if (field && colorHexCodes && colorHexCodes[field]) {
      return colorHexCodes[field];
    }
    return {};
  }, [dbHexCodes, field]);

  return {
    options,
    hexCodes,
    isLoading,
    error,
  };
}


