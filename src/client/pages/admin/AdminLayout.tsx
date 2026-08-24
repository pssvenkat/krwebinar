import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useBranding } from '../../hooks/useBranding'
import { useAuthContext } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'

/**
 * Admin Layout
 *
 * Shell for all /admin/* routes.
 * Fully responsive: desktop sidebar + mobile slide-out drawer with hamburger navigation.
 */
export default function AdminLayout() {
  const { data: branding } = useBranding()
  const { user, logout } = useAuthContext()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // Close mobile drawer on navigation
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  // Prevent background scrolling when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const handleSignOut = async () => {
    await logout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="admin-layout-shell">
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="admin-mobile-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer */}
      <aside className={`admin-sidebar ${mobileOpen ? 'admin-sidebar--open' : ''}`}>
        {/* Logo & Close Button */}
        <div className="admin-sidebar-brand">
          <div className="admin-sidebar-logo-wrap">
            {branding?.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={branding.platformName || 'Brand Logo'}
                className="admin-sidebar-logo-img"
              />
            ) : (
              <>
                <div className="admin-sidebar-logo-fallback">🌱</div>
                <div className="admin-sidebar-brand-name">
                  {branding?.platformName || 'Admin'}
                </div>
              </>
            )}
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

        {/* Navigation Groups */}
        <nav className="admin-sidebar-nav">
          <NavGroup label="Overview">
            <AdminNavLink to="/admin" end>
              📊 Dashboard
            </AdminNavLink>
          </NavGroup>
          <NavGroup label="Content">
            <AdminNavLink to="/admin/webinars">📹 Webinars</AdminNavLink>
            <AdminNavLink to="/admin/registrations">📋 Registrations</AdminNavLink>
            <AdminNavLink to="/admin/participants">👥 Participants</AdminNavLink>
          </NavGroup>
          <NavGroup label="Business">
            <AdminNavLink to="/admin/leads">🎯 Leads</AdminNavLink>
            <AdminNavLink to="/admin/analytics">📈 Analytics</AdminNavLink>
          </NavGroup>
          <NavGroup label="Organization">
            <AdminNavLink to="/admin/landing-page">📄 Landing Page CMS</AdminNavLink>
            <AdminNavLink to="/admin/trainer">🎙️ Trainer Profile</AdminNavLink>
            <AdminNavLink to="/admin/branding">🎨 Branding &amp; Theme</AdminNavLink>
            <AdminNavLink to="/admin/domains">🌐 Custom Domains</AdminNavLink>
            <AdminNavLink to="/admin/profile">🏢 Business Profile</AdminNavLink>
            <AdminNavLink to="/admin/users">👥 Team &amp; Users</AdminNavLink>
            <AdminNavLink to="/admin/privacy">🔒 Privacy &amp; DPDP</AdminNavLink>
          </NavGroup>
        </nav>

        {/* User Account Footer */}
        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-user-info">
            <div className="admin-sidebar-user-status">
              <span className="admin-status-dot" />
              <span className="admin-sidebar-user-role">{user?.role || 'VENDOR ADMIN'}</span>
            </div>
            <div className="admin-sidebar-user-email">{user?.email || 'admin@kravemicrogreens.in'}</div>
          </div>
          <Button
            variant="outline"
            size="sm"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={handleSignOut}
          >
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="admin-main-wrapper">
        {/* Top Header Bar */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
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
            <span className="admin-topbar-title">Vendor Admin</span>
          </div>

          <div className="admin-topbar-right">
            <div className="admin-topbar-user">
              <span className="admin-status-dot" />
              <span className="admin-topbar-user-email">{user?.email || 'admin'}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="admin-topbar-signout"
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="admin-content-area">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

// ─── Internal helpers ─────────────────────────────────────────────

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="admin-nav-group">
      <div className="admin-nav-group-label">{label}</div>
      {children}
    </div>
  )
}

function AdminNavLink({
  to,
  end,
  children,
}: {
  to: string
  end?: boolean
  children: React.ReactNode
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `admin-nav-link ${isActive ? 'admin-nav-link--active' : ''}`
      }
    >
      {children}
    </NavLink>
  )
}
