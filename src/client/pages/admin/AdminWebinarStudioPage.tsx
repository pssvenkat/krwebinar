import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useWebinar, useEndWebinar, useGoLiveWebinar } from '../../hooks/useWebinars'
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

  const { data: webinar, isLoading, error } = useWebinar(id)
  const endWebinar = useEndWebinar()
  const goLive = useGoLiveWebinar()

  // Studio tabs & state
  const [activeTab, setActiveTab] = useState<'chat' | 'polls' | 'qna' | 'attendees'>('chat')
  const [durationSeconds, setDurationSeconds] = useState(742) // 12m 22s initial demo timer
  const [viewerCount] = useState(18)
  const [chatEnabled, setChatEnabled] = useState(true)
  const [chatDraft, setChatDraft] = useState('')
  const [isAnnouncement, setIsAnnouncement] = useState(false)
  const [pinnedAnnouncement, setPinnedAnnouncement] = useState<string | null>(
    '🌿 Welcome to the Urban Microgreens Workshop! Download the cheat sheet from the link below.',
  )

  // Chat state
  const [chatMessages, setChatMessages] = useState<StudioChatEntry[]>([
    {
      id: 'm1',
      name: 'Priya Sharma (Host)',
      text: 'Welcome everyone! Let us know where you are joining from today.',
      ts: '10:01 AM',
      isHost: true,
    },
    {
      id: 'm2',
      name: 'Rohan Mehta',
      text: 'Joining from Bangalore! Excited for this session.',
      ts: '10:02 AM',
      isHost: false,
    },
    {
      id: 'm3',
      name: 'Sneha Patel',
      text: 'Hello from Mumbai!',
      ts: '10:03 AM',
      isHost: false,
    },
  ])

  // Polls state
  const [polls, setPolls] = useState<StudioPoll[]>([
    {
      id: 'poll-1',
      question: 'What is your experience level with growing microgreens?',
      options: [
        { id: '1', text: '🌿 Yes, I grow microgreens regularly at home', votes: 8 },
        { id: '2', text: '🌱 Tried a few times, but want to learn more', votes: 14 },
        { id: '3', text: '🪴 Complete beginner, eager to start!', votes: 26 },
      ],
      totalVotes: 48,
      isActive: true,
    },
  ])

  // New Poll creation state
  const [showNewPollModal, setShowNewPollModal] = useState(false)
  const [newPollQuestion, setNewPollQuestion] = useState('')
  const [newPollOptions, setNewPollOptions] = useState(['', ''])

  // Q&A state
  const [questions, setQuestions] = useState<StudioQuestion[]>([
    {
      id: 'q1',
      author: 'Rahul Verma',
      text: 'What is the optimal watering frequency for mustard microgreens?',
      upvotes: 14,
      isAnswered: true,
      answerText: 'Mist twice daily in the morning and evening using clean water.',
      time: '10:14 AM',
    },
    {
      id: 'q2',
      author: 'Ananya Roy',
      text: 'Can we reuse the coco-coir potting soil after harvesting the first batch?',
      upvotes: 19,
      isAnswered: false,
      time: '10:22 AM',
    },
    {
      id: 'q3',
      author: 'Venkatesh S.',
      text: 'How much direct sunlight do radish microgreens need each day?',
      upvotes: 7,
      isAnswered: false,
      time: '10:28 AM',
    },
  ])

  const [answeringQuestionId, setAnsweringQuestionId] = useState<string | null>(null)
  const [answerDraft, setAnswerDraft] = useState('')

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

  // Host send chat / announcement
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault()
    const text = chatDraft.trim()
    if (!text) return

    if (isAnnouncement) {
      setPinnedAnnouncement(text)
    }

    const newMsg: StudioChatEntry = {
      id: `m-${Date.now()}`,
      name: `${webinar?.hostName ?? 'Host'} (Host)`,
      text,
      ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isHost: true,
      isPinned: isAnnouncement,
    }

    setChatMessages((prev) => [...prev, newMsg])
    setChatDraft('')
    setIsAnnouncement(false)
  }

  // Create new poll
  const handleCreatePoll = (e: React.FormEvent) => {
    e.preventDefault()
    const validOptions = newPollOptions.map((o) => o.trim()).filter(Boolean)
    if (!newPollQuestion.trim() || validOptions.length < 2) return

    const newPoll: StudioPoll = {
      id: `poll-${Date.now()}`,
      question: newPollQuestion.trim(),
      options: validOptions.map((text, idx) => ({ id: String(idx + 1), text, votes: 0 })),
      totalVotes: 0,
      isActive: true,
    }

    // Set all previous polls inactive
    setPolls((prev) => [newPoll, ...prev.map((p) => ({ ...p, isActive: false }))])
    setNewPollQuestion('')
    setNewPollOptions(['', ''])
    setShowNewPollModal(false)
    setActiveTab('polls')
  }

  // Toggle active poll
  const handleTogglePollStatus = (pollId: string) => {
    setPolls((prev) =>
      prev.map((p) => (p.id === pollId ? { ...p, isActive: !p.isActive } : p)),
    )
  }

  // Mark question answered
  const handleMarkAnswered = (qId: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === qId ? { ...q, isAnswered: true } : q)),
    )
  }

  // Submit written answer
  const handleSubmitAnswer = (qId: string) => {
    if (!answerDraft.trim()) return
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qId ? { ...q, isAnswered: true, answerText: answerDraft.trim() } : q,
      ),
    )
    setAnsweringQuestionId(null)
    setAnswerDraft('')
  }

  if (isLoading) return <LoadingState label="Connecting to host control studio…" />
  if (error || !webinar) return <ErrorState error={(error as Error) ?? new Error('Webinar not found')} />

  const videoId = webinar.youtubeVideoId || 'dQw4w9WgXcQ'
  const isLive = webinar.status === 'LIVE'

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
          <span style={{ fontSize: '0.85rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px' }}>
            ● Stream Healthy (1080p)
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
                Share with attendees: <code style={{ color: '#38bdf8' }}>http://localhost:5173/w/{webinar.id}</code>
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
                onClick={() => setChatEnabled((v) => !v)}
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
                onClick={() => setPinnedAnnouncement(null)}
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
                {chatMessages.map((m) => (
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
                ))}
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
                  <span style={{ fontSize: '0.7rem', color: '#38bdf8' }}>Posting as Host</span>
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
              {polls.map((poll) => (
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
                      onClick={() => handleTogglePollStatus(poll.id)}
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
              ))}
            </div>
          )}

          {/* ── TAB 3: Q&A MODERATOR DECK ── */}
          {activeTab === 'qna' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '1rem', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Attendee Questions</h3>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Sorted by upvotes
                </span>
              </div>

              {questions.map((q) => (
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
