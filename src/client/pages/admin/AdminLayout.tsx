import React from 'react'
import { Outlet, NavLink } from 'react-router-dom'

/**
 * Admin Layout
 *
 * Shell for all /admin/* routes.
 * Phase 1: Minimal sidebar + header.
 * Phase 3+: Full RBAC-aware navigation.
 * Phase 5+: Vendor-branded header.
 */
export default function AdminLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-background)' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 240,
          background: 'var(--color-surface)',
          borderRight: '1.5px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: 'var(--space-5) var(--space-6)',
            borderBottom: '1.5px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
            }}
          >
            🌱
          </div>
          <div
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              fontSize: 'var(--text-base)',
              color: 'var(--color-primary)',
            }}
          >
            Admin
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: 'var(--space-4)' }}>
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
          <NavGroup label="Settings">
            <AdminNavLink to="/admin/profile">🏢 Business Profile</AdminNavLink>
            <AdminNavLink to="/admin/branding">🎨 Branding</AdminNavLink>
            <AdminNavLink to="/admin/domains">🌐 Custom Domains</AdminNavLink>
            <AdminNavLink to="/admin/privacy">🔒 Privacy</AdminNavLink>
          </NavGroup>
        </nav>

        {/* Footer */}
        <div
          style={{
            padding: 'var(--space-4) var(--space-6)',
            borderTop: '1.5px solid var(--color-border)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-muted)',
          }}
        >
          Phase 1 — Foundation
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        {/* Top bar */}
        <header
          style={{
            background: 'var(--color-surface)',
            borderBottom: '1.5px solid var(--color-border)',
            padding: 'var(--space-4) var(--space-6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 'var(--z-sticky)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              color: 'var(--color-text)',
            }}
          >
            Vendor Admin
          </span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-muted)',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-1)',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--color-success)',
                  display: 'inline-block',
                }}
              />
              Demo Vendor
            </span>
          </div>
        </header>

        {/* Page content */}
        <div style={{ padding: 'var(--space-8) var(--space-6)' }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}

// ─── Internal helpers ─────────────────────────────────────────────

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      <div
        style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--color-placeholder)',
          paddingLeft: 'var(--space-3)',
          marginBottom: 'var(--space-2)',
        }}
      >
        {label}
      </div>
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
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: 'var(--space-2) var(--space-3)',
        borderRadius: 'var(--radius-md)',
        fontSize: 'var(--text-sm)',
        fontWeight: isActive ? 600 : 400,
        color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
        background: isActive ? 'var(--color-primary-light)' : 'transparent',
        textDecoration: 'none',
        marginBottom: 2,
        transition: 'background var(--transition-fast), color var(--transition-fast)',
      })}
    >
      {children}
    </NavLink>
  )
}
