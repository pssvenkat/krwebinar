/**
 * useWebSocket — Phase 8
 *
 * Manages a WebSocket connection lifecycle:
 * - Connects when `url` is non-null
 * - Auto-reconnects with exponential backoff (max 30s)
 * - Parses incoming JSON messages
 * - Exposes `sendMessage` to send JSON
 * - Cleans up on unmount or url change
 */

import { useState, useEffect, useRef, useCallback } from 'react'

export type ReadyState = 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED'

export interface WebSocketHook<T = unknown> {
  lastMessage: T | null
  readyState: ReadyState
  sendMessage: (data: object) => void
}

const READY_STATE_MAP: Record<number, ReadyState> = {
  0: 'CONNECTING',
  1: 'OPEN',
  2: 'CLOSING',
  3: 'CLOSED',
}

export function useWebSocket<T = unknown>(url: string | null): WebSocketHook<T> {
  const [lastMessage, setLastMessage] = useState<T | null>(null)
  const [readyState, setReadyState] = useState<ReadyState>('CLOSED')
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectDelayRef = useRef(1000)
  const unmountedRef = useRef(false)

  const connect = useCallback(() => {
    if (!url || unmountedRef.current) return

    const ws = new WebSocket(url)
    wsRef.current = ws
    setReadyState('CONNECTING')

    ws.onopen = () => {
      if (unmountedRef.current) { ws.close(); return }
      setReadyState('OPEN')
      reconnectDelayRef.current = 1000  // reset backoff on success
    }

    ws.onmessage = (evt) => {
      if (unmountedRef.current) return
      try {
        const data = JSON.parse(evt.data as string) as T
        setLastMessage(data)
      } catch {
        // Ignore non-JSON frames
      }
    }

    ws.onclose = (evt) => {
      if (unmountedRef.current) return
      setReadyState('CLOSED')

      // Don't reconnect on normal close (1000) or gone (1001) or webinar ended (4000)
      if (evt.code === 1000 || evt.code === 1001 || evt.code === 4000) return

      // Exponential backoff: 1s → 2s → 4s → … → 30s
      const delay = reconnectDelayRef.current
      reconnectDelayRef.current = Math.min(delay * 2, 30_000)

      reconnectTimerRef.current = setTimeout(() => {
        if (!unmountedRef.current) connect()
      }, delay)
    }

    ws.onerror = () => {
      // onclose fires after onerror — reconnect happens there
      setReadyState('CLOSED')
    }
  }, [url])

  useEffect(() => {
    unmountedRef.current = false
    reconnectDelayRef.current = 1000

    connect()

    return () => {
      unmountedRef.current = true
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted')
      }
    }
  }, [connect])

  const sendMessage = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  // Sync readyState with the actual WS state
  useEffect(() => {
    const ws = wsRef.current
    if (!ws) return
    setReadyState(READY_STATE_MAP[ws.readyState] ?? 'CLOSED')
  }, [lastMessage])

  return { lastMessage, readyState, sendMessage }
}
