/**
 * AdminDomainsPage — Phase 13 Custom Domains Management
 */

import { useState } from 'react'
import {
  useDomains,
  useAddDomain,
  useVerifyDomain,
  useDeleteDomain,
} from '../../hooks/useDomains'
import type { TenantDomain } from '../../hooks/useDomains'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { LoadingState, ErrorState } from '../../components/ui/States'
import type { BadgeVariant } from '../../components/ui/Badge'

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  active: 'success',
  pending: 'warning',
  failed: 'error',
  deactivated: 'default',
}

const SSL_VARIANT: Record<string, BadgeVariant> = {
  active: 'success',
  issuing: 'primary',
  pending: 'warning',
  failed: 'error',
}

function DomainCard({
  domain,
  onVerify,
  onDelete,
  isVerifying,
  isDeleting,
}: {
  domain: TenantDomain
  onVerify: (id: string) => void
  onDelete: (id: string) => void
  isVerifying: boolean
  isDeleting: boolean
}) {
  const [copied, setCopied] = useState<string | null>(null)

  const copyToClipboard = (text: string, key: string) => {
    void navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="branding-section domain-card">
      <div className="domain-card-header">
        <div>
          <div className="domain-card-title-row">
            <h3 className="branding-section-title">{domain.domain}</h3>
            <Badge variant={STATUS_VARIANT[domain.status] ?? 'default'} dot={domain.status === 'active'}>
              {domain.status}
            </Badge>
            <Badge variant={SSL_VARIANT[domain.ssl_status] ?? 'default'}>
              SSL: {domain.ssl_status}
            </Badge>
          </div>
          <p className="admin-page-subtitle" style={{ marginTop: '0.25rem' }}>
            Added on {new Date(domain.created_at).toLocaleDateString()}
          </p>
        </div>

        <div className="domain-card-actions">
          {domain.status !== 'active' && (
            <Button
              id={`verify-${domain.id}`}
              variant="primary"
              size="sm"
              loading={isVerifying}
              onClick={() => onVerify(domain.id)}
            >
              Verify DNS
            </Button>
          )}
          <Button
            id={`delete-${domain.id}`}
            variant="ghost"
            size="sm"
            loading={isDeleting}
            onClick={() => onDelete(domain.id)}
          >
            Remove
          </Button>
        </div>
      </div>

      {domain.status !== 'active' && (
        <div className="domain-dns-table-wrapper">
          <p className="domain-dns-instructions-title">Required DNS Records:</p>
          <table className="admin-table domain-dns-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Host / Name</th>
                <th>Value / Target</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>CNAME</strong></td>
                <td><code>{domain.domain}</code></td>
                <td><code>{domain.cname_target}</code></td>
                <td>
                  <button
                    type="button"
                    className="admin-copy-btn"
                    onClick={() => copyToClipboard(domain.cname_target, 'cname')}
                  >
                    {copied === 'cname' ? '✓ Copied' : 'Copy target'}
                  </button>
                </td>
              </tr>
              <tr>
                <td><strong>TXT</strong></td>
                <td><code>_krwebinar-challenge.{domain.domain}</code></td>
                <td><code>{domain.verification_token}</code></td>
                <td>
                  <button
                    type="button"
                    className="admin-copy-btn"
                    onClick={() => copyToClipboard(domain.verification_token, 'txt')}
                  >
                    {copied === 'txt' ? '✓ Copied' : 'Copy token'}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function AdminDomainsPage() {
  const { data, isLoading, error } = useDomains()
  const addDomain = useAddDomain()
  const verifyDomain = useVerifyDomain()
  const deleteDomain = useDeleteDomain()

  const [domainInput, setDomainInput] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const domains = data?.domains ?? []

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setSuccessMsg(null)

    const trimmed = domainInput.trim().toLowerCase()
    if (!trimmed) {
      setFormError('Please enter a domain name.')
      return
    }

    const domainRegex = /^(?!:\/\/)([a-zA-Z0-9-_]+\.)+[a-zA-Z]{2,}$/
    if (!domainRegex.test(trimmed)) {
      setFormError('Please enter a valid domain (e.g. webinar.mybrand.com).')
      return
    }

    try {
      await addDomain.mutateAsync(trimmed)
      setDomainInput('')
      setSuccessMsg(`Domain ${trimmed} mapped successfully. Add the DNS records below to activate.`)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add domain.')
    }
  }

  const handleVerify = async (id: string) => {
    setFormError(null)
    setSuccessMsg(null)
    try {
      const res = await verifyDomain.mutateAsync(id)
      if (res.verified) {
        setSuccessMsg(`Domain ${res.domain.domain} successfully verified and SSL is active!`)
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Verification failed.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this custom domain?')) return
    setFormError(null)
    setSuccessMsg(null)
    try {
      await deleteDomain.mutateAsync(id)
      setSuccessMsg('Custom domain mapping removed.')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to remove domain.')
    }
  }

  if (isLoading) return <LoadingState label="Loading custom domains…" />
  if (error) return <ErrorState error={error as Error} />

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Custom Domains</h1>
          <p className="admin-page-subtitle">
            Host your webinars on your own branded domain with automated SSL certificates.
          </p>
        </div>
      </div>

      {formError && <Alert variant="error" onClose={() => setFormError(null)}>{formError}</Alert>}
      {successMsg && <Alert variant="success" onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      {/* Add Domain Form */}
      <div className="branding-section" style={{ maxWidth: 640 }}>
        <h3 className="branding-section-title">Add Custom Domain</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
          Enter a subdomain (e.g. <code>live.yourbrand.com</code> or <code>webinar.company.in</code>).
        </p>

        <form onSubmit={handleAdd} className="domain-add-form" noValidate>
          <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
            <input
              id="domain-input"
              type="text"
              placeholder="e.g. webinar.kravemicrogreens.in"
              className="platform-input"
              style={{ flex: 1 }}
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              disabled={addDomain.isPending}
            />
            <Button
              id="add-domain-btn"
              type="submit"
              variant="primary"
              size="md"
              loading={addDomain.isPending}
            >
              Add Domain
            </Button>
          </div>
        </form>
      </div>

      {/* Domain List */}
      <div className="domain-list" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {domains.length === 0 ? (
          <div className="leads-empty">
            <p>No custom domains connected yet.</p>
            <p className="leads-empty-hint">Add your domain above to brand your webinar URLs.</p>
          </div>
        ) : (
          domains.map((dom) => (
            <DomainCard
              key={dom.id}
              domain={dom}
              onVerify={handleVerify}
              onDelete={handleDelete}
              isVerifying={verifyDomain.isPending}
              isDeleting={deleteDomain.isPending}
            />
          ))
        )}
      </div>
    </div>
  )
}
