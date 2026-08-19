/**
 * PlatformTenantDetailPage — Phase 12
 * Single tenant detail: stats + status controls
 */

import { useParams, useNavigate } from 'react-router-dom'
import { usePlatformTenant, useUpdateTenantStatus } from '../../hooks/usePlatformTenants'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingState, ErrorState } from '../../components/ui/States'
import type { BadgeVariant } from '../../components/ui/Badge'

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  trial: 'default',
  active: 'success',
  suspended: 'error',
}

export default function PlatformTenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading, error } = usePlatformTenant(id)
  const updateStatus = useUpdateTenantStatus()

  if (isLoading) return <LoadingState label="Loading tenant…" />
  if (error || !data) return <ErrorState error={error as Error} />

  const { tenant, stats } = data

  const setStatus = (status: string) => updateStatus.mutate({ id: tenant.id, status })

  return (
    <div className="platform-page">
      <button type="button" className="admin-back-link" onClick={() => navigate('/platform/tenants')}>
        ← Tenants
      </button>

      <div className="admin-page-header">
        <div style={{ flex: 1 }}>
          <h1 className="admin-page-title">{tenant.name}</h1>
          <p className="admin-page-subtitle">/{tenant.slug} · {tenant.plan} plan</p>
        </div>
        <Badge variant={STATUS_VARIANT[tenant.status] ?? 'default'}>{tenant.status}</Badge>
      </div>

      {/* Stats */}
      <div className="leads-summary">
        <div className="leads-kpi">
          <p className="leads-kpi-label">Webinars</p>
          <p className="leads-kpi-value">{stats.webinarCount}</p>
        </div>
        <div className="leads-kpi">
          <p className="leads-kpi-label">Registrations</p>
          <p className="leads-kpi-value">{stats.registrationCount}</p>
        </div>
        <div className="leads-kpi">
          <p className="leads-kpi-label">Leads</p>
          <p className="leads-kpi-value">{stats.leadCount}</p>
        </div>
      </div>

      {/* Status controls */}
      <div className="branding-section" style={{ maxWidth: 480 }}>
        <h3 className="branding-section-title">Status control</h3>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-muted)' }}>
          Current status: <strong>{tenant.status}</strong>
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {tenant.status !== 'trial' && (
            <Button
              id="set-trial"
              variant="ghost"
              size="sm"
              loading={updateStatus.isPending}
              onClick={() => setStatus('trial')}
            >
              Set Trial
            </Button>
          )}
          {tenant.status !== 'active' && (
            <Button
              id="set-active"
              variant="primary"
              size="sm"
              loading={updateStatus.isPending}
              onClick={() => setStatus('active')}
            >
              Activate
            </Button>
          )}
          {tenant.status !== 'suspended' && (
            <Button
              id="set-suspended"
              variant="secondary"
              size="sm"
              loading={updateStatus.isPending}
              onClick={() => setStatus('suspended')}
            >
              Suspend
            </Button>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="admin-detail-grid">
        <div className="admin-detail-card">
          <h3 className="admin-detail-card-title">Tenant ID</h3>
          <code className="admin-detail-url">{tenant.id}</code>
        </div>
        <div className="admin-detail-card">
          <h3 className="admin-detail-card-title">Created</h3>
          <p style={{ margin: 0 }}>{new Date(tenant.created_at).toLocaleString()}</p>
        </div>
        <div className="admin-detail-card">
          <h3 className="admin-detail-card-title">Last Updated</h3>
          <p style={{ margin: 0 }}>{new Date(tenant.updated_at).toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}
