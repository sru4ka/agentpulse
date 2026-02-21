import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { rateLimit, EVENTS_RATE_LIMIT } from '@/lib/rate-limit'
import { authenticateRequest } from '@/lib/api-auth'

export async function GET(request: Request) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized. Provide X-API-Key header or Bearer token.' }, { status: 401 })
    }

    if (auth.agentIds.length === 0) {
      return NextResponse.json({ events: [], total: 0 })
    }

    const url = new URL(request.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 500)
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const model = url.searchParams.get('model')
    const status = url.searchParams.get('status')
    const agentName = url.searchParams.get('agent')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    const supabase = createServerSupabaseClient()

    // If agent name filter, resolve to agent IDs
    let agentIds = auth.agentIds
    if (agentName) {
      const { data: matchedAgents } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', auth.userId)
        .ilike('name', agentName)
      agentIds = (matchedAgents || []).map((a: any) => a.id)
      if (agentIds.length === 0) {
        return NextResponse.json({ events: [], total: 0 })
      }
    }

    let query = supabase
      .from('events')
      .select('*', { count: 'exact' })
      .in('agent_id', agentIds)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1)

    if (model) query = query.ilike('model', `%${model}%`)
    if (status) query = query.eq('status', status)
    if (from) query = query.gte('timestamp', from)
    if (to) query = query.lte('timestamp', to)

    const { data: events, count, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to query events', details: error.message }, { status: 500 })
    }

    return NextResponse.json({
      events: events || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 })
  }
}

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

    // Comprehensive model pricing per million tokens (server-side fallback)
    const MODEL_PRICING: Record<string, { input: number; output: number }> = {
      // MiniMax
      'MiniMax-M2.5': { input: 0.30, output: 1.20 },
      'minimax-m1': { input: 5, output: 40 },
      'MiniMax-Text-02': { input: 1, output: 5 },
      'abab6.5s-chat': { input: 1, output: 5 },
      'abab6.5-chat': { input: 5, output: 25 },
      // Anthropic
      'claude-opus-4': { input: 15, output: 75 },
      'claude-opus-4-6': { input: 15, output: 75 },
      'claude-opus-4-5': { input: 15, output: 75 },
      'claude-sonnet-4-6': { input: 3, output: 15 },
      'claude-sonnet-4-5': { input: 3, output: 15 },
      'claude-sonnet-4': { input: 3, output: 15 },
      'claude-haiku-4-5': { input: 1, output: 5 },
      'claude-haiku-4': { input: 1, output: 5 },
      'claude-haiku-3.5': { input: 0.80, output: 4 },
      'claude-3.5-sonnet': { input: 3, output: 15 },
      'claude-3-opus': { input: 15, output: 75 },
      'claude-3-haiku': { input: 0.25, output: 1.25 },
      // OpenAI
      'gpt-4o': { input: 2.50, output: 10 },
      'gpt-4o-mini': { input: 0.15, output: 0.60 },
      'gpt-4-turbo': { input: 10, output: 30 },
      'gpt-4': { input: 30, output: 60 },
      'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
      'o3': { input: 2, output: 8 },
      'o3-mini': { input: 1.10, output: 4.40 },
      'o1': { input: 15, output: 60 },
      'o1-mini': { input: 3, output: 12 },
      // Google
      'gemini-2.0-flash': { input: 0.10, output: 0.40 },
      'gemini-2.0-pro': { input: 1.25, output: 10 },
      'gemini-1.5-pro': { input: 1.25, output: 5 },
      'gemini-1.5-flash': { input: 0.075, output: 0.30 },
      // Mistral
      'mistral-large': { input: 2, output: 6 },
      'mistral-small': { input: 0.20, output: 0.60 },
      'codestral': { input: 0.30, output: 0.90 },
      // Cohere
      'command-r-plus': { input: 2.50, output: 10 },
      'command-r': { input: 0.15, output: 0.60 },
      // Meta / Llama
      'llama-3.3-70b': { input: 0.79, output: 0.79 },
      'llama-3.1-405b': { input: 3, output: 3 },
      'llama-3.1-70b': { input: 0.79, output: 0.79 },
      'llama-3.1-8b': { input: 0.05, output: 0.05 },
      // DeepSeek
      'deepseek-chat': { input: 0.14, output: 0.28 },
      'deepseek-r1': { input: 0.55, output: 2.19 },
      'deepseek-v3': { input: 0.27, output: 1.10 },
      // xAI / Grok
      'grok-2': { input: 2, output: 10 },
      'grok-3': { input: 3, output: 15 },
      'grok-3-mini': { input: 0.30, output: 0.50 },
      // Amazon
      'amazon.nova-pro': { input: 0.80, output: 3.20 },
      'amazon.nova-lite': { input: 0.06, output: 0.24 },
      // Perplexity
      'sonar-pro': { input: 3, output: 15 },
      'sonar': { input: 1, output: 1 },
    }

    function lookupPricing(model: string): { input: number; output: number } | null {
      // Exact match
      if (MODEL_PRICING[model]) return MODEL_PRICING[model]
      // Fuzzy match (model name contains known key or vice versa)
      const entry = Object.entries(MODEL_PRICING).find(
        ([k]) => model.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(model.toLowerCase())
      )
      return entry ? entry[1] : null
    }

    function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
      const pricing = lookupPricing(model)
      if (!pricing) return 0
      return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output
    }

    // Insert events — prompt_messages and response_text are stored in metadata JSONB
    // (dedicated columns require migration 002; metadata works without it)
    // Plugin sends exact tokens from API responses when available; server estimates as fallback
    const eventRows = events.map((e: any) => {
      let inputTokens = e.input_tokens || 0
      let outputTokens = e.output_tokens || 0
      let costUsd = e.cost_usd || 0
      let tokensEstimated = false

      // If plugin already has real tokens (from API response parsing), trust them
      // and recalculate cost server-side for accuracy
      if (inputTokens > 0 || outputTokens > 0) {
        // Recalculate cost server-side (plugin may have outdated pricing)
        const serverCost = estimateCost(e.model || 'unknown', inputTokens, outputTokens)
        if (serverCost > 0) {
          costUsd = serverCost
        }
      }

      // Server-side fallback: if plugin sent 0 tokens for a successful call,
      // estimate reasonable defaults based on the model
      if (inputTokens === 0 && outputTokens === 0 && (e.status === 'success' || !e.status)) {
        tokensEstimated = true
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
          ...(tokensEstimated ? { tokens_estimated: true } : {}),
          ...(e.user_id ? { user_id: e.user_id } : {}),
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

    // Trigger alert checks asynchronously (fire-and-forget)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    fetch(`${baseUrl}/api/alerts/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: agent!.id }),
    }).catch(() => { /* non-critical */ })

    return NextResponse.json({ success: true, events_received: eventRows.length })
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 })
  }
}
