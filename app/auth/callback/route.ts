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

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, { ...options })
            } catch (err) {
              // This can fail when called from a Server Component context,
              // but Route Handlers should be fine.
              console.error(`[auth/callback] Failed to set cookie ${name}:`, err)
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

  return NextResponse.redirect(`${redirectBase}${next}`)
}
