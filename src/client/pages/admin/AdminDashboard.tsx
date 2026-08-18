import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useWebinars } from '../../hooks/useWebinars'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingState } from '../../components/ui/States'
import type { BadgeVariant } from '../../components/ui/Badge'

// ── Status helpers ────────────────────────────────────────────────

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  DRAFT: 'default',
  PUBLISHED: 'primary',
  LIVE: 'error',
  ENDED: 'secondary',
  ARCHIVED: 'outline',
}

function StatCard({ label, value, icon, accent = false }: {
  label: string; value: string | number; icon: string; accent?: boolean
}) {
  return (
    <div className={`admin-stat-card${accent ? ' admin-stat-card-accent' : ''}`}>
      <span className="admin-stat-icon">{icon}</span>
      <div>
        <p className="admin-stat-value">{value}</p>
        <p className="admin-stat-label">{label}</p>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // All webinars for stats
  const { data: allData, isLoading: loadingAll } = useWebinars({ limit: 200 })
  // Upcoming (PUBLISHED + LIVE)
  const { data: upcomingData } = useWebinars({ status: 'PUBLISHED', limit: 3 })
  const { data: liveData } = useWebinars({ status: 'LIVE', limit: 3 })

  const webinars = allData?.webinars ?? []
  const upcoming = [...(liveData?.webinars ?? []), ...(upcomingData?.webinars ?? [])].slice(0, 3)

  const stats = {
    total: allData?.pagination.total ?? 0,
    live: webinars.filter((w) => w.status === 'LIVE').length,
    published: webinars.filter((w) => w.status === 'PUBLISHED').length,
    ended: webinars.filter((w) => w.status === 'ENDED').length,
  }

  if (loadingAll) return <LoadingState label="Loading dashboard…" />

  return (
    <div className="admin-dashboard">
      {/* Welcome */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋</h1>
          <p className="admin-page-subtitle">Here&apos;s what&apos;s happening with your webinars</p>
        </div>
        <div className="admin-page-actions">
          <Button id="dash-new-webinar" variant="primary" size="md" onClick={() => navigate('/admin/webinars/new')}>
            + New Webinar
          </Button>
          <Button id="dash-logout" variant="ghost" size="md" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="admin-stats-grid">
        <StatCard label="Total Webinars" value={stats.total} icon="📹" />
        <StatCard label="Live Now" value={stats.live} icon="🔴" accent={stats.live > 0} />
        <StatCard label="Upcoming" value={stats.published} icon="📅" />
        <StatCard label="Completed" value={stats.ended} icon="✅" />
      </div>

      {/* Upcoming webinars */}
      <div className="admin-section">
        <div className="admin-section-header">
          <h2 className="admin-section-title">Upcoming &amp; Live</h2>
          <Button id="dash-view-all" variant="ghost" size="sm" onClick={() => navigate('/admin/webinars')}>
            View all →
          </Button>
        </div>

        {upcoming.length === 0 ? (
          <div className="admin-empty">
            <p>No upcoming webinars. <button type="button" className="admin-link" onClick={() => navigate('/admin/webinars/new')}>Create your first one →</button></p>
          </div>
        ) : (
          <div className="admin-webinar-cards">
            {upcoming.map((w) => (
              <div key={w.id} className="admin-webinar-card" onClick={() => navigate(`/admin/webinars/${w.id}`)}>
                <div className="admin-webinar-card-top">
                  <Badge variant={STATUS_VARIANT[w.status] ?? 'default'} dot={w.status === 'LIVE'}>
                    {w.status === 'LIVE' ? '🔴 LIVE' : w.status}
                  </Badge>
                  <span className="admin-webinar-card-date">{w.startDate} · {w.startTime}</span>
                </div>
                <h3 className="admin-webinar-card-title">{w.title}</h3>
                <p className="admin-webinar-card-meta">{w.maxParticipants} max · {w.registrationOpen ? 'Registration open' : 'Registration closed'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
