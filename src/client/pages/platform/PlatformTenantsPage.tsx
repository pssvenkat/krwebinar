/**
 * Platform tenants list page — Phase 12
 */

import { useNavigate } from 'react-router-dom'
import { usePlatformTenants, useUpdateTenantStatus } from '../../hooks/usePlatformTenants'
import type { PlatformTenant } from '../../hooks/usePlatformTenants'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingState, ErrorState } from '../../components/ui/States'
import type { BadgeVariant } from '../../components/ui/Badge'

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  trial: 'default',
  active: 'success',
  suspended: 'error',
}

const PLAN_VARIANT: Record<string, BadgeVariant> = {
  free: 'default',
  starter: 'primary',
  pro: 'secondary',
  enterprise: 'warning',
}

function TenantRow({ tenant }: { tenant: PlatformTenant }) {
  const updateStatus = useUpdateTenantStatus()
  const navigate = useNavigate()

  const toggle = () => {
    const next = tenant.status === 'active' ? 'suspended'
      : tenant.status === 'suspended' ? 'trial'
      : 'active'
    updateStatus.mutate({ id: tenant.id, status: next })
  }

  return (
    <tr className="admin-table-row">
      <td>
        <button
          type="button"
          className="platform-tenant-name"
          onClick={() => navigate(`/platform/tenants/${tenant.id}`)}
        >
          {tenant.name}
        </button>
        <span className="platform-tenant-slug">/{tenant.slug}</span>
      </td>
      <td><Badge variant={PLAN_VARIANT[tenant.plan] ?? 'default'}>{tenant.plan}</Badge></td>
      <td><Badge variant={STATUS_VARIANT[tenant.status] ?? 'default'}>{tenant.status}</Badge></td>
      <td className="admin-table-date">{new Date(tenant.created_at).toLocaleDateString()}</td>
      <td>
        <Button
          id={`status-${tenant.id}`}
          variant="ghost"
          size="sm"
          loading={updateStatus.isPending}
          onClick={toggle}
        >
          {tenant.status === 'active' ? 'Suspend' : tenant.status === 'suspended' ? 'Reactivate' : 'Activate'}
        </Button>
      </td>
    </tr>
  )
}

export default function PlatformTenantsPage() {
  const { data, isLoading, error } = usePlatformTenants()
  const navigate = useNavigate()
  const tenants = data?.tenants ?? []

  if (isLoading) return <LoadingState label="Loading tenants…" />
  if (error) return <ErrorState error={error as Error} />

  return (
    <div className="platform-page">
      <div className="admin-page-header">
        <div style={{ flex: 1 }}>
          <h1 className="admin-page-title">Tenants</h1>
          <p className="admin-page-subtitle">{tenants.length} tenant{tenants.length !== 1 ? 's' : ''} on the platform</p>
        </div>
        <Button id="new-tenant" variant="primary" size="md" onClick={() => navigate('/platform/tenants/new')}>
          + New Tenant
        </Button>
      </div>

      {tenants.length === 0 ? (
        <div className="leads-empty">
          <p>No tenants yet.</p>
          <p className="leads-empty-hint">Create the first tenant to get started.</p>
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name / Slug</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => <TenantRow key={t.id} tenant={t} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
