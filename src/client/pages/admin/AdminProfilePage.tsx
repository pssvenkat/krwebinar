/**
 * AdminProfilePage — Tenant Business Profile & Organization Information
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { LoadingState } from '../../components/ui/States'
import { getAccessToken } from '../../lib/api'

interface BusinessProfile {
  name: string
  slug: string
  supportEmail: string
  timezone: string
  locale: string
  plan: string
}

async function fetchProfile(): Promise<BusinessProfile> {
  const token = getAccessToken()
  const res = await fetch('/api/v1/tenant', {
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Slug': 'krave',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  const json = (await res.json()) as {
    ok: boolean
    data?: {
      tenant: { name: string; slug: string; planTier: string }
      settings: { support_email?: string; timezone?: string; locale?: string }
    }
  }
  return {
    name: json.data?.tenant?.name ?? 'Krave Microgreens',
    slug: json.data?.tenant?.slug ?? 'krave',
    supportEmail: json.data?.settings?.support_email ?? 'support@kravemicrogreens.in',
    timezone: json.data?.settings?.timezone ?? 'Asia/Kolkata',
    locale: json.data?.settings?.locale ?? 'en-IN',
    plan: json.data?.tenant?.planTier ?? 'starter',
  }
}

export default function AdminProfilePage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'profile'],
    queryFn: fetchProfile,
  })

  const [supportEmail, setSupportEmail] = useState('')
  const [timezone, setTimezone] = useState('')
  const [saved, setSaved] = useState(false)

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Simulate save
      await new Promise((r) => setTimeout(r, 400))
      return true
    },
    onSuccess: () => {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      qc.invalidateQueries({ queryKey: ['admin', 'profile'] })
    },
  })

  if (isLoading) return <LoadingState label="Loading profile…" />

  const profile = data ?? {
    name: 'Krave Microgreens',
    slug: 'krave',
    supportEmail: 'support@kravemicrogreens.in',
    timezone: 'Asia/Kolkata',
    locale: 'en-IN',
    plan: 'starter',
  }

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Business Profile</h1>
          <p className="admin-page-subtitle">
            Manage your organization details, contact information, and default time settings.
          </p>
        </div>
      </div>

      {saved && <Alert variant="success">Profile settings updated successfully!</Alert>}

      <div className="branding-section" style={{ maxWidth: 600 }}>
        <h3 className="branding-section-title">Organization Overview</h3>

        <div className="platform-field">
          <label className="platform-label">Organization Name</label>
          <input
            type="text"
            className="platform-input"
            value={profile.name}
            disabled
            style={{ background: 'var(--color-surface)' }}
          />
        </div>

        <div className="platform-field">
          <label className="platform-label">Platform Subdomain</label>
          <div className="platform-slug-row">
            <span className="platform-slug-prefix">app.krwebinar.com/</span>
            <input
              type="text"
              className="platform-input platform-slug-input"
              value={profile.slug}
              disabled
            />
          </div>
        </div>

        <div className="platform-field">
          <label className="platform-label">Subscription Tier</label>
          <input
            type="text"
            className="platform-input"
            value={profile.plan.toUpperCase()}
            disabled
            style={{ background: 'var(--color-surface)' }}
          />
        </div>

        <div className="platform-field">
          <label className="platform-label">Support & Reply-To Email</label>
          <input
            type="email"
            className="platform-input"
            placeholder="support@yourbrand.com"
            defaultValue={profile.supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
          />
        </div>

        <div className="platform-field">
          <label className="platform-label">Default Timezone</label>
          <select
            className="platform-input"
            defaultValue={profile.timezone}
            onChange={(e) => setTimezone(e.target.value)}
          >
            <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+5:30)</option>
            <option value="UTC">UTC (Coordinated Universal Time)</option>
            <option value="America/New_York">America/New_York (EST/EDT)</option>
            <option value="Europe/London">Europe/London (GMT/BST)</option>
            <option value="Asia/Dubai">Asia/Dubai (GST - UTC+4:00)</option>
            <option value="Asia/Singapore">Asia/Singapore (SGT - UTC+8:00)</option>
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <Button
            id="save-profile"
            variant="primary"
            size="md"
            loading={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            Save Profile
          </Button>
        </div>
      </div>
    </div>
  )
}
