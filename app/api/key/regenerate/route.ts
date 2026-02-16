import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )

    const { data: { user }, error: authError } = await userClient.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use service role to generate new key (bypasses RLS)
    const supabase = createServerSupabaseClient()

    // Generate new API key
    const { data, error } = await supabase
      .from('profiles')
      .update({
        api_key: 'ap_' + Array.from(crypto.getRandomValues(new Uint8Array(24)))
          .map(b => b.toString(16).padStart(2, '0')).join('')
      })
      .eq('id', user.id)
      .select('api_key')
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to regenerate key' }, { status: 500 })
    }

    return NextResponse.json({ api_key: data.api_key })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
