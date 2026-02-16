import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getUserSupabase(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const supabase = getUserSupabase(token)
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: alerts } = await supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false })

    return NextResponse.json({ alerts: alerts || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const supabase = getUserSupabase(token)
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { data: alert, error } = await supabase
      .from('alerts')
      .insert({
        user_id: user.id,
        agent_id: body.agent_id || null,
        type: body.type,
        threshold: body.threshold,
        notify_via: body.notify_via || 'email',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ alert })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
