import { useState, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LoadingState, ErrorState } from '../../components/ui/States'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { api } from '../../lib/api'
import type { BrandingData, SettingsData } from '../../lib/api'

// ── Image Resizer Helper ──────────────────────────────────────────

function resizeImageFile(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality = 0.9,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Failed to read SVG file'))
      reader.readAsDataURL(file)
      return
    }

    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, width)
      canvas.height = Math.max(1, height)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas context unavailable'))
        return
      }

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      // PNG preserves alpha transparency for logos and favicons
      const dataUrl = canvas.toDataURL('image/png', quality)
      resolve(dataUrl)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image file'))
    }
    img.src = url
  })
}

// ── File Upload Component ─────────────────────────────────────────

function ImageUploadField({
  label,
  description,
  value,
  onChange,
  accept = 'image/png,image/jpeg,image/svg+xml,image/webp,image/x-icon,image/vnd.microsoft.icon',
  maxSizeMB = 5,
  previewHeight = 56,
  maxDimension = 800,
}: {
  label: string
  description?: string
  value: string | null
  onChange: (val: string | null) => void
  accept?: string
  maxSizeMB?: number
  previewHeight?: number
  maxDimension?: number
}) {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = async (file: File) => {
    setError(null)
    if (!file) return

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size exceeds ${maxSizeMB}MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB)`)
      return
    }

    try {
      setProcessing(true)
      const dataUrl = await resizeImageFile(file, maxDimension, maxDimension)
      onChange(dataUrl)
    } catch (err: any) {
      setError(err?.message || 'Failed to process image file')
    } finally {
      setProcessing(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void processFile(e.dataTransfer.files[0])
    }
  }

  return (
    <div className="branding-field-group" style={{ marginBottom: '1.25rem' }}>
      <label className="input-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
        {label}
      </label>
      {description && (
        <p style={{ fontSize: '0.8rem', color: 'var(--color-muted, #94a3b8)', marginTop: 0, marginBottom: '0.5rem' }}>
          {description}
        </p>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragOver ? 'var(--color-primary, #16a34a)' : 'var(--color-border, #cbd5e1)'}`,
          background: dragOver ? 'rgba(22, 163, 74, 0.05)' : 'var(--color-surface, #f8fafc)',
          borderRadius: '8px',
          padding: '1rem',
          textAlign: 'center',
          transition: 'all 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              void processFile(e.target.files[0])
            }
          }}
        />

        {processing ? (
          <div style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
            Processing image…
          </div>
        ) : value ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', justifyContent: 'space-between', padding: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  height: previewHeight,
                  maxHeight: previewHeight,
                  minWidth: previewHeight,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '4px',
                  overflow: 'hidden',
                }}
              >
                <img
                  src={value}
                  alt={`${label} preview`}
                  style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                />
              </div>
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text, #1e293b)', display: 'block' }}>
                  Image Selected
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-muted, #64748b)' }}>
                  Click Save Changes to apply
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => inputRef.current?.click()}
              >
                Change
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  onChange(null)
                  if (inputRef.current) inputRef.current.value = ''
                }}
                style={{ color: '#ef4444' }}
              >
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ fontSize: '1.75rem' }}>📁</div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text, #334155)' }}>
              Drag and drop an image here, or
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              Browse Image File
            </Button>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-muted, #94a3b8)' }}>
              PNG, JPG, SVG, WebP, or ICO up to {maxSizeMB}MB
            </span>
          </div>
        )}
      </div>

      {error && (
        <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.35rem', marginBottom: 0 }}>
          ⚠️ {error}
        </p>
      )}
    </div>
  )
}

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

  const handleTextChange = useCallback((name: string, val: string | null) => {
    setDraft((prev) => ({ ...(prev ?? branding!), [name]: val }))
  }, [branding])

  const handleSettingsChange = useCallback((name: string, val: number) => {
    setDraftSettings((prev) => ({ ...(prev ?? settings!), [name]: val }))
  }, [settings])

  const [saveError, setSaveError] = useState<string | null>(null)

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
      void qc.invalidateQueries({ queryKey: ['tenant'] })
    },
  })

  const settingsMutation = useMutation({
    mutationFn: async (data: Partial<SettingsData>) => {
      const res = await api.settings.update(data)
      if (!res.ok) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'settings'] })
      void qc.invalidateQueries({ queryKey: ['tenant'] })
    },
  })

  const handleSave = async () => {
    setSaveError(null)
    try {
      const promises: Promise<unknown>[] = []
      if (draft) {
        // Strip out non-branding properties and guarantee null instead of undefined
        const cleanBranding: Partial<BrandingData> = {
          primary_color: draft.primary_color,
          secondary_color: draft.secondary_color,
          accent_color: draft.accent_color,
          background_color: draft.background_color,
          surface_color: draft.surface_color,
          text_color: draft.text_color,
          muted_color: draft.muted_color,
          border_color: draft.border_color,
          success_color: draft.success_color,
          warning_color: draft.warning_color,
          error_color: draft.error_color,
          font_heading: draft.font_heading,
          font_body: draft.font_body,
          logo_url: draft.logo_url ?? null,
          favicon_url: draft.favicon_url ?? null,
        }
        promises.push(brandingMutation.mutateAsync(cleanBranding))
      }
      if (draftSettings) {
        promises.push(settingsMutation.mutateAsync(draftSettings))
      }
      await Promise.all(promises)
      setDraft(null)
      setDraftSettings(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      console.error('[Branding] Save failed:', err)
      setSaveError(err.message || 'Failed to save branding changes. Please check your network connection and try again.')
    }
  }

  const handleReset = () => {
    setDraft(null)
    setDraftSettings(null)
    setSaveError(null)
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

      {saveError && (
        <div style={{ marginBottom: '1.5rem' }}>
          <Alert variant="error" title="Save Failed" onClose={() => setSaveError(null)}>
            {saveError}
          </Alert>
        </div>
      )}

      <div className="branding-layout">
        {/* ── Left: settings panels ── */}
        <div className="branding-panels">

          {/* Visual identity */}
          <section className="branding-section">
            <h2 className="branding-section-title">Visual Identity</h2>

            <ImageUploadField
              label="Brand Logo"
              description="Upload your company logo to display on registration pages, emails, and webinar header"
              value={effectiveBranding.logo_url ?? null}
              onChange={(val) => handleTextChange('logo_url', val)}
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              maxSizeMB={5}
              previewHeight={56}
              maxDimension={800}
            />

            <ImageUploadField
              label="Favicon"
              description="Upload your browser tab icon (recommended: 32x32 or 64x64 square PNG/ICO/SVG)"
              value={effectiveBranding.favicon_url ?? null}
              onChange={(val) => handleTextChange('favicon_url', val)}
              accept="image/x-icon,image/vnd.microsoft.icon,image/png,image/svg+xml"
              maxSizeMB={2}
              previewHeight={36}
              maxDimension={128}
            />
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
