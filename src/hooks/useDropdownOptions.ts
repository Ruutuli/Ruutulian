'use client';

import { useState, useEffect, useMemo } from 'react';
import { csvOptions } from '@/lib/utils/csvOptionsData';

type DropdownField = keyof typeof csvOptions | string; // Allow string for fields not in csvOptions

interface UseDropdownOptionsResult {
  options: string[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch dropdown options from database first, with fallback to generated file
 * This ensures form components always have the latest data
 */
export function useDropdownOptions(field: DropdownField | undefined): UseDropdownOptionsResult {
  const [dbOptions, setDbOptions] = useState<string[] | null>(null);
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
            console.log(`[useDropdownOptions] Auth not available for ${field}, using fallback`);
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
        console.log(`[useDropdownOptions] Fetched data for field "${field}":`, {
          hasOptions: !!data.options,
          fieldsInData: data.options ? Object.keys(data.options) : [],
          hasField: data.options && data.options[field] !== undefined,
          fieldValue: data.options && data.options[field],
          fieldValueLength: data.options && data.options[field] ? data.options[field].length : 0,
        });
        
        if (data.options && data.options[field]) {
          console.log(`[useDropdownOptions] Setting dbOptions for "${field}":`, data.options[field].length, 'options');
          setDbOptions(data.options[field]);
        } else {
          // Field not found in database, will use fallback
          console.warn(`[useDropdownOptions] Field "${field}" not found in database response`);
          // Check if field exists with different casing
          if (data.options) {
            const fieldKeys = Object.keys(data.options);
            const matchingKey = fieldKeys.find(k => k.toLowerCase() === field.toLowerCase());
            if (matchingKey) {
              console.log(`[useDropdownOptions] Found field with different casing: "${matchingKey}" (looking for "${field}")`);
              setDbOptions(data.options[matchingKey]);
            } else {
              setDbOptions(null);
            }
          } else {
            setDbOptions(null);
          }
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.warn(`[useDropdownOptions] Failed to fetch ${field} from database, using fallback:`, err);
        setError(err);
        setDbOptions(null);
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

  return {
    options,
    isLoading,
    error,
  };
}


