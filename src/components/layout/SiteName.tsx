'use client';

import { useEffect, useState, useRef } from 'react';
import { getSiteConfigSync } from '@/lib/config/site-config-client';

export function SiteName() {
  const [websiteName, setWebsiteName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const fetchingRef = useRef(false);
  const lastFetchTimeRef = useRef<number>(0);
  const timeoutsRef = useRef<Set<number>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;

    const scheduleTimeout = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timeoutsRef.current.delete(id);
        fn();
      }, ms);
      timeoutsRef.current.add(id);
      return id;
    };

    async function fetchSiteName() {
      // Prevent concurrent fetches
      if (fetchingRef.current) {
        return;
      }
      
      // Cancel any previous fetch
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Create new abort controller for this fetch
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      
      fetchingRef.current = true;
      const fetchTime = Date.now();
      
      try {
        // Add cache-busting parameter to ensure fresh data
        const response = await fetch(`/api/site-config?t=${fetchTime}`, {
          cache: 'no-store',
          signal: abortController.signal,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
        });
        
        if (cancelled || abortController.signal.aborted) return;
        
        if (response.ok) {
          const result = await response.json();
          if (cancelled || abortController.signal.aborted) return;
          
          if (result.success && result.data) {
            // Use database value if it exists, even if it's an empty string
            const dbName = result.data.websiteName;
            if (dbName !== undefined && dbName !== null) {
              // Only update if this is the most recent fetch (prevent race conditions)
              // Update the ref after we've verified this is the latest
              if (fetchTime >= lastFetchTimeRef.current) {
                lastFetchTimeRef.current = fetchTime;
                if (!cancelled && !abortController.signal.aborted) {
                  setWebsiteName(dbName);
                  setIsLoading(false);
                }
                fetchingRef.current = false;
                return;
              } else {
                fetchingRef.current = false;
                return;
              }
            }
          }
        }
      } catch (error) {
        // Ignore abort errors
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        // Silently handle other errors - fallback will be used
      }
      
      if (cancelled || abortController.signal.aborted) {
        fetchingRef.current = false;
        return;
      }
      
      // Fallback to default if API fails
      const config = getSiteConfigSync();
      if (!cancelled && !abortController.signal.aborted) {
        setWebsiteName(config.websiteName);
        setIsLoading(false);
      }
      fetchingRef.current = false;
    }

    fetchSiteName();

    // Refresh when page becomes visible (user switches back to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Small delay to ensure any pending updates are complete
        scheduleTimeout(() => {
          if (!cancelled) {
            fetchSiteName();
          }
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Listen for custom event to refresh site name (dispatched after settings save)
    const handleRefresh = (event?: Event) => {
      // If the event includes the new websiteName, use it immediately
      const customEvent = event as CustomEvent;
      if (customEvent?.detail?.websiteName) {
        if (cancelled) return;
        const newName = customEvent.detail.websiteName;
        setWebsiteName(newName);
        setIsLoading(false);
        // Update the last fetch time to prevent overwriting with stale data
        lastFetchTimeRef.current = Date.now();
        // Don't fetch from API immediately - the event value is authoritative
        return;
      }
      
      // If no event data, fetch from API after a delay to ensure database is updated
      scheduleTimeout(() => {
        if (!cancelled) {
          fetchSiteName();
        }
      }, 2000); // Increased delay to ensure database commit is complete
    };

    window.addEventListener('site-settings-updated', handleRefresh);

    return () => {
      cancelled = true;
      fetchingRef.current = false;
      
      // Abort any pending fetch
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      for (const id of timeoutsRef.current) {
        clearTimeout(id);
      }
      timeoutsRef.current.clear();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('site-settings-updated', handleRefresh);
    };
  }, []);

  // Show fallback while loading to avoid layout shift
  if (isLoading) {
    const config = getSiteConfigSync();
    return <>{config.websiteName}</>;
  }

  return <>{websiteName || 'Ruutulian'}</>;
}

