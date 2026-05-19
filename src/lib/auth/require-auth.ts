import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { getSession } from './session-store';

/**
 * Returns true when a valid admin session cookie is present (public pages).
 */
export const checkAdminAuth = cache(async (): Promise<boolean> => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('admin-session');

  if (!sessionCookie?.value) {
    return false;
  }

  try {
    const session = await getSession(sessionCookie.value);
    return session !== null;
  } catch {
    return false;
  }
});

/**
 * Requires authentication for admin access.
 * Verifies the admin-session cookie token.
 * 
 * @returns A simple user object if authenticated
 * @throws Redirects to /admin/login if not authenticated
 */
export async function requireAuth() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('admin-session');

  if (!sessionCookie || !sessionCookie.value) {
    redirect('/admin/login');
  }

  // Verify session token
  const session = await getSession(sessionCookie.value);
  
  if (!session) {
    redirect('/admin/login');
  }

  // Return a simple user object for compatibility
  return {
    id: 'admin',
    email: process.env.USERNAME || 'admin',
  };
}

/**
 * Checks if user is authenticated (for API routes).
 * Returns null instead of redirecting (since API routes return JSON).
 * 
 * @returns A simple user object if authenticated, or null if not
 */
export async function checkAuth() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('admin-session');

  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  // Verify session token
  const session = await getSession(sessionCookie.value);
  
  if (!session) {
    return null;
  }

  // Return a simple user object for compatibility
  return {
    id: 'admin',
    email: process.env.USERNAME || 'admin',
  };
}
