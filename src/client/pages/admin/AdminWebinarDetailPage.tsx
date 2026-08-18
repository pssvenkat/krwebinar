import { useParams, useNavigate } from 'react-router-dom'
import {
  useWebinar, useRegistrations, usePublishWebinar,
  useGoLiveWebinar, useEndWebinar, useArchiveWebinar
} from '../../hooks/useWebinars'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingState, ErrorState } from '../../components/ui/States'
import type { BadgeVariant } from '../../components/ui/Badge'
import type { Registration } from '../../hooks/useWebinars'

// ── CSV export ────────────────────────────────────────────────────

function exportCSV(registrations: Registration[], title: string) {
  const header = 'Name,Email,Phone,Country,City,Registered At,Attended'
  const rows = registrations.map((r) => [
    `"${r.name.replace(/"/g, '""')}"`,
    r.email,
    r.phone_e164 ?? '',
    r.country_code ?? '',
    r.city ?? '',
    r.registered_at,
    r.attended ? 'Yes' : 'No',
  ].join(','))
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title.replace(/\s+/g, '_')}_registrations.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Status machine controls ────────────────────────────────────────

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  DRAFT: 'default',
  PUBLISHED: 'primary',
  LIVE: 'error',
  ENDED: 'secondary',
  ARCHIVED: 'outline',
}

function StatusControls({ id, status }: { id: string; status: string }) {
  const publish = usePublishWebinar()
  const goLive = useGoLiveWebinar()
  const end = useEndWebinar()
  const archive = useArchiveWebinar()
  const navigate = useNavigate()

  const isPending = publish.isPending || goLive.isPending || end.isPending || archive.isPending

  return (
    <div className="admin-status-controls">
      <span className="admin-status-label">Status:</span>
      <Badge variant={STATUS_VARIANT[status] ?? 'default'} dot={status === 'LIVE'}>
        {status}
      </Badge>
      <div className="admin-status-actions">
        {status === 'DRAFT' && (
          <>
            <Button id="ctrl-edit" variant="secondary" size="sm" onClick={() => navigate(`/admin/webinars/${id}/edit`)}>
              Edit
            </Button>
            <Button id="ctrl-publish" variant="primary" size="sm" loading={publish.isPending} onClick={() => void publish.mutateAsync(id)}>
              Publish
            </Button>
          </>
        )}
        {status === 'PUBLISHED' && (
          <>
            <Button id="ctrl-edit" variant="secondary" size="sm" onClick={() => navigate(`/admin/webinars/${id}/edit`)}>
              Edit
            </Button>
            <Button
              id="ctrl-live"
              variant="primary"
              size="sm"
              loading={goLive.isPending}
              disabled={isPending}
              onClick={() => void goLive.mutateAsync(id)}
              className="btn-live"
            >
              🔴 Go Live
            </Button>
          </>
        )}
        {status === 'LIVE' && (
          <Button
            id="ctrl-end"
            variant="secondary"
            size="sm"
            loading={end.isPending}
            disabled={isPending}
            onClick={() => { if (window.confirm('End this webinar?')) void end.mutateAsync(id) }}
          >
            End webinar
          </Button>
        )}
        {status === 'ENDED' && (
          <Button
            id="ctrl-archive"
            variant="ghost"
            size="sm"
            loading={archive.isPending}
            disabled={isPending}
            onClick={() => void archive.mutateAsync(id)}
          >
            Archive
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Registration table ────────────────────────────────────────────

function RegistrationsTable({ registrations, title }: { registrations: Registration[]; title: string }) {
  if (registrations.length === 0) {
    return <p className="admin-empty-subtitle">No registrations yet.</p>
  }

  return (
    <>
      <div className="admin-section-header" style={{ marginBottom: '1rem' }}>
        <span className="admin-section-count">{registrations.length} registrations</span>
        <Button
          id="export-csv"
          variant="ghost"
          size="sm"
          onClick={() => exportCSV(registrations, title)}
        >
          ↓ Export CSV
        </Button>
      </div>
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Country</th>
              <th>Registered</th>
              <th>Attended</th>
            </tr>
          </thead>
          <tbody>
            {registrations.map((r) => (
              <tr key={r.id} className="admin-table-row">
                <td><span className="admin-table-title">{r.name}</span></td>
                <td>{r.email}</td>
                <td>{r.country_code ?? '—'}</td>
                <td className="admin-table-date">{new Date(r.registered_at).toLocaleDateString()}</td>
                <td>
                  <Badge variant={r.attended ? 'success' : 'default'}>
                    {r.attended ? 'Yes' : 'No'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────

export default function AdminWebinarDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: webinar, isLoading, error } = useWebinar(id)
  const { data: regData, isLoading: regsLoading } = useRegistrations(id)

  if (isLoading) return <LoadingState label="Loading webinar…" />
  if (error || !webinar) return <ErrorState error={error as Error} />

  const w = webinar
  const attendUrl = `${window.location.origin}/w/`
  const regUrl = `${window.location.origin}/register/${id}`

  return (
    <div className="admin-webinar-detail">
      {/* Back */}
      <button type="button" className="admin-back-link" onClick={() => navigate('/admin/webinars')}>
        ← Webinars
      </button>

      {/* Header */}
      <div className="admin-page-header">
        <div style={{ flex: 1 }}>
          <h1 className="admin-page-title">{w.title}</h1>
          <p className="admin-page-subtitle">
            {w.startDate} · {w.startTime}–{w.endTime} {w.timezone}
            {w.hostName ? ` · ${w.hostName}` : ''}
          </p>
        </div>
      </div>

      {/* Status controls */}
      <StatusControls id={id!} status={w.status} />

      {/* Info grid */}
      <div className="admin-detail-grid">
        <div className="admin-detail-card">
          <h3 className="admin-detail-card-title">Registration Link</h3>
          <code className="admin-detail-url">{regUrl}</code>
          <button
            type="button"
            className="admin-copy-btn"
            onClick={() => void navigator.clipboard.writeText(regUrl)}
          >
            Copy link
          </button>
        </div>
        <div className="admin-detail-card">
          <h3 className="admin-detail-card-title">YouTube</h3>
          {w.youtubeVideoId ? (
            <a
              href={`https://youtu.be/${w.youtubeVideoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-link"
            >
              {w.youtubeVideoId}
            </a>
          ) : (
            <span className="admin-table-muted">Not set — add before going live</span>
          )}
        </div>
        <div className="admin-detail-card">
          <h3 className="admin-detail-card-title">Attend URL pattern</h3>
          <code className="admin-detail-url">{attendUrl}[token]</code>
          <p className="admin-detail-hint">Each registrant receives a unique link</p>
        </div>
      </div>

      {/* Registrations */}
      <div className="admin-section">
        <h2 className="admin-section-title">Registrations</h2>
        {regsLoading ? (
          <LoadingState label="Loading registrations…" />
        ) : (
          <RegistrationsTable
            registrations={regData?.registrations ?? []}
            title={w.title}
          />
        )}
      </div>
    </div>
  )
}
