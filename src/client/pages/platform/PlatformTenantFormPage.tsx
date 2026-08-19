/**
 * PlatformTenantFormPage — Phase 12
 * Create a new tenant (name, slug, plan)
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreatePlatformTenant } from '../../hooks/usePlatformTenants'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'

const PLANS = [
  { value: 'free',       label: 'Free' },
  { value: 'starter',    label: 'Starter' },
  { value: 'pro',        label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
]

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function PlatformTenantFormPage() {
  const navigate = useNavigate()
  const create = useCreatePlatformTenant()

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [plan, setPlan] = useState('free')
  const [error, setError] = useState<string | null>(null)

  const handleNameChange = (val: string) => {
    setName(val)
    if (!slugEdited) setSlug(slugify(val))
  }

  const handleSlugChange = (val: string) => {
    setSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, ''))
    setSlugEdited(true)
  }

  const isValidSlug = /^[a-z0-9-]{2,50}$/.test(slug)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (name.trim().length < 2) { setError('Name must be at least 2 characters.'); return }
    if (!isValidSlug) { setError('Slug must be 2–50 lowercase alphanumeric characters or hyphens.'); return }
    try {
      await create.mutateAsync({ name: name.trim(), slug, plan })
      navigate('/platform/tenants')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tenant')
    }
  }

  return (
    <div className="platform-page">
      <button type="button" className="admin-back-link" onClick={() => navigate('/platform/tenants')}>
        ← Tenants
      </button>

      <div className="admin-page-header">
        <h1 className="admin-page-title">New Tenant</h1>
        <p className="admin-page-subtitle">Create a new vendor tenant. Status starts as <strong>trial</strong>.</p>
      </div>

      {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}

      <form onSubmit={handleSubmit} className="platform-form" noValidate>
        <div className="platform-form-section">

          <div className="platform-field">
            <label htmlFor="tenant-name" className="platform-label">Organisation name</label>
            <input
              id="tenant-name"
              type="text"
              className="platform-input"
              placeholder="e.g. Krave Microgreens"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              maxLength={100}
              required
            />
          </div>

          <div className="platform-field">
            <label htmlFor="tenant-slug" className="platform-label">
              Slug
              <span className="platform-label-hint"> — used in subdomain and URLs</span>
            </label>
            <div className="platform-slug-row">
              <span className="platform-slug-prefix">app.kfwebinar.com/</span>
              <input
                id="tenant-slug"
                type="text"
                className={`platform-input platform-slug-input${slug && !isValidSlug ? ' platform-input--error' : ''}`}
                placeholder="krave"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                maxLength={50}
                required
              />
            </div>
            {slug && !isValidSlug && (
              <p className="platform-field-error">Lowercase letters, numbers, and hyphens only (2–50 chars)</p>
            )}
          </div>

          <div className="platform-field">
            <label htmlFor="tenant-plan" className="platform-label">Plan</label>
            <select
              id="tenant-plan"
              className="platform-input"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
            >
              {PLANS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="platform-form-actions">
          <Button id="cancel" type="button" variant="ghost" size="md" onClick={() => navigate('/platform/tenants')}>
            Cancel
          </Button>
          <Button id="submit" type="submit" variant="primary" size="md" loading={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create Tenant'}
          </Button>
        </div>
      </form>
    </div>
  )
}
