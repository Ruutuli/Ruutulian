'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

interface DropdownOptionsData {
  options: Record<string, string[]>;
  hexCodes: Record<string, Record<string, string>>;
}

interface DropdownOptionsContextValue {
  data: DropdownOptionsData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const DropdownOptionsContext = createContext<DropdownOptionsContextValue | null>(null);

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface DropdownOptionsProviderProps {
  children: React.ReactNode;
}

export function DropdownOptionsProvider({ children }: DropdownOptionsProviderProps) {
  const [data, setData] = useState<DropdownOptionsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const fetchPromiseRef = useRef<Promise<void> | null>(null);

  const fetchOptions = useCallback(async (): Promise<void> => {
    // If there's already a fetch in progress, return that promise
    if (fetchPromiseRef.current) {
      return fetchPromiseRef.current;
    }

    const fetchPromise = (async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/admin/dropdown-options');
        
        if (!response.ok) {
          // Don't throw for 401/403 - just return empty data
          if (response.status === 401 || response.status === 403) {
            console.warn('[DropdownOptionsContext] Auth error:', response.status);
            setData({ options: {}, hexCodes: {} });
            setIsLoading(false);
            setLastFetchTime(Date.now());
            return;
          }
          
          throw new Error(`Failed to fetch dropdown options: ${response.statusText}`);
        }

        const result = await response.json();
        setData({
          options: result.options || {},
          hexCodes: result.hexCodes || {},
        });
        setLastFetchTime(Date.now());
        setError(null);
      } catch (err) {
        console.error('[DropdownOptionsContext] Error fetching dropdown options:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch dropdown options'));
        // Keep existing data on error (stale-while-revalidate)
      } finally {
        setIsLoading(false);
        fetchPromiseRef.current = null;
      }
    })();

    fetchPromiseRef.current = fetchPromise;
    return fetchPromise;
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  // Refetch function that can be called manually
  const refetch = useCallback(async () => {
    await fetchOptions();
  }, [fetchOptions]);

  // Auto-refetch when data is stale (stale-while-revalidate pattern)
  useEffect(() => {
    if (!data || isLoading) return;

    const timeSinceLastFetch = Date.now() - lastFetchTime;
    if (timeSinceLastFetch >= CACHE_TTL) {
      // Data is stale, refetch in background
      fetchOptions();
    }
  }, [data, lastFetchTime, isLoading, fetchOptions]);

  const value: DropdownOptionsContextValue = {
    data,
    isLoading,
    error,
    refetch,
  };

  return (
    <DropdownOptionsContext.Provider value={value}>
      {children}
    </DropdownOptionsContext.Provider>
  );
}

export function useDropdownOptionsContext(): DropdownOptionsContextValue {
  const context = useContext(DropdownOptionsContext);
  if (!context) {
    // Return a fallback that will trigger direct API calls
    return {
      data: null,
      isLoading: false,
      error: null,
      refetch: async () => {},
    };
  }
  return context;
}


