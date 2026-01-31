'use client'

import { useEffect } from 'react'
import { startPeriodicLogging, stopPeriodicLogging, logMemoryUsage } from '@/lib/memory-monitor'

/**
 * Client-side memory monitoring component
 * Starts periodic memory logging when mounted
 */
export function MemoryMonitor() {
  useEffect(() => {
    // Log initial memory on mount
    logMemoryUsage('Client', 'MemoryMonitor: Component mounted')

    // Start periodic logging
    startPeriodicLogging()

    // Cleanup on unmount
    return () => {
      logMemoryUsage('Client', 'MemoryMonitor: Component unmounting')
      stopPeriodicLogging()
    }
  }, [])

  // This component doesn't render anything
  return null
}
