import { NextResponse } from 'next/server';
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from '@/lib/auth/rate-limit';
import { constantTimeCompare, generateSessionToken } from '@/lib/auth/security';
import { createSession } from '@/lib/auth/session-store';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    // Check rate limiting first
    const rateLimit = checkRateLimit(request);
    if (!rateLimit.allowed) {
      const retryAfter = rateLimit.retryAfter || 1800; // 30 minutes default
      return NextResponse.json(
        { 
          error: 'Too many login attempts. Please try again later.',
          retryAfter 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
          }
        }
      );
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    const validUsername = process.env.USERNAME?.trim();
    const validPassword = process.env.PASSWORD?.trim();

    if (!validUsername || !validPassword) {
      logger.error('Auth', 'No admin credentials configured (set USERNAME and PASSWORD in env)');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const usernameMatch = constantTimeCompare(trimmedUsername, validUsername);
    const passwordMatch = constantTimeCompare(trimmedPassword, validPassword);
    const isValid = usernameMatch && passwordMatch;

    if (!isValid) {
      // Record failed attempt
      recordFailedAttempt(request);
      
      // Log failed attempt (without revealing which field was wrong)
      const clientId = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
      logger.warn('Auth', `Failed login attempt from ${clientId}`);
      
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Successful login - clear rate limit and create session
    clearRateLimit(request);
    
    // Generate secure session token
    const sessionToken = generateSessionToken();
    await createSession(sessionToken);

    // Create response with success
    const response = NextResponse.json({ success: true });

    // Set secure session cookie
    response.cookies.set('admin-session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Allows cookie to be sent with top-level navigations
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    const clientId = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    logger.success('Auth', `Login successful from ${clientId}`);

    return response;
  } catch (err) {
    logger.error('Auth', 'Unexpected error', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
