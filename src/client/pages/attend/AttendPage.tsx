import { useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LoadingState, ErrorState } from '../../components/ui/States'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'

interface AttendData {
  registration: { id: string; name: string; email: string }
  webinar: {
    id: string; title: string; description: string | null
    hostName: string; startDate: string; startTime: string
    endTime: string; timezone: string; status: string
    youtubeVideoId: string | null; isLive: boolean; isEnded: boolean
  }
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

function WaitingRoom({ webinar, participantName }: {
  webinar: AttendData['webinar']
  participantName: string
}) {
  const displayDate = new Date(`${webinar.startDate}T${webinar.startTime}`).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="attend-waiting">
      <div className="attend-waiting-icon" aria-hidden="true">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      </div>
      <Badge variant="primary">Starts soon</Badge>
      <h2 className="attend-waiting-title">{webinar.title}</h2>
      <p className="attend-waiting-greeting">Hi <strong>{participantName}</strong> — you&apos;re all set!</p>
      <p className="attend-waiting-date">{displayDate} at {webinar.startTime} ({webinar.timezone})</p>
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
          <Button variant="primary" size="md">
            Share your feedback
          </Button>
        </Link>
      </div>
    </div>
  )
}

// ── Main AttendPage ───────────────────────────────────────────────

export default function AttendPage() {
  const { token } = useParams<{ token: string }>()
  const pollInterval = useRef<number | null>(null)

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

  // Poll every 30s when webinar is PUBLISHED (waiting for LIVE)
  useEffect(() => {
    if (data?.webinar.status === 'PUBLISHED') {
      pollInterval.current = window.setInterval(() => { void refetch() }, 30_000)
    }
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current)
    }
  }, [data?.webinar.status, refetch])

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
            {webinar.isLive && (
              <Badge variant="error" dot>LIVE</Badge>
            )}
            {webinar.isEnded && (
              <Badge variant="secondary">Ended</Badge>
            )}
            {!webinar.isLive && !webinar.isEnded && (
              <Badge variant="primary">Upcoming</Badge>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="attend-main">
        {webinar.isLive && webinar.youtubeVideoId ? (
          <div className="attend-live-layout">
            <div className="attend-stream-section">
              <YouTubeEmbed videoId={webinar.youtubeVideoId} autoplay />
              <div className="attend-stream-meta">
                <h1 className="attend-stream-title">{webinar.title}</h1>
                <p className="attend-stream-host">Hosted by {webinar.hostName}</p>
              </div>
            </div>
            <aside className="attend-chat-sidebar">
              <div className="attend-chat-header">
                <span>Live Q&A</span>
                <Badge variant="success" dot>Active</Badge>
              </div>
              <div className="attend-chat-body">
                <p className="attend-chat-coming-soon">
                  💬 Live chat will be enabled in a future update.
                  <br /><br />
                  Please use the YouTube chat directly.
                </p>
              </div>
            </aside>
          </div>
        ) : webinar.isEnded ? (
          <EndedState webinar={webinar} token={token!} />
        ) : (
          <WaitingRoom webinar={webinar} participantName={registration.name} />
        )}
      </main>
    </div>
  )
}
