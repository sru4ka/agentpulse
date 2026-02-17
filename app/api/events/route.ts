import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { rateLimit, EVENTS_RATE_LIMIT } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const rl = rateLimit(`events:${ip}`, EVENTS_RATE_LIMIT)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      )
    }

    const body = await request.json()
    const { api_key, agent_name, framework, events } = body

    if (!api_key || !events || !Array.isArray(events)) {
      return NextResponse.json({ error: 'Missing required fields: api_key, events' }, { status: 400 })
    }

    // Limit batch size
    if (events.length > 100) {
      return NextResponse.json({ error: 'Batch too large. Max 100 events per request.' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Plan limits: max agents and history retention (days)
    const PLAN_LIMITS: Record<string, { maxAgents: number; historyDays: number }> = {
      free: { maxAgents: 1, historyDays: 7 },
      pro: { maxAgents: 5, historyDays: 90 },
      team: { maxAgents: 25, historyDays: 365 },
      enterprise: { maxAgents: 999, historyDays: 99999 },
    }

    // Look up user by API key
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, plan')
      .eq('api_key', api_key)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    const plan = (profile.plan as string) || 'free'
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free

    // Find or create agent (use maybeSingle to avoid error when no rows found)
    const { data: agent_result, error: agentLookupError } = await supabase
      .from('agents')
      .select('id')
      .eq('user_id', profile.id)
      .eq('name', agent_name || 'default')
      .maybeSingle()

    let agent = agent_result

    if (agentLookupError) {
      console.error('Agent lookup error:', agentLookupError.message)
      return NextResponse.json({ error: 'Failed to look up agent' }, { status: 500 })
    }

    if (!agent) {
      // Check agent limit before creating
      const { count: agentCount } = await supabase
        .from('agents')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)

      if ((agentCount || 0) >= limits.maxAgents) {
        return NextResponse.json(
          { error: `Agent limit reached (${limits.maxAgents} on ${plan} plan). Upgrade at https://agentpulses.com/pricing` },
          { status: 403 }
        )
      }

      const { data: newAgent, error: agentError } = await supabase
        .from('agents')
        .insert({
          user_id: profile.id,
          name: agent_name || 'default',
          framework: framework || 'openclaw',
          last_seen: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (agentError) {
        return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 })
      }
      agent = newAgent
    } else {
      // Update last_seen
      await supabase
        .from('agents')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', agent.id)
    }

    // Model pricing per million tokens (server-side fallback)
    const MODEL_PRICING: Record<string, { input: number; output: number }> = {
      'MiniMax-M2.5': { input: 15, output: 120 },
      'claude-sonnet-4-5': { input: 3, output: 15 },
      'claude-haiku-3.5': { input: 0.80, output: 4 },
      'claude-opus-4': { input: 15, output: 75 },
      'gpt-4o': { input: 2.50, output: 10 },
      'gpt-4o-mini': { input: 0.15, output: 0.60 },
      'o3-mini': { input: 1.10, output: 4.40 },
    }

    function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
      const pricing = MODEL_PRICING[model] || Object.entries(MODEL_PRICING).find(
        ([k]) => model.toLowerCase().includes(k.toLowerCase())
      )?.[1]
      if (!pricing) return 0
      return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output
    }

    // Insert events — store prompt_messages and response_text in metadata JSONB
    // If plugin sends 0 tokens for a success event, estimate server-side
    const eventRows = events.map((e: any) => {
      let inputTokens = e.input_tokens || 0
      let outputTokens = e.output_tokens || 0
      let costUsd = e.cost_usd || 0

      // Server-side fallback: if plugin sent 0 tokens for a successful call,
      // estimate reasonable defaults based on the model
      if (inputTokens === 0 && outputTokens === 0 && (e.status === 'success' || !e.status)) {
        // Estimate from prompt content if available
        const promptText = Array.isArray(e.prompt_messages)
          ? e.prompt_messages.map((m: any) => m.content || '').join(' ')
          : ''
        const responseText = e.response_text || ''

        if (promptText || responseText) {
          // ~4 chars per token for English
          inputTokens = Math.max(100, Math.round(promptText.length / 4))
          outputTokens = Math.max(50, Math.round(responseText.length / 4))
        } else {
          // Minimum reasonable estimate for an LLM call
          inputTokens = 500
          outputTokens = 200
        }
        costUsd = estimateCost(e.model || 'unknown', inputTokens, outputTokens)
      }

      return {
        agent_id: agent!.id,
        timestamp: e.timestamp || new Date().toISOString(),
        provider: e.provider || 'unknown',
        model: e.model || 'unknown',
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
        cost_usd: Math.round(costUsd * 1_000_000) / 1_000_000,
        latency_ms: e.latency_ms || null,
        status: e.status || 'success',
        error_message: e.error_message || null,
        task_context: e.task_context || null,
        tools_used: e.tools_used || [],
        metadata: {
          ...(e.metadata || {}),
          ...(e.prompt_messages ? { prompt_messages: e.prompt_messages } : {}),
          ...(e.response_text ? { response_text: e.response_text } : {}),
          ...((e.input_tokens === 0 && e.output_tokens === 0) ? { tokens_estimated: true } : {}),
        },
      }
    })

    const { error: insertError } = await supabase
      .from('events')
      .insert(eventRows)

    if (insertError) {
      return NextResponse.json({ error: 'Failed to insert events', details: insertError.message }, { status: 500 })
    }

    // Update daily stats (upsert)
    const today = new Date().toISOString().split('T')[0]
    const totalTokens = eventRows.reduce((s: number, e: any) => s + e.total_tokens, 0)
    const totalCost = eventRows.reduce((s: number, e: any) => s + (e.cost_usd || 0), 0)
    const successCount = eventRows.filter((e: any) => e.status === 'success').length
    const errorCount = eventRows.filter((e: any) => e.status === 'error').length
    const rateLimitCount = eventRows.filter((e: any) => e.status === 'rate_limit').length

    // Update daily stats atomically using RPC or fallback to select-then-update
    const { data: existingStats } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('agent_id', agent!.id)
      .eq('date', today)
      .maybeSingle()

    if (existingStats) {
      const { error: updateError } = await supabase
        .from('daily_stats')
        .update({
          total_events: existingStats.total_events + eventRows.length,
          total_tokens: existingStats.total_tokens + totalTokens,
          total_cost_usd: parseFloat(existingStats.total_cost_usd) + totalCost,
          success_count: existingStats.success_count + successCount,
          error_count: existingStats.error_count + errorCount,
          rate_limit_count: existingStats.rate_limit_count + rateLimitCount,
        })
        .eq('id', existingStats.id)

      if (updateError) {
        console.error('Failed to update daily_stats:', updateError.message)
      }
    } else {
      const { error: insertStatsError } = await supabase
        .from('daily_stats')
        .insert({
          agent_id: agent!.id,
          date: today,
          total_events: eventRows.length,
          total_tokens: totalTokens,
          total_cost_usd: totalCost,
          success_count: successCount,
          error_count: errorCount,
          rate_limit_count: rateLimitCount,
        })

      if (insertStatsError) {
        console.error('Failed to insert daily_stats:', insertStatsError.message)
      }
    }

    // Clean up old events beyond plan's history limit
    if (limits.historyDays < 99999) {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - limits.historyDays)
      await supabase
        .from('events')
        .delete()
        .eq('agent_id', agent!.id)
        .lt('timestamp', cutoff.toISOString())
    }

    return NextResponse.json({ success: true, events_received: eventRows.length })
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 })
  }
}
