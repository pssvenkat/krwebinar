/**
 * WebinarRoom Durable Object — Phase 8 (Full Implementation)
 *
 * One instance per active webinar: WEBINAR_ROOM:{tenantId}:{webinarId}
 * Named key must be deterministic so all participants land on the same DO.
 *
 * Responsibilities:
 * - Manage WebSocket connections for attendees + host
 * - Track participant presence and count
 * - Broadcast real-time chat messages (rate-limited)
 * - Broadcast ROOM_STATE on join / count change
 * - Broadcast WEBINAR_ENDED when host ends the session
 * - Heartbeat acknowledgement
 */

import type {
  ServerMessage,
  ParticipantCountMessage,
  RoomStateMessage,
  ChatMessage,
  ErrorMessage,
} from '../shared/types/index'

interface ParticipantConnection {
  sessionId: string
  name: string
  socket: WebSocket
  isHost: boolean
  joinedAt: number
  messageCount: number
  messageWindowStart: number
}

// Extend server message types with Phase 8 additions
type Phase8Message =
  | ServerMessage
  | { type: 'WEBINAR_ENDED'; timestamp: string }

export class WebinarRoom implements DurableObject {
  private connections: Map<string, ParticipantConnection> = new Map()
  private tenantId: string = ''
  private webinarId: string = ''
  private chatEnabled: boolean = true
  private qaEnabled: boolean = true
  private isEnded: boolean = false

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Record<string, unknown>,
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const upgradeHeader = request.headers.get('Upgrade')

    // WebSocket upgrade — both attendees and host
    if (upgradeHeader?.toLowerCase() === 'websocket') {
      return this.handleWebSocketUpgrade(request, url)
    }

    // HTTP: current state (viewer count, flags)
    if (url.pathname.endsWith('/state')) {
      return this.handleStateRequest()
    }

    // HTTP: host broadcasts a system announcement
    if (url.pathname.endsWith('/announce') && request.method === 'POST') {
      return this.handleAnnouncement(request)
    }

    return new Response('Not found', { status: 404 })
  }

  // ── WebSocket upgrade ─────────────────────────────────────────────

  private async handleWebSocketUpgrade(request: Request, _url: URL): Promise<Response> {
    if (this.isEnded) {
      return new Response('Webinar has ended', { status: 410 })
    }

    const { 0: client, 1: server } = new WebSocketPair()

    const urlParams = new URL(request.url).searchParams
    const sessionId = urlParams.get('sessionId') ?? crypto.randomUUID()
    const participantName = urlParams.get('name') ?? 'Participant'
    const isHost = urlParams.get('isHost') === '1'
    this.tenantId = urlParams.get('tenantId') ?? this.tenantId
    this.webinarId = urlParams.get('webinarId') ?? this.webinarId

    this.state.acceptWebSocket(server, [sessionId])

    const connection: ParticipantConnection = {
      sessionId,
      name: participantName,
      socket: server,
      isHost,
      joinedAt: Date.now(),
      messageCount: 0,
      messageWindowStart: Date.now(),
    }

    this.connections.set(sessionId, connection)

    // Send current room state immediately on join
    this.sendTo(server, this.buildRoomState())
    this.broadcastParticipantCount()

    return new Response(null, { status: 101, webSocket: client })
  }

  // ── Incoming messages ─────────────────────────────────────────────

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string') return

    let data: { type: string; sessionId: string; content?: string }
    try {
      data = JSON.parse(message) as { type: string; sessionId: string; content?: string }
    } catch {
      return
    }

    const connection = this.connections.get(data.sessionId)
    if (!connection) return

    switch (data.type) {
      case 'HEARTBEAT':
        // Acknowledge — keep connection alive
        this.sendTo(ws, { type: 'HEARTBEAT_ACK', timestamp: new Date().toISOString() } as unknown as ServerMessage)
        break

      case 'CHAT_SEND':
        await this.handleChatMessage(connection, data.content ?? '')
        break

      case 'END_WEBINAR':
        if (connection.isHost) {
          await this.handleEndWebinar()
        }
        break

      default:
        break
    }
  }

  async webSocketClose(ws: WebSocket, _code: number, _reason: string): Promise<void> {
    const tags = this.state.getTags(ws)
    const sessionId = tags[0]
    if (sessionId) {
      this.connections.delete(sessionId)
      if (!this.isEnded) this.broadcastParticipantCount()
    }
  }

  async webSocketError(ws: WebSocket, _error: unknown): Promise<void> {
    const tags = this.state.getTags(ws)
    const sessionId = tags[0]
    if (sessionId) {
      this.connections.delete(sessionId)
      if (!this.isEnded) this.broadcastParticipantCount()
    }
  }

  // ── Message handlers ──────────────────────────────────────────────

  private async handleChatMessage(connection: ParticipantConnection, content: string): Promise<void> {
    if (!this.chatEnabled) return

    // Rate limiting: max 5 messages per 10 seconds per participant
    const now = Date.now()
    if (now - connection.messageWindowStart > 10_000) {
      connection.messageCount = 0
      connection.messageWindowStart = now
    }

    if (connection.messageCount >= 5) {
      const errorMsg: ErrorMessage = {
        type: 'ERROR',
        code: 'RATE_LIMITED',
        message: 'Sending too quickly — please wait a moment.',
        timestamp: new Date().toISOString(),
      }
      this.sendTo(connection.socket, errorMsg)
      return
    }

    connection.messageCount++

    const chatMsg: ChatMessage = {
      type: 'CHAT_MESSAGE',
      id: crypto.randomUUID(),
      participantId: connection.sessionId,
      participantName: connection.isHost ? `${connection.name} (Host)` : connection.name,
      content: content.slice(0, 500),
      timestamp: new Date().toISOString(),
    }

    this.broadcast(chatMsg)
  }

  private async handleEndWebinar(): Promise<void> {
    this.isEnded = true
    const endedMsg: Phase8Message = {
      type: 'WEBINAR_ENDED',
      timestamp: new Date().toISOString(),
    }
    this.broadcastRaw(endedMsg)
  }

  private async handleAnnouncement(request: Request): Promise<Response> {
    const body = await request.json() as { content: string }
    this.broadcast({
      type: 'ANNOUNCEMENT',
      id: crypto.randomUUID(),
      content: (body.content ?? '').slice(0, 500),
      timestamp: new Date().toISOString(),
    })
    return Response.json({ ok: true })
  }

  // ── Broadcast helpers ─────────────────────────────────────────────

  private sendTo(ws: WebSocket, message: ServerMessage | Phase8Message): void {
    try {
      ws.send(JSON.stringify(message))
    } catch {
      // Connection may have closed
    }
  }

  private broadcast(message: ServerMessage): void {
    const payload = JSON.stringify(message)
    for (const conn of this.connections.values()) {
      try {
        conn.socket.send(payload)
      } catch {
        // Connection may have closed — cleaned up on webSocketClose
      }
    }
  }

  private broadcastRaw(message: Phase8Message): void {
    const payload = JSON.stringify(message)
    for (const conn of this.connections.values()) {
      try {
        conn.socket.send(payload)
      } catch {
        // ignore
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

  private buildRoomState(): RoomStateMessage {
    return {
      type: 'ROOM_STATE',
      participantCount: this.connections.size,
      chatEnabled: this.chatEnabled,
      qaEnabled: this.qaEnabled,
      activePollId: null,
      timestamp: new Date().toISOString(),
    }
  }

  private handleStateRequest(): Response {
    return Response.json({
      participantCount: this.connections.size,
      tenantId: this.tenantId,
      webinarId: this.webinarId,
      chatEnabled: this.chatEnabled,
      qaEnabled: this.qaEnabled,
      isEnded: this.isEnded,
    })
  }
}
