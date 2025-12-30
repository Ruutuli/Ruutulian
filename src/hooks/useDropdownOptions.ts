'use client';

import { useState, useEffect, useMemo } from 'react';
import { useDropdownOptionsContext } from '@/contexts/DropdownOptionsContext';

type DropdownField = string;

interface UseDropdownOptionsResult {
  options: string[];
  hexCodes: Record<string, string>; // option -> hex_code
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch dropdown options from database
 * Uses shared context if available, otherwise falls back to direct API call
 */
export function useDropdownOptions(field: DropdownField | undefined): UseDropdownOptionsResult {
  const context = useDropdownOptionsContext();
  const [dbOptions, setDbOptions] = useState<string[]>([]);
  const [dbHexCodes, setDbHexCodes] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  // Check if context is available (has data or is loading)
  const contextAvailable = context.data !== null || context.isLoading;

  useEffect(() => {
    if (!field) {
      setDbOptions([]);
      setDbHexCodes({});
      setIsLoading(false);
      return;
    }

    // Use context if available
    if (contextAvailable && !useFallback) {
      setIsLoading(context.isLoading);
      setError(context.error);

      if (context.data) {
        // Extract field-specific data from context
        let fieldData: string[] | undefined = context.data.options?.[field];
        let hexCodeData: Record<string, string> | undefined = context.data.hexCodes?.[field];

        if (!fieldData && context.data.options) {
          // Try case-insensitive match
          const fieldKeys = Object.keys(context.data.options);
          const matchingKey = fieldKeys.find(k => k.toLowerCase() === field.toLowerCase());
          if (matchingKey) {
            fieldData = context.data.options[matchingKey];
            hexCodeData = context.data.hexCodes?.[matchingKey];
          }
        }

        setDbOptions(fieldData && Array.isArray(fieldData) ? fieldData : []);
        setDbHexCodes(hexCodeData || {});
        setIsLoading(false);
      }
      return;
    }

    // Fallback to direct API call if context is not available
    setIsLoading(true);
    setError(null);
    
    fetch('/api/admin/dropdown-options')
      .then(res => {
        if (!res.ok) {
          // Don't throw for 401/403 - just return empty
          if (res.status === 401 || res.status === 403) {
            console.warn(`[useDropdownOptions] Auth error for field "${field}":`, res.status);
            setDbOptions([]);
            setDbHexCodes({});
            setIsLoading(false);
            return null;
          }
          // Log error details
          console.error(`[useDropdownOptions] Failed to fetch options for field "${field}":`, res.status, res.statusText);
          throw new Error(`Failed to fetch options: ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        if (!data) return; // Handled auth error above
        
        // Check if field exists (with case-insensitive fallback)
        let fieldData: string[] | undefined = data.options?.[field];
        let hexCodeData: Record<string, string> | undefined = data.hexCodes?.[field];
        
        if (!fieldData && data.options) {
          // Try case-insensitive match
          const fieldKeys = Object.keys(data.options);
          const matchingKey = fieldKeys.find(k => k.toLowerCase() === field.toLowerCase());
          if (matchingKey) {
            fieldData = data.options[matchingKey];
            hexCodeData = data.hexCodes?.[matchingKey];
          }
        }
        
        setDbOptions(fieldData && Array.isArray(fieldData) ? fieldData : []);
        setDbHexCodes(hexCodeData || {});
        setIsLoading(false);
      })
      .catch(err => {
        console.error(`[useDropdownOptions] Error fetching options for field "${field}":`, err);
        setError(err);
        setDbOptions([]);
        setDbHexCodes({});
        setIsLoading(false);
      });
  }, [field, contextAvailable, context.data, context.isLoading, context.error, useFallback]);

  return {
    options: dbOptions,
    hexCodes: dbHexCodes,
    isLoading,
    error,
  };
}


