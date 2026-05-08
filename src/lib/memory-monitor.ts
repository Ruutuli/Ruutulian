/**
 * Memory monitoring utility for tracking memory usage in both Node.js and browser contexts
 * Helps identify memory leaks by logging memory consumption at key points
 */

import { logger } from './logger';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Production: off unless ENABLE_MEMORY_LOGGING=true. Development: always on.
const ENABLE_MEMORY_LOGGING =
  process.env.ENABLE_MEMORY_LOGGING === 'true' ||
  process.env.NODE_ENV === 'development';

export const MEMORY_LOG_INTERVAL_MS = parseInt(
  process.env.MEMORY_LOG_INTERVAL_MS || '30000',
  10
);

const MEMORY_WARNING_THRESHOLD = 0.8; // Warn if heap used > 80% of limit

// Configurable via env to reduce false positives (Node/Next in production often 900MB–1.2GB RSS)
const MEMORY_RSS_WARNING_MB = parseInt(process.env.MEMORY_RSS_WARNING_MB || '900', 10);
const MEMORY_DELTA_WARNING_MB = parseInt(process.env.MEMORY_DELTA_WARNING_MB || '25', 10);
// Next/dev often holds 200–350MB in `external` (buffers); default avoids constant false-positive warns.
const MEMORY_EXTERNAL_WARNING_MB = parseInt(process.env.MEMORY_EXTERNAL_WARNING_MB || '400', 10);

const g = globalThis as typeof globalThis & { __memoryMonitorInit?: boolean };
if (ENABLE_MEMORY_LOGGING && !g.__memoryMonitorInit) {
  g.__memoryMonitorInit = true;
  const side = typeof window !== 'undefined' ? 'client' : 'server';
  logger.debug('Memory', `Monitor · ${side} · ${MEMORY_LOG_INTERVAL_MS}ms`);
}

if (!ENABLE_MEMORY_LOGGING) {
  logger.info(
    'Memory',
    'Memory monitoring off in production (ENABLE_MEMORY_LOGGING=true to enable)'
  );
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

/** One short line for logs (avoids duplicate console + logger and huge JSON payloads). */
function compactMemoryStats(stats: MemoryStats): string {
  const parts: string[] = [`heap ${stats.heapUsed}MB`];
  if (stats.delta !== undefined) {
    const sign = stats.delta >= 0 ? '+' : '';
    parts.push(`Δ${sign}${stats.delta}MB`);
  }
  if (stats.rss !== undefined) parts.push(`rss ${stats.rss}MB`);
  if (stats.external !== undefined) parts.push(`ext ${stats.external}MB`);
  return parts.join(' · ');
}

function formatContextBrief(context?: Record<string, unknown>): string {
  if (!context || !Object.keys(context).length) return '';
  try {
    const s = JSON.stringify(context);
    const max = 160;
    const shown = s.length > max ? `${s.slice(0, max)}…` : s;
    return ` · ${shown}`;
  } catch {
    return '';
  }
}

/**
 * Log memory usage with context
 */
export function logMemoryUsage(
  category: string,
  message: string,
  context?: Record<string, any>,
  /** Client bundles omit Railway env; MemoryMonitor passes true when server mounted this component */
  forceEnable?: boolean
): void {
  const stats = getMemoryUsage();
  const active = ENABLE_MEMORY_LOGGING || !!forceEnable;

  if (!active) {
    if (stats && stats.heapUsed > 500) {
      console.warn(`[Memory] ⚠️ HIGH MEMORY DETECTED (logging disabled): ${stats.heapUsed}MB`, context);
    }
    return;
  }

  if (!stats) {
    logger.info('Memory', `${category}: ${message} (stats n/a)${formatContextBrief(context)}`);
    return;
  }

  const line = `${category} · ${message} · ${compactMemoryStats(stats)}${formatContextBrief(context)}`;
  const isPeriodic = category === 'Periodic';

  if (isPeriodic) {
    logger.debug('Memory', line);
  } else {
    logger.info('Memory', line);
  }

  const alerts: string[] = [];
  if (stats.usagePercent !== undefined && stats.usagePercent > MEMORY_WARNING_THRESHOLD * 100) {
    alerts.push(`heap ${stats.usagePercent.toFixed(0)}% of limit`);
  }
  if (stats.delta !== undefined && stats.delta > MEMORY_DELTA_WARNING_MB) {
    alerts.push(`growth +${stats.delta}MB`);
  }
  if (stats.heapUsed > 500) {
    alerts.push(`heap ${stats.heapUsed}MB`);
  }
  if (stats.rss !== undefined && stats.rss > MEMORY_RSS_WARNING_MB) {
    alerts.push(`rss ${stats.rss}MB`);
  }
  if (stats.external !== undefined && stats.external > MEMORY_EXTERNAL_WARNING_MB) {
    alerts.push(`ext ${stats.external}MB`);
  }

  if (alerts.length > 0) {
    logger.warn('Memory', `Threshold · ${alerts.join(' · ')}`);
  }
}

/**
 * Start periodic memory logging
 */
export function startPeriodicLogging(
  intervalMs: number = MEMORY_LOG_INTERVAL_MS,
  forceEnable = false
): void {
  if (!ENABLE_MEMORY_LOGGING && !forceEnable) {
    return;
  }

  // Clear existing interval if any
  stopPeriodicLogging();

  // Reset last stats to avoid incorrect deltas
  lastMemoryStats = null;

  if (isBrowser) {
    periodicLoggingInterval = window.setInterval(() => {
      logMemoryUsage('Periodic', 'Memory check', undefined, forceEnable);
    }, intervalMs);
  } else {
    periodicLoggingInterval = setInterval(() => {
      logMemoryUsage('Periodic', 'Memory check', undefined, forceEnable);
    }, intervalMs);
  }

  logger.debug('Memory', `Periodic logging · ${intervalMs}ms`);
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
    logger.debug('Memory', 'Periodic logging stopped');
  }
}

/**
 * Reset memory tracking (useful for testing or resetting deltas)
 */
export function resetMemoryTracking(): void {
  lastMemoryStats = null;
}
