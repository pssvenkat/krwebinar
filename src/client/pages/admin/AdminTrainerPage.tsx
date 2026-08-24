/**
 * AdminTrainerPage — Trainer & Expert Profile Management
 *
 * Allows vendor administrators to configure the trainer profile that is displayed
 * on the public webinar landing page, including name, title, bio, photo upload,
 * achievement highlights, and WhatsApp community link.
 */

import React, { useState, useEffect, useRef } from 'react'
import { useTrainer, useUpdateTrainer } from '../../hooks/useTrainer'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card'
import { Alert } from '../../components/ui/Alert'
import type { TrainerProfile } from '../../lib/api'

// ── Image Resizer & Compressor ─────────────────────────────────────

async function compressImageToDataUrl(
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.9,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
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

      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      resolve(dataUrl)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image file'))
    }
    img.src = url
  })
}

// ── Trainer Photo Upload Component ────────────────────────────────

function TrainerPhotoUpload({
  value,
  onChange,
}: {
  value: string | null
  onChange: (val: string | null) => void
}) {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = async (file: File) => {
    setError(null)
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (PNG, JPG, WebP).')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file is too large (max 5MB).')
      return
    }

    try {
      setLoading(true)
      const dataUrl = await compressImageToDataUrl(file, 600, 600, 0.88)
      onChange(dataUrl)
    } catch {
      setError('Could not process image. Please try another file.')
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0])
    }
  }

  return (
    <div className="branding-upload-wrap" style={{ marginBottom: '1.5rem' }}>
      <label className="admin-form-label" style={{ marginBottom: '0.4rem', display: 'block', fontWeight: 600 }}>
        Trainer Photo / Avatar
      </label>
      <p className="admin-form-hint" style={{ marginBottom: '0.75rem', fontSize: '0.82rem', color: 'var(--color-muted)' }}>
        Recommended: Square photo of the speaker or trainer (min 400x400px).
      </p>

      {error && (
        <div style={{ marginBottom: '0.75rem' }}>
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <div
        className={`branding-dropzone ${dragOver ? 'branding-dropzone--active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: '2px dashed var(--color-border)',
          borderRadius: '16px',
          padding: '1.5rem',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragOver ? 'var(--color-surface-hover, #f0fdf4)' : 'var(--color-surface, #fff)',
          transition: 'all 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              processFile(e.target.files[0])
            }
          }}
        />

        {value ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{
                width: '88px',
                height: '88px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid var(--color-primary, #1e5631)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                flexShrink: 0,
                position: 'relative',
              }}
            >
              <img
                src={value}
                alt="Trainer Preview"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)' }}>Photo selected</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
                Click or drop new file to replace
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                style={{ marginTop: '0.4rem', color: 'var(--color-error, #dc2626)', padding: '0.2rem 0.5rem', height: 'auto' }}
                onClick={(e) => {
                  e.stopPropagation()
                  onChange(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
              >
                ✕ Remove Photo
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: '2.25rem' }}>👤</div>
            <div>
              <span style={{ fontWeight: 600, color: 'var(--color-primary, #1e5631)' }}>
                {loading ? 'Processing image...' : 'Click to select photo'}
              </span>{' '}
              <span style={{ color: 'var(--color-muted)' }}>or drag &amp; drop</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
              PNG, JPG, WebP up to 5MB
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main Admin Trainer Profile Page ───────────────────────────────

export default function AdminTrainerPage() {
  const { data: initialProfile, isLoading, error: loadError } = useTrainer()
  const updateMutation = useUpdateTrainer()

  const [form, setForm] = useState<TrainerProfile>({
    name: 'Shanthi Ramakrishnamurthy',
    title: 'Lead Trainer & Microgreens Specialist, Krave Microgreens',
    bio: 'Shanthi is a passionate urban farming advocate and lead trainer at Krave Microgreens, helping home growers turn small balcony spaces into thriving, profitable microgreens businesses.',
    avatar_url: null,
    highlights: [
      '2,000+ students trained',
      'Microgreens Pioneer in Coimbatore',
      'Hands-on Commercial & Home Setup Expert',
    ],
    experience_years: '8+ Years Experience',
    whatsapp_community_url: 'https://chat.whatsapp.com/krave-community',
    social_links: { website: 'https://kravemicrogreens.in' },
  })

  const [highlightInput, setHighlightInput] = useState('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (initialProfile) {
      setForm(initialProfile)
    }
  }, [initialProfile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMessage(null)
    setErrorMessage(null)

    if (!form.name.trim()) {
      setErrorMessage('Trainer Name is required.')
      return
    }

    try {
      await updateMutation.mutateAsync(form)
      setSuccessMessage('Trainer profile updated successfully! Changes are live on your webinar landing page.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save trainer profile')
    }
  }

  const addHighlight = () => {
    if (!highlightInput.trim()) return
    setForm((prev) => ({
      ...prev,
      highlights: [...prev.highlights, highlightInput.trim()],
    }))
    setHighlightInput('')
  }

  const removeHighlight = (index: number) => {
    setForm((prev) => ({
      ...prev,
      highlights: prev.highlights.filter((_, i) => i !== index),
    }))
  }

  if (isLoading) {
    return (
      <div className="admin-page-loading" style={{ padding: '3rem', textAlign: 'center' }}>
        <div className="admin-spinner" />
        <p style={{ marginTop: '1rem', color: 'var(--color-muted)' }}>Loading trainer profile...</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="admin-page" style={{ padding: '2rem' }}>
        <Alert variant="error">Failed to load trainer profile. Please refresh the page.</Alert>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="admin-page-title" style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
            🎙️ Trainer &amp; Expert Profile
          </h1>
          <p className="admin-page-subtitle" style={{ color: 'var(--color-muted)', marginTop: '0.25rem' }}>
            Maintain the presenter details showcased on your public webinar landing pages.
          </p>
        </div>
        <Button
          type="submit"
          form="trainer-profile-form"
          variant="primary"
          loading={updateMutation.isPending}
          style={{ minWidth: '140px' }}
        >
          {updateMutation.isPending ? 'Saving...' : '💾 Save Profile'}
        </Button>
      </div>

      {successMessage && (
        <div style={{ marginBottom: '1.5rem' }}>
          <Alert variant="success">{successMessage}</Alert>
        </div>
      )}

      {errorMessage && (
        <div style={{ marginBottom: '1.5rem' }}>
          <Alert variant="error">{errorMessage}</Alert>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'start' }}>
        {/* ── Configuration Form ── */}
        <form id="trainer-profile-form" onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Presenter Information</CardTitle>
              <CardDescription>
                Details shown in the &quot;Your Trainer&quot; card and webinar meta badges.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Photo Upload */}
              <TrainerPhotoUpload
                value={form.avatar_url}
                onChange={(val) => setForm((prev) => ({ ...prev, avatar_url: val }))}
              />

              {/* Trainer Name */}
              <div>
                <label className="admin-form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                  Trainer Name *
                </label>
                <input
                  type="text"
                  required
                  className="admin-form-input"
                  placeholder="e.g. Shanthi Ramakrishnamurthy"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                />
              </div>

              {/* Title / Designation */}
              <div>
                <label className="admin-form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                  Professional Title &amp; Organization
                </label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="e.g. Lead Trainer & Microgreens Specialist, Krave Microgreens"
                  value={form.title || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                />
              </div>

              {/* Experience Badge */}
              <div>
                <label className="admin-form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                  Experience / Credential Highlight
                </label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="e.g. 8+ Years Experience"
                  value={form.experience_years || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, experience_years: e.target.value }))}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                />
              </div>

              {/* WhatsApp Community Link */}
              <div>
                <label className="admin-form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                  WhatsApp Community / Group Link (Optional)
                </label>
                <input
                  type="url"
                  className="admin-form-input"
                  placeholder="https://chat.whatsapp.com/your-community-link"
                  value={form.whatsapp_community_url || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, whatsapp_community_url: e.target.value }))}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.3rem' }}>
                  Used for the secondary &quot;💬 Join WhatsApp Community&quot; button on your landing page.
                </p>
              </div>

              {/* Bio */}
              <div>
                <label className="admin-form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                  Bio &amp; Background Story
                </label>
                <textarea
                  rows={4}
                  className="admin-form-textarea"
                  placeholder="Describe the trainer's background, authority, and why attendees should learn from them..."
                  value={form.bio || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-border)', resize: 'vertical' }}
                />
              </div>

              {/* Highlights & Achievements */}
              <div>
                <label className="admin-form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                  Key Highlights &amp; Accreditations
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <input
                    type="text"
                    className="admin-form-input"
                    placeholder="e.g. 2,000+ students trained"
                    value={highlightInput}
                    onChange={(e) => setHighlightInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addHighlight()
                      }
                    }}
                    style={{ flex: 1, padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addHighlight}>
                    + Add
                  </Button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {form.highlights.map((item, idx) => (
                    <span
                      key={idx}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'var(--color-surface-hover, #f0fdf4)',
                        border: '1px solid var(--color-border, #d0e6d6)',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.85rem',
                        color: 'var(--color-text)',
                      }}
                    >
                      <span>✓ {item}</span>
                      <button
                        type="button"
                        onClick={() => removeHighlight(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--color-muted)',
                          fontWeight: 'bold',
                          padding: 0,
                          lineHeight: 1,
                        }}
                        title="Remove"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  {form.highlights.length === 0 && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontStyle: 'italic' }}>
                      No highlights added yet. Type above and click &quot;+ Add&quot;.
                    </span>
                  )}
                </div>
              </div>
              </div>
            </CardContent>
          </Card>
        </form>

        {/* ── Live Landing Page Preview ── */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>👁️ Live Landing Page Preview</CardTitle>
              <CardDescription>
                How this will appear to prospective webinar attendees on your landing page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                style={{
                  background: 'linear-gradient(to bottom, #f4f9f5, #ffffff)',
                  borderRadius: '24px',
                  border: '1px solid #e2efe6',
                  padding: '2rem',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      background: '#e2efe6',
                      color: '#1e5631',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '0.3rem 0.8rem',
                      borderRadius: '999px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '0.5rem',
                    }}
                  >
                    YOUR TRAINER
                  </span>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#143623', margin: 0 }}>
                    Learn From India&apos;s Leading Expert
                  </h3>
                </div>

                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: '20px',
                    border: '1px solid #e2efe6',
                    padding: '1.75rem',
                    boxShadow: '0 8px 20px rgba(30, 86, 49, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: '1.25rem',
                  }}
                >
                  <div
                    style={{
                      width: '130px',
                      height: '130px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: '4px solid #1e5631',
                      boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                      background: '#edf6f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {form.avatar_url ? (
                      <img
                        src={form.avatar_url}
                        alt={form.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: '3.5rem' }}>🌱</span>
                    )}
                  </div>

                  <div>
                    <h4 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#143623', margin: '0 0 0.25rem 0' }}>
                      {form.name || 'Trainer Name'}
                    </h4>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#2d7d46', margin: '0 0 0.75rem 0' }}>
                      {form.title || 'Lead Trainer & Specialist'}
                    </p>
                    <p style={{ fontSize: '0.85rem', lineHeight: 1.6, color: '#4a6b57', margin: '0 0 1.25rem 0' }}>
                      {form.bio || 'Trainer biography will appear here.'}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                      {form.highlights.map((h, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: '#f0f7f2',
                            border: '1px solid #d0e6d6',
                            borderRadius: '12px',
                            padding: '0.5rem 0.85rem',
                            fontSize: '0.82rem',
                            textAlign: 'left',
                          }}
                        >
                          <span style={{ color: '#1e5631', fontWeight: 800 }}>✓</span>
                          <span style={{ color: '#143623', fontWeight: 600 }}>{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
