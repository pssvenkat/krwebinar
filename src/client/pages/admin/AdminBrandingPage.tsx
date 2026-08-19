import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LoadingState, ErrorState } from '../../components/ui/States'
import { Button } from '../../components/ui/Button'
import { api } from '../../lib/api'
import type { BrandingData, SettingsData } from '../../lib/api'

// ── Color swatch ──────────────────────────────────────────────────

function ColorField({
  label, name, value, onChange,
}: {
  label: string; name: string; value: string; onChange: (name: string, val: string) => void
}) {
  return (
    <div className="branding-color-field">
      <label className="branding-color-label" htmlFor={name}>{label}</label>
      <div className="branding-color-row">
        <input
          id={name}
          type="color"
          className="branding-color-picker"
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          aria-label={label}
        />
        <input
          type="text"
          className="branding-color-text"
          value={value}
          maxLength={7}
          pattern="^#[0-9a-fA-F]{6}$"
          onChange={(e) => {
            if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
              onChange(name, e.target.value)
            }
          }}
          aria-label={`${label} hex value`}
        />
        <span className="branding-color-swatch" style={{ background: value }} aria-hidden="true" />
      </div>
    </div>
  )
}

// ── Live preview ──────────────────────────────────────────────────

function BrandingPreview({ draft, logoUrl }: { draft: BrandingData; logoUrl: string }) {
  return (
    <div className="branding-preview" style={{
      '--preview-primary': draft.primary_color,
      '--preview-bg': draft.background_color,
      '--preview-surface': draft.surface_color,
      '--preview-text': draft.text_color,
      '--preview-border': draft.border_color,
    } as React.CSSProperties}>
      <div className="branding-preview-header">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo preview" className="branding-preview-logo" />
        ) : (
          <div className="branding-preview-logo-placeholder">Your Logo</div>
        )}
      </div>
      <div className="branding-preview-body">
        <h3 className="branding-preview-title" style={{ color: draft.text_color }}>
          Join Our Next Webinar
        </h3>
        <p className="branding-preview-sub" style={{ color: draft.muted_color }}>
          Live webinar · 60 minutes
        </p>
        <button
          type="button"
          className="branding-preview-btn"
          style={{ background: draft.primary_color, color: '#fff' }}
        >
          Register Free
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────

export default function AdminBrandingPage() {
  const qc = useQueryClient()
  const [saved, setSaved] = useState(false)

  // Load current branding + settings
  const { data: branding, isLoading: bLoading, error: bError } = useQuery({
    queryKey: ['admin', 'branding'],
    queryFn: async () => {
      const res = await api.branding.get()
      if (!res.ok) throw new Error(res.error.message)
      return res.data
    },
    staleTime: 60_000,
  })

  const { data: settings, isLoading: sLoading, error: sError } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async () => {
      const res = await api.settings.get()
      if (!res.ok) throw new Error(res.error.message)
      return res.data
    },
    staleTime: 60_000,
  })

  // Local draft state — starts as a copy of server data
  const [draft, setDraft] = useState<BrandingData | null>(null)
  const [draftSettings, setDraftSettings] = useState<SettingsData | null>(null)

  // Sync draft from server data (once loaded)
  const effectiveBranding = draft ?? branding
  const effectiveSettings = draftSettings ?? settings

  const handleColorChange = useCallback((name: string, val: string) => {
    setDraft((prev) => ({ ...(prev ?? branding!), [name]: val }))
  }, [branding])

  const handleTextChange = useCallback((name: string, val: string) => {
    setDraft((prev) => ({ ...(prev ?? branding!), [name]: val }))
  }, [branding])

  const handleSettingsChange = useCallback((name: string, val: number) => {
    setDraftSettings((prev) => ({ ...(prev ?? settings!), [name]: val }))
  }, [settings])

  // Save mutations
  const brandingMutation = useMutation({
    mutationFn: async (data: Partial<BrandingData>) => {
      const res = await api.branding.update(data)
      if (!res.ok) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'branding'] })
      void qc.invalidateQueries({ queryKey: ['public', 'branding'] })
    },
  })

  const settingsMutation = useMutation({
    mutationFn: async (data: Partial<SettingsData>) => {
      const res = await api.settings.update(data)
      if (!res.ok) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'settings'] }),
  })

  const handleSave = async () => {
    const promises: Promise<unknown>[] = []
    if (draft) promises.push(brandingMutation.mutateAsync(draft))
    if (draftSettings) promises.push(settingsMutation.mutateAsync(draftSettings))
    await Promise.all(promises)
    setDraft(null)
    setDraftSettings(null)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleReset = () => {
    setDraft(null)
    setDraftSettings(null)
  }

  if (bLoading || sLoading) return <LoadingState label="Loading branding settings…" />
  if (bError || sError) return <ErrorState error={(bError ?? sError) as Error} />
  if (!effectiveBranding || !effectiveSettings) return null

  const isDirty = draft !== null || draftSettings !== null
  const isSaving = brandingMutation.isPending || settingsMutation.isPending

  return (
    <div className="admin-branding-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Branding & Settings</h1>
          <p className="admin-page-subtitle">Customise how your webinar platform looks to attendees</p>
        </div>
        <div className="admin-page-header-actions">
          {saved && <span className="branding-saved-badge">✓ Saved</span>}
          {isDirty && (
            <Button variant="ghost" size="sm" onClick={handleReset} disabled={isSaving}>
              Reset
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={() => void handleSave()}
            disabled={!isDirty || isSaving}
          >
            {isSaving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="branding-layout">
        {/* ── Left: settings panels ── */}
        <div className="branding-panels">

          {/* Visual identity */}
          <section className="branding-section">
            <h2 className="branding-section-title">Visual Identity</h2>

            <div className="branding-field-group">
              <label className="input-label">
                Logo URL
                <input
                  type="url"
                  className="input-field"
                  placeholder="https://example.com/logo.png"
                  value={effectiveBranding.logo_url ?? ''}
                  onChange={(e) => handleTextChange('logo_url', e.target.value || null as unknown as string)}
                />
              </label>
              {effectiveBranding.logo_url && (
                <div className="branding-logo-preview">
                  <img src={effectiveBranding.logo_url} alt="Logo preview" />
                </div>
              )}
            </div>

            <div className="branding-field-group">
              <label className="input-label">
                Favicon URL
                <input
                  type="url"
                  className="input-field"
                  placeholder="https://example.com/favicon.ico"
                  value={effectiveBranding.favicon_url ?? ''}
                  onChange={(e) => handleTextChange('favicon_url', e.target.value || null as unknown as string)}
                />
              </label>
            </div>
          </section>

          {/* Colour palette */}
          <section className="branding-section">
            <h2 className="branding-section-title">Colour Palette</h2>
            <div className="branding-color-grid">
              <ColorField label="Primary" name="primary_color" value={effectiveBranding.primary_color} onChange={handleColorChange} />
              <ColorField label="Secondary" name="secondary_color" value={effectiveBranding.secondary_color} onChange={handleColorChange} />
              <ColorField label="Accent" name="accent_color" value={effectiveBranding.accent_color} onChange={handleColorChange} />
              <ColorField label="Background" name="background_color" value={effectiveBranding.background_color} onChange={handleColorChange} />
              <ColorField label="Surface" name="surface_color" value={effectiveBranding.surface_color} onChange={handleColorChange} />
              <ColorField label="Text" name="text_color" value={effectiveBranding.text_color} onChange={handleColorChange} />
              <ColorField label="Muted" name="muted_color" value={effectiveBranding.muted_color} onChange={handleColorChange} />
              <ColorField label="Border" name="border_color" value={effectiveBranding.border_color} onChange={handleColorChange} />
              <ColorField label="Success" name="success_color" value={effectiveBranding.success_color} onChange={handleColorChange} />
              <ColorField label="Warning" name="warning_color" value={effectiveBranding.warning_color} onChange={handleColorChange} />
              <ColorField label="Error" name="error_color" value={effectiveBranding.error_color} onChange={handleColorChange} />
            </div>
          </section>

          {/* Typography */}
          <section className="branding-section">
            <h2 className="branding-section-title">Typography</h2>
            <div className="branding-field-group">
              <label className="input-label">
                Heading font stack
                <input
                  type="text"
                  className="input-field"
                  value={effectiveBranding.font_heading}
                  onChange={(e) => handleTextChange('font_heading', e.target.value)}
                  placeholder="Inter, system-ui, sans-serif"
                />
              </label>
              <label className="input-label">
                Body font stack
                <input
                  type="text"
                  className="input-field"
                  value={effectiveBranding.font_body}
                  onChange={(e) => handleTextChange('font_body', e.target.value)}
                  placeholder="Inter, system-ui, sans-serif"
                />
              </label>
            </div>
          </section>

          {/* Platform limits */}
          <section className="branding-section">
            <h2 className="branding-section-title">Platform Limits</h2>
            <div className="branding-field-group">
              <label className="input-label">
                Max webinars per month
                <input
                  type="number"
                  className="input-field"
                  min={1} max={1000}
                  value={effectiveSettings.max_webinars}
                  onChange={(e) => handleSettingsChange('max_webinars', Number(e.target.value))}
                />
              </label>
              <label className="input-label">
                Max participants per webinar
                <input
                  type="number"
                  className="input-field"
                  min={1} max={10000}
                  value={effectiveSettings.max_participants}
                  onChange={(e) => handleSettingsChange('max_participants', Number(e.target.value))}
                />
              </label>
              <label className="input-label">
                Chat rate limit — messages per window
                <input
                  type="number"
                  className="input-field"
                  min={1} max={100}
                  value={effectiveSettings.chat_rate_limit_messages}
                  onChange={(e) => handleSettingsChange('chat_rate_limit_messages', Number(e.target.value))}
                />
              </label>
              <label className="input-label">
                Chat rate limit — window (seconds)
                <input
                  type="number"
                  className="input-field"
                  min={5} max={3600}
                  value={effectiveSettings.chat_rate_limit_window_seconds}
                  onChange={(e) => handleSettingsChange('chat_rate_limit_window_seconds', Number(e.target.value))}
                />
              </label>
            </div>
          </section>
        </div>

        {/* ── Right: live preview ── */}
        <div className="branding-preview-col">
          <h2 className="branding-section-title">Live Preview</h2>
          <p className="branding-preview-hint">Changes apply to your registration pages.</p>
          <BrandingPreview draft={effectiveBranding} logoUrl={effectiveBranding.logo_url ?? ''} />
        </div>
      </div>
    </div>
  )
}
