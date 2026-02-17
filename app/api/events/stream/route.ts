import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/events/stream — Server-Sent Events for real-time dashboard updates
// The client connects once and receives live stats + events as they come in.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Accept auth via header or query param (EventSource can't send headers)
  const authHeader = request.headers.get('Authorization')
  const url = new URL(request.url)
  const queryToken = url.searchParams.get('token')
  const token = authHeader ? authHeader.replace('Bearer ', '') : queryToken

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's agent IDs
  const { data: agents } = await supabase
    .from('agents')
    .select('id')
    .eq('user_id', user.id)

  const agentIds = (agents || []).map((a: any) => a.id)

  const encoder = new TextEncoder()
  let closed = false

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial heartbeat
      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: 'connected' })}\n\n`))

      // Poll for new data every 5 seconds
      // (Supabase Realtime could be used instead for true push,
      //  but polling is simpler and works without additional setup)
      let lastEventTimestamp = new Date().toISOString()

      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval)
          return
        }

        try {
          if (agentIds.length === 0) return

          // Check for new events since last poll
          const { data: newEvents } = await supabase
            .from('events')
            .select('*')
            .in('agent_id', agentIds)
            .gt('timestamp', lastEventTimestamp)
            .order('timestamp', { ascending: false })
            .limit(20)

          if (newEvents && newEvents.length > 0) {
            lastEventTimestamp = newEvents[0].timestamp

            // Send new events
            controller.enqueue(
              encoder.encode(`event: events\ndata: ${JSON.stringify(newEvents)}\n\n`)
            )
          }

          // Send updated today's stats
          const today = new Date().toISOString().split('T')[0]
          const { data: todayStats } = await supabase
            .from('daily_stats')
            .select('*')
            .in('agent_id', agentIds)
            .eq('date', today)

          if (todayStats) {
            const summary = {
              cost: todayStats.reduce((s: number, d: any) => s + parseFloat(d.total_cost_usd || 0), 0),
              tokens: todayStats.reduce((s: number, d: any) => s + (d.total_tokens || 0), 0),
              events: todayStats.reduce((s: number, d: any) => s + (d.total_events || 0), 0),
              errors: todayStats.reduce((s: number, d: any) => s + (d.error_count || 0), 0),
            }

            controller.enqueue(
              encoder.encode(`event: stats\ndata: ${JSON.stringify(summary)}\n\n`)
            )
          }

          // Heartbeat
          controller.enqueue(encoder.encode(`:heartbeat\n\n`))
        } catch (err) {
          // Connection might be closed
          if (!closed) {
            console.error('[sse] Poll error:', err)
          }
        }
      }, 5000)

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        closed = true
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
