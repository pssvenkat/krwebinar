import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useWebinar, useEndWebinar, useGoLiveWebinar } from '../../hooks/useWebinars'
import { useWebSocket } from '../../hooks/useWebSocket'
import { getAccessToken, api } from '../../lib/api'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingState, ErrorState } from '../../components/ui/States'

// ── Types ──────────────────────────────────────────────────────────

interface StudioChatEntry {
  id: string
  name: string
  text: string
  ts: string
  isHost: boolean
  isPinned?: boolean
}

interface StudioPoll {
  id: string
  question: string
  options: { id: string; text: string; votes: number }[]
  totalVotes: number
  isActive: boolean
}

interface StudioQuestion {
  id: string
  author: string
  text: string
  upvotes: number
  isAnswered: boolean
  answerText?: string
  time: string
}

export default function AdminWebinarStudioPage() {
  const { id } = useParams<{ id: string }>()

  const { data: webinar, isLoading, error, refetch } = useWebinar(id)
  const endWebinar = useEndWebinar()
  const goLive = useGoLiveWebinar()

  // Studio tabs & state
  const [activeTab, setActiveTab] = useState<'chat' | 'polls' | 'qna' | 'attendees'>('chat')
  const [durationSeconds, setDurationSeconds] = useState(0)
  const [viewerCount, setViewerCount] = useState(1)
  const [chatEnabled, setChatEnabled] = useState(true)
  const [chatDraft, setChatDraft] = useState('')
  const [isAnnouncement, setIsAnnouncement] = useState(false)
  const [pinnedAnnouncement, setPinnedAnnouncement] = useState<string | null>(null)

  // Host Name state & editing
  const [hostName, setHostName] = useState<string>('')
  const [isEditingHostName, setIsEditingHostName] = useState(false)
  const [hostNameDraft, setHostNameDraft] = useState('')
  const [isSavingHostName, setIsSavingHostName] = useState(false)

  // Chat, Polls, Q&A state
  const [chatMessages, setChatMessages] = useState<StudioChatEntry[]>([])
  const [polls, setPolls] = useState<StudioPoll[]>([])
  const [showNewPollModal, setShowNewPollModal] = useState(false)
  const [newPollQuestion, setNewPollQuestion] = useState('')
  const [newPollOptions, setNewPollOptions] = useState(['', ''])

  const [questions, setQuestions] = useState<StudioQuestion[]>([])
  const [answeringQuestionId, setAnsweringQuestionId] = useState<string | null>(null)
  const [answerDraft, setAnswerDraft] = useState('')

  // Initialize host name from webinar
  useEffect(() => {
    if (webinar?.hostName && !hostName) {
      setHostName(webinar.hostName)
      setHostNameDraft(webinar.hostName)
    }
  }, [webinar, hostName])

  // WebSocket connection
  const token = getAccessToken()
  const wsUrl = id && token ? `/api/v1/ws/webinar/${id}/ws/host?token=${token}` : null
  const wsAbsoluteUrl = wsUrl
    ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}${wsUrl}`
    : null

  const { lastMessage, readyState, sendMessage } = useWebSocket<any>(wsAbsoluteUrl)

  // Handle incoming WebSocket messages from DO
  useEffect(() => {
    if (!lastMessage) return

    switch (lastMessage.type) {
      case 'ROOM_STATE':
        if (typeof lastMessage.participantCount === 'number') {
          setViewerCount(lastMessage.participantCount)
        }
        if (typeof lastMessage.chatEnabled === 'boolean') {
          setChatEnabled(lastMessage.chatEnabled)
        }
        if (lastMessage.hostName) {
          setHostName(lastMessage.hostName)
        }
        if (lastMessage.pinnedAnnouncement !== undefined) {
          setPinnedAnnouncement(lastMessage.pinnedAnnouncement)
        }
        if (Array.isArray(lastMessage.chatHistory)) {
          setChatMessages(
            lastMessage.chatHistory.map((m: any) => ({
              id: m.id,
              name: m.participantName || (m.isHost ? 'Host' : 'Participant'),
              text: m.content,
              ts: m.timestamp
                ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '',
              isHost: !!m.isHost,
              isPinned: !!m.isAnnouncement,
            })),
          )
        }
        if (Array.isArray(lastMessage.polls)) {
          setPolls(lastMessage.polls)
        }
        if (Array.isArray(lastMessage.questions)) {
          setQuestions(
            lastMessage.questions.map((q: any) => ({
              id: q.id,
              author: q.author,
              text: q.text,
              upvotes: q.upvotes || 0,
              isAnswered: !!q.isAnswered,
              answerText: q.answerText,
              time: q.timestamp
                ? new Date(q.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '',
            })),
          )
        }
        break

      case 'PARTICIPANT_COUNT':
        setViewerCount(lastMessage.count ?? 1)
        break

      case 'CHAT_MESSAGE':
        if (lastMessage.id && lastMessage.content) {
          setChatMessages((prev) => {
            if (prev.some((m) => m.id === lastMessage.id)) return prev
            return [
              ...prev.slice(-199),
              {
                id: lastMessage.id,
                name: lastMessage.participantName || (lastMessage.isHost ? 'Host' : 'Participant'),
                text: lastMessage.content,
                ts: lastMessage.timestamp
                  ? new Date(lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isHost: !!lastMessage.isHost,
                isPinned: !!lastMessage.isAnnouncement,
              },
            ]
          })
        }
        break

      case 'ANNOUNCEMENT_PINNED':
        setPinnedAnnouncement(lastMessage.content ?? null)
        break

      case 'ANNOUNCEMENT_CLEARED':
        setPinnedAnnouncement(null)
        break

      case 'CHAT_TOGGLED':
        if (typeof lastMessage.enabled === 'boolean') {
          setChatEnabled(lastMessage.enabled)
        }
        break

      case 'POLL_STARTED':
        if (lastMessage.poll) {
          setPolls((prev) => [lastMessage.poll, ...prev.filter((p) => p.id !== lastMessage.poll.id)])
        }
        break

      case 'POLL_UPDATED':
      case 'POLL_ENDED':
        if (lastMessage.poll) {
          setPolls((prev) =>
            prev.map((p) => (p.id === lastMessage.poll.id ? lastMessage.poll : p)),
          )
        }
        break

      case 'POLL_DELETED':
        if (lastMessage.pollId) {
          setPolls((prev) => prev.filter((p) => p.id !== lastMessage.pollId))
        }
        break

      case 'QUESTION_CREATED':
        if (lastMessage.question) {
          const q = lastMessage.question
          setQuestions((prev) => [
            {
              id: q.id,
              author: q.author,
              text: q.text,
              upvotes: q.upvotes || 1,
              isAnswered: !!q.isAnswered,
              answerText: q.answerText,
              time: q.timestamp
                ? new Date(q.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
            ...prev.filter((existing) => existing.id !== q.id),
          ])
        }
        break

      case 'QUESTION_UPDATED':
        if (lastMessage.question) {
          const q = lastMessage.question
          setQuestions((prev) =>
            prev.map((existing) =>
              existing.id === q.id
                ? {
                    ...existing,
                    upvotes: typeof q.upvotes === 'number' ? q.upvotes : existing.upvotes,
                    isAnswered: q.isAnswered !== undefined ? q.isAnswered : existing.isAnswered,
                    answerText: q.answerText !== undefined ? q.answerText : existing.answerText,
                  }
                : existing,
            ),
          )
        } else if (lastMessage.questionId) {
          setQuestions((prev) =>
            prev.map((existing) =>
              existing.id === lastMessage.questionId
                ? {
                    ...existing,
                    upvotes: typeof lastMessage.upvotes === 'number' ? lastMessage.upvotes : existing.upvotes,
                    isAnswered: lastMessage.isAnswered !== undefined ? lastMessage.isAnswered : existing.isAnswered,
                    answerText: lastMessage.answerText !== undefined ? lastMessage.answerText : existing.answerText,
                  }
                : existing,
            ),
          )
        }
        break

      case 'QUESTION_DELETED':
        if (lastMessage.questionId) {
          setQuestions((prev) => prev.filter((q) => q.id !== lastMessage.questionId))
        }
        break

      case 'HOST_NAME_UPDATED':
        if (lastMessage.hostName) {
          setHostName(lastMessage.hostName)
        }
        break

      default:
        break
    }
  }, [lastMessage])

  // Live broadcast duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setDurationSeconds((s) => s + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Auto-scroll chat
  const chatBottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (activeTab === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages, activeTab])

  // Format timer HH:MM:SS
  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600)
    const mins = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Save updated Host Name to DB and broadcast via WS
  const handleSaveHostName = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!id || !hostNameDraft.trim()) return

    setIsSavingHostName(true)
    try {
      const res = await api.webinars.update(id, { hostName: hostNameDraft.trim() })
      if (res.ok) {
        setHostName(hostNameDraft.trim())
        setIsEditingHostName(false)
        sendMessage({
          type: 'HOST_NAME_UPDATE',
          hostName: hostNameDraft.trim(),
        })
        refetch()
      }
    } catch {
      // ignore
    } finally {
      setIsSavingHostName(false)
    }
  }

  // Host send chat / announcement
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault()
    const text = chatDraft.trim()
    if (!text) return

    sendMessage({
      type: 'CHAT_MESSAGE',
      content: text,
      isAnnouncement,
    })

    if (isAnnouncement) {
      sendMessage({
        type: 'ANNOUNCEMENT_PIN',
        content: text,
      })
    }

    setChatDraft('')
    setIsAnnouncement(false)
  }

  // Toggle chat active/muted
  const handleToggleChat = () => {
    const nextVal = !chatEnabled
    setChatEnabled(nextVal)
    sendMessage({
      type: 'CHAT_TOGGLE',
      enabled: nextVal,
    })
  }

  // Create new poll
  const handleCreatePoll = (e: React.FormEvent) => {
    e.preventDefault()
    const validOptions = newPollOptions.map((o) => o.trim()).filter(Boolean)
    if (!newPollQuestion.trim() || validOptions.length < 2) return

    sendMessage({
      type: 'POLL_CREATE',
      poll: {
        question: newPollQuestion.trim(),
        options: validOptions,
      },
    })

    setNewPollQuestion('')
    setNewPollOptions(['', ''])
    setShowNewPollModal(false)
    setActiveTab('polls')
  }

  // Toggle active/closed poll
  const handleTogglePollStatus = (pollId: string, currentActive: boolean) => {
    if (currentActive) {
      sendMessage({
        type: 'POLL_END',
        pollId,
      })
    } else {
      const p = polls.find((item) => item.id === pollId)
      if (p) {
        sendMessage({
          type: 'POLL_CREATE',
          poll: {
            question: p.question,
            options: p.options.map((opt) => opt.text),
          },
        })
      }
    }
  }

  // Mark question answered live
  const handleMarkAnswered = (qId: string) => {
    sendMessage({
      type: 'QUESTION_ANSWER',
      questionId: qId,
    })
  }

  // Submit written answer
  const handleSubmitAnswer = (qId: string) => {
    if (!answerDraft.trim()) return
    sendMessage({
      type: 'QUESTION_ANSWER',
      questionId: qId,
      answerText: answerDraft.trim(),
    })
    setAnsweringQuestionId(null)
    setAnswerDraft('')
  }

  if (isLoading) return <LoadingState label="Connecting to host control studio…" />
  if (error || !webinar) return <ErrorState error={(error as Error) ?? new Error('Webinar not found')} />

  const videoId = webinar.youtubeVideoId || 'dQw4w9WgXcQ'
  const isLive = webinar.status === 'LIVE'
  const currentHostDisplayName = hostName || webinar.hostName || 'Host'

  return (
    <div className="admin-studio-container" style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* ── Studio Top Broadcast Bar ── */}
      <header
        style={{
          background: '#1e293b',
          borderBottom: '1px solid #334155',
          padding: '0.75rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to={`/admin/webinars/${id}`} style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.85rem' }}>
            ← Back to Overview
          </Link>
          <div style={{ height: '1.2rem', width: '1px', background: '#334155' }} />
          <h1 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: '#fff' }}>
            🎙️ Host Studio: {webinar.title}
          </h1>
          {isLive ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#dc2626', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
              🔴 ON AIR ({formatTime(durationSeconds)})
            </span>
          ) : (
            <Badge variant="warning">STATUS: {webinar.status}</Badge>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.85rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
            👥 {viewerCount} Live Viewers
          </span>
          <span style={{ fontSize: '0.85rem', color: readyState === 'OPEN' ? '#4ade80' : '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
            ● {readyState === 'OPEN' ? 'Live Synced' : 'Connecting WS…'}
          </span>
          {isLive ? (
            <Button
              variant="danger"
              size="sm"
              loading={endWebinar.isPending}
              onClick={() => endWebinar.mutate(webinar.id)}
            >
              ⏹ End Broadcast
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              loading={goLive.isPending}
              onClick={() => goLive.mutate(webinar.id)}
            >
              ▶ Go Live Now
            </Button>
          )}
        </div>
      </header>

      {/* ── Main Studio Grid Layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', flex: 1, overflow: 'hidden' }}>
        {/* ── Left Column: Broadcast Monitor & Stage Controls ── */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
          {/* Stream Player Area */}
          <div
            style={{
              position: 'relative',
              borderRadius: '12px',
              overflow: 'hidden',
              background: '#000',
              aspectRatio: '16/9',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
              border: '1px solid #334155',
            }}
          >
            <iframe
              style={{ width: '100%', height: '100%', border: 'none' }}
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=1`}
              title="Host Stream Monitor"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            <div
              style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                background: 'rgba(0,0,0,0.7)',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                color: '#fff',
                backdropFilter: 'blur(4px)',
              }}
            >
              📺 Host Preview Monitor (Muted)
            </div>
          </div>

          {/* Host Name Edit Bar */}
          <div
            style={{
              background: '#1e293b',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              border: '1px solid #334155',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>Host Display Name:</span>
              {isEditingHostName ? (
                <form onSubmit={handleSaveHostName} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1, maxWidth: '360px' }}>
                  <input
                    type="text"
                    value={hostNameDraft}
                    onChange={(e) => setHostNameDraft(e.target.value)}
                    placeholder="Enter Host Name…"
                    autoFocus
                    style={{
                      flex: 1,
                      padding: '0.35rem 0.6rem',
                      background: '#0f172a',
                      border: '1px solid #38bdf8',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '0.85rem',
                    }}
                  />
                  <Button variant="primary" size="sm" type="submit" loading={isSavingHostName}>
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => {
                      setHostNameDraft(currentHostDisplayName)
                      setIsEditingHostName(false)
                    }}
                  >
                    Cancel
                  </Button>
                </form>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#38bdf8' }}>
                    {currentHostDisplayName}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setHostNameDraft(currentHostDisplayName)
                      setIsEditingHostName(true)
                    }}
                    style={{
                      background: 'rgba(56, 189, 248, 0.1)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      color: '#38bdf8',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    ✏️ Edit Host Name
                  </button>
                </div>
              )}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Broadcasts to attendee screen
            </span>
          </div>

          {/* Quick Stage Controls Bar */}
          <div
            style={{
              background: '#1e293b',
              borderRadius: '10px',
              padding: '1rem',
              border: '1px solid #334155',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>Attendee Invite Link</p>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                Share with attendees: <code style={{ color: '#38bdf8' }}>{window.location.origin}/w/{webinar.id}</code>
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <a
                href={`/w/${webinar.id}`}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: 'none' }}
              >
                <Button variant="secondary" size="sm">
                  ↗ Open Attendee View
                </Button>
              </a>
              <Button
                variant={chatEnabled ? 'outline' : 'danger'}
                size="sm"
                onClick={handleToggleChat}
              >
                {chatEnabled ? '💬 Chat: Enabled' : '🔇 Chat: Muted'}
              </Button>
            </div>
          </div>

          {/* Pinned Announcement Box */}
          {pinnedAnnouncement && (
            <div
              style={{
                background: '#1e293b',
                borderLeft: '4px solid #38bdf8',
                borderRadius: '0 8px 8px 0',
                padding: '0.75rem 1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase' }}>
                  📌 Active Pinned Announcement
                </span>
                <p style={{ margin: '2px 0 0', fontSize: '0.85rem' }}>{pinnedAnnouncement}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPinnedAnnouncement(null)
                  sendMessage({ type: 'ANNOUNCEMENT_CLEAR' })
                }}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem' }}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* ── Right Column: Studio Multi-Deck (Chat / Polls / Q&A / Audience) ── */}
        <div
          style={{
            background: '#1e293b',
            borderLeft: '1px solid #334155',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Deck Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #334155', background: '#0f172a' }}>
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              style={{
                flex: 1,
                padding: '0.75rem 0.5rem',
                background: activeTab === 'chat' ? '#1e293b' : 'transparent',
                border: 'none',
                color: activeTab === 'chat' ? '#38bdf8' : '#94a3b8',
                fontWeight: activeTab === 'chat' ? 600 : 400,
                fontSize: '0.85rem',
                cursor: 'pointer',
                borderBottom: activeTab === 'chat' ? '2px solid #38bdf8' : 'none',
              }}
            >
              💬 Live Chat ({chatMessages.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('polls')}
              style={{
                flex: 1,
                padding: '0.75rem 0.5rem',
                background: activeTab === 'polls' ? '#1e293b' : 'transparent',
                border: 'none',
                color: activeTab === 'polls' ? '#38bdf8' : '#94a3b8',
                fontWeight: activeTab === 'polls' ? 600 : 400,
                fontSize: '0.85rem',
                cursor: 'pointer',
                borderBottom: activeTab === 'polls' ? '2px solid #38bdf8' : 'none',
              }}
            >
              📊 Polls ({polls.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('qna')}
              style={{
                flex: 1,
                padding: '0.75rem 0.5rem',
                background: activeTab === 'qna' ? '#1e293b' : 'transparent',
                border: 'none',
                color: activeTab === 'qna' ? '#38bdf8' : '#94a3b8',
                fontWeight: activeTab === 'qna' ? 600 : 400,
                fontSize: '0.85rem',
                cursor: 'pointer',
                borderBottom: activeTab === 'qna' ? '2px solid #38bdf8' : 'none',
              }}
            >
              ❓ Q&A ({questions.filter((q) => !q.isAnswered).length})
            </button>
          </div>

          {/* ── TAB 1: LIVE CHAT DECK ── */}
          {activeTab === 'chat' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Messages stream */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {chatMessages.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', marginTop: '2rem' }}>
                    No chat messages yet. Broadcast a welcome message below!
                  </p>
                ) : (
                  chatMessages.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        background: m.isHost ? 'rgba(56, 189, 248, 0.1)' : '#0f172a',
                        border: `1px solid ${m.isHost ? 'rgba(56, 189, 248, 0.3)' : '#334155'}`,
                        borderRadius: '8px',
                        padding: '0.6rem 0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.8rem', color: m.isHost ? '#38bdf8' : '#e2e8f0' }}>
                          {m.name}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{m.ts}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#f1f5f9' }}>{m.text}</p>
                    </div>
                  ))
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Host Chat Input */}
              <form onSubmit={handleSendChat} style={{ padding: '0.75rem', background: '#0f172a', borderTop: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isAnnouncement}
                      onChange={(e) => setIsAnnouncement(e.target.checked)}
                    />
                    📌 Pin as System Announcement
                  </label>
                  <span style={{ fontSize: '0.7rem', color: '#38bdf8' }}>Posting as {currentHostDisplayName} (Host)</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Broadcast message to all attendees…"
                    value={chatDraft}
                    onChange={(e) => setChatDraft(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.6rem 0.75rem',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '0.85rem',
                    }}
                  />
                  <Button type="submit" variant="primary" size="sm" disabled={!chatDraft.trim()}>
                    Send
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* ── TAB 2: POLLS COMMANDER DECK ── */}
          {activeTab === 'polls' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '1rem', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Interactive Polls</h3>
                <Button variant="primary" size="sm" onClick={() => setShowNewPollModal(true)}>
                  + Launch New Poll
                </Button>
              </div>

              {/* New Poll Creation Form */}
              {showNewPollModal && (
                <form
                  onSubmit={handleCreatePoll}
                  style={{
                    background: '#0f172a',
                    border: '1px solid #38bdf8',
                    borderRadius: '8px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#38bdf8' }}>Create & Launch Live Poll</h4>
                  <input
                    type="text"
                    placeholder="Poll Question (e.g. Which topic should we cover next?)"
                    value={newPollQuestion}
                    onChange={(e) => setNewPollQuestion(e.target.value)}
                    style={{
                      padding: '0.5rem',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '0.85rem',
                    }}
                  />
                  {newPollOptions.map((opt, idx) => (
                    <input
                      key={idx}
                      type="text"
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const next = [...newPollOptions]
                        next[idx] = e.target.value
                        setNewPollOptions(next)
                      }}
                      style={{
                        padding: '0.4rem 0.5rem',
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '0.8rem',
                      }}
                    />
                  ))}
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between' }}>
                    <button
                      type="button"
                      onClick={() => setNewPollOptions((prev) => [...prev, ''])}
                      style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      + Add Option
                    </button>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Button variant="ghost" size="sm" onClick={() => setShowNewPollModal(false)}>
                        Cancel
                      </Button>
                      <Button variant="primary" size="sm" type="submit">
                        Launch Poll
                      </Button>
                    </div>
                  </div>
                </form>
              )}

              {/* Polls List */}
              {polls.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', marginTop: '2rem' }}>
                  No active polls. Launch a live poll to engage attendees!
                </p>
              ) : (
                polls.map((poll) => (
                  <div
                    key={poll.id}
                    style={{
                      background: '#0f172a',
                      border: `1px solid ${poll.isActive ? '#22c55e' : '#334155'}`,
                      borderRadius: '8px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: poll.isActive ? '#4ade80' : '#94a3b8',
                            textTransform: 'uppercase',
                          }}
                        >
                          {poll.isActive ? '● LIVE VOTING OPEN' : '○ CLOSED'}
                        </span>
                        <h4 style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#fff' }}>{poll.question}</h4>
                      </div>
                      <Button
                        variant={poll.isActive ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => handleTogglePollStatus(poll.id, poll.isActive)}
                      >
                        {poll.isActive ? 'Close Poll' : 'Re-open'}
                      </Button>
                    </div>

                    {/* Results bars */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {poll.options.map((opt) => {
                        const pct = Math.round((opt.votes / (poll.totalVotes || 1)) * 100) || 0
                        return (
                          <div key={opt.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                              <span style={{ color: '#cbd5e1' }}>{opt.text}</span>
                              <span style={{ fontWeight: 600, color: '#38bdf8' }}>{opt.votes} ({pct}%)</span>
                            </div>
                            <div style={{ height: '6px', background: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: '#38bdf8' }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Votes Cast: {poll.totalVotes}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── TAB 3: Q&A MODERATOR DECK ── */}
          {activeTab === 'qna' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '1rem', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Attendee Questions</h3>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Real-time sync
                </span>
              </div>

              {questions.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', marginTop: '2rem' }}>
                  No attendee questions submitted yet.
                </p>
              ) : (
                questions.map((q) => (
                  <div
                    key={q.id}
                    style={{
                      background: '#0f172a',
                      border: `1px solid ${q.isAnswered ? 'rgba(34, 197, 94, 0.4)' : '#334155'}`,
                      borderRadius: '8px',
                      padding: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: '0.8rem', color: '#38bdf8' }}>{q.author}</span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: '6px' }}>{q.time}</span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 700 }}>👍 {q.upvotes}</span>
                    </div>

                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#f8fafc' }}>{q.text}</p>

                    {q.answerText && (
                      <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.8rem', color: '#86efac' }}>
                        <strong>Host Answer:</strong> {q.answerText}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '4px' }}>
                      {q.isAnswered ? (
                        <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 600 }}>✓ Answered Live</span>
                      ) : (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleMarkAnswered(q.id)}
                          >
                            ✓ Mark Answered
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAnsweringQuestionId(q.id)
                              setAnswerDraft('')
                            }}
                          >
                            Type Answer
                          </Button>
                        </>
                      )}
                    </div>

                    {answeringQuestionId === q.id && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <input
                          type="text"
                          placeholder="Type answer to publish to attendee…"
                          value={answerDraft}
                          onChange={(e) => setAnswerDraft(e.target.value)}
                          style={{
                            flex: 1,
                            padding: '0.4rem 0.5rem',
                            background: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '0.8rem',
                          }}
                        />
                        <Button variant="primary" size="sm" onClick={() => handleSubmitAnswer(q.id)}>
                          Reply
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
