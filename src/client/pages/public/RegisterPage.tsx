import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { googleCalendarUrl, outlookWebUrl, downloadICS } from '../../lib/calendar'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Checkbox } from '../../components/ui/Checkbox'
import { PhoneInput } from '../../components/ui/PhoneInput'
import { CountrySelect } from '../../components/ui/CountrySelect'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { LoadingState, ErrorState } from '../../components/ui/States'

// ── Schema ────────────────────────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().optional(),
  countryCode: z.string().optional(),
  city: z.string().optional(),
  consentMarketing: z.boolean().optional(),
})

type FormData = z.infer<typeof registerSchema>
type FormErrors = Partial<Record<keyof FormData, string>>

// ── Calendar confirm block ────────────────────────────────────────

function CalendarActions({ webinar, registrationName }: {
  webinar: {
    title: string; description: string | null; startDate: string
    startTime: string; endTime: string; timezone: string
  }
  registrationName: string
}) {
  const event = {
    title: webinar.title,
    description: [webinar.description, `Registered as: ${registrationName}`].filter(Boolean).join('\n\n'),
    startDate: webinar.startDate,
    startTime: webinar.startTime,
    endTime: webinar.endTime,
    timezone: webinar.timezone,
  }

  return (
    <div className="cal-actions">
      <p className="cal-actions-label">Add to your calendar</p>
      <div className="cal-actions-buttons">
        <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className="cal-btn cal-btn-google">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
          Google Calendar
        </a>
        <a href={outlookWebUrl(event)} target="_blank" rel="noopener noreferrer" className="cal-btn cal-btn-outlook">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/>
          </svg>
          Outlook
        </a>
        <button
          type="button"
          onClick={() => downloadICS(event, `${webinar.title.replace(/\s+/g, '_')}.ics`)}
          className="cal-btn cal-btn-ics"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
          </svg>
          Download .ics
        </button>
      </div>
    </div>
  )
}

// ── Success screen ────────────────────────────────────────────────

function SuccessScreen({ registration, webinar, alreadyRegistered }: {
  registration: { name: string; email: string; accessToken: string }
  webinar: { title: string; description: string | null; startDate: string; startTime: string; endTime: string; timezone: string }
  alreadyRegistered: boolean
}) {
  const [copied, setCopied] = useState(false)
  const attendUrl = `${window.location.origin}/w/${registration.accessToken}`

  const copyLink = async () => {
    await navigator.clipboard.writeText(attendUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const displayDate = new Date(`${webinar.startDate}T${webinar.startTime}`).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="register-success">
      <div className="register-success-icon" aria-hidden="true">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      </div>
      {alreadyRegistered ? (
        <h2 className="register-success-title">You&apos;re already registered!</h2>
      ) : (
        <h2 className="register-success-title">You&apos;re registered! 🎉</h2>
      )}
      <p className="register-success-subtitle">
        Hi <strong>{registration.name}</strong> — your spot is confirmed for
      </p>
      <div className="register-webinar-card">
        <p className="register-webinar-title">{webinar.title}</p>
        <p className="register-webinar-date">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          {displayDate} &bull; {webinar.startTime}–{webinar.endTime} ({webinar.timezone})
        </p>
      </div>
      <div className="register-attend-link">
        <p className="register-attend-label">Your personal join link</p>
        <div className="register-attend-url-row">
          <code className="register-attend-url">{attendUrl}</code>
          <button type="button" onClick={copyLink} className="register-attend-copy" aria-label="Copy join link">
            {copied ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            )}
          </button>
        </div>
        <p className="register-attend-hint">
          Save this link — you&apos;ll use it to join the webinar. A confirmation email will be sent to <strong>{registration.email}</strong>.
        </p>
      </div>
      <CalendarActions webinar={webinar} registrationName={registration.name} />
    </div>
  )
}

// ── Webinar type ──────────────────────────────────────────────────

interface WebinarPublicData {
  title: string; description: string | null; hostName: string
  startDate: string; startTime: string; endTime: string; timezone: string
  spotsLeft: number; isFull: boolean; status: string; registrationOpen: boolean
}

// ── Main RegisterPage ─────────────────────────────────────────────

export default function RegisterPage() {
  const { webinarId } = useParams<{ webinarId: string }>()

  const [formData, setFormData] = useState<FormData>({
    name: '', email: '', phone: '', countryCode: 'IN', city: '', consentMarketing: false,
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [globalError, setGlobalError] = useState<string | null>(null)

  // ── Fetch public webinar info ─────────────────────────────────

  const { data: webinarData, isLoading, error } = useQuery({
    queryKey: ['public-webinar', webinarId],
    queryFn: async (): Promise<WebinarPublicData> => {
      const r = await fetch(`/api/v1/webinars/${webinarId}/public`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      const json = await r.json() as { ok: boolean; data?: { webinar: WebinarPublicData }; error?: { message: string } }
      if (!json.ok) throw new Error(json.error?.message ?? 'Webinar not found')
      return json.data!.webinar
    },
    enabled: !!webinarId,
  })

  // ── Registration mutation ─────────────────────────────────────

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const r = await fetch(`/api/v1/webinars/${webinarId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone || undefined,
          countryCode: data.countryCode || undefined,
          city: data.city || undefined,
          consentMarketing: data.consentMarketing ?? false,
        }),
      })
      const json = await r.json() as {
        ok: boolean
        data?: {
          registration: { name: string; email: string; accessToken: string; alreadyRegistered: boolean }
          webinar: WebinarPublicData & { startDate: string; startTime: string; endTime: string; timezone: string; description: string | null }
        }
        error?: { code: string; message: string }
      }
      if (!json.ok) throw new Error(json.error?.message ?? 'Registration failed')
      return json.data!
    },
  })

  // ── Form validation ───────────────────────────────────────────

  const validate = (): boolean => {
    const result = registerSchema.safeParse(formData)
    if (!result.success) {
      const errs: FormErrors = {}
      result.error.issues.forEach((i) => {
        const key = i.path[0] as keyof FormData
        if (!errs[key]) errs[key] = i.message
      })
      setErrors(errs)
      return false
    }
    setErrors({})
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGlobalError(null)
    if (!validate()) return
    try {
      await mutation.mutateAsync(formData)
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
    }
  }

  // ── Render ────────────────────────────────────────────────────

  if (isLoading) return <LoadingState label="Loading webinar details…" />
  if (error || !webinarData) return <ErrorState error={error as Error} />

  // Success state
  if (mutation.isSuccess && mutation.data) {
    return (
      <div className="register-page">
        <div className="register-container">
          <SuccessScreen
            registration={mutation.data.registration}
            webinar={mutation.data.webinar}
            alreadyRegistered={mutation.data.registration.alreadyRegistered}
          />
        </div>
      </div>
    )
  }

  const w = webinarData
  const displayDate = new Date(`${w.startDate}T${w.startTime}`).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="register-page">
      <div className="register-container">
        {/* Webinar summary card */}
        <div className="register-webinar-hero">
          <div className="register-webinar-meta">
            <Badge variant={w.status === 'LIVE' ? 'error' : 'primary'}>
              {w.status === 'LIVE' ? '🔴 LIVE NOW' : 'Upcoming'}
            </Badge>
            <p className="register-host">Hosted by <strong>{w.hostName}</strong></p>
          </div>
          <h1 className="register-title">{w.title}</h1>
          {w.description && <p className="register-description">{w.description}</p>}
          <div className="register-details">
            <span className="register-detail-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {displayDate}
            </span>
            <span className="register-detail-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              {w.startTime}–{w.endTime} {w.timezone}
            </span>
            {w.spotsLeft < 20 && w.spotsLeft > 0 && (
              <span className="register-detail-item register-detail-urgent">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                Only {w.spotsLeft} spots left!
              </span>
            )}
          </div>
        </div>

        {/* Registration form */}
        {w.isFull ? (
          <Alert variant="warning" title="Webinar is fully booked">
            Unfortunately all spots for this webinar have been filled. Please check back for future events.
          </Alert>
        ) : !w.registrationOpen ? (
          <Alert variant="info" title="Registration closed">
            Registration for this webinar is currently closed.
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="register-form" noValidate>
            <h2 className="register-form-title">Reserve your spot</h2>

            {globalError && (
              <Alert variant="error" title="Registration failed" onClose={() => setGlobalError(null)}>
                {globalError}
              </Alert>
            )}

            <div className="register-form-grid">
              <Input
                id="reg-name"
                label="Full name"
                type="text"
                autoComplete="name"
                placeholder="Priya Sharma"
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData((f) => ({ ...f, name: e.target.value }))}
                error={errors.name}
                required
              />
              <Input
                id="reg-email"
                label="Email address"
                type="email"
                autoComplete="email"
                placeholder="priya@example.com"
                value={formData.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData((f) => ({ ...f, email: e.target.value }))}
                error={errors.email}
                required
              />
              <PhoneInput
                id="reg-phone"
                label="Phone number (optional)"
                value={formData.phone ?? ''}
                onChange={(val: string) => setFormData((f) => ({ ...f, phone: val }))}
                defaultCountry="IN"
                hint="We'll only use this to send webinar reminders"
              />
              <div className="register-form-row">
                <CountrySelect
                  id="reg-country"
                  label="Country"
                  value={formData.countryCode ?? ''}
                  onChange={(val: string) => setFormData((f) => ({ ...f, countryCode: val }))}
                />
                <Input
                  id="reg-city"
                  label="City (optional)"
                  type="text"
                  autoComplete="address-level2"
                  placeholder="Coimbatore"
                  value={formData.city ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData((f) => ({ ...f, city: e.target.value }))}
                />
              </div>
            </div>

            <div className="register-consent-section">
              <Checkbox
                id="reg-consent-necessary"
                label="I agree to receive information about this webinar and understand my data will be processed for registration purposes."
                checked
                disabled
                hint="Required for registration"
              />
              <Checkbox
                id="reg-consent-marketing"
                label="I'd like to receive updates about future events and promotions."
                checked={formData.consentMarketing ?? false}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData((f) => ({ ...f, consentMarketing: e.target.checked }))}
                hint="Optional — unsubscribe anytime"
              />
            </div>

            <Button
              id="reg-submit"
              type="submit"
              variant="primary"
              size="lg"
              loading={mutation.isPending}
              className="register-submit-btn"
            >
              {mutation.isPending ? 'Reserving your spot…' : "Reserve my spot — it's free"}
            </Button>

            <p className="register-privacy-note">
              🔒 Your data is protected under our privacy policy and Indian DPDP Act 2023.
              We never share your details without consent.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
