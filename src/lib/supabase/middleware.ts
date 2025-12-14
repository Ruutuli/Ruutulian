import { NextResponse, type NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session-store'

export async function updateSession(request: NextRequest) {
  const url = request.nextUrl;
  const pathname = url.pathname;

  // Allow login page through without authentication
  // Handle both with and without trailing slash
  const isLoginPage = pathname === '/admin/login' || pathname === '/admin/login/';
  if (isLoginPage) {
    return NextResponse.next();
  }

  // Allow all API routes through
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // For all other admin routes, require authentication
  if (pathname.startsWith('/admin')) {
    const sessionCookie = request.cookies.get('admin-session');
    
    // No session cookie - redirect to login
    if (!sessionCookie?.value) {
      const loginUrl = url.clone();
      loginUrl.pathname = '/admin/login';
      return NextResponse.redirect(loginUrl, 302);
    }

    // Verify session token exists and is valid
    try {
      const session = await getSession(sessionCookie.value);
      
      if (!session) {
        const loginUrl = url.clone();
        loginUrl.pathname = '/admin/login';
        return NextResponse.redirect(loginUrl, 302);
      }
    } catch (error) {
      // If session check fails, redirect to login
      const loginUrl = url.clone();
      loginUrl.pathname = '/admin/login';
      return NextResponse.redirect(loginUrl, 302);
    }
  }

  // For all other routes, just pass through
  return NextResponse.next();
}
