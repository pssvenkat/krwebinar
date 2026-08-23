/// <reference types="vite/client" />
import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LoadingState, ErrorState } from '../../components/ui/States'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useBranding } from '../../hooks/useBranding'

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

interface ChatEntry {
  id: string
  name: string
  text: string
  ts: string
  isHost: boolean
  isPinned?: boolean
}

interface PollOption {
  id: string
  text: string
  votes: number
}

interface PollItem {
  id: string
  question: string
  options: PollOption[]
  totalVotes: number
  isActive: boolean
}

interface QuestionItem {
  id: string
  author: string
  authorId?: string
  text: string
  upvotes: number
  hasUpvoted?: boolean
  isAnswered: boolean
  answerText?: string
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
  pinnedAnnouncement,
  onSend,
  chatEnabled,
  isConnected,
}: {
  messages: ChatEntry[]
  pinnedAnnouncement: string | null
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
      if (!text || !isConnected || !chatEnabled) return
      onSend(text)
      setDraft('')
    },
    [draft, isConnected, chatEnabled, onSend],
  )

  return (
    <div className="attend-chat">
      {/* Pinned announcement banner */}
      {pinnedAnnouncement && (
        <div
          style={{
            background: 'var(--color-surface)',
            borderBottom: '2px solid var(--color-primary)',
            padding: '0.6rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span style={{ fontSize: '1rem' }}>📌</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
              Host Announcement
            </span>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text)' }}>{pinnedAnnouncement}</p>
          </div>
        </div>
      )}

      <div className="attend-chat-messages" role="log" aria-live="polite" aria-label="Live chat">
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--color-muted)', padding: '2rem 1rem' }}>
            <p>👋 Welcome to the live stream!</p>
            <p style={{ fontSize: '0.8rem' }}>Introduce yourself and join the discussion.</p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`attend-chat-msg${m.isHost ? ' attend-chat-msg--host' : ''}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="attend-chat-name" style={{ color: m.isHost ? 'var(--color-primary)' : undefined }}>
                {m.name}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-muted)' }}>{m.ts}</span>
            </div>
            <span className="attend-chat-text">{m.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {chatEnabled ? (
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
      ) : (
        <div style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-muted)', background: 'var(--color-surface)' }}>
          🔇 Chat has been paused by the host.
        </div>
      )}
    </div>
  )
}

// ── Live Poll Panel ───────────────────────────────────────────────

function PollPanel({
  polls,
  onVote,
}: {
  polls: PollItem[]
  onVote: (pollId: string, optionId: string) => void
}) {
  const [votedMap, setVotedMap] = useState<Record<string, string>>({})

  const activePoll = polls.find((p) => p.isActive) || polls[0]

  if (!activePoll) {
    return (
      <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--color-muted)' }}>
        <p style={{ fontSize: '1.5rem', margin: 0 }}>📊</p>
        <p style={{ fontWeight: 600, marginTop: '0.5rem' }}>No Active Polls</p>
        <p style={{ fontSize: '0.8rem' }}>When the host launches a poll, it will appear here in real-time.</p>
      </div>
    )
  }

  const votedOption = votedMap[activePoll.id] || null
  const totalVotes = activePoll.options.reduce((acc, opt) => acc + opt.votes, 0) || activePoll.totalVotes || 0

  const handleVoteClick = (optId: string) => {
    if (votedOption || !activePoll.isActive) return
    setVotedMap((prev) => ({ ...prev, [activePoll.id]: optId }))
    onVote(activePoll.id, optId)
  }

  return (
    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Badge variant={activePoll.isActive ? 'primary' : 'warning'}>
            {activePoll.isActive ? 'Active Poll' : 'Poll Closed'}
          </Badge>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{totalVotes} votes cast</span>
        </div>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: '0.5rem', color: 'var(--color-text)' }}>
          {activePoll.question}
        </h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {activePoll.options.map((opt) => {
          const pct = Math.round((opt.votes / (totalVotes || 1)) * 100) || 0
          const isSelected = votedOption === opt.id

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleVoteClick(opt.id)}
              disabled={votedOption !== null || !activePoll.isActive}
              style={{
                position: 'relative',
                padding: '0.75rem',
                border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                borderRadius: '8px',
                background: 'var(--color-surface)',
                textAlign: 'left',
                cursor: votedOption || !activePoll.isActive ? 'default' : 'pointer',
                overflow: 'hidden',
              }}
            >
              {(votedOption || !activePoll.isActive) && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: `${pct}%`,
                    background: isSelected ? 'rgba(22, 163, 74, 0.2)' : 'rgba(0,0,0,0.05)',
                    zIndex: 0,
                    transition: 'width 0.3s ease',
                  }}
                />
              )}
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: isSelected ? 600 : 400 }}>{opt.text}</span>
                {(votedOption || !activePoll.isActive) && (
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

function QnAPanel({
  userName,
  questions,
  onAsk,
  onUpvote,
}: {
  userName: string
  questions: QuestionItem[]
  onAsk: (text: string) => void
  onUpvote: (questionId: string) => void
}) {
  const [draftQuestion, setDraftQuestion] = useState('')

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draftQuestion.trim()) return
    onAsk(draftQuestion.trim())
    setDraftQuestion('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1rem', gap: '1rem' }}>
      <form onSubmit={handleAsk} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <input
          type="text"
          className="attend-chat-input"
          placeholder={`Ask host a question as ${userName || 'Attendee'}…`}
          value={draftQuestion}
          onChange={(e) => setDraftQuestion(e.target.value)}
          maxLength={200}
        />
        <Button id="submit-qna" type="submit" variant="primary" size="sm" disabled={!draftQuestion.trim()}>
          Submit Question
        </Button>
      </form>

      <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
        {questions.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--color-muted)', padding: '2rem 1rem' }}>
            <p style={{ fontSize: '1.5rem', margin: 0 }}>❓</p>
            <p style={{ fontWeight: 600, marginTop: '0.5rem' }}>No questions yet</p>
            <p style={{ fontSize: '0.8rem' }}>Be the first to ask the host a question!</p>
          </div>
        ) : (
          questions.map((q) => (
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
              {q.answerText && (
                <div style={{ background: 'rgba(22, 163, 74, 0.1)', padding: '0.4rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--color-success)', marginBottom: '0.5rem' }}>
                  <strong>Host Reply:</strong> {q.answerText}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {q.isAnswered ? (
                  <Badge variant="success">Answered Live</Badge>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Pending host reply</span>
                )}
                <button
                  type="button"
                  onClick={() => onUpvote(q.id)}
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
          ))
        )}
      </div>
    </div>
  )
}

// ── Countdown Hook & Calendar Helpers ─────────────────────────────

function useCountdown(targetDateStr: string | null, targetTimeStr: string | null) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
    isPassed: boolean
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPassed: false,
  })

  useEffect(() => {
    if (!targetDateStr) return

    const update = () => {
      const timePart = targetTimeStr ? `${targetTimeStr}:00` : '00:00:00'
      const targetTime = new Date(`${targetDateStr}T${timePart}`).getTime()
      const now = Date.now()
      const diff = targetTime - now

      if (isNaN(targetTime) || diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPassed: true })
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft({ days, hours, minutes, seconds, isPassed: false })
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [targetDateStr, targetTimeStr])

  return timeLeft
}

function downloadIcsFile(webinar: {
  title: string
  description?: string | null
  startDate: string
  startTime: string
  endTime: string
}) {
  const startClean = `${webinar.startDate.replace(/-/g, '')}T${(webinar.startTime || '00:00').replace(':', '')}00`
  const endClean = `${webinar.startDate.replace(/-/g, '')}T${(webinar.endTime || '01:00').replace(':', '')}00`

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//WebinarPlatform//Webinar Event//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `SUMMARY:${webinar.title.replace(/\n/g, ' ')}`,
    `DESCRIPTION:${(webinar.description || webinar.title).replace(/\n/g, ' ')}`,
    `DTSTART:${startClean}`,
    `DTEND:${endClean}`,
    `STATUS:CONFIRMED`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `${webinar.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function getGoogleCalendarUrl(webinar: {
  title: string
  description?: string | null
  startDate: string
  startTime: string
  endTime: string
}) {
  const startClean = `${webinar.startDate.replace(/-/g, '')}T${(webinar.startTime || '00:00').replace(':', '')}00`
  const endClean = `${webinar.startDate.replace(/-/g, '')}T${(webinar.endTime || '01:00').replace(':', '')}00`
  const title = encodeURIComponent(webinar.title)
  const details = encodeURIComponent(webinar.description || `Live Webinar: ${webinar.title}`)
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startClean}/${endClean}&details=${details}`
}

// ── Screen: Webinar Not Started Yet ───────────────────────────────

function WebinarNotStartedScreen({
  webinar,
  branding,
  targetWebinarId,
  onRefresh,
  isRefreshing,
}: {
  webinar: AttendData['webinar']
  branding: any
  targetWebinarId: string
  onRefresh: () => void
  isRefreshing: boolean
}) {
  const countdown = useCountdown(webinar.startDate, webinar.startTime)

  const formattedDate = webinar.startDate
    ? new Date(`${webinar.startDate}T00:00:00`).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Scheduled Date TBA'

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#090d16',
        padding: '1.5rem',
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '540px',
          width: '100%',
          background: '#111827',
          borderRadius: '16px',
          padding: '2.5rem 2rem',
          border: '1px solid #1f2937',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          textAlign: 'center',
        }}
      >
        {/* Logo / Icon */}
        <div style={{ marginBottom: '1.5rem' }}>
          {branding?.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={branding.platformName || 'Logo'}
              style={{ maxHeight: 48, maxWidth: 200, objectFit: 'contain', marginBottom: '0.75rem' }}
            />
          ) : (
            <span style={{ fontSize: '2.75rem', display: 'block', marginBottom: '0.5rem' }}>⏳</span>
          )}
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#f59e0b',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              display: 'inline-block',
            }}
          >
            🟡 Webinar Not Started Yet
          </span>
        </div>

        {/* Title & Host */}
        <h1 style={{ fontSize: '1.45rem', fontWeight: 700, margin: '0.5rem 0 0.4rem', color: '#ffffff', lineHeight: 1.3 }}>
          {webinar.title}
        </h1>
        {webinar.hostName && (
          <p style={{ margin: '0 0 1.25rem', fontSize: '0.9rem', color: '#9ca3af' }}>
            Hosted by <strong style={{ color: '#e5e7eb' }}>{webinar.hostName}</strong>
          </p>
        )}

        {/* Schedule Badge Card */}
        <div
          style={{
            background: '#1f2937',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            border: '1px solid #374151',
            marginBottom: '1.5rem',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.1rem' }}>📅</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f3f4f6' }}>{formattedDate}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.1rem' }}>⏰</span>
            <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
              {webinar.startTime ? `${webinar.startTime} – ${webinar.endTime || ''}` : 'Time TBA'} ({webinar.timezone || 'IST'})
            </span>
          </div>
        </div>

        {/* Countdown Timer */}
        <div style={{ marginBottom: '1.75rem' }}>
          <p style={{ fontSize: '0.8rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.75rem', fontWeight: 600 }}>
            {countdown.isPassed ? 'Broadcasting soon' : 'Time Remaining Until Live'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
            {[
              { label: 'Days', val: countdown.days },
              { label: 'Hours', val: countdown.hours },
              { label: 'Mins', val: countdown.minutes },
              { label: 'Secs', val: countdown.seconds },
            ].map((unit) => (
              <div
                key={unit.label}
                style={{
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  padding: '0.75rem 0.25rem',
                }}
              >
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#38bdf8', lineHeight: 1 }}>
                  {String(unit.val).padStart(2, '0')}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', marginTop: '0.35rem', fontWeight: 600 }}>
                  {unit.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Auto-Detection Note */}
        <div
          style={{
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            borderRadius: '10px',
            padding: '0.85rem 1rem',
            fontSize: '0.825rem',
            color: '#bae6fd',
            marginBottom: '1.5rem',
            lineHeight: 1.45,
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            textAlign: 'left',
          }}
        >
          <span style={{ fontSize: '1.25rem', animation: 'pulse 2s infinite' }}>📡</span>
          <span>
            {countdown.isPassed
              ? 'The scheduled start time has arrived! As soon as the host starts the stream, this room will open automatically.'
              : 'Please keep this tab open. You will be automatically admitted to the login & live stream as soon as the host goes live!'}
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={onRefresh}
            disabled={isRefreshing}
            style={{ width: '100%', padding: '0.75rem' }}
          >
            {isRefreshing ? 'Checking Live Status…' : '🔄 Check Status Now'}
          </Button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <a
              href={getGoogleCalendarUrl(webinar)}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.6rem 0.5rem',
                background: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#e5e7eb',
                fontSize: '0.8rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              📅 Google Cal
            </a>
            <button
              type="button"
              onClick={() => downloadIcsFile(webinar)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.6rem 0.5rem',
                background: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#e5e7eb',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              📥 Outlook / iCal
            </button>
          </div>
        </div>

        {/* Not registered link */}
        <div style={{ marginTop: '1.5rem', borderTop: '1px solid #1f2937', paddingTop: '1rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Haven't registered yet? </span>
          <Link
            to={`/register/${targetWebinarId}`}
            style={{ color: '#38bdf8', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'underline' }}
          >
            Register now
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Screen: Webinar Ended ─────────────────────────────────────────

function WebinarEndedScreen({
  webinar,
  branding,
  token,
  targetWebinarId,
}: {
  webinar: AttendData['webinar']
  branding: any
  token: string
  targetWebinarId: string
}) {
  const formattedDate = webinar.startDate
    ? new Date(`${webinar.startDate}T00:00:00`).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#090d16',
        padding: '1.5rem',
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '500px',
          width: '100%',
          background: '#111827',
          borderRadius: '16px',
          padding: '2.5rem 2rem',
          border: '1px solid #1f2937',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          textAlign: 'center',
        }}
      >
        {/* Logo / Icon */}
        <div style={{ marginBottom: '1.5rem' }}>
          {branding?.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={branding.platformName || 'Logo'}
              style={{ maxHeight: 48, maxWidth: 200, objectFit: 'contain', marginBottom: '0.75rem' }}
            />
          ) : (
            <span style={{ fontSize: '2.75rem', display: 'block', marginBottom: '0.5rem' }}>🏁</span>
          )}
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              background: 'rgba(148, 163, 184, 0.12)',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              display: 'inline-block',
            }}
          >
            ⚪ Webinar Concluded
          </span>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: '1.45rem', fontWeight: 700, margin: '0.5rem 0 0.4rem', color: '#ffffff', lineHeight: 1.3 }}>
          {webinar.title}
        </h1>
        {webinar.hostName && (
          <p style={{ margin: '0 0 1.25rem', fontSize: '0.9rem', color: '#9ca3af' }}>
            Hosted by <strong style={{ color: '#e5e7eb' }}>{webinar.hostName}</strong>
          </p>
        )}

        {/* Ended Message */}
        <div
          style={{
            background: '#1f2937',
            borderRadius: '12px',
            padding: '1.25rem',
            border: '1px solid #374151',
            marginBottom: '1.75rem',
            color: '#e5e7eb',
            fontSize: '0.9rem',
            lineHeight: 1.5,
          }}
        >
          <p style={{ margin: 0 }}>
            This live webinar session has ended{formattedDate ? ` (${formattedDate})` : ''}.
          </p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.825rem', color: '#9ca3af' }}>
            Thank you for attending! If you have questions or would like to share your thoughts, please submit your feedback below.
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Link
            to={`/w/${token}/feedback`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              background: '#2563eb',
              color: '#ffffff',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            ⭐ Share Feedback & Enquire →
          </Link>

          <Link
            to={`/register/${targetWebinarId}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.65rem 1.25rem',
              background: '#1f2937',
              border: '1px solid #374151',
              color: '#9ca3af',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            View Webinar Details
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Main AttendPage ───────────────────────────────────────────────

export default function AttendPage() {
  const { token } = useParams<{ token: string }>()
  const { data: branding } = useBranding()

  const [activeSideTab, setActiveSideTab] = useState<'chat' | 'poll' | 'qna'>('chat')
  const [viewerCount, setViewerCount] = useState(1)
  const [chatEnabled, setChatEnabled] = useState(true)
  const [liveHostName, setLiveHostName] = useState<string>('')
  const [pinnedAnnouncement, setPinnedAnnouncement] = useState<string | null>(null)

  const [chatMessages, setChatMessages] = useState<ChatEntry[]>([])
  const [polls, setPolls] = useState<PollItem[]>([])
  const [questions, setQuestions] = useState<QuestionItem[]>([])

  // Phone verification state
  const [isPhoneVerified, setIsPhoneVerified] = useState<boolean>(() => {
    if (!token) return false
    try {
      return !!sessionStorage.getItem(`verified_attendee_${token}`)
    } catch {
      return false
    }
  })
  const [verifiedRegistration, setVerifiedRegistration] = useState<{ id: string; name: string; email: string; phone?: string } | null>(() => {
    if (!token) return null
    try {
      const stored = sessionStorage.getItem(`verified_attendee_${token}`)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [phoneInput, setPhoneInput] = useState('')
  const [countryDialCode, setCountryDialCode] = useState('+91')
  const [phoneVerifyError, setPhoneVerifyError] = useState<string | null>(null)
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false)

  // Initial HTTP fetch — validates token, gets webinar state
  const { data, isLoading, isFetching, error, refetch } = useQuery({
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
    refetchInterval: (query) => {
      const w = query.state.data?.webinar
      // Auto-poll every 5s if webinar is not live and not ended, so attendee gets instant entry when host goes live!
      if (w && !w.isLive && !w.isEnded) {
        return 5_000
      }
      return false
    },
    staleTime: 5_000,
  })

  // Check if phone was already validated for this specific webinar ID
  useEffect(() => {
    if (data?.webinar.id) {
      try {
        const stored = sessionStorage.getItem(`verified_attendee_${data.webinar.id}`)
        if (stored) {
          setVerifiedRegistration(JSON.parse(stored))
          setIsPhoneVerified(true)
        }
      } catch {
        // ignore
      }
    }
  }, [data?.webinar.id])

  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault()
    setPhoneVerifyError(null)
    const raw = phoneInput.trim()
    if (!raw) {
      setPhoneVerifyError('Please enter your phone number')
      return
    }

    const fullPhone = raw.startsWith('+') ? raw : `${countryDialCode}${raw}`
    setIsVerifyingPhone(true)

    try {
      const effectiveWebinarId = data?.webinar.id || token || ''
      const res = await fetch('/api/v1/attend/verify-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Slug': 'krave',
        },
        body: JSON.stringify({
          webinarId: effectiveWebinarId,
          phone: fullPhone,
        }),
      })

      const json = (await res.json()) as any
      if (!json.ok || !json.data) {
        setPhoneVerifyError(json.error?.message || 'This phone number is not registered for this webinar. Please register first.')
        return
      }

      const reg = json.data.registration
      setVerifiedRegistration(reg)
      setIsPhoneVerified(true)
      try {
        sessionStorage.setItem(`verified_attendee_${effectiveWebinarId}`, JSON.stringify(reg))
        if (token) {
          sessionStorage.setItem(`verified_attendee_${token}`, JSON.stringify(reg))
        }
      } catch {
        // ignore
      }
    } catch (err: any) {
      setPhoneVerifyError(err.message || 'Failed to verify phone number')
    } finally {
      setIsVerifyingPhone(false)
    }
  }

  // Build WS URL
  const webinarId = data?.webinar.id ?? ''
  const registrationId = verifiedRegistration?.id ?? data?.registration.id ?? ''

  const wsUrl = webinarId && token ? `/api/v1/ws/webinar/${webinarId}/ws?token=${token}` : null
  const wsAbsoluteUrl = wsUrl
    ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}${wsUrl}`
    : null

  const { lastMessage, readyState, sendMessage } = useWebSocket<any>(wsAbsoluteUrl)

  // Handle incoming WS messages
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
          setLiveHostName(lastMessage.hostName)
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
              hasUpvoted: Array.isArray(q.upvoters) ? q.upvoters.includes(registrationId) : false,
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
                name: lastMessage.participantName ?? (lastMessage.isHost ? 'Host' : 'Participant'),
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
              hasUpvoted: Array.isArray(q.upvoters) ? q.upvoters.includes(registrationId) : false,
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
                    hasUpvoted: Array.isArray(q.upvoters) ? q.upvoters.includes(registrationId) : existing.hasUpvoted,
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
          setLiveHostName(lastMessage.hostName)
        }
        break

      default:
        break
    }
  }, [lastMessage, registrationId])

  const handleSendMessage = useCallback(
    (text: string) => {
      if (readyState === 'OPEN') {
        sendMessage({
          type: 'CHAT_MESSAGE',
          content: text,
          sessionId: registrationId,
        })
      }
    },
    [readyState, sendMessage, registrationId],
  )

  const handleVotePoll = useCallback(
    (pollId: string, optionId: string) => {
      if (readyState === 'OPEN') {
        sendMessage({
          type: 'POLL_VOTE',
          pollId,
          optionId,
          sessionId: registrationId,
        })
      }
    },
    [readyState, sendMessage, registrationId],
  )

  const handleAskQuestion = useCallback(
    (text: string) => {
      if (readyState === 'OPEN') {
        sendMessage({
          type: 'QUESTION_CREATE',
          text,
          author: data?.registration.name || 'Attendee',
          sessionId: registrationId,
        })
      }
    },
    [readyState, sendMessage, registrationId, data?.registration.name],
  )

  const handleUpvoteQuestion = useCallback(
    (questionId: string) => {
      if (readyState === 'OPEN') {
        sendMessage({
          type: 'QUESTION_VOTE',
          questionId,
          sessionId: registrationId,
        })
      }
    },
    [readyState, sendMessage, registrationId],
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

  const registration = verifiedRegistration ?? data?.registration ?? { name: 'Attendee', email: 'attendee@example.com' }
  const webinar = data?.webinar ?? {
    id: token ?? '',
    title: 'Webinar',
    description: null,
    hostName: 'Host',
    youtubeVideoId: 'dQw4w9WgXcQ',
    startDate: '',
    startTime: '',
    endTime: '',
    timezone: 'IST',
    status: 'PUBLISHED',
    isLive: false,
    isEnded: false,
  }

  const targetWebinarId = webinar.id || token || ''

  // 1. If the webinar has ENDED — show Webinar Concluded Page
  if (webinar.isEnded || webinar.status === 'ENDED') {
    return (
      <WebinarEndedScreen
        webinar={webinar as any}
        branding={branding}
        token={token || ''}
        targetWebinarId={targetWebinarId}
      />
    )
  }

  // 2. If the webinar has NOT STARTED YET — show Waiting Room & Countdown Screen
  if (!webinar.isLive && webinar.status !== 'LIVE') {
    return (
      <WebinarNotStartedScreen
        webinar={webinar as any}
        branding={branding}
        targetWebinarId={targetWebinarId}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
      />
    )
  }

  // 3. If the webinar IS LIVE — require attendee phone verification before joining stream
  if (!isPhoneVerified) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#090d16',
          padding: '1.5rem',
          color: '#f8fafc',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: '460px',
            width: '100%',
            background: '#111827',
            borderRadius: '16px',
            padding: '2.25rem',
            border: '1px solid #1f2937',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            {branding?.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={branding.platformName || 'Logo'}
                style={{ maxHeight: 48, maxWidth: 200, objectFit: 'contain', marginBottom: '0.75rem' }}
              />
            ) : (
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>🔒</span>
            )}
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
              Attendee Access Verification
            </span>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0.5rem 0 0.25rem', color: '#ffffff' }}>
              {webinar.title}
            </h1>
            {webinar.hostName && (
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#9ca3af' }}>
                Hosted by {webinar.hostName}
              </p>
            )}
          </div>

          <form onSubmit={handleVerifyPhone} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            <div>
              <label
                htmlFor="attendee-phone"
                style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#e5e7eb' }}
              >
                Registered Mobile Number
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select
                  value={countryDialCode}
                  onChange={(e) => setCountryDialCode(e.target.value)}
                  style={{
                    padding: '0.65rem 0.5rem',
                    background: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    minWidth: '85px',
                  }}
                >
                  <option value="+91">🇮🇳 +91</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+971">🇦🇪 +971</option>
                  <option value="+65">🇸🇬 +65</option>
                  <option value="+61">🇦🇺 +61</option>
                  <option value="+49">🇩🇪 +49</option>
                  <option value="+33">🇫🇷 +33</option>
                </select>
                <input
                  id="attendee-phone"
                  type="tel"
                  placeholder="Enter phone (e.g. 9876543210)"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.65rem 0.85rem',
                    background: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                  }}
                  autoFocus
                />
              </div>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>
                Please enter the phone number you used when registering for this webinar.
              </p>
            </div>

            {phoneVerifyError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #ef4444',
                  borderRadius: '8px',
                  padding: '0.85rem',
                  color: '#fca5a5',
                  fontSize: '0.85rem',
                }}
              >
                <p style={{ margin: 0, fontWeight: 600 }}>⚠️ Verification Failed</p>
                <p style={{ margin: '0.25rem 0 0.5rem', fontSize: '0.8rem' }}>{phoneVerifyError}</p>
                <Link
                  to={`/register/${targetWebinarId}`}
                  style={{
                    display: 'inline-block',
                    padding: '0.4rem 0.75rem',
                    background: '#ef4444',
                    color: '#ffffff',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Register for this Webinar →
                </Link>
              </div>
            )}

            <Button
              id="btn-join-webinar"
              type="submit"
              variant="primary"
              size="lg"
              disabled={isVerifyingPhone || !phoneInput.trim()}
              style={{ width: '100%', marginTop: '0.25rem', padding: '0.75rem' }}
            >
              {isVerifyingPhone ? 'Verifying Phone…' : 'Verify & Enter Live Stream →'}
            </Button>
          </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center', borderTop: '1px solid #1f2937', paddingTop: '1rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Haven't registered yet? </span>
            <Link
              to={`/register/${targetWebinarId}`}
              style={{ color: '#38bdf8', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'underline' }}
            >
              Register now
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const displayHostName = liveHostName || webinar.hostName || 'Host'
  const videoId = webinar.youtubeVideoId || 'dQw4w9WgXcQ'

  return (
    <div className="attend-page">
      {/* ── Top Bar ── */}
      <header className="attend-header">
        <div className="attend-header-inner">
          <div className="attend-header-left" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {branding?.logoUrl && (
              <img
                src={branding.logoUrl}
                alt={branding.platformName || 'Logo'}
                style={{ maxHeight: 32, maxWidth: 120, objectFit: 'contain' }}
              />
            )}
            <div>
              <p className="attend-webinar-name">{webinar.title}</p>
              <p className="attend-participant">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                {registration.name}
              </p>
            </div>
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
              <p className="attend-stream-host">Hosted by {displayHostName}</p>
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
                💬 Chat ({chatMessages.length})
              </button>
              <button
                type="button"
                className={`admin-tab-btn${activeSideTab === 'poll' ? ' admin-tab-btn--active' : ''}`}
                style={{ flex: 1, padding: '0.6rem 0.5rem', fontSize: '0.85rem' }}
                onClick={() => setActiveSideTab('poll')}
              >
                📊 Polls {polls.some((p) => p.isActive) ? '●' : ''}
              </button>
              <button
                type="button"
                className={`admin-tab-btn${activeSideTab === 'qna' ? ' admin-tab-btn--active' : ''}`}
                style={{ flex: 1, padding: '0.6rem 0.5rem', fontSize: '0.85rem' }}
                onClick={() => setActiveSideTab('qna')}
              >
                ❓ Q&A ({questions.length})
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {activeSideTab === 'chat' && (
                <ChatPanel
                  messages={chatMessages}
                  pinnedAnnouncement={pinnedAnnouncement}
                  onSend={handleSendMessage}
                  chatEnabled={chatEnabled}
                  isConnected={readyState === 'OPEN'}
                />
              )}
              {activeSideTab === 'poll' && (
                <PollPanel polls={polls} onVote={handleVotePoll} />
              )}
              {activeSideTab === 'qna' && (
                <QnAPanel
                  userName={registration.name}
                  questions={questions}
                  onAsk={handleAskQuestion}
                  onUpvote={handleUpvoteQuestion}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
