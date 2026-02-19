import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { authenticateRequest } from '@/lib/api-auth'

export async function GET(request: Request) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized. Provide X-API-Key header or Bearer token.' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', auth.userId)
      .single()

    // Get agents for this user
    const { data: agents } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', auth.userId)
      .order('last_seen', { ascending: false })

    const agentIds = (agents || []).map((a: any) => a.id)

    // Get today's stats
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    let todayStats: any[] = []
    if (agentIds.length > 0) {
      const { data } = await supabase
        .from('daily_stats')
        .select('*')
        .in('agent_id', agentIds)
        .eq('date', today)
      todayStats = data || []
    }

    // Get ALL stats for all-time totals
    let allStats: any[] = []
    if (agentIds.length > 0) {
      const { data } = await supabase
        .from('daily_stats')
        .select('*')
        .in('agent_id', agentIds)
        .order('date', { ascending: true })
      allStats = data || []
    }

    // Last 30 days for charts
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoStr = `${thirtyDaysAgo.getFullYear()}-${String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(thirtyDaysAgo.getDate()).padStart(2, '0')}`
    const recentStats = allStats.filter((s: any) => s.date >= thirtyDaysAgoStr)

    // Recent events
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

    // Calculate today totals
    const todayCost = todayStats.reduce((s: number, stat: any) => s + parseFloat(stat.total_cost_usd || 0), 0)
    const todayTokens = todayStats.reduce((s: number, stat: any) => s + (stat.total_tokens || 0), 0)
    const todayEvents = todayStats.reduce((s: number, stat: any) => s + (stat.total_events || 0), 0)
    const todayErrors = todayStats.reduce((s: number, stat: any) => s + (stat.error_count || 0), 0)

    // Calculate all-time totals
    const totalCost = allStats.reduce((s: number, stat: any) => s + parseFloat(stat.total_cost_usd || 0), 0)
    const totalTokens = allStats.reduce((s: number, stat: any) => s + (stat.total_tokens || 0), 0)
    const totalEvents = allStats.reduce((s: number, stat: any) => s + (stat.total_events || 0), 0)
    const totalErrors = allStats.reduce((s: number, stat: any) => s + (stat.error_count || 0), 0)

    // Per-agent today cost map
    const agentTodayCosts: Record<string, number> = {}
    for (const stat of todayStats) {
      agentTodayCosts[stat.agent_id] = (agentTodayCosts[stat.agent_id] || 0) + parseFloat(stat.total_cost_usd || 0)
    }

    return NextResponse.json({
      profile: { plan: profile?.plan || 'free' },
      agents: agents || [],
      today: {
        cost: todayCost,
        tokens: todayTokens,
        events: todayEvents,
        errors: todayErrors,
      },
      total: {
        cost: totalCost,
        tokens: totalTokens,
        events: totalEvents,
        errors: totalErrors,
      },
      agent_today_costs: agentTodayCosts,
      daily_stats: recentStats,
      recent_events: recentEvents,
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 })
  }
}
