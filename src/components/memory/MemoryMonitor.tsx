'use client'

import { useEffect } from 'react'
import { startPeriodicLogging, stopPeriodicLogging, logMemoryUsage } from '@/lib/memory-monitor'

/**
 * Client-side memory monitoring component.
 * Only mounted when NODE_ENV=development or ENABLE_MEMORY_LOGGING=true (see layout).
 * Starts periodic memory logging when mounted.
 */
export function MemoryMonitor() {
  useEffect(() => {
    logMemoryUsage('Client', 'MemoryMonitor: Component mounted');
    startPeriodicLogging();
    return () => {
      logMemoryUsage('Client', 'MemoryMonitor: Component unmounting');
      stopPeriodicLogging();
    };
  }, []);

  return null;
}
