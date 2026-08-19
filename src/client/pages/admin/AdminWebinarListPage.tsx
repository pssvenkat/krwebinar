import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWebinars, usePublishWebinar, useGoLiveWebinar, useEndWebinar, useArchiveWebinar } from '../../hooks/useWebinars'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingState, ErrorState } from '../../components/ui/States'
import type { BadgeVariant } from '../../components/ui/Badge'
import type { WebinarSummary } from '../../hooks/useWebinars'

// ── Types ─────────────────────────────────────────────────────────

type StatusFilter = 'ALL' | 'DRAFT' | 'PUBLISHED' | 'LIVE' | 'ENDED' | 'ARCHIVED'

const STATUS_TABS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: '🔴 Live', value: 'LIVE' },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Ended', value: 'ENDED' },
  { label: 'Archived', value: 'ARCHIVED' },
]

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  DRAFT: 'default',
  PUBLISHED: 'primary',
  LIVE: 'error',
  ENDED: 'secondary',
  ARCHIVED: 'outline',
}

// ── Row actions ───────────────────────────────────────────────────

function WebinarRowActions({ webinar }: { webinar: WebinarSummary }) {
  const navigate = useNavigate()
  const publish = usePublishWebinar()
  const goLive = useGoLiveWebinar()
  const end = useEndWebinar()
  const archive = useArchiveWebinar()

  const isPending = publish.isPending || goLive.isPending || end.isPending || archive.isPending

  return (
    <div className="admin-table-actions">
      <button
        type="button"
        className="admin-table-action-btn"
        onClick={(e) => { e.stopPropagation(); navigate(`/admin/webinars/${webinar.id}/studio`) }}
        title="Open Live Host Studio"
        style={{ fontWeight: 600, color: webinar.status === 'LIVE' ? '#dc2626' : undefined }}
      >
        🎙️ Studio
      </button>
      {webinar.status === 'DRAFT' && (
        <button
          type="button"
          className="admin-table-action-btn"
          disabled={isPending}
          onClick={(e) => { e.stopPropagation(); void publish.mutateAsync(webinar.id) }}
          title="Publish"
        >
          Publish
        </button>
      )}
      {webinar.status === 'PUBLISHED' && (
        <button
          type="button"
          className="admin-table-action-btn admin-table-action-live"
          disabled={isPending}
          onClick={(e) => { e.stopPropagation(); void goLive.mutateAsync(webinar.id) }}
          title="Go Live"
        >
          Go Live
        </button>
      )}
      {webinar.status === 'LIVE' && (
        <button
          type="button"
          className="admin-table-action-btn admin-table-action-end"
          disabled={isPending}
          onClick={(e) => { e.stopPropagation(); void end.mutateAsync(webinar.id) }}
          title="End Webinar"
        >
          End
        </button>
      )}
      {webinar.status === 'ENDED' && (
        <button
          type="button"
          className="admin-table-action-btn"
          disabled={isPending}
          onClick={(e) => { e.stopPropagation(); void archive.mutateAsync(webinar.id) }}
          title="Archive"
        >
          Archive
        </button>
      )}
      {(webinar.status === 'DRAFT' || webinar.status === 'PUBLISHED') && (
        <button
          type="button"
          className="admin-table-action-btn admin-table-action-edit"
          onClick={(e) => { e.stopPropagation(); navigate(`/admin/webinars/${webinar.id}/edit`) }}
          title="Edit"
        >
          Edit
        </button>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────

export default function AdminWebinarListPage() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')

  const { data, isLoading, error, refetch } = useWebinars({
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    limit: 50,
  })

  const webinars = data?.webinars ?? []

  return (
    <div className="admin-webinar-list">
      {/* Page header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Webinars</h1>
          <p className="admin-page-subtitle">{data?.pagination.total ?? 0} total webinars</p>
        </div>
        <Button id="webinar-list-new" variant="primary" size="md" onClick={() => navigate('/admin/webinars/new')}>
          + New Webinar
        </Button>
      </div>

      {/* Status tabs */}
      <div className="admin-tabs">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`admin-tab${statusFilter === tab.value ? ' admin-tab-active' : ''}`}
            onClick={() => setStatusFilter(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingState label="Loading webinars…" />
      ) : error ? (
        <ErrorState error={error as Error} action={<button type="button" className="btn btn-secondary btn-sm" onClick={() => void refetch()}>Retry</button>} />
      ) : webinars.length === 0 ? (
        <div className="admin-empty-state">
          <p className="admin-empty-title">No webinars yet</p>
          <p className="admin-empty-subtitle">Create your first webinar to get started</p>
          <Button id="empty-create" variant="primary" size="md" onClick={() => navigate('/admin/webinars/new')}>
            Create webinar
          </Button>
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Date &amp; Time</th>
                <th>Status</th>
                <th>Host</th>
                <th>Capacity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {webinars.map((w) => (
                <tr
                  key={w.id}
                  className="admin-table-row"
                  onClick={() => navigate(`/admin/webinars/${w.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="admin-table-cell-title">
                    <span className="admin-table-title">{w.title}</span>
                  </td>
                  <td>
                    <span className="admin-table-date">{w.startDate}</span>
                    <span className="admin-table-time">{w.startTime}</span>
                  </td>
                  <td>
                    <Badge variant={STATUS_VARIANT[w.status] ?? 'default'} dot={w.status === 'LIVE'}>
                      {w.status}
                    </Badge>
                  </td>
                  <td>{w.hostName}</td>
                  <td>
                    <span className={w.maxParticipants ? '' : 'admin-table-muted'}>
                      {w.maxParticipants ?? '∞'}
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <WebinarRowActions webinar={w} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
