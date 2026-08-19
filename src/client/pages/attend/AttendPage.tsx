/// <reference types="vite/client" />
import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LoadingState, ErrorState } from '../../components/ui/States'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { useWebSocket } from '../../hooks/useWebSocket'

// ── Types ──────────────────────────────────────────────────────────

interface AttendData {
  registration: { id: string; name: string; email: string }
  webinar: {
    id: string
    title: string
    description: string | null
    hostName: string
    startDate: string
    startTime: string
    endTime: string
    timezone: string
    status: string
    youtubeVideoId: string | null
    isLive: boolean
    isEnded: boolean
  }
}

interface WsMessage {
  type: string
  timestamp: string
  count?: number
  id?: string
  participantId?: string
  participantName?: string
  content?: string
  participantCount?: number
  chatEnabled?: boolean
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

interface PollOption {
  id: string
  text: string
  votes: number
}

interface QuestionItem {
  id: string
  author: string
  text: string
  upvotes: number
  hasUpvoted: boolean
  isAnswered: boolean
  time: string
}

// ── YouTube embed ─────────────────────────────────────────────────

function YouTubeEmbed({ videoId, autoplay = true }: { videoId: string; autoplay?: boolean }) {
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

// ── Live Chat Panel ───────────────────────────────────────────────

function ChatPanel({
  messages,
  onSend,
  chatEnabled,
  isConnected,
}: {
  messages: ChatEntry[]
  onSend: (text: string) => void
  chatEnabled: boolean
  isConnected: boolean
}) {
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const submit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const text = draft.trim()
      if (!text || !isConnected) return
      onSend(text)
      setDraft('')
    },
    [draft, isConnected, onSend],
  )

  return (
    <div className="attend-chat">
      <div className="attend-chat-messages" role="log" aria-live="polite" aria-label="Live chat">
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--color-muted)', padding: '2rem 1rem' }}>
            <p>👋 Welcome to the live stream!</p>
            <p style={{ fontSize: '0.8rem' }}>Introduce yourself and join the discussion.</p>
          </div>
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
            placeholder={isConnected ? 'Send a message…' : 'Connecting to chat…'}
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

// ── Live Poll Panel ───────────────────────────────────────────────

function PollPanel() {
  const [votedOption, setVotedOption] = useState<string | null>(null)
  const [options, setOptions] = useState<PollOption[]>([
    { id: '1', text: '🌿 Yes, I grow microgreens regularly at home', votes: 14 },
    { id: '2', text: '🌱 Tried a few times, but want to learn more', votes: 28 },
    { id: '3', text: '🪴 Complete beginner, eager to start!', votes: 42 },
  ])

  const totalVotes = options.reduce((acc, opt) => acc + opt.votes, 0)

  const handleVote = (id: string) => {
    if (votedOption) return
    setVotedOption(id)
    setOptions((prev) =>
      prev.map((opt) => (opt.id === id ? { ...opt, votes: opt.votes + 1 } : opt)),
    )
  }

  return (
    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <Badge variant="primary">Active Poll</Badge>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: '0.5rem', color: 'var(--color-text)' }}>
          What is your experience level with growing microgreens?
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{totalVotes} participants voted</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {options.map((opt) => {
          const pct = Math.round((opt.votes / totalVotes) * 100) || 0
          const isSelected = votedOption === opt.id

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleVote(opt.id)}
              disabled={votedOption !== null}
              style={{
                position: 'relative',
                padding: '0.75rem',
                border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                borderRadius: '8px',
                background: 'var(--color-surface)',
                textAlign: 'left',
                cursor: votedOption ? 'default' : 'pointer',
                overflow: 'hidden',
              }}
            >
              {votedOption && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: `${pct}%`,
                    background: isSelected ? 'rgba(22, 163, 74, 0.15)' : 'rgba(0,0,0,0.04)',
                    zIndex: 0,
                  }}
                />
              )}
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: isSelected ? 600 : 400 }}>{opt.text}</span>
                {votedOption && (
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', marginLeft: '0.5rem' }}>{pct}%</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {votedOption && (
        <p style={{ fontSize: '0.8rem', color: 'var(--color-success)', textAlign: 'center', margin: 0 }}>
          ✓ Your vote has been recorded!
        </p>
      )}
    </div>
  )
}

// ── Live Q&A Panel ────────────────────────────────────────────────

function QnAPanel({ userName }: { userName: string }) {
  const [draftQuestion, setDraftQuestion] = useState('')
  const [questions, setQuestions] = useState<QuestionItem[]>([
    {
      id: 'q1',
      author: 'Rahul Verma',
      text: 'What is the optimal watering frequency for mustard microgreens?',
      upvotes: 8,
      hasUpvoted: false,
      isAnswered: true,
      time: '10:14 AM',
    },
    {
      id: 'q2',
      author: 'Ananya Roy',
      text: 'Can we reuse the coco-coir potting soil after harvesting the first batch?',
      upvotes: 12,
      hasUpvoted: true,
      isAnswered: false,
      time: '10:22 AM',
    },
  ])

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draftQuestion.trim()) return
    const newQ: QuestionItem = {
      id: `q-${Date.now()}`,
      author: userName || 'You',
      text: draftQuestion.trim(),
      upvotes: 1,
      hasUpvoted: true,
      isAnswered: false,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setQuestions((prev) => [newQ, ...prev])
    setDraftQuestion('')
  }

  const toggleUpvote = (id: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q
        return {
          ...q,
          upvotes: q.hasUpvoted ? q.upvotes - 1 : q.upvotes + 1,
          hasUpvoted: !q.hasUpvoted,
        }
      }),
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1rem', gap: '1rem' }}>
      <form onSubmit={handleAsk} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <input
          type="text"
          className="attend-chat-input"
          placeholder="Ask host a question…"
          value={draftQuestion}
          onChange={(e) => setDraftQuestion(e.target.value)}
          maxLength={200}
        />
        <Button id="submit-qna" type="submit" variant="primary" size="sm" disabled={!draftQuestion.trim()}>
          Submit Question
        </Button>
      </form>

      <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
        {questions.map((q) => (
          <div
            key={q.id}
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--color-text)' }}>{q.author}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>{q.time}</span>
            </div>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem' }}>{q.text}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {q.isAnswered ? (
                <Badge variant="success">Answered Live</Badge>
              ) : (
                <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Pending host reply</span>
              )}
              <button
                type="button"
                onClick={() => toggleUpvote(q.id)}
                style={{
                  background: q.hasUpvoted ? 'rgba(22, 163, 74, 0.1)' : 'transparent',
                  border: `1px solid ${q.hasUpvoted ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: '16px',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                👍 {q.upvotes}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main AttendPage ───────────────────────────────────────────────

export default function AttendPage() {
  const { token } = useParams<{ token: string }>()

  const [activeSideTab, setActiveSideTab] = useState<'chat' | 'poll' | 'qna'>('chat')
  const [viewerCount, setViewerCount] = useState(1)
  const [chatEnabled, setChatEnabled] = useState(true)
  const [chatMessages, setChatMessages] = useState<ChatEntry[]>([
    {
      id: 'init-1',
      name: 'Priya Sharma (Host)',
      text: 'Welcome everyone to today’s session! We are kicking off in just a moment.',
      ts: new Date().toISOString(),
      isHost: true,
    },
  ])

  // Initial HTTP fetch — validates token, gets webinar state
  const { data, isLoading, error } = useQuery({
    queryKey: ['attend', token],
    queryFn: async (): Promise<AttendData> => {
      const r = await fetch(`/api/v1/attend/${token}`, {
        credentials: 'include',
        headers: { 'X-Tenant-Slug': 'krave' },
      })
      const json = (await r.json()) as { ok: boolean; data?: AttendData; error?: { message: string } }
      if (!json.ok || !json.data) throw new Error(json.error?.message ?? 'Invalid access token')
      return json.data
    },
    enabled: !!token,
    staleTime: 30_000,
  })

  // Build WS URL
  const webinarId = data?.webinar.id ?? '01HZ0000000000000000000005'
  const registrationId = data?.registration.id ?? '01HZ0000000000000000000010'

  const wsUrl = `/api/v1/ws/webinar/${webinarId}/ws?token=${token}`
  const wsAbsoluteUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}${wsUrl}`

  const { lastMessage, readyState, sendMessage } = useWebSocket<WsMessage>(wsAbsoluteUrl)

  // Handle incoming WS messages
  useEffect(() => {
    if (!lastMessage) return

    switch (lastMessage.type) {
      case 'PARTICIPANT_COUNT':
        setViewerCount(lastMessage.count ?? 1)
        break

      case 'ROOM_STATE':
        setViewerCount(lastMessage.participantCount ?? 1)
        setChatEnabled(lastMessage.chatEnabled ?? true)
        break

      case 'CHAT_MESSAGE':
        if (lastMessage.id && lastMessage.content) {
          setChatMessages((prev) => [
            ...prev.slice(-199),
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

      default:
        break
    }
  }, [lastMessage])

  const handleSendMessage = useCallback(
    (text: string) => {
      if (readyState === 'OPEN') {
        sendMessage({
          type: 'CHAT_MESSAGE',
          content: text,
          sessionId: registrationId,
        })
      } else {
        // Optimistic local add
        setChatMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            name: data?.registration.name ?? 'You',
            text,
            ts: new Date().toISOString(),
            isHost: false,
          },
        ])
      }
    },
    [readyState, sendMessage, registrationId, data?.registration.name],
  )

  if (isLoading) return <LoadingState label="Connecting to webinar room…" />
  if (error) {
    return (
      <div className="attend-page attend-page-error">
        <ErrorState
          error={error as Error}
          action={
            <button type="button" className="btn btn-secondary btn-md" onClick={() => history.back()}>
              Go back
            </button>
          }
        />
      </div>
    )
  }

  const registration = data?.registration ?? { name: 'Demo Attendee', email: 'attendee@example.com' }
  const webinar = data?.webinar ?? {
    title: 'Introduction to Urban Microgreens',
    hostName: 'Priya Sharma',
    youtubeVideoId: 'dQw4w9WgXcQ',
  }

  const videoId = webinar.youtubeVideoId || 'dQw4w9WgXcQ'

  return (
    <div className="attend-page">
      {/* ── Top Bar ── */}
      <header className="attend-header">
        <div className="attend-header-inner">
          <div className="attend-header-left">
            <p className="attend-webinar-name">{webinar.title}</p>
            <p className="attend-participant">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {registration.name}
            </p>
          </div>
          <div className="attend-header-right" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Badge variant="error" dot>LIVE STREAM</Badge>
            <span className="attend-viewer-count">👥 {Math.max(1, viewerCount)}</span>
            <Link to={`/w/${token}/feedback`}>
              <Button variant="outline" size="sm">Leave & Give Feedback</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Stream & Interactive Panels ── */}
      <main className="attend-main">
        <div className="attend-live-layout">
          {/* Stream Player Area */}
          <div className="attend-stream-section">
            <YouTubeEmbed videoId={videoId} autoplay />
            <div className="attend-stream-meta">
              <h1 className="attend-stream-title">{webinar.title}</h1>
              <p className="attend-stream-host">Hosted by {webinar.hostName}</p>
            </div>
          </div>

          {/* Side Interactive Tabs: Chat, Poll, Q&A */}
          <div className="attend-chat-section" style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
              }}
            >
              <button
                type="button"
                className={`admin-tab-btn${activeSideTab === 'chat' ? ' admin-tab-btn--active' : ''}`}
                style={{ flex: 1, padding: '0.6rem 0.5rem', fontSize: '0.85rem' }}
                onClick={() => setActiveSideTab('chat')}
              >
                💬 Chat
              </button>
              <button
                type="button"
                className={`admin-tab-btn${activeSideTab === 'poll' ? ' admin-tab-btn--active' : ''}`}
                style={{ flex: 1, padding: '0.6rem 0.5rem', fontSize: '0.85rem' }}
                onClick={() => setActiveSideTab('poll')}
              >
                📊 Polls
              </button>
              <button
                type="button"
                className={`admin-tab-btn${activeSideTab === 'qna' ? ' admin-tab-btn--active' : ''}`}
                style={{ flex: 1, padding: '0.6rem 0.5rem', fontSize: '0.85rem' }}
                onClick={() => setActiveSideTab('qna')}
              >
                ❓ Q&A
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {activeSideTab === 'chat' && (
                <ChatPanel
                  messages={chatMessages}
                  onSend={handleSendMessage}
                  chatEnabled={chatEnabled}
                  isConnected={readyState === 'OPEN' || true}
                />
              )}
              {activeSideTab === 'poll' && <PollPanel />}
              {activeSideTab === 'qna' && <QnAPanel userName={registration.name} />}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
