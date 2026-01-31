/**
 * Memory monitoring utility for tracking memory usage in both Node.js and browser contexts
 * Helps identify memory leaks by logging memory consumption at key points
 */

import { logger } from './logger';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Configuration
const ENABLE_MEMORY_LOGGING = 
  process.env.ENABLE_MEMORY_LOGGING !== 'false' && 
  (process.env.NODE_ENV === 'development' || process.env.ENABLE_MEMORY_LOGGING === 'true');

const MEMORY_LOG_INTERVAL_MS = parseInt(
  process.env.MEMORY_LOG_INTERVAL_MS || '30000',
  10
);

const MEMORY_WARNING_THRESHOLD = 0.8; // Warn if heap used > 80% of limit

// Memory stats interface
export interface MemoryStats {
  heapUsed: number; // MB
  heapTotal: number; // MB
  heapLimit: number; // MB
  external?: number; // MB (Node.js only)
  rss?: number; // MB (Node.js only)
  delta?: number; // MB change since last check
  usagePercent?: number; // Percentage of heap limit used
}

// Track last memory reading for delta calculation
let lastMemoryStats: MemoryStats | null = null;
let periodicLoggingInterval: NodeJS.Timeout | number | null = null;

/**
 * Get current memory usage statistics
 */
export function getMemoryUsage(): MemoryStats | null {
  if (!ENABLE_MEMORY_LOGGING) {
    return null;
  }

  try {
    if (isBrowser) {
      // Browser: Use performance.memory API (Chrome/Edge)
      const perfMemory = (performance as any).memory;
      if (perfMemory) {
        const heapUsed = perfMemory.usedJSHeapSize / 1024 / 1024; // Convert to MB
        const heapTotal = perfMemory.totalJSHeapSize / 1024 / 1024;
        const heapLimit = perfMemory.jsHeapSizeLimit / 1024 / 1024;
        const usagePercent = heapLimit > 0 ? heapUsed / heapLimit : undefined;

        const stats: MemoryStats = {
          heapUsed: Math.round(heapUsed * 100) / 100,
          heapTotal: Math.round(heapTotal * 100) / 100,
          heapLimit: Math.round(heapLimit * 100) / 100,
          usagePercent: usagePercent ? Math.round(usagePercent * 10000) / 100 : undefined,
        };

        // Calculate delta if we have previous stats
        if (lastMemoryStats) {
          stats.delta = Math.round((stats.heapUsed - lastMemoryStats.heapUsed) * 100) / 100;
        }

        lastMemoryStats = stats;
        return stats;
      } else {
        // Fallback for browsers without performance.memory API
        return null;
      }
    } else {
      // Node.js: Use process.memoryUsage()
      const memUsage = process.memoryUsage();
      const heapUsed = memUsage.heapUsed / 1024 / 1024; // Convert to MB
      const heapTotal = memUsage.heapTotal / 1024 / 1024;
      const rss = memUsage.rss / 1024 / 1024;
      const external = memUsage.external / 1024 / 1024;
      
      // Estimate heap limit (Node.js doesn't provide this directly)
      // Use a reasonable default or calculate from v8 heap stats if available
      const heapLimit = heapTotal * 2; // Rough estimate
      const usagePercent = heapLimit > 0 ? heapUsed / heapLimit : undefined;

      const stats: MemoryStats = {
        heapUsed: Math.round(heapUsed * 100) / 100,
        heapTotal: Math.round(heapTotal * 100) / 100,
        heapLimit: Math.round(heapLimit * 100) / 100,
        rss: Math.round(rss * 100) / 100,
        external: Math.round(external * 100) / 100,
        usagePercent: usagePercent ? Math.round(usagePercent * 10000) / 100 : undefined,
      };

      // Calculate delta if we have previous stats
      if (lastMemoryStats) {
        stats.delta = Math.round((stats.heapUsed - lastMemoryStats.heapUsed) * 100) / 100;
      }

      lastMemoryStats = stats;
      return stats;
    }
  } catch (error) {
    // Silently fail if memory monitoring isn't available
    return null;
  }
}

/**
 * Format memory stats for logging
 */
function formatMemoryStats(stats: MemoryStats): string {
  const parts: string[] = [];
  
  parts.push(`heapUsed: ${stats.heapUsed}MB`);
  parts.push(`heapTotal: ${stats.heapTotal}MB`);
  
  if (stats.heapLimit) {
    parts.push(`heapLimit: ${stats.heapLimit}MB`);
  }
  
  if (stats.usagePercent !== undefined) {
    parts.push(`usage: ${stats.usagePercent}%`);
  }
  
  if (stats.delta !== undefined) {
    const deltaSign = stats.delta >= 0 ? '+' : '';
    parts.push(`delta: ${deltaSign}${stats.delta}MB`);
  }
  
  if (stats.rss !== undefined) {
    parts.push(`rss: ${stats.rss}MB`);
  }
  
  if (stats.external !== undefined) {
    parts.push(`external: ${stats.external}MB`);
  }
  
  return `{ ${parts.join(', ')} }`;
}

/**
 * Log memory usage with context
 */
export function logMemoryUsage(
  category: string,
  message: string,
  context?: Record<string, any>
): void {
  if (!ENABLE_MEMORY_LOGGING) {
    return;
  }

  const stats = getMemoryUsage();
  if (!stats) {
    return;
  }

  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  const memoryStr = formatMemoryStats(stats);
  
  logger.debug('Memory', `${category}: ${message} ${memoryStr}${contextStr}`);

  // Warn if memory usage is high
  if (stats.usagePercent && stats.usagePercent > MEMORY_WARNING_THRESHOLD * 100) {
    logger.warn('Memory', `High memory usage detected: ${stats.usagePercent}% of heap limit`, {
      ...stats,
      ...context,
    });
  }

  // Warn if memory is growing significantly
  if (stats.delta && stats.delta > 10) {
    logger.warn('Memory', `Significant memory growth detected: +${stats.delta}MB`, {
      ...stats,
      ...context,
    });
  }
}

/**
 * Start periodic memory logging
 */
export function startPeriodicLogging(intervalMs: number = MEMORY_LOG_INTERVAL_MS): void {
  if (!ENABLE_MEMORY_LOGGING) {
    return;
  }

  // Clear existing interval if any
  stopPeriodicLogging();

  // Reset last stats to avoid incorrect deltas
  lastMemoryStats = null;

  if (isBrowser) {
    periodicLoggingInterval = window.setInterval(() => {
      logMemoryUsage('Periodic', 'Memory check');
    }, intervalMs);
  } else {
    periodicLoggingInterval = setInterval(() => {
      logMemoryUsage('Periodic', 'Memory check');
    }, intervalMs);
  }

  logger.debug('Memory', `Started periodic memory logging (interval: ${intervalMs}ms)`);
}

/**
 * Stop periodic memory logging
 */
export function stopPeriodicLogging(): void {
  if (periodicLoggingInterval) {
    if (isBrowser) {
      window.clearInterval(periodicLoggingInterval as number);
    } else {
      clearInterval(periodicLoggingInterval as NodeJS.Timeout);
    }
    periodicLoggingInterval = null;
    logger.debug('Memory', 'Stopped periodic memory logging');
  }
}

/**
 * Reset memory tracking (useful for testing or resetting deltas)
 */
export function resetMemoryTracking(): void {
  lastMemoryStats = null;
}
