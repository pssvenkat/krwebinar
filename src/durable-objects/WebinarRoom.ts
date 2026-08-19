/**
 * WebinarRoom Durable Object — Real-Time State & Synchronization
 *
 * One instance per active webinar: WEBINAR_ROOM:{tenantId}:{webinarId}
 * Deterministic routing ensures all participants land on the same DO instance.
 *
 * Capabilities:
 * - WebSocket connection pooling for Host + Attendees
 * - Live bidirectional Chat with rate limiting & pinned announcements
 * - Live Poll creation, real-time voting, and live results broadcast
 * - Live Q&A question submission, upvoting, live answering & status updates
 * - Live Host Name updates broadcast to all clients
 * - Full state sync (ROOM_STATE) delivered on connect
 */

export interface ChatEntry {
  id: string
  participantId: string
  participantName: string
  content: string
  isHost: boolean
  isAnnouncement?: boolean
  timestamp: string
}

export interface PollOption {
  id: string
  text: string
  votes: number
}

export interface PollItem {
  id: string
  question: string
  options: PollOption[]
  totalVotes: number
  isActive: boolean
  createdAt: string
}

export interface QuestionItem {
  id: string
  author: string
  authorId: string
  text: string
  upvotes: number
  upvoters?: string[]
  isAnswered: boolean
  answerText?: string
  timestamp: string
}

interface ParticipantConnection {
  sessionId: string
  name: string
  socket: WebSocket
  isHost: boolean
  joinedAt: number
  messageCount: number
  messageWindowStart: number
}

export class WebinarRoom implements DurableObject {
  private connections: Map<string, ParticipantConnection> = new Map()
  private tenantId: string = ''
  private webinarId: string = ''
  private hostName: string = 'Host'
  private chatEnabled: boolean = true
  private qaEnabled: boolean = true
  private isEnded: boolean = false
  private pinnedAnnouncement: string | null = null

  // In-memory real-time state buffers
  private chatHistory: ChatEntry[] = []
  private polls: PollItem[] = []
  private questions: QuestionItem[] = []

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Record<string, unknown>,
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const upgradeHeader = request.headers.get('Upgrade')

    if (upgradeHeader?.toLowerCase() === 'websocket') {
      return this.handleWebSocketUpgrade(request, url)
    }

    if (url.pathname.endsWith('/state')) {
      return this.handleStateRequest()
    }

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
    const initialHostName = urlParams.get('hostName')
    if (initialHostName && (!this.hostName || this.hostName === 'Host')) {
      this.hostName = initialHostName
    }

    if (typeof (server as any).serializeAttachment === 'function') {
      try {
        (server as any).serializeAttachment({
          sessionId,
          name: participantName,
          isHost,
          tenantId: this.tenantId,
          webinarId: this.webinarId,
        })
      } catch {
        // ignore
      }
    }

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

    // Send complete current room snapshot to the connecting client
    this.sendTo(server, this.buildRoomState())
    this.broadcastParticipantCount()

    return new Response(null, { status: 101, webSocket: client })
  }

  // ── Incoming message routing ──────────────────────────────────────

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string') return

    let data: any
    try {
      data = JSON.parse(message)
    } catch {
      return
    }

    const attachment = (typeof (ws as any).deserializeAttachment === 'function'
      ? (ws as any).deserializeAttachment()
      : null) as { sessionId?: string; name?: string; isHost?: boolean } | null

    // Try finding connection by sessionId, attachment, or matching socket
    let connection = (data.sessionId ? this.connections.get(data.sessionId) : null) ||
      (attachment?.sessionId ? this.connections.get(attachment.sessionId) : null) ||
      null

    if (!connection) {
      for (const conn of this.connections.values()) {
        if (conn.socket === ws) {
          connection = conn
          break
        }
      }
    }

    // Reconstruct connection from attachment or fallback if evicted during hibernation
    if (!connection) {
      const sId = attachment?.sessionId || data.sessionId || `session-${Date.now()}`
      const pName = attachment?.name || data.author || data.participantName || (data.isHost ? 'Host' : 'Participant')
      const isHost = attachment?.isHost ?? (data.isHost ?? false)
      connection = {
        sessionId: sId,
        name: pName,
        socket: ws,
        isHost,
        joinedAt: Date.now(),
        messageCount: 0,
        messageWindowStart: Date.now(),
      }
      this.connections.set(sId, connection)
    }

    switch (data.type) {
      case 'HEARTBEAT':
        this.sendTo(ws, { type: 'HEARTBEAT_ACK', timestamp: new Date().toISOString() })
        break

      // Chat messages
      case 'CHAT_MESSAGE':
      case 'CHAT_SEND':
        await this.handleChatMessage(connection, data.content ?? '', !!data.isAnnouncement)
        break

      case 'ANNOUNCEMENT_PIN':
        this.pinnedAnnouncement = data.content ?? null
        this.broadcast({
          type: 'ANNOUNCEMENT_PINNED',
          content: this.pinnedAnnouncement,
          timestamp: new Date().toISOString(),
        })
        break

      case 'ANNOUNCEMENT_CLEAR':
        this.pinnedAnnouncement = null
        this.broadcast({
          type: 'ANNOUNCEMENT_CLEARED',
          timestamp: new Date().toISOString(),
        })
        break

      case 'CHAT_TOGGLE':
        if (connection.isHost && typeof data.enabled === 'boolean') {
          this.chatEnabled = data.enabled
          this.broadcast({
            type: 'CHAT_TOGGLED',
            enabled: this.chatEnabled,
            timestamp: new Date().toISOString(),
          })
        }
        break

      // Polls
      case 'POLL_CREATE':
      case 'POLL_START':
        if (connection.isHost && data.poll) {
          this.handlePollCreate(data.poll)
        }
        break

      case 'POLL_VOTE':
        if (data.pollId && data.optionId) {
          this.handlePollVote(data.pollId, data.optionId)
        }
        break

      case 'POLL_END':
        if (connection.isHost && data.pollId) {
          this.handlePollEnd(data.pollId)
        }
        break

      case 'POLL_DELETE':
        if (connection.isHost && data.pollId) {
          this.polls = this.polls.filter((p) => p.id !== data.pollId)
          this.broadcast({
            type: 'POLL_DELETED',
            pollId: data.pollId,
            timestamp: new Date().toISOString(),
          })
        }
        break

      // Q&A
      case 'QUESTION_CREATE':
      case 'QUESTION_ASK':
        if (data.text) {
          this.handleQuestionCreate(connection, data.text, data.author)
        }
        break

      case 'QUESTION_VOTE':
      case 'QUESTION_UPVOTE':
        if (data.questionId) {
          this.handleQuestionVote(connection, data.questionId)
        }
        break

      case 'QUESTION_ANSWER':
        if (connection.isHost && data.questionId) {
          this.handleQuestionAnswer(data.questionId, data.answerText)
        }
        break

      case 'QUESTION_DELETE':
        if (connection.isHost && data.questionId) {
          this.questions = this.questions.filter((q) => q.id !== data.questionId)
          this.broadcast({
            type: 'QUESTION_DELETED',
            questionId: data.questionId,
            timestamp: new Date().toISOString(),
          })
        }
        break

      // Host Name Update
      case 'HOST_NAME_UPDATE':
        if (connection.isHost && data.hostName) {
          this.hostName = data.hostName.trim()
          this.broadcast({
            type: 'HOST_NAME_UPDATED',
            hostName: this.hostName,
            timestamp: new Date().toISOString(),
          })
        }
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
    } else {
      for (const [sId, conn] of this.connections.entries()) {
        if (conn.socket === ws) {
          this.connections.delete(sId)
          break
        }
      }
    }
    if (!this.isEnded) this.broadcastParticipantCount()
  }

  async webSocketError(ws: WebSocket, _error: unknown): Promise<void> {
    const tags = this.state.getTags(ws)
    const sessionId = tags[0]
    if (sessionId) {
      this.connections.delete(sessionId)
    }
    if (!this.isEnded) this.broadcastParticipantCount()
  }

  // ── Handler Implementations ───────────────────────────────────────

  private async handleChatMessage(
    connection: ParticipantConnection,
    content: string,
    isAnnouncement: boolean,
  ): Promise<void> {
    if (!this.chatEnabled && !connection.isHost) return
    const text = content.trim().slice(0, 1000)
    if (!text) return

    // Rate limiting: 10 messages per 10 seconds per non-host participant
    if (!connection.isHost) {
      const now = Date.now()
      if (now - connection.messageWindowStart > 10_000) {
        connection.messageCount = 0
        connection.messageWindowStart = now
      }
      if (connection.messageCount >= 10) {
        this.sendTo(connection.socket, {
          type: 'ERROR',
          code: 'RATE_LIMITED',
          message: 'Sending too quickly — please wait a moment.',
          timestamp: new Date().toISOString(),
        })
        return
      }
      connection.messageCount++
    }

    const chatMsg: ChatEntry = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      participantId: connection.sessionId,
      participantName: connection.isHost ? `${this.hostName || connection.name} (Host)` : connection.name,
      content: text,
      isHost: connection.isHost,
      isAnnouncement: isAnnouncement && connection.isHost,
      timestamp: new Date().toISOString(),
    }

    this.chatHistory.push(chatMsg)
    if (this.chatHistory.length > 200) {
      this.chatHistory.shift()
    }

    this.broadcast({
      type: 'CHAT_MESSAGE',
      ...chatMsg,
    })
  }

  private handlePollCreate(pollData: { question: string; options: string[] | { id: string; text: string }[] }): void {
    const rawOptions = pollData.options || []
    const options: PollOption[] = rawOptions.map((opt, idx) => {
      if (typeof opt === 'string') {
        return { id: String(idx + 1), text: opt, votes: 0 }
      }
      return { id: opt.id || String(idx + 1), text: opt.text, votes: 0 }
    })

    const newPoll: PollItem = {
      id: `poll-${Date.now()}`,
      question: pollData.question,
      options,
      totalVotes: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
    }

    this.polls.unshift(newPoll)
    this.broadcast({
      type: 'POLL_STARTED',
      poll: newPoll,
      timestamp: new Date().toISOString(),
    })
  }

  private handlePollVote(pollId: string, optionId: string): void {
    const poll = this.polls.find((p) => p.id === pollId)
    if (!poll || !poll.isActive) return

    const option = poll.options.find((o) => o.id === optionId)
    if (option) {
      option.votes++
      poll.totalVotes++
      this.broadcast({
        type: 'POLL_UPDATED',
        poll,
        timestamp: new Date().toISOString(),
      })
    }
  }

  private handlePollEnd(pollId: string): void {
    const poll = this.polls.find((p) => p.id === pollId)
    if (!poll) return

    poll.isActive = false
    this.broadcast({
      type: 'POLL_ENDED',
      pollId,
      poll,
      timestamp: new Date().toISOString(),
    })
  }

  private handleQuestionCreate(connection: ParticipantConnection, text: string, customAuthor?: string): void {
    const cleanText = text.trim().slice(0, 500)
    if (!cleanText) return

    const newQuestion: QuestionItem = {
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      author: customAuthor || connection.name || 'Anonymous',
      authorId: connection.sessionId,
      text: cleanText,
      upvotes: 1,
      upvoters: [connection.sessionId],
      isAnswered: false,
      timestamp: new Date().toISOString(),
    }

    this.questions.unshift(newQuestion)
    this.broadcast({
      type: 'QUESTION_CREATED',
      question: newQuestion,
      timestamp: new Date().toISOString(),
    })
  }

  private handleQuestionVote(connection: ParticipantConnection, questionId: string): void {
    const question = this.questions.find((q) => q.id === questionId)
    if (!question) return

    question.upvoters = question.upvoters || []
    const hasUpvoted = question.upvoters.includes(connection.sessionId)

    if (hasUpvoted) {
      question.upvoters = question.upvoters.filter((id) => id !== connection.sessionId)
      question.upvotes = Math.max(0, question.upvotes - 1)
    } else {
      question.upvoters.push(connection.sessionId)
      question.upvotes++
    }

    this.broadcast({
      type: 'QUESTION_UPDATED',
      question,
      questionId: question.id,
      upvotes: question.upvotes,
      timestamp: new Date().toISOString(),
    })
  }

  private handleQuestionAnswer(questionId: string, answerText?: string): void {
    const question = this.questions.find((q) => q.id === questionId)
    if (!question) return

    question.isAnswered = true
    if (answerText) {
      question.answerText = answerText
    }

    this.broadcast({
      type: 'QUESTION_UPDATED',
      question,
      questionId: question.id,
      isAnswered: true,
      answerText: question.answerText,
      timestamp: new Date().toISOString(),
    })
  }

  private async handleEndWebinar(): Promise<void> {
    this.isEnded = true
    this.broadcast({
      type: 'WEBINAR_ENDED',
      timestamp: new Date().toISOString(),
    })
  }

  private async handleAnnouncement(request: Request): Promise<Response> {
    const body = (await request.json()) as { content: string }
    const content = (body.content ?? '').slice(0, 500)
    this.pinnedAnnouncement = content || null
    this.broadcast({
      type: 'ANNOUNCEMENT',
      id: crypto.randomUUID(),
      content,
      timestamp: new Date().toISOString(),
    })
    return Response.json({ ok: true })
  }

  // ── Broadcast helpers ─────────────────────────────────────────────

  private sendTo(ws: WebSocket, message: object): void {
    try {
      ws.send(JSON.stringify(message))
    } catch {
      // Connection closed
    }
  }

  private broadcast(message: object): void {
    const payload = JSON.stringify(message)
    const sockets: WebSocket[] =
      typeof (this.state as any).getWebSockets === 'function'
        ? (this.state as any).getWebSockets()
        : Array.from(this.connections.values()).map((c) => c.socket)

    for (const socket of sockets) {
      try {
        socket.send(payload)
      } catch {
        // Ignored, cleaned up on close
      }
    }
  }

  private countBroadcastTimeout: ReturnType<typeof setTimeout> | null = null

  private broadcastParticipantCount(immediate = false): void {
    if (immediate) {
      if (this.countBroadcastTimeout) {
        clearTimeout(this.countBroadcastTimeout)
        this.countBroadcastTimeout = null
      }
      this.sendParticipantCount()
      return
    }

    if (!this.countBroadcastTimeout) {
      this.countBroadcastTimeout = setTimeout(() => {
        this.countBroadcastTimeout = null
        this.sendParticipantCount()
      }, 300)
    }
  }

  private sendParticipantCount(): void {
    const socketsCount =
      typeof (this.state as any).getWebSockets === 'function'
        ? (this.state as any).getWebSockets().length
        : this.connections.size

    this.broadcast({
      type: 'PARTICIPANT_COUNT',
      count: Math.max(1, socketsCount),
      timestamp: new Date().toISOString(),
    })
  }

  private buildRoomState(): object {
    const socketsCount =
      typeof (this.state as any).getWebSockets === 'function'
        ? (this.state as any).getWebSockets().length
        : this.connections.size

    return {
      type: 'ROOM_STATE',
      participantCount: Math.max(1, socketsCount),
      chatEnabled: this.chatEnabled,
      qaEnabled: this.qaEnabled,
      hostName: this.hostName,
      pinnedAnnouncement: this.pinnedAnnouncement,
      chatHistory: this.chatHistory,
      polls: this.polls,
      questions: this.questions,
      timestamp: new Date().toISOString(),
    }
  }

  private handleStateRequest(): Response {
    return Response.json({
      participantCount: this.connections.size,
      tenantId: this.tenantId,
      webinarId: this.webinarId,
      hostName: this.hostName,
      chatEnabled: this.chatEnabled,
      qaEnabled: this.qaEnabled,
      isEnded: this.isEnded,
      pinnedAnnouncement: this.pinnedAnnouncement,
      pollsCount: this.polls.length,
      questionsCount: this.questions.length,
    })
  }
}
