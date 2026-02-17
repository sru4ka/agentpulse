"use client"

import { useEffect, useRef, useCallback } from 'react'

interface StreamCallbacks {
  onEvents?: (events: any[]) => void
  onStats?: (stats: { cost: number; tokens: number; events: number; errors: number }) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

export function useEventStream(accessToken: string | null, callbacks: StreamCallbacks) {
  const eventSourceRef = useRef<EventSource | null>(null)
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  const connect = useCallback(() => {
    if (!accessToken) return

    // EventSource doesn't support custom headers, so we pass the token as a query param
    // The SSE endpoint will accept both header and query param auth
    const url = `/api/events/stream?token=${encodeURIComponent(accessToken)}`
    const es = new EventSource(url)

    es.addEventListener('connected', () => {
      callbacksRef.current.onConnect?.()
    })

    es.addEventListener('events', (e) => {
      try {
        const events = JSON.parse(e.data)
        callbacksRef.current.onEvents?.(events)
      } catch { /* ignore parse errors */ }
    })

    es.addEventListener('stats', (e) => {
      try {
        const stats = JSON.parse(e.data)
        callbacksRef.current.onStats?.(stats)
      } catch { /* ignore parse errors */ }
    })

    es.onerror = () => {
      callbacksRef.current.onDisconnect?.()
      es.close()
      // Reconnect after 10 seconds
      setTimeout(() => connect(), 10_000)
    }

    eventSourceRef.current = es
  }, [accessToken])

  useEffect(() => {
    connect()
    return () => {
      eventSourceRef.current?.close()
    }
  }, [connect])
}
