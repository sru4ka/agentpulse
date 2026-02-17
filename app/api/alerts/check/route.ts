import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { sendAlertEmail } from '@/lib/email'

// POST /api/alerts/check
// Called after events are ingested to evaluate alert thresholds.
// Can also be called by a cron job for periodic checks.
// Accepts optional { agent_id } in body, or checks all agents.

export async function POST(request: Request) {
  try {
    // Verify this is an internal call or has admin auth
    const authHeader = request.headers.get('Authorization')
    const cronSecret = request.headers.get('x-cron-secret')

    // Allow calls from the events endpoint (internal) or cron with secret
    if (cronSecret && cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { agent_id } = body

    const supabase = createServerSupabaseClient()
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
    const cooldownMs = 60 * 60 * 1000 // 1 hour cooldown between alert triggers

    // Get all enabled alerts (optionally filtered by agent)
    let alertsQuery = supabase
      .from('alerts')
      .select('*, profiles!inner(email)')
      .eq('enabled', true)

    if (agent_id) {
      // Check alerts for this specific agent + global alerts (agent_id is null)
      alertsQuery = alertsQuery.or(`agent_id.eq.${agent_id},agent_id.is.null`)
    }

    const { data: alerts, error: alertsError } = await alertsQuery

    if (alertsError || !alerts || alerts.length === 0) {
      return NextResponse.json({ checked: 0, triggered: 0 })
    }

    let triggered = 0

    for (const alert of alerts) {
      // Skip if triggered recently (cooldown)
      if (alert.last_triggered) {
        const lastTriggered = new Date(alert.last_triggered).getTime()
        if (now.getTime() - lastTriggered < cooldownMs) continue
      }

      const userEmail = (alert as any).profiles?.email
      if (!userEmail) continue

      // Get the agent IDs to check
      let targetAgentIds: string[] = []
      if (alert.agent_id) {
        targetAgentIds = [alert.agent_id]
      } else {
        // Global alert — check all agents for this user
        const { data: agents } = await supabase
          .from('agents')
          .select('id')
          .eq('user_id', alert.user_id)
        targetAgentIds = (agents || []).map((a: any) => a.id)
      }

      if (targetAgentIds.length === 0) continue

      let shouldTrigger = false
      let currentValue = 0
      let agentName: string | undefined

      // Get agent name for notification
      if (alert.agent_id) {
        const { data: agentData } = await supabase
          .from('agents')
          .select('name')
          .eq('id', alert.agent_id)
          .single()
        agentName = agentData?.name
      }

      switch (alert.type) {
        case 'daily_cost_limit': {
          // Sum today's cost across target agents
          const { data: stats } = await supabase
            .from('daily_stats')
            .select('total_cost_usd')
            .in('agent_id', targetAgentIds)
            .eq('date', today)

          currentValue = (stats || []).reduce(
            (sum: number, s: any) => sum + parseFloat(s.total_cost_usd || 0),
            0
          )
          shouldTrigger = currentValue >= parseFloat(String(alert.threshold))
          break
        }

        case 'consecutive_failures': {
          // Check the last N events for consecutive errors
          const { data: recentEvents } = await supabase
            .from('events')
            .select('status')
            .in('agent_id', targetAgentIds)
            .order('timestamp', { ascending: false })
            .limit(Math.max(parseInt(String(alert.threshold)), 10))

          if (recentEvents && recentEvents.length > 0) {
            let consecutive = 0
            for (const e of recentEvents) {
              if (e.status === 'error') {
                consecutive++
              } else {
                break
              }
            }
            currentValue = consecutive
            shouldTrigger = consecutive >= parseInt(String(alert.threshold))
          }
          break
        }

        case 'rate_limit_threshold': {
          // Count rate_limit events in the last hour
          const { data: rateLimitEvents, error: rlError } = await supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .in('agent_id', targetAgentIds)
            .eq('status', 'rate_limit')
            .gte('timestamp', oneHourAgo)

          currentValue = rateLimitEvents ? 1 : 0
          // Use count from the response
          const { count } = await supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .in('agent_id', targetAgentIds)
            .eq('status', 'rate_limit')
            .gte('timestamp', oneHourAgo)

          currentValue = count || 0
          shouldTrigger = currentValue >= parseInt(String(alert.threshold))
          break
        }
      }

      if (shouldTrigger) {
        // Send notification
        if (alert.notify_via === 'email' || alert.notify_via === 'both') {
          await sendAlertEmail(
            userEmail,
            alert.type,
            parseFloat(String(alert.threshold)),
            currentValue,
            agentName
          )
        }

        // Update last_triggered
        await supabase
          .from('alerts')
          .update({ last_triggered: now.toISOString() })
          .eq('id', alert.id)

        triggered++
      }
    }

    return NextResponse.json({ checked: alerts.length, triggered })
  } catch (err: any) {
    console.error('[alerts/check] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
