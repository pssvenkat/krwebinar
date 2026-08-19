import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  useWebinar, useRegistrations, usePublishWebinar,
  useGoLiveWebinar, useEndWebinar, useArchiveWebinar
} from '../../hooks/useWebinars'
import { useLeads, downloadLeadsCsv } from '../../hooks/useLeads'
import type { Lead, LeadsSummary } from '../../hooks/useLeads'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingState, ErrorState } from '../../components/ui/States'
import type { BadgeVariant } from '../../components/ui/Badge'
import type { Registration } from '../../hooks/useWebinars'

// ── CSV export (registrations) ────────────────────────────────────

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
        <Button
          id="ctrl-studio"
          variant="primary"
          size="sm"
          onClick={() => navigate(`/admin/webinars/${id}/studio`)}
          style={{ background: status === 'LIVE' ? '#dc2626' : undefined, borderColor: status === 'LIVE' ? '#dc2626' : undefined }}
        >
          🎙️ {status === 'LIVE' ? 'Enter Live Studio (ON AIR)' : 'Enter Host Studio'}
        </Button>
        {status === 'DRAFT' && (
          <>
            <Button id="ctrl-edit" variant="secondary" size="sm" onClick={() => navigate(`/admin/webinars/${id}/edit`)}>
              Edit
            </Button>
            <Button id="ctrl-publish" variant="outline" size="sm" loading={isPending}
              onClick={() => publish.mutate(id)}>
              Publish
            </Button>
          </>
        )}
        {status === 'PUBLISHED' && (
          <>
            <Button id="ctrl-edit" variant="secondary" size="sm" onClick={() => navigate(`/admin/webinars/${id}/edit`)}>
              Edit
            </Button>
            <Button id="ctrl-golive" variant="outline" size="sm" loading={isPending}
              onClick={() => goLive.mutate(id)}>
              Go Live
            </Button>
          </>
        )}
        {status === 'LIVE' && (
          <Button id="ctrl-end" variant="secondary" size="sm" loading={isPending}
            onClick={() => end.mutate(id)}>
            End Webinar
          </Button>
        )}
        {status === 'ENDED' && (
          <>
            <Button id="ctrl-archive" variant="ghost" size="sm" loading={isPending}
              onClick={() => archive.mutate(id)}>
              Archive
            </Button>
            <Button id="ctrl-analytics" variant="secondary" size="sm"
              onClick={() => navigate(`/admin/webinars/${id}/analytics`)}>
              View Analytics
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Registrations table ────────────────────────────────────────────

function RegistrationsTable({ registrations, title }: { registrations: Registration[]; title: string }) {
  return (
    <>
      <div className="admin-section-header">
        <span className="admin-table-count">{registrations.length} registrant{registrations.length !== 1 ? 's' : ''}</span>
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

// ── Stars display ─────────────────────────────────────────────────

function Stars({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="leads-no-rating">—</span>
  return (
    <span className="leads-stars" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < rating ? 'leads-star--filled' : 'leads-star--empty'}>★</span>
      ))}
    </span>
  )
}

// ── Leads panel ───────────────────────────────────────────────────

const INTEREST_BADGE: Record<string, BadgeVariant> = {
  hot: 'error', warm: 'warning', cold: 'secondary',
}

function LeadsPanel({ webinarId }: { webinarId: string }) {
  const { data, isLoading, error } = useLeads(webinarId)

  if (isLoading) return <LoadingState label="Loading leads…" />
  if (error) return <ErrorState error={error as Error} />

  const leads = data?.leads ?? []
  const summary: LeadsSummary | undefined = data?.summary

  return (
    <>
      {summary && (
        <div className="leads-summary">
          <div className="leads-kpi">
            <p className="leads-kpi-label">Total Leads</p>
            <p className="leads-kpi-value">{summary.totalLeads}</p>
          </div>
          <div className="leads-kpi">
            <p className="leads-kpi-label">Avg Rating</p>
            <p className="leads-kpi-value">
              {summary.avgRating !== null ? `${summary.avgRating} ★` : '—'}
            </p>
          </div>
          <div className="leads-kpi">
            <p className="leads-kpi-label">Follow-up Requested</p>
            <p className="leads-kpi-value">{summary.contactRequested}</p>
          </div>
        </div>
      )}

      <div className="admin-section-header">
        <span className="admin-table-count">{leads.length} lead{leads.length !== 1 ? 's' : ''}</span>
        <Button
          id="export-leads-csv"
          variant="ghost"
          size="sm"
          onClick={() => downloadLeadsCsv(webinarId)}
        >
          ↓ Export CSV
        </Button>
      </div>

      {leads.length === 0 ? (
        <div className="leads-empty">
          <p>No feedback submitted yet.</p>
          <p className="leads-empty-hint">Leads appear here once attendees complete the post-webinar feedback form.</p>
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table leads-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Rating</th>
                <th>Interests</th>
                <th>Follow-up</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead: Lead) => (
                <tr key={lead.id} className="admin-table-row">
                  <td><span className="admin-table-title">{lead.name}</span></td>
                  <td><a href={`mailto:${lead.email}`} className="admin-link">{lead.email}</a></td>
                  <td><Stars rating={lead.rating} /></td>
                  <td>
                    <div className="leads-interests">
                      {lead.interests.length > 0
                        ? lead.interests.map((tag: string) => (
                          <Badge key={tag} variant={INTEREST_BADGE[tag] ?? 'default'}>
                            {tag.replace(/_/g, ' ')}
                          </Badge>
                        ))
                        : <span className="leads-no-rating">—</span>
                      }
                    </div>
                  </td>
                  <td>
                    <Badge variant={lead.contact_requested ? 'primary' : 'default'}>
                      {lead.contact_requested ? `Yes (${lead.preferred_contact ?? 'any'})` : 'No'}
                    </Badge>
                  </td>
                  <td className="admin-table-date">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────

type Tab = 'registrations' | 'leads'

export default function AdminWebinarDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('registrations')

  const { data: webinar, isLoading, error } = useWebinar(id)
  const { data: regData, isLoading: regsLoading } = useRegistrations(id)

  if (isLoading) return <LoadingState label="Loading webinar…" />
  if (error || !webinar) return <ErrorState error={error as Error} />

  const w = webinar
  const attendUrl = `${window.location.origin}/w/`
  const regUrl = `${window.location.origin}/register/${id}`

  return (
    <div className="admin-webinar-detail">
      <button type="button" className="admin-back-link" onClick={() => navigate('/admin/webinars')}>
        ← Webinars
      </button>

      <div className="admin-page-header">
        <div style={{ flex: 1 }}>
          <h1 className="admin-page-title">{w.title}</h1>
          <p className="admin-page-subtitle">
            {w.startDate} · {w.startTime}–{w.endTime} {w.timezone}
            {w.hostName ? ` · ${w.hostName}` : ''}
          </p>
        </div>
      </div>

      <StatusControls id={id!} status={w.status} />

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

      {/* Tabs: Registrations | Leads */}
      <div className="admin-section">
        <div className="admin-tabs">
          <button
            type="button"
            className={`admin-tab${tab === 'registrations' ? ' admin-tab--active' : ''}`}
            onClick={() => setTab('registrations')}
          >
            Registrations
            <span className="admin-tab-count">{regData?.registrations?.length ?? 0}</span>
          </button>
          <button
            type="button"
            className={`admin-tab${tab === 'leads' ? ' admin-tab--active' : ''}`}
            onClick={() => setTab('leads')}
          >
            Leads &amp; Feedback
          </button>
        </div>

        <div className="admin-tab-content">
          {tab === 'registrations' ? (
            regsLoading ? (
              <LoadingState label="Loading registrations…" />
            ) : (
              <RegistrationsTable
                registrations={regData?.registrations ?? []}
                title={w.title}
              />
            )
          ) : (
            <LeadsPanel webinarId={id!} />
          )}
        </div>
      </div>
    </div>
  )
}
