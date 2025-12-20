import { createHash, randomBytes, timingSafeEqual } from 'crypto';

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  // Convert to buffers for timing-safe comparison
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  
  try {
    return timingSafeEqual(bufferA, bufferB);
  } catch {
    return false;
  }
}

/**
 * Generate a secure random session token
 */
export function generateSessionToken(): string {
  // Generate 32 random bytes and encode as base64
  const token = randomBytes(32).toString('base64url');
  return token;
}

/**
 * Hash a session token for storage (optional, for extra security)
 */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Verify a session token against a hash
 */
export function verifySessionToken(token: string, hash: string): boolean {
  const tokenHash = hashSessionToken(token);
  return constantTimeCompare(tokenHash, hash);
}


















