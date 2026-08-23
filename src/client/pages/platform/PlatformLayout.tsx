/**
 * Platform admin layout
 * Full navigation for the Platform Superadmin with Sign Out button & mobile support
 */

import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
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
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const handleSignOut = async () => {
    await logout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="platform-shell">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="admin-mobile-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar / Drawer */}
      <aside className={`platform-sidebar ${mobileOpen ? 'platform-sidebar--open' : ''}`}>
        <div className="platform-sidebar-brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className="platform-sidebar-logo">🛡️</span>
            <div>
              <div className="platform-sidebar-title">Platform Superadmin</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>$0/mo Cloudflare Core</div>
            </div>
          </div>
          <button
            type="button"
            className="admin-mobile-close-btn"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            ✕
          </button>
        </div>

        <nav className="platform-nav">
          <PlatformNavLink to="/platform">📊 Master Dashboard</PlatformNavLink>
          <PlatformNavLink to="/platform/tenants">🏢 Tenants &amp; Governance</PlatformNavLink>
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

      {/* Main Area */}
      <div className="platform-main-container">
        <header className="platform-mobile-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              className="admin-hamburger-btn"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text)' }}>
              Platform Superadmin
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            Sign Out
          </Button>
        </header>

        <main className="platform-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
