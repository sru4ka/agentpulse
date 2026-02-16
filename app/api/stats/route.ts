import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    // Create client with user's token for RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Get agents for this user
    const { data: agents } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', user.id)
      .order('last_seen', { ascending: false })

    const agentIds = (agents || []).map((a: any) => a.id)

    // Get today's stats (filtered to user's agents)
    const today = new Date().toISOString().split('T')[0]
    let todayStats: any[] = []
    if (agentIds.length > 0) {
      const { data } = await supabase
        .from('daily_stats')
        .select('*')
        .in('agent_id', agentIds)
        .eq('date', today)
      todayStats = data || []
    }

    // Get last 30 days stats (filtered to user's agents)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    let recentStats: any[] = []
    if (agentIds.length > 0) {
      const { data } = await supabase
        .from('daily_stats')
        .select('*')
        .in('agent_id', agentIds)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: true })
      recentStats = data || []
    }

    // Get recent events (last 20, filtered to user's agents)
    let recentEvents: any[] = []
    if (agentIds.length > 0) {
      const { data } = await supabase
        .from('events')
        .select('*')
        .in('agent_id', agentIds)
        .order('timestamp', { ascending: false })
        .limit(20)
      recentEvents = data || []
    }

    // Calculate totals
    const todayCost = todayStats.reduce((s: number, stat: any) => s + parseFloat(stat.total_cost_usd || 0), 0)
    const todayTokens = todayStats.reduce((s: number, stat: any) => s + (stat.total_tokens || 0), 0)
    const todayEvents = todayStats.reduce((s: number, stat: any) => s + (stat.total_events || 0), 0)
    const todayErrors = todayStats.reduce((s: number, stat: any) => s + (stat.error_count || 0), 0)

    return NextResponse.json({
      profile,
      agents: agents || [],
      today: {
        cost: todayCost,
        tokens: todayTokens,
        events: todayEvents,
        errors: todayErrors,
      },
      daily_stats: recentStats,
      recent_events: recentEvents,
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 })
  }
}
