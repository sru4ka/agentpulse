import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // GitHub may redirect back with an error (e.g., user denied access)
  if (errorParam) {
    console.error('[auth/callback] GitHub OAuth error:', errorParam, errorDescription)
    const message = encodeURIComponent(errorDescription || errorParam)
    return NextResponse.redirect(`${origin}/login?error=${message}`)
  }

  if (!code) {
    console.error('[auth/callback] No code parameter received')
    return NextResponse.redirect(`${origin}/login?error=no_code`)
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
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch (err) {
            console.error('[auth/callback] Failed to set cookies:', err)
          }
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession failed:', error.message)
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
