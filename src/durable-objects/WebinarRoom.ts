/**
 * WebinarRoom Durable Object
 *
 * One instance per active webinar: WEBINAR_ROOM:{tenant_id}:{webinar_id}
 *
 * Responsibilities:
 * - Manage WebSocket connections for all participants
 * - Track participant presence and count
 * - Broadcast chat messages
 * - Broadcast Q&A events
 * - Broadcast poll events
 * - Broadcast announcements
 * - Rate limit chat messages per participant
 *
 * This is a stub implementation for Phase 1.
 * Full implementation in Phase 11.
 */

import type { ServerMessage, ParticipantCountMessage } from '../shared/types'

interface ParticipantConnection {
  sessionId: string
  name: string
  socket: WebSocket
  joinedAt: number
  messageCount: number
  messageWindowStart: number
}

export class WebinarRoom implements DurableObject {
  private connections: Map<string, ParticipantConnection> = new Map()
  private tenantId: string = ''
  private webinarId: string = ''
  private chatEnabled: boolean = true
  private qaEnabled: boolean = true

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Record<string, unknown>,
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const upgradeHeader = request.headers.get('Upgrade')

    // WebSocket upgrade
    if (upgradeHeader?.toLowerCase() === 'websocket') {
      return this.handleWebSocketUpgrade(request, url)
    }

    // HTTP control endpoints (host dashboard)
    if (url.pathname.endsWith('/state')) {
      return this.handleStateRequest()
    }

    return new Response('Not found', { status: 404 })
  }

  private async handleWebSocketUpgrade(request: Request, _url: URL): Promise<Response> {
    const { 0: client, 1: server } = new WebSocketPair()

    // Extract session info from query params (validated by Worker before upgrade)
    const urlParams = new URL(request.url).searchParams
    const sessionId = urlParams.get('sessionId') ?? 'unknown'
    const participantName = urlParams.get('name') ?? 'Participant'
    this.tenantId = urlParams.get('tenantId') ?? ''
    this.webinarId = urlParams.get('webinarId') ?? ''

    this.state.acceptWebSocket(server, [sessionId])

    const connection: ParticipantConnection = {
      sessionId,
      name: participantName,
      socket: server,
      joinedAt: Date.now(),
      messageCount: 0,
      messageWindowStart: Date.now(),
    }

    this.connections.set(sessionId, connection)
    this.broadcastParticipantCount()

    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string') return

    try {
      const data = JSON.parse(message) as { type: string; sessionId: string }
      const connection = this.connections.get(data.sessionId)
      if (!connection) return

      switch (data.type) {
        case 'HEARTBEAT':
          // Acknowledge heartbeat — attendance tracking handled by Worker
          break
        case 'CHAT_SEND':
          await this.handleChatMessage(connection, data as { type: string; sessionId: string; content: string })
          break
        default:
          break
      }
    } catch {
      // Ignore malformed messages
    }
  }

  async webSocketClose(ws: WebSocket, _code: number, _reason: string): Promise<void> {
    const tags = this.state.getTags(ws)
    const sessionId = tags[0]
    if (sessionId) {
      this.connections.delete(sessionId)
      this.broadcastParticipantCount()
    }
  }

  async webSocketError(ws: WebSocket, _error: unknown): Promise<void> {
    const tags = this.state.getTags(ws)
    const sessionId = tags[0]
    if (sessionId) {
      this.connections.delete(sessionId)
      this.broadcastParticipantCount()
    }
  }

  private async handleChatMessage(
    connection: ParticipantConnection,
    data: { type: string; sessionId: string; content: string },
  ): Promise<void> {
    if (!this.chatEnabled) return

    // Rate limiting: max 5 messages per 10 seconds
    const now = Date.now()
    if (now - connection.messageWindowStart > 10_000) {
      connection.messageCount = 0
      connection.messageWindowStart = now
    }

    if (connection.messageCount >= 5) {
      const errorMsg: ServerMessage = {
        type: 'ERROR',
        code: 'RATE_LIMITED',
        message: 'You are sending messages too quickly. Please wait.',
        timestamp: new Date().toISOString(),
      }
      connection.socket.send(JSON.stringify(errorMsg))
      return
    }

    connection.messageCount++

    const chatMsg: ServerMessage = {
      type: 'CHAT_MESSAGE',
      id: crypto.randomUUID(),
      participantId: connection.sessionId,
      participantName: connection.name,
      content: (data.content ?? '').slice(0, 500),
      timestamp: new Date().toISOString(),
    }

    this.broadcast(chatMsg)
  }

  private broadcast(message: ServerMessage): void {
    const payload = JSON.stringify(message)
    for (const conn of this.connections.values()) {
      try {
        conn.socket.send(payload)
      } catch {
        // Connection may have closed — will be cleaned up on webSocketClose
      }
    }
  }

  private broadcastParticipantCount(): void {
    const msg: ParticipantCountMessage = {
      type: 'PARTICIPANT_COUNT',
      count: this.connections.size,
      timestamp: new Date().toISOString(),
    }
    this.broadcast(msg)
  }

  private handleStateRequest(): Response {
    return Response.json({
      participantCount: this.connections.size,
      tenantId: this.tenantId,
      webinarId: this.webinarId,
      chatEnabled: this.chatEnabled,
      qaEnabled: this.qaEnabled,
    })
  }
}
