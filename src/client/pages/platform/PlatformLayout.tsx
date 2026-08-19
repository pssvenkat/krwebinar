/**
 * Platform admin layout — Phase 12
 * Minimal sidebar for the platform owner section
 */

import { NavLink, Outlet } from 'react-router-dom'

function PlatformNavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `platform-nav-link${isActive ? ' platform-nav-link--active' : ''}`
      }
    >
      {children}
    </NavLink>
  )
}

export default function PlatformLayout() {
  return (
    <div className="platform-shell">
      <aside className="platform-sidebar">
        <div className="platform-sidebar-brand">
          <span className="platform-sidebar-logo">⚙️</span>
          <span className="platform-sidebar-title">Platform Admin</span>
        </div>
        <nav className="platform-nav">
          <PlatformNavLink to="/platform/tenants">🏢 Tenants</PlatformNavLink>
        </nav>
        <div className="platform-sidebar-footer">
          <span className="platform-sidebar-role">PLATFORM OWNER</span>
        </div>
      </aside>
      <main className="platform-main">
        <Outlet />
      </main>
    </div>
  )
}
