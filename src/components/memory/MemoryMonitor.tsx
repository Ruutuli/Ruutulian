'use client'

import { useEffect } from 'react'
import {
  startPeriodicLogging,
  stopPeriodicLogging,
  MEMORY_LOG_INTERVAL_MS,
} from '@/lib/memory-monitor'

/**
 * Client-side memory monitoring component.
 * Only mounted when NODE_ENV=development or ENABLE_MEMORY_LOGGING=true (see layout).
 * Starts periodic memory logging when mounted.
 */
export function MemoryMonitor() {
  useEffect(() => {
    startPeriodicLogging(MEMORY_LOG_INTERVAL_MS, true);
    return () => {
      stopPeriodicLogging();
    };
  }, []);

  return null;
}
