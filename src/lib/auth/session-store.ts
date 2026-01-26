/**
 * Database-backed session store using Supabase
 * Sessions are stored in the database so they persist across server restarts
 */

import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

interface SessionData {
  token: string;
  expiresAt: number;
  createdAt: number;
}

// Session duration: 7 days
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

// Note: The admin_sessions table must be created in Supabase.
// Run the SQL migration file to create it if it doesn't exist.

/**
 * Create a new session
 */
export async function createSession(token: string): Promise<void> {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const createdAt = Date.now();
  
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('admin_sessions')
    .insert({
      token,
      expires_at: expiresAt,
      created_at: createdAt,
    });
  
  if (error) {
    logger.error('Utility', 'session-store: Error creating session', error);
    // If table doesn't exist, log a helpful message
    if (error.code === '42P01') {
      logger.error('Utility', 'session-store: admin_sessions table does not exist. Please run the SQL migration to create it.');
    }
    throw error;
  }
}

/**
 * Verify and get session data
 */
export async function getSession(token: string): Promise<SessionData | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('admin_sessions')
    .select('token, expires_at, created_at')
    .eq('token', token)
    .single();
  
  if (error || !data) {
    // If table doesn't exist, log a helpful message
    if (error?.code === '42P01') {
      logger.error('Utility', 'session-store: admin_sessions table does not exist. Please run the SQL migration to create it.');
    }
    return null;
  }
  
  // Check if expired
  const now = Date.now();
  if (data.expires_at < now) {
    // Delete expired session
    await supabase
      .from('admin_sessions')
      .delete()
      .eq('token', token);
    return null;
  }
  
  return {
    token: data.token,
    expiresAt: data.expires_at,
    createdAt: data.created_at,
  };
}

/**
 * Delete a session
 */
export async function deleteSession(token: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from('admin_sessions')
    .delete()
    .eq('token', token);
}

/**
 * Clean up expired sessions
 */
export async function cleanupSessions(): Promise<void> {
  const now = Date.now();
  const supabase = createAdminClient();
  await supabase
    .from('admin_sessions')
    .delete()
    .lt('expires_at', now);
}

// Clean up expired sessions every hour
if (typeof setInterval !== 'undefined' && typeof window === 'undefined') {
  // Guard against multiple intervals in dev/hot-reload environments
  const globalAny = globalThis as unknown as { __ruutulianSessionCleanupInterval?: ReturnType<typeof setInterval> };
  if (!globalAny.__ruutulianSessionCleanupInterval) {
    globalAny.__ruutulianSessionCleanupInterval = setInterval(() => {
      cleanupSessions().catch((error) => logger.error('Utility', 'session-store: Error in cleanup', error));
    }, 60 * 60 * 1000);
  }
}


