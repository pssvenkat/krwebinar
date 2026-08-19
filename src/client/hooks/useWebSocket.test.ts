/**
 * useWebSocket hook tests — Comprehensive Suite
 *
 * Tests the hook's connection lifecycle, JSON message parsing,
 * exponential backoff reconnect logic, terminal status codes (1000, 1001, 4000),
 * dynamic URL switching, timer cancellation on unmount, and error handling.
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

  simulateClose(code = 1006, reason = '') {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.({ code, reason })
  }

  simulateError() {
    this.onerror?.()
  }
}

// ── Tests ─────────────────────────────────────────────────────────

describe('useWebSocket Comprehensive Test Suite', () => {
  beforeEach(() => {
    MockWebSocket.instances = []
    vi.stubGlobal('WebSocket', MockWebSocket)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  describe('Initialization and Connection Lifecycle', () => {
    it('starts as CLOSED when url is null and creates no WebSocket instances', () => {
      const { result } = renderHook(() => useWebSocket(null))
      expect(result.current.readyState).toBe('CLOSED')
      expect(result.current.lastMessage).toBeNull()
      expect(MockWebSocket.instances).toHaveLength(0)
    })

    it('creates a WebSocket when url is provided and starts in CONNECTING state', () => {
      const { result } = renderHook(() => useWebSocket('wss://example.com/ws'))
      expect(MockWebSocket.instances).toHaveLength(1)
      expect(MockWebSocket.instances[0].url).toBe('wss://example.com/ws')
      expect(result.current.readyState).toBe('CONNECTING')
    })

    it('transitions to OPEN and sends initial JOIN message when connection opens', async () => {
      const { result } = renderHook(() => useWebSocket('wss://example.com/ws'))
      act(() => {
        MockWebSocket.instances[0].simulateOpen()
      })
      expect(result.current.readyState).toBe('OPEN')
      expect(MockWebSocket.instances[0].sentMessages).toHaveLength(1)
      expect(JSON.parse(MockWebSocket.instances[0].sentMessages[0])).toEqual({ type: 'JOIN' })
    })

    it('closes WebSocket cleanly with code 1000 on unmount', () => {
      const { unmount } = renderHook(() => useWebSocket('wss://example.com/ws'))
      act(() => { MockWebSocket.instances[0].simulateOpen() })
      unmount()
      expect(MockWebSocket.instances[0].readyState).toBe(MockWebSocket.CLOSED)
    })
  })

  describe('Message Transmission & Reception', () => {
    it('parses structured JSON messages into lastMessage', async () => {
      const { result } = renderHook(() => useWebSocket<{ type: string; count: number }>('wss://example.com/ws'))
      act(() => {
        MockWebSocket.instances[0].simulateOpen()
        MockWebSocket.instances[0].simulateMessage({ type: 'PARTICIPANT_COUNT', count: 42 })
      })
      expect(result.current.lastMessage).toEqual({ type: 'PARTICIPANT_COUNT', count: 42 })
    })

    it('handles multiple sequential messages in order', async () => {
      const { result } = renderHook(() => useWebSocket<{ seq: number }>('wss://example.com/ws'))
      act(() => {
        MockWebSocket.instances[0].simulateOpen()
      })
      act(() => {
        MockWebSocket.instances[0].simulateMessage({ seq: 1 })
      })
      expect(result.current.lastMessage).toEqual({ seq: 1 })

      act(() => {
        MockWebSocket.instances[0].simulateMessage({ seq: 2 })
      })
      expect(result.current.lastMessage).toEqual({ seq: 2 })
    })

    it('safely ignores malformed non-JSON messages without throwing', () => {
      const { result } = renderHook(() => useWebSocket('wss://example.com/ws'))
      act(() => {
        MockWebSocket.instances[0].simulateOpen()
        MockWebSocket.instances[0].onmessage?.({ data: 'invalid-json-{broken' })
      })
      expect(result.current.lastMessage).toBeNull()
    })

    it('sendMessage sends JSON formatted payload when OPEN', () => {
      const { result } = renderHook(() => useWebSocket('wss://example.com/ws'))
      act(() => {
        MockWebSocket.instances[0].simulateOpen()
      })
      act(() => {
        result.current.sendMessage({ type: 'HEARTBEAT', sessionId: 'abc-123' })
      })
      expect(MockWebSocket.instances[0].sentMessages).toHaveLength(2)
      expect(JSON.parse(MockWebSocket.instances[0].sentMessages[0])).toEqual({ type: 'JOIN' })
      expect(JSON.parse(MockWebSocket.instances[0].sentMessages[1])).toEqual({
        type: 'HEARTBEAT',
        sessionId: 'abc-123',
      })
    })

    it('sendMessage ignores requests when WebSocket is not OPEN', () => {
      const { result } = renderHook(() => useWebSocket('wss://example.com/ws'))
      // Still in CONNECTING state
      act(() => {
        result.current.sendMessage({ type: 'HEARTBEAT', sessionId: 'abc' })
      })
      expect(MockWebSocket.instances[0].sentMessages).toHaveLength(0)
    })
  })

  describe('Reconnection & Exponential Backoff Logic', () => {
    it('reconnects with exponential backoff progression (1s, 2s, 4s)', async () => {
      renderHook(() => useWebSocket('wss://example.com/ws'))
      act(() => { MockWebSocket.instances[0].simulateOpen() })

      // First drop (delay 1s)
      act(() => { MockWebSocket.instances[0].simulateClose(1006) })
      await act(async () => { vi.advanceTimersByTime(999) })
      expect(MockWebSocket.instances).toHaveLength(1)
      await act(async () => { vi.advanceTimersByTime(101) })
      expect(MockWebSocket.instances).toHaveLength(2)

      // Second drop (delay doubled to 2s)
      act(() => { MockWebSocket.instances[1].simulateClose(1006) })
      await act(async () => { vi.advanceTimersByTime(1900) })
      expect(MockWebSocket.instances).toHaveLength(2)
      await act(async () => { vi.advanceTimersByTime(200) })
      expect(MockWebSocket.instances).toHaveLength(3)

      // Third drop (delay doubled to 4s)
      act(() => { MockWebSocket.instances[2].simulateClose(1006) })
      await act(async () => { vi.advanceTimersByTime(3900) })
      expect(MockWebSocket.instances).toHaveLength(3)
      await act(async () => { vi.advanceTimersByTime(200) })
      expect(MockWebSocket.instances).toHaveLength(4)
    })

    it('resets backoff delay to 1s upon successful connection open', async () => {
      renderHook(() => useWebSocket('wss://example.com/ws'))
      act(() => { MockWebSocket.instances[0].simulateOpen() })

      // Disconnect and let it back off to 2s
      act(() => { MockWebSocket.instances[0].simulateClose(1006) })
      await act(async () => { vi.advanceTimersByTime(1100) })
      expect(MockWebSocket.instances).toHaveLength(2)

      // Successfully open the second connection -> resets delay to 1000
      act(() => { MockWebSocket.instances[1].simulateOpen() })

      // Disconnect again -> should reconnect in 1s, not 2s or 4s
      act(() => { MockWebSocket.instances[1].simulateClose(1006) })
      await act(async () => { vi.advanceTimersByTime(1100) })
      expect(MockWebSocket.instances).toHaveLength(3)
    })

    it('does NOT reconnect on clean close code 1000 (NORMAL)', async () => {
      renderHook(() => useWebSocket('wss://example.com/ws'))
      act(() => { MockWebSocket.instances[0].simulateOpen() })
      act(() => { MockWebSocket.instances[0].simulateClose(1000) })

      await act(async () => { vi.advanceTimersByTime(10000) })
      expect(MockWebSocket.instances).toHaveLength(1)
    })

    it('does NOT reconnect on close code 1001 (GOING_AWAY)', async () => {
      renderHook(() => useWebSocket('wss://example.com/ws'))
      act(() => { MockWebSocket.instances[0].simulateOpen() })
      act(() => { MockWebSocket.instances[0].simulateClose(1001) })

      await act(async () => { vi.advanceTimersByTime(10000) })
      expect(MockWebSocket.instances).toHaveLength(1)
    })

    it('does NOT reconnect on close code 4000 (WEBINAR_ENDED)', async () => {
      renderHook(() => useWebSocket('wss://example.com/ws'))
      act(() => { MockWebSocket.instances[0].simulateOpen() })
      act(() => { MockWebSocket.instances[0].simulateClose(4000, 'Webinar Ended') })

      await act(async () => { vi.advanceTimersByTime(10000) })
      expect(MockWebSocket.instances).toHaveLength(1)
    })
  })

  describe('Dynamic URL Switching & Cleanup', () => {
    it('switches connection when URL prop changes', () => {
      const { rerender } = renderHook(({ url }: { url: string | null }) => useWebSocket(url), {
        initialProps: { url: 'wss://example.com/room1' },
      })
      expect(MockWebSocket.instances).toHaveLength(1)
      expect(MockWebSocket.instances[0].url).toBe('wss://example.com/room1')

      // Switch to new room
      rerender({ url: 'wss://example.com/room2' })
      expect(MockWebSocket.instances[0].readyState).toBe(MockWebSocket.CLOSED)
      expect(MockWebSocket.instances).toHaveLength(2)
      expect(MockWebSocket.instances[1].url).toBe('wss://example.com/room2')
    })

    it('disconnects and stays CLOSED when URL changes from string to null', () => {
      const { result, rerender } = renderHook(({ url }: { url: string | null }) => useWebSocket(url), {
        initialProps: { url: 'wss://example.com/room1' as string | null },
      })
      expect(MockWebSocket.instances).toHaveLength(1)

      rerender({ url: null })
      expect(MockWebSocket.instances[0].readyState).toBe(MockWebSocket.CLOSED)
      expect(result.current.readyState).toBe('CLOSED')
    })

    it('cancels pending reconnect timer on unmount and prevents reconnect after unmount', async () => {
      const { unmount } = renderHook(() => useWebSocket('wss://example.com/ws'))
      act(() => { MockWebSocket.instances[0].simulateOpen() })

      // Drop connection
      act(() => { MockWebSocket.instances[0].simulateClose(1006) })

      // Unmount before timer fires
      unmount()

      // Advance timer
      await act(async () => { vi.advanceTimersByTime(5000) })

      // No new instance should be created after unmount
      expect(MockWebSocket.instances).toHaveLength(1)
    })

    it('transitions to CLOSED on onerror event', () => {
      const { result } = renderHook(() => useWebSocket('wss://example.com/ws'))
      act(() => { MockWebSocket.instances[0].simulateOpen() })
      expect(result.current.readyState).toBe('OPEN')

      act(() => {
        MockWebSocket.instances[0].simulateError()
      })
      expect(result.current.readyState).toBe('CLOSED')
    })
  })
})
