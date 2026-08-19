import { Link } from 'react-router-dom'
import { LoadingState, ErrorState } from '../../components/ui/States'
import { usePlatformAnalytics } from '../../hooks/useAnalytics'

// ── KPI Card ──────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="analytics-kpi-card">
      <p className="analytics-kpi-label">{label}</p>
      <p className="analytics-kpi-value">{value}</p>
      {sub && <p className="analytics-kpi-sub">{sub}</p>}
    </div>
  )
}

// ── Inline bar (CSS only) ─────────────────────────────────────────

function InlineBar({ pct }: { pct: number }) {
  return (
    <div className="analytics-inline-bar" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="analytics-inline-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────

export default function AdminAnalyticsPage() {
  const { data, isLoading, error } = usePlatformAnalytics()

  if (isLoading) return <LoadingState label="Loading analytics…" />
  if (error || !data) return <ErrorState error={error as Error} />

  const d = data

  return (
    <div className="admin-analytics-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Analytics</h1>
          <p className="admin-page-subtitle">Platform-wide performance overview</p>
        </div>
      </div>

      {/* KPI grid */}
      <div className="analytics-kpi-grid">
        <KpiCard label="Total Webinars" value={d.totalWebinars} />
        <KpiCard label="Published" value={d.publishedWebinars} />
        <KpiCard label="Live Now" value={d.liveWebinars} />
        <KpiCard label="Total Registrations" value={d.totalRegistrations.toLocaleString('en-IN')} />
        <KpiCard label="Total Attended" value={d.totalAttended.toLocaleString('en-IN')} />
        <KpiCard
          label="Attendance Rate"
          value={`${d.overallAttendanceRate}%`}
          sub="registered → attended"
        />
        <KpiCard
          label="This Month"
          value={d.thisMonthRegistrations.toLocaleString('en-IN')}
          sub="new registrations"
        />
      </div>

      {/* Top webinars table */}
      {d.topWebinars.length > 0 && (
        <div className="analytics-section">
          <h2 className="analytics-section-title">Top Webinars by Registrations</h2>
          <div className="analytics-table-wrapper">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Webinar</th>
                  <th className="analytics-table-num">Registrations</th>
                  <th className="analytics-table-num">Attended</th>
                  <th className="analytics-table-bar">Attendance Rate</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {d.topWebinars.map((w) => (
                  <tr key={w.id}>
                    <td className="analytics-table-title">{w.title}</td>
                    <td className="analytics-table-num">{w.registrations.toLocaleString('en-IN')}</td>
                    <td className="analytics-table-num">{w.attended.toLocaleString('en-IN')}</td>
                    <td className="analytics-table-bar">
                      <div className="analytics-bar-row">
                        <InlineBar pct={w.attendanceRate} />
                        <span className="analytics-bar-pct">{w.attendanceRate}%</span>
                      </div>
                    </td>
                    <td>
                      <Link
                        to={`/admin/webinars/${w.id}/analytics`}
                        className="analytics-table-link"
                      >
                        Details →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {d.topWebinars.length === 0 && (
        <div className="analytics-empty">
          <p>No webinar data yet. Create and publish a webinar to start seeing analytics.</p>
          <Link to="/admin/webinars/new" className="btn btn-primary btn-md">Create Webinar</Link>
        </div>
      )}
    </div>
  )
}
