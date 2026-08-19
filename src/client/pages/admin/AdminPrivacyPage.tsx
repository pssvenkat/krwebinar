/**
 * AdminPrivacyPage — Privacy & DPDP Compliance Controls
 */

import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { Checkbox } from '../../components/ui/Checkbox'

export default function AdminPrivacyPage() {
  const [saved, setSaved] = useState(false)
  const [retentionDays, setRetentionDays] = useState(90)
  const [maskPii, setMaskPii] = useState(true)
  const [consentEnforced, setConsentEnforced] = useState(true)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Privacy & DPDP Compliance</h1>
          <p className="admin-page-subtitle">
            Configure data retention policies, consent governance, and participant privacy protections.
          </p>
        </div>
      </div>

      {saved && <Alert variant="success">Privacy and compliance settings updated successfully!</Alert>}

      <form onSubmit={handleSave} className="branding-section" style={{ maxWidth: 640 }}>
        <h3 className="branding-section-title">Digital Personal Data Protection (DPDP) Governance</h3>

        <div className="platform-field">
          <label className="platform-label">Attendee Data Retention Period (Days)</label>
          <input
            type="number"
            min={30}
            max={365}
            className="platform-input"
            value={retentionDays}
            onChange={(e) => setRetentionDays(Number(e.target.value))}
          />
          <span className="platform-label-hint">
            Inactive participant registration data older than this limit is automatically scrubbed.
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
          <Checkbox
            id="enforce-consent"
            label="Enforce explicit opt-in consent for marketing and follow-ups on all registration pages."
            checked={consentEnforced}
            onChange={(e) => setConsentEnforced(e.target.checked)}
          />
          <Checkbox
            id="mask-pii"
            label="Mask phone numbers and email identifiers in audit trails and staff moderator views."
            checked={maskPii}
            onChange={(e) => setMaskPii(e.target.checked)}
          />
        </div>

        <div className="platform-field" style={{ marginTop: '0.5rem' }}>
          <label className="platform-label">Designated Data Protection Officer (DPO) Contact</label>
          <input
            type="email"
            className="platform-input"
            defaultValue="privacy@kravemicrogreens.in"
            placeholder="privacy@yourcompany.com"
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <Button id="save-privacy" type="submit" variant="primary" size="md">
            Save Privacy Settings
          </Button>
        </div>
      </form>
    </div>
  )
}
