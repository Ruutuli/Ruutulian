import { NextResponse, type NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session-store'

export async function updateSession(request: NextRequest) {
  const url = request.nextUrl;
  const pathname = url.pathname;

  console.log('[Middleware] Request received:', {
    pathname,
    method: request.method,
  });

  // Allow login page through without authentication
  // Handle both with and without trailing slash
  const isLoginPage = pathname === '/admin/login' || pathname === '/admin/login/';
  if (isLoginPage) {
    console.log('[Middleware] Login page - allowing through');
    return NextResponse.next();
  }

  // Allow setup page through without authentication
  const isSetupPage = pathname === '/admin/setup' || pathname === '/admin/setup/';
  if (isSetupPage) {
    console.log('[Middleware] Setup page - allowing through');
    return NextResponse.next();
  }

  // Allow all API routes through
  if (pathname.startsWith('/api')) {
    console.log('[Middleware] API route - allowing through');
    return NextResponse.next();
  }

  // For all other admin routes, require authentication
  if (pathname.startsWith('/admin')) {
    console.log('[Middleware] Admin route detected - checking authentication');
    const sessionCookie = request.cookies.get('admin-session');
    
    // No session cookie - redirect to login
    if (!sessionCookie?.value) {
      console.warn('[Middleware] No session cookie found - redirecting to login:', {
        pathname,
        hasCookie: !!sessionCookie,
      });
      const loginUrl = url.clone();
      loginUrl.pathname = '/admin/login';
      return NextResponse.redirect(loginUrl, 302);
    }

    console.log('[Middleware] Session cookie found - verifying session');

    // Verify session token exists and is valid
    try {
      const session = await getSession(sessionCookie.value);
      
      if (!session) {
        console.warn('[Middleware] Session invalid or expired - redirecting to login:', {
          pathname,
          hasCookie: true,
        });
        const loginUrl = url.clone();
        loginUrl.pathname = '/admin/login';
        return NextResponse.redirect(loginUrl, 302);
      }

      console.log('[Middleware] Session valid - allowing access:', {
        pathname,
      });
    } catch (error) {
      // If session check fails, redirect to login
      console.error('[Middleware] Session check failed - redirecting to login:', {
        pathname,
        error: error instanceof Error ? error.message : String(error),
      });
      const loginUrl = url.clone();
      loginUrl.pathname = '/admin/login';
      return NextResponse.redirect(loginUrl, 302);
    }
  }

  // For all other routes, just pass through
  console.log('[Middleware] Public route - allowing through:', { pathname });
  return NextResponse.next();
}
