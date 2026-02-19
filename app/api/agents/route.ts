import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase'
import { authenticateRequest } from '@/lib/api-auth'

export async function GET(request: Request) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized. Provide X-API-Key header or Bearer token.' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()

    const { data: agents } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', auth.userId)
      .order('last_seen', { ascending: false })

    return NextResponse.json({ agents: agents || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
