/**
 * AdminLandingPageEditor — Landing Page Content & Fallback Redirect CMS
 *
 * Provides a management interface for:
 *  1. No-webinar fallback announcement & 5-second countdown redirect settings
 *  2. Hero headline & CTA customization
 *  3. Learning benefits module
 *  4. Testimonials / Success stories
 *  5. FAQ Accordion items
 */

import React, { useState, useEffect } from 'react'
import { useLandingConfig, useUpdateLandingConfig } from '../../hooks/useLandingConfig'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card'
import { Alert } from '../../components/ui/Alert'
import type { LandingPageSettings, BenefitItem, TestimonialItem, FaqItemData } from '../../lib/api'

type TabType = 'redirect' | 'hero' | 'benefits' | 'testimonials' | 'faqs'

export default function AdminLandingPageEditor() {
  const { data: initialConfig, isLoading, error: loadError } = useLandingConfig()
  const updateMutation = useUpdateLandingConfig()

  const [activeTab, setActiveTab] = useState<TabType>('redirect')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [form, setForm] = useState<LandingPageSettings>({
    fallback_redirect_url: 'https://kravemicrogreens.in',
    fallback_redirect_secs: 5,
    fallback_title: 'No Live Webinar Scheduled At The Moment',
    fallback_message:
      'We are currently scheduling our next high-yield live masterclass. You will be redirected to our main website shortly.',
    hero_headline_override: null,
    hero_subheading_override: null,
    hero_badge_text: 'FREE LIVE WEBINAR',
    hero_social_proof_text: '2,000+ entrepreneurs already registered',
    hero_primary_cta_text: '🎯 Reserve My Free Spot',
    hero_secondary_cta_text: '💬 Join WhatsApp Community',
    benefits: [],
    testimonials: [],
    faqs: [],
  })

  useEffect(() => {
    if (initialConfig) {
      setForm(initialConfig)
    }
  }, [initialConfig])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMessage(null)
    setErrorMessage(null)

    if (!form.fallback_redirect_url.trim()) {
      setErrorMessage('Fallback redirect URL is required.')
      return
    }

    try {
      await updateMutation.mutateAsync(form)
      setSuccessMessage('Landing page configuration saved successfully! All updates are live.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save landing page configuration')
    }
  }

  // Benefit card helpers
  const handleBenefitChange = (index: number, field: keyof BenefitItem, val: string) => {
    setForm((prev) => {
      const updated = [...prev.benefits]
      updated[index] = { ...updated[index], [field]: val }
      return { ...prev, benefits: updated }
    })
  }

  const addBenefit = () => {
    setForm((prev) => ({
      ...prev,
      benefits: [
        ...prev.benefits,
        {
          icon: '✨',
          num: String(prev.benefits.length + 1),
          title: 'New Value Module',
          desc: 'Describe what attendees will achieve or learn from this lesson.',
        },
      ],
    }))
  }

  const removeBenefit = (index: number) => {
    setForm((prev) => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index),
    }))
  }

  // Testimonial helpers
  const handleTestimonialChange = (index: number, field: keyof TestimonialItem, val: any) => {
    setForm((prev) => {
      const updated = [...prev.testimonials]
      updated[index] = { ...updated[index], [field]: val }
      return { ...prev, testimonials: updated }
    })
  }

  const addTestimonial = () => {
    setForm((prev) => ({
      ...prev,
      testimonials: [
        ...prev.testimonials,
        {
          initials: 'JD',
          name: 'Jane Doe',
          location: 'Bengaluru · Microgreens Grower',
          rating: 5,
          quote: 'This webinar transformed my home setup into a profitable business!',
        },
      ],
    }))
  }

  const removeTestimonial = (index: number) => {
    setForm((prev) => ({
      ...prev,
      testimonials: prev.testimonials.filter((_, i) => i !== index),
    }))
  }

  // FAQ helpers
  const handleFaqChange = (index: number, field: keyof FaqItemData, val: string) => {
    setForm((prev) => {
      const updated = [...prev.faqs]
      updated[index] = { ...updated[index], [field]: val }
      return { ...prev, faqs: updated }
    })
  }

  const addFaq = () => {
    setForm((prev) => ({
      ...prev,
      faqs: [
        ...prev.faqs,
        {
          q: 'Frequently asked question title?',
          a: 'Comprehensive answer providing clarity and addressing attendee concerns.',
        },
      ],
    }))
  }

  const removeFaq = (index: number) => {
    setForm((prev) => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index),
    }))
  }

  if (isLoading) {
    return (
      <div className="admin-page-loading" style={{ padding: '3rem', textAlign: 'center' }}>
        <div className="admin-spinner" />
        <p style={{ marginTop: '1rem', color: 'var(--color-muted)' }}>Loading landing page editor...</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="admin-page" style={{ padding: '2rem' }}>
        <Alert variant="error">Failed to load landing page editor. Please refresh.</Alert>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <div
        className="admin-page-header"
        style={{
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1 className="admin-page-title" style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
            📄 Landing Page Editor &amp; CMS
          </h1>
          <p className="admin-page-subtitle" style={{ color: 'var(--color-muted)', marginTop: '0.25rem' }}>
            Configure the public webinar landing page, fallback notices, and auto-redirect destinations.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              background: '#ffffff',
              color: 'var(--color-text)',
              fontSize: '0.88rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            ↗ View Live Page
          </a>
          <Button
            type="submit"
            form="landing-editor-form"
            variant="primary"
            loading={updateMutation.isPending}
            style={{ minWidth: '140px' }}
          >
            {updateMutation.isPending ? 'Saving...' : '💾 Save Changes'}
          </Button>
        </div>
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

      {/* ── Navigation Tabs ── */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: '2rem',
          overflowX: 'auto',
          paddingBottom: '2px',
        }}
      >
        {[
          { id: 'redirect', label: '🔀 Fallback & Redirect', icon: '🔀' },
          { id: 'hero', label: '🌟 Hero & CTA Text', icon: '🌟' },
          { id: 'benefits', label: "🌱 What You'll Learn", icon: '🌱' },
          { id: 'testimonials', label: '💬 Success Stories', icon: '💬' },
          { id: 'faqs', label: '❓ FAQ Accordion', icon: '❓' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as TabType)}
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              borderBottom: activeTab === tab.id ? '3px solid var(--color-primary, #1e5631)' : '3px solid transparent',
              background: activeTab === tab.id ? 'var(--color-surface, #ffffff)' : 'transparent',
              color: activeTab === tab.id ? 'var(--color-primary, #1e5631)' : 'var(--color-muted)',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Form Container ── */}
      <form id="landing-editor-form" onSubmit={handleSubmit}>
        {/* ── TAB 1: Fallback & Redirection ── */}
        {activeTab === 'redirect' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
            <Card>
              <CardHeader>
                <CardTitle>🔀 No-Webinar Fallback &amp; Auto-Redirect</CardTitle>
                <CardDescription>
                  When there are no live or upcoming scheduled webinars, visitors see an informative waiting notice and are automatically redirected.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <label className="admin-form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                      Destination Redirect URL *
                    </label>
                    <input
                      type="url"
                      required
                      className="admin-form-input"
                      placeholder="https://kravemicrogreens.in"
                      value={form.fallback_redirect_url}
                      onChange={(e) => setForm((prev) => ({ ...prev, fallback_redirect_url: e.target.value }))}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                    />
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: '0.3rem' }}>
                      Where to send visitors when no webinar is scheduled (e.g. your main website or product page).
                    </p>
                  </div>

                  <div>
                    <label className="admin-form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                      Redirect Delay (Seconds)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      className="admin-form-input"
                      value={form.fallback_redirect_secs}
                      onChange={(e) => setForm((prev) => ({ ...prev, fallback_redirect_secs: parseInt(e.target.value) || 5 }))}
                      style={{ width: '120px', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                    />
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: '0.3rem' }}>
                      Countdown time before automatically initiating the browser redirection (Default: 5 seconds).
                    </p>
                  </div>

                  <div>
                    <label className="admin-form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                      Announcement Heading
                    </label>
                    <input
                      type="text"
                      className="admin-form-input"
                      value={form.fallback_title}
                      onChange={(e) => setForm((prev) => ({ ...prev, fallback_title: e.target.value }))}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                    />
                  </div>

                  <div>
                    <label className="admin-form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                      Detailed Notice Message
                    </label>
                    <textarea
                      rows={3}
                      className="admin-form-textarea"
                      value={form.fallback_message}
                      onChange={(e) => setForm((prev) => ({ ...prev, fallback_message: e.target.value }))}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fallback Screen Preview Card */}
            <Card>
              <CardHeader>
                <CardTitle>👁️ Live Fallback Preview</CardTitle>
                <CardDescription>
                  Preview of how visitors will experience the page when no webinar is scheduled.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  style={{
                    background: 'linear-gradient(180deg, #edf6f0 0%, #f7fbf8 50%, #ffffff 100%)',
                    border: '1px solid #e2efe6',
                    borderRadius: '24px',
                    padding: '2.5rem 1.5rem',
                    textAlign: 'center',
                    boxShadow: '0 8px 24px rgba(30, 86, 49, 0.04)',
                  }}
                >
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: '#dcfce7',
                      color: '#15803d',
                      fontSize: '2rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1rem',
                    }}
                  >
                    📅
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#143623', margin: '0 0 0.5rem 0' }}>
                    {form.fallback_title}
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: '#4a6b57', margin: '0 0 1.5rem 0', lineHeight: 1.5 }}>
                    {form.fallback_message}
                  </p>

                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      background: '#ffffff',
                      border: '1px solid #b8dbc3',
                      padding: '0.5rem 1rem',
                      borderRadius: '999px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: '#1e5631',
                      marginBottom: '1.5rem',
                    }}
                  >
                    <span className="animate-spin" style={{ display: 'inline-block' }}>⏳</span>
                    <span>Redirecting to main site in <strong>{form.fallback_redirect_secs}s</strong>...</span>
                  </div>

                  <div>
                    <a
                      href={form.fallback_redirect_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: '#1e5631',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '12px',
                        textDecoration: 'none',
                      }}
                    >
                      Visit Website Now →
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── TAB 2: Hero & CTA Text ── */}
        {activeTab === 'hero' && (
          <Card>
            <CardHeader>
              <CardTitle>🌟 Hero Section &amp; CTA Copy</CardTitle>
              <CardDescription>
                Customize the primary headline, live status badge, and call-to-action button labels.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <label className="admin-form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                    Headline Override (Optional)
                  </label>
                  <input
                    type="text"
                    className="admin-form-input"
                    placeholder="Leave empty to use active webinar title automatically"
                    value={form.hero_headline_override || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, hero_headline_override: e.target.value || null }))}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                  />
                </div>

                <div>
                  <label className="admin-form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                    Subheading Override (Optional)
                  </label>
                  <input
                    type="text"
                    className="admin-form-input"
                    placeholder="Leave empty to use active webinar description automatically"
                    value={form.hero_subheading_override || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, hero_subheading_override: e.target.value || null }))}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                  />
                </div>

                <div>
                  <label className="admin-form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                    Top Status Badge Text
                  </label>
                  <input
                    type="text"
                    className="admin-form-input"
                    value={form.hero_badge_text || 'FREE LIVE WEBINAR'}
                    onChange={(e) => setForm((prev) => ({ ...prev, hero_badge_text: e.target.value }))}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                  />
                </div>

                <div>
                  <label className="admin-form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                    Social Proof Counter Text
                  </label>
                  <input
                    type="text"
                    className="admin-form-input"
                    value={form.hero_social_proof_text || '2,000+ entrepreneurs already registered'}
                    onChange={(e) => setForm((prev) => ({ ...prev, hero_social_proof_text: e.target.value }))}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                  />
                </div>

                <div>
                  <label className="admin-form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                    Primary CTA Button Text
                  </label>
                  <input
                    type="text"
                    className="admin-form-input"
                    value={form.hero_primary_cta_text || '🎯 Reserve My Free Spot'}
                    onChange={(e) => setForm((prev) => ({ ...prev, hero_primary_cta_text: e.target.value }))}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                  />
                </div>

                <div>
                  <label className="admin-form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                    Secondary CTA Button Text (WhatsApp)
                  </label>
                  <input
                    type="text"
                    className="admin-form-input"
                    value={form.hero_secondary_cta_text || '💬 Join WhatsApp Community'}
                    onChange={(e) => setForm((prev) => ({ ...prev, hero_secondary_cta_text: e.target.value }))}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── TAB 3: What You'll Learn (Benefits) ── */}
        {activeTab === 'benefits' && (
          <Card>
            <CardHeader>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <CardTitle>🌱 &quot;What You&apos;ll Learn&quot; Learning Modules</CardTitle>
                  <CardDescription>
                    Custom value cards displayed in the learning roadmap section.
                  </CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addBenefit}>
                  + Add Benefit Card
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
                {form.benefits.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: '16px',
                      padding: '1.25rem',
                      background: '#ffffff',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={item.icon}
                          onChange={(e) => handleBenefitChange(index, 'icon', e.target.value)}
                          style={{ width: '45px', textAlign: 'center', padding: '0.35rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '1.2rem' }}
                          title="Icon Emoji"
                        />
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                          Card #{index + 1}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        style={{ color: '#dc2626' }}
                        onClick={() => removeBenefit(index)}
                      >
                        ✕
                      </Button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <input
                        type="text"
                        placeholder="Title"
                        value={item.title}
                        onChange={(e) => handleBenefitChange(index, 'title', e.target.value)}
                        style={{ width: '100%', fontWeight: 700, padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                      />
                      <textarea
                        rows={3}
                        placeholder="Description"
                        value={item.desc}
                        onChange={(e) => handleBenefitChange(index, 'desc', e.target.value)}
                        style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── TAB 4: Testimonials ── */}
        {activeTab === 'testimonials' && (
          <Card>
            <CardHeader>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <CardTitle>💬 Success Stories &amp; Testimonials</CardTitle>
                  <CardDescription>
                    Social proof cards with star ratings and attendee reviews.
                  </CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addTestimonial}>
                  + Add Testimonial
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
                {form.testimonials.map((t, index) => (
                  <div
                    key={index}
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: '16px',
                      padding: '1.25rem',
                      background: '#ffffff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                        Testimonial #{index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        style={{ color: '#dc2626' }}
                        onClick={() => removeTestimonial(index)}
                      >
                        ✕
                      </Button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          type="text"
                          placeholder="Initials"
                          value={t.initials}
                          onChange={(e) => handleTestimonialChange(index, 'initials', e.target.value)}
                          style={{ width: '60px', textAlign: 'center', fontWeight: 700, padding: '0.45rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                        />
                        <input
                          type="text"
                          placeholder="Attendee Name"
                          value={t.name}
                          onChange={(e) => handleTestimonialChange(index, 'name', e.target.value)}
                          style={{ flex: 1, fontWeight: 700, padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Location · Crop / Subtitle"
                        value={t.location}
                        onChange={(e) => handleTestimonialChange(index, 'location', e.target.value)}
                        style={{ width: '100%', fontSize: '0.82rem', padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                      />
                      <textarea
                        rows={3}
                        placeholder="Quote text..."
                        value={t.quote}
                        onChange={(e) => handleTestimonialChange(index, 'quote', e.target.value)}
                        style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── TAB 5: FAQ Accordion ── */}
        {activeTab === 'faqs' && (
          <Card>
            <CardHeader>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <CardTitle>❓ Frequently Asked Questions</CardTitle>
                  <CardDescription>
                    Expandable Q&amp;A accordion items addressing questions and objections.
                  </CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addFaq}>
                  + Add FAQ Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {form.faqs.map((faq, index) => (
                  <div
                    key={index}
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: '16px',
                      padding: '1.25rem',
                      background: '#ffffff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-primary, #1e5631)' }}>
                        Q#{index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        style={{ color: '#dc2626' }}
                        onClick={() => removeFaq(index)}
                      >
                        ✕ Remove
                      </Button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <input
                        type="text"
                        placeholder="Question title"
                        value={faq.q}
                        onChange={(e) => handleFaqChange(index, 'q', e.target.value)}
                        style={{ width: '100%', fontWeight: 700, padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                      />
                      <textarea
                        rows={2}
                        placeholder="Detailed answer text"
                        value={faq.a}
                        onChange={(e) => handleFaqChange(index, 'a', e.target.value)}
                        style={{ width: '100%', fontSize: '0.88rem', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  )
}
