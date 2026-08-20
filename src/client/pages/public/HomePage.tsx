import { useQuery } from '@tanstack/react-query'
import { useBranding } from '../../hooks/useBranding'
import type { ApiResponse, HealthResponse } from '../../../shared/types'

/**
 * Platform Home Page
 *
 * Public landing page for the webinar platform.
 * In production, this might redirect to the vendor's page
 * or show a platform-level directory.
 */
export default function HomePage() {
  const { data: branding } = useBranding()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['health'],
    queryFn: async (): Promise<HealthResponse> => {
      const res = await fetch('/api/health')
      const json: ApiResponse<HealthResponse> = await res.json()
      if (!json.ok) throw new Error('Health check failed')
      return json.data
    },
  })

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-background)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-8)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Logo / Platform badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-10)',
        }}
      >
        {branding?.logoUrl ? (
          <img
            src={branding.logoUrl}
            alt={branding.platformName || 'Brand Logo'}
            style={{ maxHeight: 60, maxWidth: 220, objectFit: 'contain' }}
          />
        ) : (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '1.5rem',
            }}
          >
            🌱
          </div>
        )}
        {!branding?.logoUrl && (
          <div>
            <div
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                fontSize: 'var(--text-xl)',
                color: 'var(--color-primary)',
                lineHeight: 1,
              }}
            >
              {branding?.platformName || 'WebinarPlatform'}
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-muted)' }}>
              Live Learning & Engagement
            </div>
          </div>
        )}
      </div>

      {/* Hero text */}
      <h1
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          fontWeight: 900,
          color: 'var(--color-text)',
          textAlign: 'center',
          maxWidth: 700,
          marginBottom: 'var(--space-4)',
          lineHeight: 1.15,
        }}
      >
        Live Learning,{' '}
        <span style={{ color: 'var(--color-primary)' }}>Reimagined</span>
      </h1>

      <p
        style={{
          fontSize: 'var(--text-lg)',
          color: 'var(--color-muted)',
          textAlign: 'center',
          maxWidth: 560,
          marginBottom: 'var(--space-10)',
          lineHeight: 1.6,
        }}
      >
        A multi-tenant, white-label webinar platform built on Cloudflare&apos;s edge.
        Zero infrastructure cost. YouTube-powered. International from day one.
      </p>

      {/* Phase status cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--space-4)',
          width: '100%',
          maxWidth: 800,
          marginBottom: 'var(--space-8)',
        }}
      >
        <StatusCard label="Phase" value="1 — Foundation" accent />
        <StatusCard
          label="API Status"
          value={isLoading ? 'Checking…' : isError ? 'Offline' : 'Online ✓'}
          success={!isLoading && !isError}
          error={isError}
        />
        <StatusCard
          label="Version"
          value={data?.version ?? '—'}
        />
        <StatusCard
          label="Environment"
          value={data?.environment ?? '—'}
        />
      </div>

      {/* Navigation hints */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-3)',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <a
          href="/admin"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-3) var(--space-6)',
            background: 'var(--color-primary)',
            color: 'white',
            borderRadius: 'var(--radius-full)',
            fontWeight: 600,
            fontSize: 'var(--text-sm)',
            textDecoration: 'none',
            transition: 'background var(--transition-fast)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-primary-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--color-primary)'
          }}
        >
          Admin Dashboard →
        </a>
        <a
          href="/api/health"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-3) var(--space-6)',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1.5px solid var(--color-border)',
            borderRadius: 'var(--radius-full)',
            fontWeight: 600,
            fontSize: 'var(--text-sm)',
            textDecoration: 'none',
          }}
        >
          GET /api/health
        </a>
      </div>
    </div>
  )
}

// ─── Internal component ───────────────────────────────────────────

interface StatusCardProps {
  label: string
  value: string
  accent?: boolean
  success?: boolean
  error?: boolean
}

function StatusCard({ label, value, accent, success, error }: StatusCardProps) {
  const bg = accent
    ? 'var(--color-primary-light)'
    : success
      ? 'var(--color-success-bg)'
      : error
        ? 'var(--color-error-bg)'
        : 'var(--color-surface)'

  const valueColor = accent
    ? 'var(--color-primary)'
    : success
      ? 'var(--color-success)'
      : error
        ? 'var(--color-error)'
        : 'var(--color-text)'

  return (
    <div
      style={{
        background: bg,
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
          fontSize: 'var(--text-lg)',
          color: valueColor,
        }}
      >
        {value}
      </div>
    </div>
  )
}
