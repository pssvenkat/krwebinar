import { Link, useParams } from 'react-router-dom'
import { LoadingState, ErrorState } from '../../components/ui/States'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { useWebinarAnalytics } from '../../hooks/useAnalytics'

// ── Attendance funnel ─────────────────────────────────────────────

function AttendanceFunnel({ registered, attended }: { registered: number; attended: number }) {
  const rate = registered > 0 ? Math.round((attended / registered) * 100) : 0
  const notAttended = registered - attended

  return (
    <div className="analytics-funnel">
      <div className="analytics-funnel-step">
        <div className="analytics-funnel-bar analytics-funnel-bar--registered" style={{ width: '100%' }}>
          <span>{registered.toLocaleString('en-IN')} Registered</span>
        </div>
      </div>
      <div className="analytics-funnel-step">
        <div
          className="analytics-funnel-bar analytics-funnel-bar--attended"
          style={{ width: registered > 0 ? `${rate}%` : '0%', minWidth: attended > 0 ? '80px' : '0' }}
        >
          {attended > 0 && <span>{attended.toLocaleString('en-IN')} Attended</span>}
        </div>
        {notAttended > 0 && (
          <span className="analytics-funnel-missed">{notAttended.toLocaleString('en-IN')} did not attend</span>
        )}
      </div>
      <p className="analytics-funnel-rate">
        Attendance rate: <strong>{rate}%</strong>
      </p>
    </div>
  )
}

// ── Day-by-day bar chart ──────────────────────────────────────────

function DayChart({ data }: { data: { date: string; count: number }[] }) {
  if (data.length === 0) {
    return <p className="analytics-chart-empty">No registration data available.</p>
  }

  const max = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="analytics-bar-chart" role="img" aria-label="Registrations per day">
      {data.map((d) => (
        <div key={d.date} className="analytics-bar-chart-col" title={`${d.date}: ${d.count}`}>
          <div
            className="analytics-bar-chart-bar"
            style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
          />
          <span className="analytics-bar-chart-label">
            {new Date(d.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Country table ─────────────────────────────────────────────────

function CountryTable({ data }: { data: { country: string; count: number }[] }) {
  if (data.length === 0) {
    return <p className="analytics-chart-empty">No country data available.</p>
  }

  const total = data.reduce((s, r) => s + r.count, 0)

  return (
    <table className="analytics-table analytics-table--compact">
      <thead>
        <tr>
          <th>Country</th>
          <th className="analytics-table-num">Registrations</th>
          <th className="analytics-table-num">Share</th>
        </tr>
      </thead>
      <tbody>
        {data.map((r) => (
          <tr key={r.country}>
            <td>{r.country}</td>
            <td className="analytics-table-num">{r.count.toLocaleString('en-IN')}</td>
            <td className="analytics-table-num">
              {total > 0 ? `${Math.round((r.count / total) * 100)}%` : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── Status badge ──────────────────────────────────────────────────

function statusVariant(status: string) {
  if (status === 'LIVE') return 'error' as const
  if (status === 'PUBLISHED') return 'primary' as const
  if (status === 'ENDED') return 'secondary' as const
  return 'secondary' as const
}

// ── Main page ─────────────────────────────────────────────────────

export default function AdminWebinarAnalyticsPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, error } = useWebinarAnalytics(id)

  if (isLoading) return <LoadingState label="Loading webinar analytics…" />
  if (error || !data) return <ErrorState error={error as Error} />

  const d = data

  const handleExport = () => {
    window.open(`/api/v1/admin/webinars/${id}/export`, '_blank')
  }

  return (
    <div className="admin-analytics-page">
      <div className="admin-page-header">
        <div>
          <div className="analytics-breadcrumb">
            <Link to="/admin/analytics" className="analytics-breadcrumb-link">Analytics</Link>
            <span> / </span>
            <span>{d.title}</span>
          </div>
          <h1 className="admin-page-title">{d.title}</h1>
          <Badge variant={statusVariant(d.status)}>{d.status}</Badge>
        </div>
        <div className="admin-page-header-actions">
          <Button variant="secondary" size="sm" onClick={handleExport}>
            ⬇ Export CSV
          </Button>
          <Link to={`/admin/webinars/${id}`}>
            <Button variant="secondary" size="sm">View Webinar</Button>
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="analytics-kpi-grid analytics-kpi-grid--3">
        <div className="analytics-kpi-card">
          <p className="analytics-kpi-label">Registrations</p>
          <p className="analytics-kpi-value">{d.totalRegistrations.toLocaleString('en-IN')}</p>
        </div>
        <div className="analytics-kpi-card">
          <p className="analytics-kpi-label">Attended</p>
          <p className="analytics-kpi-value">{d.attendedCount.toLocaleString('en-IN')}</p>
        </div>
        <div className="analytics-kpi-card analytics-kpi-card--highlight">
          <p className="analytics-kpi-label">Attendance Rate</p>
          <p className="analytics-kpi-value">{d.attendanceRate}%</p>
        </div>
      </div>

      {/* Attendance funnel */}
      <div className="analytics-section">
        <h2 className="analytics-section-title">Registration → Attendance Funnel</h2>
        <AttendanceFunnel registered={d.totalRegistrations} attended={d.attendedCount} />
      </div>

      {/* Day-by-day chart */}
      <div className="analytics-section">
        <h2 className="analytics-section-title">Registrations Over Time</h2>
        <DayChart data={d.registrationsByDay} />
      </div>

      {/* Country breakdown */}
      <div className="analytics-section">
        <h2 className="analytics-section-title">Top Countries</h2>
        <CountryTable data={d.countryCounts} />
      </div>
    </div>
  )
}
