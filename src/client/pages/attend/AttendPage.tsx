/// <reference types="vite/client" />
import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LoadingState, ErrorState } from '../../components/ui/States'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { useWebSocket } from '../../hooks/useWebSocket'
import { getAccessToken } from '../../lib/api'

// ── Types ──────────────────────────────────────────────────────────

interface AttendData {
  registration: { id: string; name: string; email: string }
  webinar: {
    id: string; title: string; description: string | null
    hostName: string; startDate: string; startTime: string
    endTime: string; timezone: string; status: string
    youtubeVideoId: string | null; isLive: boolean; isEnded: boolean
  }
}

interface WsMessage {
  type: string
  timestamp: string
  // PARTICIPANT_COUNT
  count?: number
  // CHAT_MESSAGE
  id?: string
  participantId?: string
  participantName?: string
  content?: string
  // ROOM_STATE
  participantCount?: number
  chatEnabled?: boolean
  // ERROR
  code?: string
  message?: string
}

interface ChatEntry {
  id: string
  name: string
  text: string
  ts: string
  isHost: boolean
}

// ── YouTube embed ─────────────────────────────────────────────────

function YouTubeEmbed({ videoId, autoplay = false }: { videoId: string; autoplay?: boolean }) {
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    ...(autoplay ? { autoplay: '1' } : {}),
  })

  return (
    <div className="attend-yt-wrapper" role="region" aria-label="Webinar stream">
      <iframe
        className="attend-yt-iframe"
        src={`https://www.youtube.com/embed/${videoId}?${params.toString()}`}
        title="Webinar stream"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  )
}

// ── Waiting room ──────────────────────────────────────────────────

function WaitingRoom({ webinar, participantName, viewerCount }: {
  webinar: AttendData['webinar']
  participantName: string
  viewerCount: number
}) {
  const displayDate = new Date(`${webinar.startDate}T${webinar.startTime}`).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="attend-waiting">
      <div className="attend-waiting-icon" aria-hidden="true">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      </div>
      <Badge variant="primary">Starts soon</Badge>
      <h2 className="attend-waiting-title">{webinar.title}</h2>
      <p className="attend-waiting-greeting">Hi <strong>{participantName}</strong> — you&apos;re all set!</p>
      <p className="attend-waiting-date">{displayDate} at {webinar.startTime} ({webinar.timezone})</p>
      {viewerCount > 1 && (
        <p className="attend-viewer-count">👥 {viewerCount} people are in the waiting room</p>
      )}
      <p className="attend-waiting-hint">This page will automatically update when the webinar goes live. Keep it open!</p>
    </div>
  )
}

// ── Ended state ───────────────────────────────────────────────────

function EndedState({ webinar, token }: { webinar: AttendData['webinar']; token: string }) {
  const hasReplay = !!webinar.youtubeVideoId

  return (
    <div className="attend-ended">
      <Badge variant="secondary">Ended</Badge>
      <h2 className="attend-ended-title">{webinar.title}</h2>
      {hasReplay ? (
        <>
          <p className="attend-ended-subtitle">Watch the full replay</p>
          <YouTubeEmbed videoId={webinar.youtubeVideoId!} />
        </>
      ) : (
        <p className="attend-ended-subtitle">This webinar has ended. Thank you for attending!</p>
      )}
      <div className="attend-ended-actions">
        <Link to={`/w/${token}/feedback`}>
          <Button variant="primary" size="md">Share your feedback</Button>
        </Link>
      </div>
    </div>
  )
}

// ── Live chat panel ───────────────────────────────────────────────

function ChatPanel({ messages, sessionId: _sessionId, onSend, chatEnabled, isConnected }: {
  messages: ChatEntry[]
  sessionId: string
  onSend: (text: string) => void
  chatEnabled: boolean
  isConnected: boolean
}) {
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const submit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || !isConnected) return
    onSend(text)
    setDraft('')
  }, [draft, isConnected, onSend])

  return (
    <div className="attend-chat">
      <div className="attend-chat-messages" role="log" aria-live="polite" aria-label="Live chat">
        {messages.length === 0 && (
          <p className="attend-chat-empty">Chat will appear here once the webinar starts.</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`attend-chat-msg${m.isHost ? ' attend-chat-msg--host' : ''}`}>
            <span className="attend-chat-name">{m.name}</span>
            <span className="attend-chat-text">{m.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {chatEnabled && (
        <form className="attend-chat-form" onSubmit={submit}>
          <input
            className="attend-chat-input"
            type="text"
            placeholder={isConnected ? 'Type a message…' : 'Connecting…'}
            maxLength={500}
            value={draft}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
            disabled={!isConnected}
            aria-label="Chat message"
          />
          <button
            className="attend-chat-send"
            type="submit"
            disabled={!draft.trim() || !isConnected}
            aria-label="Send message"
          >
            Send
          </button>
        </form>
      )}
    </div>
  )
}

// ── Main AttendPage ───────────────────────────────────────────────

export default function AttendPage() {
  const { token } = useParams<{ token: string }>()
  const [searchParams] = useSearchParams()
  const isHostView = searchParams.get('host') === '1'

  const [viewerCount, setViewerCount] = useState(0)
  const [chatEnabled, setChatEnabled] = useState(true)
  const [chatMessages, setChatMessages] = useState<ChatEntry[]>([])
  const [webinarEnded, setWebinarEnded] = useState(false)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Initial HTTP fetch — validates token, gets webinar state
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['attend', token],
    queryFn: async (): Promise<AttendData> => {
      const r = await fetch(`/api/v1/attend/${token}`, { credentials: 'include' })
      const json = await r.json() as { ok: boolean; data?: AttendData; error?: { message: string } }
      if (!json.ok) throw new Error(json.error?.message ?? 'Invalid access token')
      return json.data!
    },
    enabled: !!token,
    staleTime: 30_000,
  })

  // Build WS URL — only connect when webinar is LIVE
  const isLive = data?.webinar.isLive ?? false
  const webinarId = data?.webinar.id ?? null
  const registrationId = data?.registration.id ?? null

  const wsUrl = isLive && webinarId && registrationId && token
    ? (isHostView
        ? `/api/v1/ws/webinar/${webinarId}/ws/host`
        : `/api/v1/ws/webinar/${webinarId}/ws?token=${token}`)
    : null

  // Convert relative WS URL to ws:// or wss://
  const wsAbsoluteUrl = wsUrl
    ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}${wsUrl}`
    : null

  const { lastMessage, readyState, sendMessage } = useWebSocket<WsMessage>(wsAbsoluteUrl)

  // Handle incoming WS messages
  useEffect(() => {
    if (!lastMessage) return

    switch (lastMessage.type) {
      case 'PARTICIPANT_COUNT':
        setViewerCount(lastMessage.count ?? 0)
        break

      case 'ROOM_STATE':
        setViewerCount(lastMessage.participantCount ?? 0)
        setChatEnabled(lastMessage.chatEnabled ?? true)
        break

      case 'CHAT_MESSAGE':
        if (lastMessage.id && lastMessage.content) {
          setChatMessages((prev) => [
            ...prev.slice(-199), // keep last 200 messages
            {
              id: lastMessage.id!,
              name: lastMessage.participantName ?? 'Participant',
              text: lastMessage.content!,
              ts: lastMessage.timestamp,
              isHost: (lastMessage.participantName ?? '').includes('(Host)'),
            },
          ])
        }
        break

      case 'WEBINAR_ENDED':
        setWebinarEnded(true)
        break

      default:
        break
    }
  }, [lastMessage])

  // Heartbeat every 30s to keep WS alive
  useEffect(() => {
    if (readyState !== 'OPEN' || !registrationId) return
    const hb = setInterval(() => {
      sendMessage({ type: 'HEARTBEAT', sessionId: isHostView ? `host:${registrationId}` : registrationId })
    }, 30_000)
    return () => clearInterval(hb)
  }, [readyState, registrationId, isHostView, sendMessage])

  // Poll HTTP every 30s when waiting for LIVE (before WS is established)
  useEffect(() => {
    if (data?.webinar.status === 'PUBLISHED' && !isLive) {
      pollIntervalRef.current = setInterval(() => { void refetch() }, 30_000)
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [data?.webinar.status, isLive, refetch])

  const handleSendChat = useCallback((text: string) => {
    sendMessage({
      type: 'CHAT_SEND',
      sessionId: registrationId ?? '',
      content: text,
    })
  }, [sendMessage, registrationId])

  const handleEndWebinar = useCallback(() => {
    if (!confirm('End the webinar for all attendees?')) return
    sendMessage({
      type: 'END_WEBINAR',
      sessionId: `host:${registrationId ?? ''}`,
    })
    // Also update server status via admin API
    if (webinarId) {
      const jwt = getAccessToken()
      fetch(`/api/v1/admin/webinars/${webinarId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
        },
        body: JSON.stringify({ action: 'end' }),
      }).catch(() => console.warn('[Host] Failed to update server status'))
    }
  }, [sendMessage, registrationId, webinarId])

  if (isLoading) return <LoadingState label="Loading your session…" />
  if (error) {
    return (
      <div className="attend-page attend-page-error">
        <ErrorState
          error={error as Error}
          action={<button type="button" className="btn btn-secondary btn-md" onClick={() => history.back()}>Go back</button>}
        />
      </div>
    )
  }
  if (!data) return null

  const { registration, webinar } = data
  const showEnded = webinar.isEnded || webinarEnded
  const showLive = (webinar.isLive || isLive) && !showEnded

  return (
    <div className="attend-page">
      {/* Header */}
      <header className="attend-header">
        <div className="attend-header-inner">
          <div className="attend-header-left">
            <p className="attend-webinar-name">{webinar.title}</p>
            <p className="attend-participant">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              {registration.name}
            </p>
          </div>
          <div className="attend-header-right">
            {showLive && <Badge variant="error" dot>LIVE</Badge>}
            {showEnded && <Badge variant="secondary">Ended</Badge>}
            {!showLive && !showEnded && <Badge variant="primary">Upcoming</Badge>}
            {viewerCount > 0 && showLive && (
              <span className="attend-viewer-count">👥 {viewerCount}</span>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="attend-main">
        {showLive && webinar.youtubeVideoId ? (
          <div className="attend-live-layout">
            <div className="attend-stream-section">
              <YouTubeEmbed videoId={webinar.youtubeVideoId} autoplay />
              <div className="attend-stream-meta">
                <h1 className="attend-stream-title">{webinar.title}</h1>
                <p className="attend-stream-host">Hosted by {webinar.hostName}</p>
              </div>
              {/* Host end-webinar control */}
              {isHostView && (
                <div className="attend-host-controls">
                  <Button variant="secondary" size="sm" onClick={handleEndWebinar}>
                    ⏹ End Webinar
                  </Button>
                  {readyState === 'OPEN'
                    ? <span className="attend-host-status attend-host-status--connected">● Host connected</span>
                    : <span className="attend-host-status attend-host-status--disconnected">○ Reconnecting…</span>
                  }
                </div>
              )}
            </div>
            <aside className="attend-chat-sidebar">
              <div className="attend-chat-header">
                <span>Live Chat</span>
                {readyState === 'OPEN'
                  ? <Badge variant="success" dot>Active</Badge>
                  : <Badge variant="secondary">Connecting…</Badge>
                }
              </div>
              <ChatPanel
                messages={chatMessages}
                sessionId={registrationId ?? ''}
                onSend={handleSendChat}
                chatEnabled={chatEnabled}
                isConnected={readyState === 'OPEN'}
              />
            </aside>
          </div>
        ) : showEnded ? (
          <EndedState webinar={webinar} token={token!} />
        ) : (
          <WaitingRoom webinar={webinar} participantName={registration.name} viewerCount={viewerCount} />
        )}
      </main>
    </div>
  )
}
