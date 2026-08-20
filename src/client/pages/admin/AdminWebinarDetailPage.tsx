import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  useWebinar, useRegistrations, usePublishWebinar,
  useGoLiveWebinar, useEndWebinar, useArchiveWebinar, useUpdateWebinar
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
          variant="secondary"
          size="sm"
          onClick={() => exportCSV(registrations, title)}
        >
          ↓ Export CSV ({registrations.length})
        </Button>
      </div>
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Attendee</th>
              <th>Phone Number</th>
              <th>City / Country</th>
              <th>Attendance</th>
              <th>Registered Date</th>
            </tr>
          </thead>
          <tbody>
            {registrations.map((r) => (
              <tr key={r.id} className="admin-table-row">
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{r.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{r.email}</div>
                </td>
                <td style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.85rem' }}>
                  {r.phone_e164 ? (
                    <span style={{ color: 'var(--color-text)' }}>{r.phone_e164}</span>
                  ) : (
                    <span style={{ color: 'var(--color-muted)' }}>—</span>
                  )}
                </td>
                <td>{r.city || '—'} {r.country_code ? `(${r.country_code})` : ''}</td>
                <td>
                  <Badge variant={r.attended ? 'success' : 'default'} dot={Boolean(r.attended)}>
                    {r.attended ? 'Attended' : 'Registered'}
                  </Badge>
                </td>
                <td className="admin-table-date">{new Date(r.registered_at).toLocaleDateString()}</td>
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

// ── Feedback Settings Tab ─────────────────────────────────────────

function FeedbackSettingsTab({
  webinar,
  onSave,
  isPending,
}: {
  webinar: any
  onSave: (interests: string[]) => Promise<void>
  isPending: boolean
}) {
  const defaultList = [
    'Buy a home microgreens kit',
    'Bulk supply for restaurant / hotel',
    'Corporate wellness program',
    'Consulting & commercial growing',
    'Become a reseller / distributor',
  ]
  const [interests, setInterests] = useState<string[]>(
    Array.isArray(webinar.feedbackInterests) && webinar.feedbackInterests.length > 0
      ? webinar.feedbackInterests
      : defaultList,
  )
  const [newInterest, setNewInterest] = useState('')
  const [saved, setSaved] = useState(false)

  const handleAdd = () => {
    const trimmed = newInterest.trim()
    if (!trimmed) return
    if (!interests.includes(trimmed)) {
      setInterests((prev) => [...prev, trimmed])
    }
    setNewInterest('')
  }

  const handleRemove = (idx: number) => {
    setInterests((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSave = async () => {
    await onSave(interests.filter(Boolean))
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div style={{ maxWidth: '640px', padding: '0.5rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Feedback Form Interest Options</h3>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
            These interest checkboxes will be presented to attendees when submitting post-webinar feedback.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setInterests(defaultList)}
        >
          Reset Suggestions
        </Button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <input
          type="text"
          className="platform-input"
          placeholder="Add custom interest or product inquiry..."
          value={newInterest}
          onChange={(e) => setNewInterest(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAdd()
            }
          }}
          style={{ flex: 1 }}
        />
        <Button type="button" variant="secondary" size="md" onClick={handleAdd}>
          + Add
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {interests.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.6rem 0.85rem',
              background: 'var(--color-surface, #f8fafc)',
              border: '1px solid var(--color-border, #e2e8f0)',
              borderRadius: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)', width: '20px' }}>
                {idx + 1}.
              </span>
              <span style={{ fontSize: '0.9rem', color: 'var(--color-text)' }}>{item}</span>
            </div>
            <button
              type="button"
              onClick={() => handleRemove(idx)}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '1.1rem',
                padding: '2px 8px',
              }}
              title="Remove interest"
            >
              ✕
            </button>
          </div>
        ))}
        {interests.length === 0 && (
          <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', fontStyle: 'italic', margin: 0 }}>
            No custom interests added. Attendees will be shown standard default questions.
          </p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Button
          type="button"
          variant="primary"
          size="md"
          loading={isPending}
          onClick={handleSave}
        >
          {isPending ? 'Saving…' : 'Save Feedback Interests'}
        </Button>
        {saved && <span style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.85rem' }}>✓ Interests Updated</span>}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────

type Tab = 'registrations' | 'leads' | 'feedback-form'

export default function AdminWebinarDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('registrations')

  const { data: webinar, isLoading, error } = useWebinar(id)
  const { data: regData, isLoading: regsLoading } = useRegistrations(id)
  const updateMutation = useUpdateWebinar(id!)

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

      {/* Tabs: Registrations | Leads | Feedback Form */}
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
          <button
            type="button"
            className={`admin-tab${tab === 'feedback-form' ? ' admin-tab--active' : ''}`}
            onClick={() => setTab('feedback-form')}
          >
            ⚙️ Feedback Form Settings
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
          ) : tab === 'leads' ? (
            <LeadsPanel webinarId={id!} />
          ) : (
            <FeedbackSettingsTab
              webinar={w}
              isPending={updateMutation.isPending}
              onSave={async (feedbackInterests) => {
                await updateMutation.mutateAsync({ feedbackInterests })
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
