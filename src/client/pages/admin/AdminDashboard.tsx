import React from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ApiResponse, HealthResponse } from '../../../shared/types'

/**
 * Admin Dashboard
 *
 * Phase 1: Platform health check + placeholder cards for upcoming features.
 * Phase 3+: Real tenant-specific metrics from the API.
 */
export default function AdminDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-health'],
    queryFn: async (): Promise<HealthResponse> => {
      const res = await fetch('/api/health')
      const json: ApiResponse<HealthResponse> = await res.json()
      if (!json.ok) throw new Error('Health check failed')
      return json.data
    },
  })

  return (
    <div>
      {/* Page heading */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--text-2xl)',
            fontWeight: 800,
            color: 'var(--color-text)',
            marginBottom: 'var(--space-2)',
          }}
        >
          Dashboard
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: 'var(--text-sm)' }}>
          Welcome to your webinar management console.
        </p>
      </div>

      {/* Platform status */}
      <section style={{ marginBottom: 'var(--space-8)' }}>
        <SectionLabel>Platform Status</SectionLabel>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          <MetricCard
            label="API Status"
            value={isLoading ? 'Checking…' : isError ? 'Offline ✗' : 'Online ✓'}
            color={isLoading ? undefined : isError ? 'var(--color-error)' : 'var(--color-success)'}
          />
          <MetricCard label="Version" value={data?.version ?? '—'} />
          <MetricCard label="Environment" value={data?.environment ?? '—'} />
          <MetricCard
            label="Uptime"
            value="Live"
            color="var(--color-success)"
          />
        </div>
      </section>

      {/* Phase roadmap */}
      <section>
        <SectionLabel>Build Roadmap</SectionLabel>
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1.5px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          {PHASE_ITEMS.map((item, i) => (
            <div
              key={item.phase}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-4)',
                padding: 'var(--space-4) var(--space-5)',
                borderBottom:
                  i < PHASE_ITEMS.length - 1 ? '1px solid var(--color-border)' : 'none',
                background: item.status === 'complete' ? 'var(--color-success-bg)' : undefined,
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 'var(--radius-full)',
                  background:
                    item.status === 'complete'
                      ? 'var(--color-success)'
                      : item.status === 'active'
                        ? 'var(--color-primary)'
                        : 'var(--color-border)',
                  color: item.status === 'pending' ? 'var(--color-muted)' : 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {item.status === 'complete' ? '✓' : item.phase}
              </span>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: item.status === 'active' ? 600 : 400,
                    color:
                      item.status === 'pending' ? 'var(--color-muted)' : 'var(--color-text)',
                  }}
                >
                  {item.title}
                </div>
              </div>
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  padding: '2px 10px',
                  borderRadius: 'var(--radius-full)',
                  background:
                    item.status === 'complete'
                      ? 'var(--color-success-bg)'
                      : item.status === 'active'
                        ? 'var(--color-primary-light)'
                        : 'var(--color-surface-muted)',
                  color:
                    item.status === 'complete'
                      ? 'var(--color-success)'
                      : item.status === 'active'
                        ? 'var(--color-primary)'
                        : 'var(--color-muted)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {item.status === 'complete'
                  ? 'Done'
                  : item.status === 'active'
                    ? 'In Progress'
                    : 'Pending'}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 'var(--text-xs)',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--color-muted)',
        marginBottom: 'var(--space-3)',
      }}
    >
      {children}
    </div>
  )
}

function MetricCard({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-5)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div
        style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--color-muted)',
          marginBottom: 'var(--space-2)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 700,
          fontSize: 'var(--text-xl)',
          color: color ?? 'var(--color-text)',
        }}
      >
        {value}
      </div>
    </div>
  )
}

const PHASE_ITEMS = [
  { phase: 0, title: 'Repository Audit & Architecture', status: 'complete' },
  { phase: 1, title: 'Project Foundation', status: 'active' },
  { phase: 2, title: 'Design System', status: 'pending' },
  { phase: 3, title: 'Multi-Tenant Foundation', status: 'pending' },
  { phase: 4, title: 'Vendor Business Profile', status: 'pending' },
  { phase: 5, title: 'Vendor Branding', status: 'pending' },
  { phase: 6, title: 'Webinar Management', status: 'pending' },
  { phase: 7, title: 'International Registration', status: 'pending' },
  { phase: 8, title: 'Privacy / Consent Foundation', status: 'pending' },
  { phase: 9, title: 'Secure Webinar Access', status: 'pending' },
  { phase: 10, title: 'Public Webinar Experience', status: 'pending' },
] as const
