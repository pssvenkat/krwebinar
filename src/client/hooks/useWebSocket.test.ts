/**
 * useWebSocket hook tests — Phase 8
 *
 * Tests the hook's connection lifecycle, JSON message parsing,
 * reconnect logic, and sendMessage behavior using a mock WebSocket.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWebSocket } from './useWebSocket'

// ── Mock WebSocket ────────────────────────────────────────────────

class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState = MockWebSocket.CONNECTING
  url: string

  onopen: (() => void) | null = null
  onmessage: ((evt: { data: string }) => void) | null = null
  onclose: ((evt: { code: number; reason: string }) => void) | null = null
  onerror: (() => void) | null = null

  sentMessages: string[] = []
  static instances: MockWebSocket[] = []

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }

  send(data: string) {
    this.sentMessages.push(data)
  }

  close(code = 1000, reason = '') {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.({ code, reason })
  }

  // Test helpers
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN
    this.onopen?.()
  }

  simulateMessage(data: object) {
    this.onmessage?.({ data: JSON.stringify(data) })
  }

  simulateClose(code = 1006) {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.({ code, reason: '' })
  }
}

// ── Tests ─────────────────────────────────────────────────────────

describe('useWebSocket', () => {
  beforeEach(() => {
    MockWebSocket.instances = []
    vi.stubGlobal('WebSocket', MockWebSocket)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('starts as CLOSED when url is null', () => {
    const { result } = renderHook(() => useWebSocket(null))
    expect(result.current.readyState).toBe('CLOSED')
    expect(result.current.lastMessage).toBeNull()
    expect(MockWebSocket.instances).toHaveLength(0)
  })

  it('creates a WebSocket when url is provided', () => {
    renderHook(() => useWebSocket('wss://example.com/ws'))
    expect(MockWebSocket.instances).toHaveLength(1)
    expect(MockWebSocket.instances[0].url).toBe('wss://example.com/ws')
  })

  it('transitions to OPEN when connection opens', async () => {
    const { result } = renderHook(() => useWebSocket('wss://example.com/ws'))
    act(() => {
      MockWebSocket.instances[0].simulateOpen()
    })
    expect(result.current.readyState).toBe('OPEN')
  })

  it('parses JSON messages into lastMessage', async () => {
    const { result } = renderHook(() => useWebSocket<{ type: string; count: number }>('wss://example.com/ws'))
    act(() => {
      MockWebSocket.instances[0].simulateOpen()
      MockWebSocket.instances[0].simulateMessage({ type: 'PARTICIPANT_COUNT', count: 42 })
    })
    expect(result.current.lastMessage).toEqual({ type: 'PARTICIPANT_COUNT', count: 42 })
  })

  it('ignores malformed non-JSON messages', () => {
    const { result } = renderHook(() => useWebSocket('wss://example.com/ws'))
    act(() => {
      MockWebSocket.instances[0].simulateOpen()
      MockWebSocket.instances[0].onmessage?.({ data: 'not-json' })
    })
    expect(result.current.lastMessage).toBeNull()
  })

  it('sendMessage sends JSON when OPEN', () => {
    const { result } = renderHook(() => useWebSocket('wss://example.com/ws'))
    act(() => {
      MockWebSocket.instances[0].simulateOpen()
    })
    act(() => {
      result.current.sendMessage({ type: 'HEARTBEAT', sessionId: 'abc' })
    })
    expect(MockWebSocket.instances[0].sentMessages).toHaveLength(1)
    expect(JSON.parse(MockWebSocket.instances[0].sentMessages[0])).toEqual({
      type: 'HEARTBEAT',
      sessionId: 'abc',
    })
  })

  it('sendMessage does nothing when not OPEN', () => {
    const { result } = renderHook(() => useWebSocket('wss://example.com/ws'))
    // Not yet opened
    act(() => {
      result.current.sendMessage({ type: 'HEARTBEAT', sessionId: 'abc' })
    })
    expect(MockWebSocket.instances[0].sentMessages).toHaveLength(0)
  })

  it('reconnects with backoff on unexpected close', async () => {
    renderHook(() => useWebSocket('wss://example.com/ws'))
    act(() => { MockWebSocket.instances[0].simulateOpen() })

    // Simulate unexpected close (code 1006)
    act(() => { MockWebSocket.instances[0].simulateClose(1006) })

    // Timer fires after 1s backoff
    await act(async () => { vi.advanceTimersByTime(1100) })

    expect(MockWebSocket.instances).toHaveLength(2)
  })

  it('does NOT reconnect on clean close (code 1000)', async () => {
    renderHook(() => useWebSocket('wss://example.com/ws'))
    act(() => { MockWebSocket.instances[0].simulateOpen() })
    act(() => { MockWebSocket.instances[0].simulateClose(1000) })

    await act(async () => { vi.advanceTimersByTime(5000) })

    expect(MockWebSocket.instances).toHaveLength(1)
  })

  it('closes WebSocket on unmount', () => {
    const { unmount } = renderHook(() => useWebSocket('wss://example.com/ws'))
    act(() => { MockWebSocket.instances[0].simulateOpen() })
    unmount()
    expect(MockWebSocket.instances[0].readyState).toBe(MockWebSocket.CLOSED)
  })
})
