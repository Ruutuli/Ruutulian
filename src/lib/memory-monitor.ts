/**
 * Memory monitoring utility for tracking memory usage in both Node.js and browser contexts
 * Helps identify memory leaks by logging memory consumption at key points
 */

import { logger } from './logger';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Configuration - Enable by default, can be disabled with ENABLE_MEMORY_LOGGING=false
const ENABLE_MEMORY_LOGGING =
  process.env.ENABLE_MEMORY_LOGGING !== 'false';

const MEMORY_LOG_INTERVAL_MS = parseInt(
  process.env.MEMORY_LOG_INTERVAL_MS || '30000',
  10
);

const MEMORY_WARNING_THRESHOLD = 0.8; // Warn if heap used > 80% of limit

// Configurable via env to reduce false positives (Node/Next dev often 400–500 MB RSS)
const MEMORY_RSS_WARNING_MB = parseInt(process.env.MEMORY_RSS_WARNING_MB || '512', 10);
const MEMORY_DELTA_WARNING_MB = parseInt(process.env.MEMORY_DELTA_WARNING_MB || '15', 10);

const isDevOrLoggingEnabled =
  process.env.NODE_ENV === 'development' || process.env.ENABLE_MEMORY_LOGGING === 'true';

if (isDevOrLoggingEnabled) {
  if (typeof window !== 'undefined') {
    console.log('[Memory Monitor] Client-side initialized', { ENABLE_MEMORY_LOGGING, hasPerfMemory: !!(typeof performance !== 'undefined' && (performance as any).memory) });
  } else {
    console.log('[Memory Monitor] Server-side initialized', { ENABLE_MEMORY_LOGGING });
  }
}

if (ENABLE_MEMORY_LOGGING) {
  logger.info('Memory', `Memory monitoring enabled (interval: ${MEMORY_LOG_INTERVAL_MS}ms, env: ${process.env.NODE_ENV})`);
} else {
  logger.info('Memory', 'Memory monitoring disabled (set ENABLE_MEMORY_LOGGING=true to enable)');
}

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
 * Always tries to get stats, regardless of logging enabled state
 */
export function getMemoryUsage(): MemoryStats | null {
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
      // Try to log a warning that memory API isn't available
      if (ENABLE_MEMORY_LOGGING && typeof console !== 'undefined') {
        console.warn('[Memory] performance.memory API not available in this browser. Memory monitoring limited.');
      }
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
  const stats = getMemoryUsage();

  if (!ENABLE_MEMORY_LOGGING) {
    if (stats && stats.heapUsed > 500) {
      console.warn(`[Memory] ⚠️ HIGH MEMORY DETECTED (logging disabled): ${stats.heapUsed}MB`, context);
    }
    return;
  }

  if (!stats) {
    const msg = `${category}: ${message} [Memory stats unavailable]`;
    logger.info('Memory', msg, context);
    return;
  }

  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  const memoryStr = formatMemoryStats(stats);
  
  // Always log to console directly for visibility (use error/warn so they're not stripped)
  // Use error for high memory/RSS, warn for medium, log for low
  const isHighMemory = stats.heapUsed > 500 || (stats.rss !== undefined && stats.rss > MEMORY_RSS_WARNING_MB);
  const isMediumMemory = stats.heapUsed > 200 || (stats.rss !== undefined && stats.rss > 200);
  
  if (isHighMemory) {
    console.error(`[Memory] ${category}: ${message} ${memoryStr}${contextStr}`);
  } else if (isMediumMemory) {
    console.warn(`[Memory] ${category}: ${message} ${memoryStr}${contextStr}`);
  } else {
    console.log(`[Memory] ${category}: ${message} ${memoryStr}${contextStr}`);
  }
  
  // Also use logger for formatted output
  logger.info('Memory', `${category}: ${message} ${memoryStr}${contextStr}`);

  // Warn if memory usage is high
  if (stats.usagePercent && stats.usagePercent > MEMORY_WARNING_THRESHOLD * 100) {
    logger.warn('Memory', `⚠️ HIGH MEMORY USAGE: ${stats.usagePercent}% of heap limit (${stats.heapUsed}MB / ${stats.heapLimit}MB)`, {
      ...stats,
      ...context,
    });
  }

  // Warn if memory is growing significantly (threshold configurable via MEMORY_DELTA_WARNING_MB)
  if (stats.delta !== undefined && stats.delta > MEMORY_DELTA_WARNING_MB) {
    logger.warn('Memory', `⚠️ MEMORY GROWTH: +${stats.delta}MB since last check`, {
      ...stats,
      ...context,
    });
  }

  // Warn if memory exceeds 500MB (potential leak indicator)
  if (stats.heapUsed > 500) {
    logger.warn('Memory', `⚠️ HIGH MEMORY: ${stats.heapUsed}MB used - potential memory leak?`, {
      ...stats,
      ...context,
    });
  }

  // Warn if RSS (total process memory) is high (threshold configurable via MEMORY_RSS_WARNING_MB)
  if (stats.rss !== undefined && stats.rss > MEMORY_RSS_WARNING_MB) {
    logger.warn('Memory', `⚠️ HIGH RSS: ${stats.rss}MB total process memory - potential leak?`, {
      ...stats,
      ...context,
    });
  }

  // Warn if external memory is high (buffers, images, etc.)
  if (stats.external && stats.external > 30) {
    logger.warn('Memory', `⚠️ HIGH EXTERNAL: ${stats.external}MB external memory - buffers/images may not be released`, {
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

  logger.info('Memory', `Started periodic memory logging (interval: ${intervalMs}ms)`);
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
    logger.info('Memory', 'Stopped periodic memory logging');
  }
}

/**
 * Reset memory tracking (useful for testing or resetting deltas)
 */
export function resetMemoryTracking(): void {
  lastMemoryStats = null;
}
