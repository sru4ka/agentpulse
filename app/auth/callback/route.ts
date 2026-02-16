import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  // The code exchange is handled client-side by Supabase Auth
  // This route just redirects after OAuth callback
  return NextResponse.redirect(`${origin}${next}`)
}
