import Link from 'next/link';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { NavigationClient } from './NavigationClient';
import { getSession } from '@/lib/auth/session-store';

const checkAuth = cache(async () => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('admin-session');
  
  if (!sessionCookie?.value) {
    return false;
  }

  // Verify session token exists and is valid
  try {
    const session = await getSession(sessionCookie.value);
    return session !== null;
  } catch (error) {
    return false;
  }
});

export async function Navigation() {
  const isAuthenticated = await checkAuth();

  return <NavigationClient isAuthenticated={isAuthenticated} />;
}
