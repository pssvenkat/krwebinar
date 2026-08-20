import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  usePlatformTenant,
  useUpdateTenantStatus,
  usePlatformTenantDomains,
  useCreatePlatformTenantDomain,
  useVerifyPlatformTenantDomain,
  useDeletePlatformTenantDomain,
} from '../../hooks/usePlatformTenants'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingState, ErrorState } from '../../components/ui/States'
import type { BadgeVariant } from '../../components/ui/Badge'

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  trial: 'default',
  active: 'success',
  suspended: 'error',
  pending: 'warning',
  failed: 'error',
}

export default function PlatformTenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading, error } = usePlatformTenant(id)
  const updateStatus = useUpdateTenantStatus()

  // Domains & Subdomains hooks
  const { data: domainData, isLoading: domainsLoading, refetch: refetchDomains } = usePlatformTenantDomains(id)
  const createDomain = useCreatePlatformTenantDomain(id)
  const verifyDomain = useVerifyPlatformTenantDomain(id)
  const deleteDomain = useDeletePlatformTenantDomain(id)

  const [newDomain, setNewDomain] = useState('')
  const [domainError, setDomainError] = useState<string | null>(null)
  const [domainSuccess, setDomainSuccess] = useState<string | null>(null)

  if (isLoading) return <LoadingState label="Loading tenant…" />
  if (error || !data) return <ErrorState error={error as Error} />

  const { tenant, stats } = data
  const domains = domainData?.domains || []
  const instructions = domainData?.instructions || {
    cnameTarget: 'custom.krwebinar.com',
    txtPrefix: '_krwebinar-challenge',
  }

  const setStatus = (status: string) => updateStatus.mutate({ id: tenant.id, status })

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault()
    setDomainError(null)
    setDomainSuccess(null)

    const trimmed = newDomain.trim().toLowerCase()
    if (!trimmed) {
      setDomainError('Please enter a domain or subdomain')
      return
    }

    try {
      await createDomain.mutateAsync(trimmed)
      setNewDomain('')
      setDomainSuccess(`Domain/Subdomain "${trimmed}" successfully assigned to ${tenant.name}!`)
      refetchDomains()
    } catch (err: any) {
      setDomainError(err.message || 'Failed to add domain')
    }
  }

  const handleVerifyDomain = async (domainId: string) => {
    setDomainError(null)
    setDomainSuccess(null)
    try {
      await verifyDomain.mutateAsync(domainId)
      setDomainSuccess('DNS and SSL verification completed successfully!')
      refetchDomains()
    } catch (err: any) {
      setDomainError(err.message || 'Verification failed')
    }
  }

  const handleDeleteDomain = async (domainId: string, domainName: string) => {
    if (!confirm(`Are you sure you want to remove domain "${domainName}" from this tenant?`)) {
      return
    }
    setDomainError(null)
    setDomainSuccess(null)
    try {
      await deleteDomain.mutateAsync(domainId)
      setDomainSuccess(`Domain "${domainName}" removed.`)
      refetchDomains()
    } catch (err: any) {
      setDomainError(err.message || 'Failed to delete domain')
    }
  }

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
        <div className="leads-kpi">
          <p className="leads-kpi-label">Trial / Plan Remaining</p>
          <p className="leads-kpi-value" style={{ fontSize: '1.25rem' }}>
            {tenant.status === 'trial'
              ? `${Math.max(0, Math.ceil((new Date(tenant.created_at).getTime() + 14 * 86400 * 1000 - Date.now()) / (86400 * 1000)))} Days`
              : tenant.status === 'active'
                ? 'Active'
                : 'Suspended'}
          </p>
        </div>
      </div>

      {/* ── Subdomains & Custom Domains Management (Platform Superadmin) ── */}
      <div className="branding-section" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h3 className="branding-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🌐 Subdomains & Custom Domains
            </h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--color-muted)' }}>
              Configure custom domains and subdomains for this tenant. Traffic to these hostnames maps directly to this tenant.
            </p>
          </div>
        </div>

        {domainSuccess && (
          <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', color: '#86efac', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
            ✅ {domainSuccess}
          </div>
        )}

        {domainError && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
            ⚠️ {domainError}
          </div>
        )}

        {/* Add Domain / Subdomain Form */}
        <form onSubmit={handleAddDomain} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '260px' }}>
            <input
              type="text"
              id="input-tenant-domain"
              className="form-input"
              placeholder="e.g. webinar.kravefoods.in or krave.krwebinar.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              style={{ width: '100%', padding: '0.65rem 0.85rem' }}
            />
          </div>
          <Button
            id="btn-add-tenant-domain"
            type="submit"
            variant="primary"
            loading={createDomain.isPending}
            disabled={!newDomain.trim()}
          >
            + Assign Domain / Subdomain
          </Button>
        </form>

        {/* Mapped Domains Table */}
        {domainsLoading ? (
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)' }}>Loading mapped domains…</p>
        ) : domains.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--color-surface-elevated, #1e293b)', borderRadius: '8px', border: '1px dashed var(--color-border)' }}>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-muted)' }}>
              No custom domains or subdomains assigned to this tenant yet.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {domains.map((d) => (
              <div
                key={d.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  background: 'var(--color-surface-elevated, #1e293b)',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <a
                      href={`https://${d.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontWeight: 600, fontSize: '1rem', color: '#38bdf8', textDecoration: 'none' }}
                    >
                      {d.domain} ↗
                    </a>
                    <Badge variant={STATUS_VARIANT[d.status] || 'default'}>Domain: {d.status}</Badge>
                    <Badge variant={d.ssl_status === 'active' ? 'success' : 'warning'}>SSL: {d.ssl_status}</Badge>
                  </div>
                  <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                    CNAME: <code>{d.cname_target}</code> · Added {new Date(d.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <Button
                    id={`btn-verify-${d.id}`}
                    variant="outline"
                    size="sm"
                    loading={verifyDomain.isPending}
                    onClick={() => handleVerifyDomain(d.id)}
                  >
                    🔄 Verify Status
                  </Button>
                  <Button
                    id={`btn-delete-${d.id}`}
                    variant="danger"
                    size="sm"
                    loading={deleteDomain.isPending}
                    onClick={() => handleDeleteDomain(d.id, d.domain)}
                  >
                    🗑️ Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* DNS Setup Guide Card */}
        <div style={{ marginTop: '1.25rem', padding: '1rem', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155', fontSize: '0.8rem' }}>
          <p style={{ margin: '0 0 0.5rem', fontWeight: 600, color: '#e2e8f0' }}>📋 DNS Setup Instructions for Custom Domains</p>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#94a3b8', lineHeight: 1.6 }}>
            <li><strong>CNAME Record:</strong> Host/Name: Subdomain (e.g. <code>webinar</code>) → Target: <code>{instructions.cnameTarget}</code> (or <code>krwebinar.pssvenkat2.workers.dev</code>).</li>
            <li><strong>Cloudflare DNS:</strong> If the root domain is on Cloudflare, enable Proxy status (☁️ Proxied).</li>
          </ul>
        </div>
      </div>

      {/* Status controls */}
      <div className="branding-section" style={{ maxWidth: 480, marginTop: '1.5rem' }}>
        <h3 className="branding-section-title">Status control</h3>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-muted)' }}>
          Current status: <strong>{tenant.status}</strong>
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
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
      <div className="admin-detail-grid" style={{ marginTop: '1.5rem' }}>
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
