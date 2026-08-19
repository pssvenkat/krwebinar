/**
 * Platform admin layout
 * Full navigation for the Platform Superadmin with Sign Out button
 */

import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthContext } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'

function PlatformNavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === '/platform'}
      className={({ isActive }) =>
        `platform-nav-link${isActive ? ' platform-nav-link--active' : ''}`
      }
    >
      {children}
    </NavLink>
  )
}

export default function PlatformLayout() {
  const { logout, user } = useAuthContext()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await logout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="platform-shell">
      <aside className="platform-sidebar">
        <div className="platform-sidebar-brand">
          <span className="platform-sidebar-logo">🛡️</span>
          <div>
            <div className="platform-sidebar-title">Platform Superadmin</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>$0/mo Cloudflare Core</div>
          </div>
        </div>

        <nav className="platform-nav">
          <PlatformNavLink to="/platform">📊 Master Dashboard</PlatformNavLink>
          <PlatformNavLink to="/platform/tenants">🏢 Tenants & Governance</PlatformNavLink>
          <PlatformNavLink to="/platform/users">👥 User Directory</PlatformNavLink>
        </nav>

        <div className="platform-sidebar-footer">
          <div style={{ marginBottom: '0.5rem' }}>
            <span className="platform-sidebar-role">PLATFORM OWNER</span>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
              {user?.email ?? 'owner@krwebinar.com'}
            </div>
          </div>
          <Button
            id="platform-logout-btn"
            variant="outline"
            size="sm"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={handleSignOut}
          >
            Sign Out
          </Button>
        </div>
      </aside>

      <main className="platform-main">
        <Outlet />
      </main>
    </div>
  )
}
