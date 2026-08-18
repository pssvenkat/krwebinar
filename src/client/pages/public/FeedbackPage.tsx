import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Button } from '../../components/ui/Button'
import { Textarea } from '../../components/ui/Textarea'
import { StarRating } from '../../components/ui/StarRating'
import { Checkbox, RadioGroup } from '../../components/ui/Checkbox'
import { Alert } from '../../components/ui/Alert'
import { LoadingState, ErrorState } from '../../components/ui/States'

// ── Schema ────────────────────────────────────────────────────────

// interests, contactRequested, preferredContact, consentContact
type FeedbackData = {
  rating?: number
  suggestion?: string
  interests?: string[]
  contactRequested?: boolean
  preferredContact?: 'email' | 'whatsapp' | 'call'
  consentContact?: boolean
}

const INTEREST_OPTIONS = [
  { value: 'microgreens_kit',    label: 'Buy a home microgreens kit' },
  { value: 'bulk_supply',        label: 'Bulk supply for restaurant / hotel' },
  { value: 'corporate_wellness', label: 'Corporate wellness program' },
  { value: 'learn_more',        label: 'Just learning — tell me more' },
  { value: 'reseller',          label: 'Become a reseller / distributor' },
]

const CONTACT_OPTIONS = [
  { value: 'email',     label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'call',     label: 'Phone call' },
]

// ── Success screen ────────────────────────────────────────────────

function FeedbackSuccess() {
  return (
    <div className="feedback-success">
      <div className="feedback-success-icon" aria-hidden="true">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      </div>
      <h2 className="feedback-success-title">Thank you! 🙏</h2>
      <p className="feedback-success-subtitle">
        Your feedback helps us improve every webinar.
        <br />We&apos;ll be in touch soon if you requested a follow-up.
      </p>
    </div>
  )
}

// ── Main FeedbackPage ─────────────────────────────────────────────

export default function FeedbackPage() {
  // Route: /w/:token/feedback — no webinarId in URL; resolved from attend API
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()

  const [form, setForm] = useState<FeedbackData>({
    rating: undefined,
    suggestion: '',
    interests: [],
    contactRequested: false,
    preferredContact: undefined,
    consentContact: false,
  })
  const [globalError, setGlobalError] = useState<string | null>(null)

  // Fetch attend data to get webinarId
  const { data: attendData, isLoading: attendLoading, error: attendError } = useQuery({
    queryKey: ['attend', token],
    queryFn: async () => {
      const r = await fetch(`/api/v1/attend/${token}`, { credentials: 'include' })
      const json = await r.json() as {
        ok: boolean
        data?: { registration: { id: string; name: string }; webinar: { id: string; title: string; status: string } }
        error?: { message: string }
      }
      if (!json.ok) throw new Error(json.error?.message ?? 'Invalid access token')
      return json.data!
    },
    enabled: !!token,
    staleTime: 60_000,
  })

  const mutation = useMutation({
    mutationFn: async (data: FeedbackData) => {
      const webinarId = attendData!.webinar.id
      const r = await fetch(`/api/v1/webinars/${webinarId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...data, accessToken: token }),
      })
      const json = await r.json() as { ok: boolean; data?: unknown; error?: { code: string; message: string } }
      if (!json.ok) throw new Error(json.error?.message ?? 'Submission failed')
      return json
    },
  })

  const toggleInterest = (val: string) => {
    setForm((f) => ({
      ...f,
      interests: f.interests?.includes(val)
        ? f.interests.filter((v) => v !== val)
        : [...(f.interests ?? []), val],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGlobalError(null)
    try {
      await mutation.mutateAsync(form)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Submission failed'
      if (msg.includes('ALREADY_SUBMITTED')) {
        setGlobalError('You have already submitted feedback for this webinar.')
      } else if (msg.includes('NOT_ALLOWED')) {
        setGlobalError('Feedback can only be submitted after the webinar has ended.')
      } else {
        setGlobalError(msg)
      }
    }
  }

  if (attendLoading) return <div className="feedback-page"><div className="feedback-container"><LoadingState label="Loading…" /></div></div>
  if (attendError || !attendData) {
    return (
      <div className="feedback-page">
        <div className="feedback-container">
          <ErrorState error={attendError as Error} />
        </div>
      </div>
    )
  }
  if (mutation.isSuccess) {
    return <div className="feedback-page"><div className="feedback-container"><FeedbackSuccess /></div></div>
  }

  return (
    <div className="feedback-page">
      <div className="feedback-container">
        <div className="feedback-header">
          <h1 className="feedback-title">How was the webinar?</h1>
          <p className="feedback-subtitle">
            Your feedback takes 60 seconds and helps us make every session better.
          </p>
          <p className="feedback-webinar-name">{attendData.webinar.title}</p>
        </div>

        {globalError && (
          <Alert variant="error" onClose={() => setGlobalError(null)}>
            {globalError}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="feedback-form" noValidate>

          {/* Rating */}
          <div className="feedback-section">
            <p className="feedback-section-label">How would you rate this webinar?</p>
            <StarRating
              id="fb-rating"
              value={form.rating ?? 0}
              onChange={(val: number) => setForm((f) => ({ ...f, rating: val }))}
              size="lg"
            />
          </div>

          {/* Suggestion */}
          <div className="feedback-section">
            <Textarea
              id="fb-suggestion"
              label="Any suggestions or comments?"
              placeholder="What did you enjoy most? What could we improve?"
              value={form.suggestion ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, suggestion: e.target.value }))}
              maxLength={500}
              rows={3}
              hint="Optional"
            />
          </div>

          {/* Interest areas */}
          <div className="feedback-section">
            <p className="feedback-section-label">
              What are you interested in?{' '}
              <span className="feedback-optional">(select all that apply)</span>
            </p>
            <div className="feedback-interests">
              {INTEREST_OPTIONS.map((opt) => (
                <Checkbox
                  key={opt.value}
                  id={`fb-interest-${opt.value}`}
                  label={opt.label}
                  checked={(form.interests ?? []).includes(opt.value)}
                  onChange={(_e: React.ChangeEvent<HTMLInputElement>) => toggleInterest(opt.value)}
                />
              ))}
            </div>
          </div>

          {/* Contact preference */}
          <div className="feedback-section">
            <Checkbox
              id="fb-contact-requested"
              label="I'd like someone to follow up with me"
              checked={form.contactRequested ?? false}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm((f) => ({
                  ...f,
                  contactRequested: e.target.checked,
                  consentContact: e.target.checked,
                }))
              }
            />

            {form.contactRequested && (
              <div className="feedback-contact-pref">
                <p className="feedback-section-sublabel">Preferred contact method</p>
                <RadioGroup
                  name="preferred-contact"
                  options={CONTACT_OPTIONS}
                  value={form.preferredContact ?? ''}
                  onChange={(val: string) =>
                    setForm((f) => ({ ...f, preferredContact: val as FeedbackData['preferredContact'] }))
                  }
                />
                <Checkbox
                  id="fb-consent-contact"
                  label="I consent to being contacted regarding my interests."
                  checked={form.consentContact ?? false}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, consentContact: e.target.checked }))}
                  hint="Required for follow-up"
                />
              </div>
            )}
          </div>

          <div className="feedback-actions">
            <Button
              id="fb-skip"
              type="button"
              variant="ghost"
              size="md"
              onClick={() => navigate(`/w/${token}`)}
            >
              Skip for now
            </Button>
            <Button
              id="fb-submit"
              type="submit"
              variant="primary"
              size="md"
              loading={mutation.isPending}
            >
              {mutation.isPending ? 'Submitting…' : 'Submit feedback'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
