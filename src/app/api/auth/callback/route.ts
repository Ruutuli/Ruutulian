import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/admin'

    if (code) {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
        const isLocalEnv = process.env.NODE_ENV === 'development'
        if (isLocalEnv) {
          return NextResponse.redirect(`${origin}${next}`)
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${next}`)
        } else {
          return NextResponse.redirect(`${origin}${next}`)
        }
      } else {
        logger.error('Auth', 'Failed to exchange code for session', { error: error.message })
      }
    } else {
      logger.warn('Auth', 'Auth callback called without code parameter')
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/admin/login?error=auth_callback_error`)
  } catch (error) {
    logger.error('Auth', 'Auth callback error', error)
    const { origin } = new URL(request.url)
    return NextResponse.redirect(`${origin}/admin/login?error=auth_callback_error`)
  }
}
