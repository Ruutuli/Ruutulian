/**
 * Simple in-memory rate limiter for login attempts
 * In production, consider using Redis or a dedicated rate limiting service
 */

interface RateLimitEntry {
  attempts: number;
  resetTime: number;
  lockedUntil?: number;
}

// In-memory store (clears on server restart)
// In production, use Redis or similar persistent store
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const MAX_ATTEMPTS = 5; // Maximum failed attempts
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 30 * 60 * 1000; // 30 minutes lockout after max attempts

/**
 * Get client identifier from request
 */
function getClientId(request: Request): string {
  // Try to get IP from various headers (for proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  return ip;
}

/**
 * Check if IP is rate limited
 * @returns null if allowed, or lockout time remaining in ms if blocked
 */
export function checkRateLimit(request: Request): { allowed: boolean; retryAfter?: number } {
  const clientId = getClientId(request);
  const now = Date.now();
  
  const entry = rateLimitStore.get(clientId);
  
  // Clean up expired entries
  if (entry && entry.resetTime < now && (!entry.lockedUntil || entry.lockedUntil < now)) {
    rateLimitStore.delete(clientId);
    return { allowed: true };
  }
  
  // Check if locked out
  if (entry?.lockedUntil && entry.lockedUntil > now) {
    const retryAfter = Math.ceil((entry.lockedUntil - now) / 1000); // seconds
    return { allowed: false, retryAfter };
  }
  
  // Check if within attempt window
  if (entry && entry.resetTime > now) {
    if (entry.attempts >= MAX_ATTEMPTS) {
      // Lock out for LOCKOUT_MS
      entry.lockedUntil = now + LOCKOUT_MS;
      const retryAfter = Math.ceil(LOCKOUT_MS / 1000);
      return { allowed: false, retryAfter };
    }
    return { allowed: true };
  }
  
  return { allowed: true };
}

/**
 * Record a failed login attempt
 */
export function recordFailedAttempt(request: Request): void {
  const clientId = getClientId(request);
  const now = Date.now();
  
  const entry = rateLimitStore.get(clientId);
  
  if (entry && entry.resetTime > now) {
    // Within existing window, increment attempts
    entry.attempts += 1;
  } else {
    // New window
    rateLimitStore.set(clientId, {
      attempts: 1,
      resetTime: now + WINDOW_MS,
    });
  }
}

/**
 * Clear rate limit for successful login
 */
export function clearRateLimit(request: Request): void {
  const clientId = getClientId(request);
  rateLimitStore.delete(clientId);
}

/**
 * Clean up old entries (call periodically)
 */
export function cleanupRateLimit(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now && (!entry.lockedUntil || entry.lockedUntil < now)) {
      rateLimitStore.delete(key);
    }
  }
}


















