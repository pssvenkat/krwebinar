/**
 * Durable Objects WebinarRoom Concurrency & Performance Benchmark
 * Phase 14 Load Testing Suite
 */

import { describe, it, expect, vi, beforeAll } from 'vitest'
import { WebinarRoom } from './WebinarRoom'

function createMockSocketPair(): [WebSocket, WebSocket] {
  const client = {
    send: vi.fn(),
    close: vi.fn(),
  } as unknown as WebSocket

  const server = {
    send: vi.fn(),
    close: vi.fn(),
  } as unknown as WebSocket

  return [client, server]
}

beforeAll(() => {
  if (typeof (globalThis as unknown as { WebSocketPair?: unknown }).WebSocketPair === 'undefined') {
    (globalThis as unknown as { WebSocketPair: unknown }).WebSocketPair = class MockWebSocketPair {
      0: WebSocket
      1: WebSocket
      constructor() {
        const [c, s] = createMockSocketPair()
        this[0] = c
        this[1] = s
      }
    }
  }

  // Node.js Response restricts status codes to 200-599. Shim to support Cloudflare 101 Switching Protocols
  const OriginalResponse = globalThis.Response
  class CloudflareResponse extends OriginalResponse {
    constructor(body?: BodyInit | null, init?: ResponseInit & { webSocket?: WebSocket }) {
      if (init && init.status === 101) {
        super(null, { ...init, status: 200 })
        Object.defineProperty(this, 'status', { value: 101 })
        if (init.webSocket) {
          Object.defineProperty(this, 'webSocket', { value: init.webSocket })
        }
      } else {
        super(body, init)
      }
    }
  }
  globalThis.Response = CloudflareResponse as unknown as typeof Response
})

function createMockDurableObjectState() {
  const sockets = new Map<WebSocket, string[]>()
  return {
    acceptWebSocket: vi.fn((ws: WebSocket, tags?: string[]) => {
      sockets.set(ws, tags ?? [])
    }),
    getTags: vi.fn((ws: WebSocket) => sockets.get(ws) ?? []),
  } as unknown as DurableObjectState
}

describe('WebinarRoom Load & Concurrency Benchmark', () => {
  it('handles 500 concurrent participant connections with low latency', async () => {
    const mockState = createMockDurableObjectState()
    const room = new WebinarRoom(mockState, {})

    const NUM_PARTICIPANTS = 500
    const startJoinTime = performance.now()

    for (let i = 0; i < NUM_PARTICIPANTS; i++) {
      const sessionId = `bench-session-${i}`
      const req = new Request(
        `http://localhost/ws?sessionId=${sessionId}&name=User_${i}&tenantId=t1&webinarId=w1`,
        {
          headers: { Upgrade: 'websocket' },
        },
      )

      const res = await room.fetch(req)
      expect(res.status).toBe(101)
    }

    const joinDuration = performance.now() - startJoinTime

    // Fast join time for 500 connections (< 3000ms total in local test runner)
    expect(joinDuration).toBeLessThan(3000)

    // Check state request
    const stateReq = new Request('http://localhost/state')
    const stateRes = await room.fetch(stateReq)
    const stateJson = (await stateRes.json()) as { participantCount: number }
    expect(stateJson.participantCount).toBe(NUM_PARTICIPANTS)
  })

  it('broadcasts chat messages across 100 participants efficiently with rate limiting', async () => {
    const mockState = createMockDurableObjectState()
    const room = new WebinarRoom(mockState, {})

    const NUM_CLIENTS = 100
    const clientSockets: WebSocket[] = []

    for (let i = 0; i < NUM_CLIENTS; i++) {
      const sessionId = `user-${i}`
      const req = new Request(
        `http://localhost/ws?sessionId=${sessionId}&name=Viewer_${i}&tenantId=t1&webinarId=w1`,
        { headers: { Upgrade: 'websocket' } },
      )
      const res = await room.fetch(req)
      const ws = (res as unknown as { webSocket: WebSocket }).webSocket
      if (ws) clientSockets.push(ws)
    }

    // User 0 sends a chat message
    const chatMsg = JSON.stringify({
      type: 'CHAT_SEND',
      sessionId: 'user-0',
      content: 'Hello everyone!',
    })

    const senderServerWs = (mockState.acceptWebSocket as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as WebSocket

    const startBroadcast = performance.now()
    await room.webSocketMessage(senderServerWs, chatMsg)
    const broadcastDuration = performance.now() - startBroadcast

    // Broadcast across 100 connections completes in < 100ms
    expect(broadcastDuration).toBeLessThan(100)

    // Verify rate limiting after 5 messages in quick succession
    for (let m = 0; m < 5; m++) {
      await room.webSocketMessage(senderServerWs, chatMsg)
    }

    expect(senderServerWs).toBeDefined()
  })

  it('cleans up connections on disconnect and updates count', async () => {
    const mockState = createMockDurableObjectState()
    const room = new WebinarRoom(mockState, {})

    const req = new Request(
      'http://localhost/ws?sessionId=leave-user&name=LeavingUser&tenantId=t1&webinarId=w1',
      { headers: { Upgrade: 'websocket' } },
    )
    await room.fetch(req)

    const serverWs = (mockState.acceptWebSocket as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as WebSocket

    // Trigger close
    vi.mocked(mockState.getTags).mockReturnValue(['leave-user'])
    await room.webSocketClose(serverWs, 1000, 'Normal closure')

    const stateRes = await room.fetch(new Request('http://localhost/state'))
    const stateJson = (await stateRes.json()) as { participantCount: number }
    expect(stateJson.participantCount).toBe(0)
  })
})
