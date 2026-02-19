import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Determine the correct origin for redirects.
  // On Vercel/production behind a reverse proxy, request.url.origin may be
  // an internal host. Use x-forwarded-host to get the real user-facing domain.
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https'
  const redirectBase = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : origin

  // GitHub may redirect back with an error (e.g., user denied access)
  if (errorParam) {
    console.error('[auth/callback] GitHub OAuth error:', errorParam, errorDescription)
    const message = encodeURIComponent(errorDescription || errorParam)
    return NextResponse.redirect(`${redirectBase}/login?error=${message}`)
  }

  if (!code) {
    console.error('[auth/callback] No code parameter received')
    return NextResponse.redirect(`${redirectBase}/login?error=no_code`)
  }

  // Collect cookies set by Supabase during the exchange so we can
  // forward them on the redirect response (NextResponse.redirect creates
  // a new response that won't automatically include cookieStore mutations).
  const cookieStore = await cookies()
  const pendingCookies: Array<{ name: string; value: string; options: Record<string, any> }> = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          pendingCookies.push(...cookiesToSet)
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, { ...options })
            } catch (err) {
              // Ignore — we'll set them on the redirect response below.
            }
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession failed:', error.message)
    return NextResponse.redirect(`${redirectBase}/login?error=exchange_failed`)
  }

  // Build the redirect URL. Append verified=true so the dashboard can show a
  // success toast (only when the user didn't supply a custom ?next param, which
  // signals OAuth rather than email-verification).
  const separator = next.includes('?') ? '&' : '?'
  const redirectUrl = next === '/dashboard'
    ? `${redirectBase}${next}${separator}verified=true`
    : `${redirectBase}${next}`

  // Set session cookies on the redirect response so the browser receives them.
  const response = NextResponse.redirect(redirectUrl)
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })
  return response
}
