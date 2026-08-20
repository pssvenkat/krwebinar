import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useWebinar, useCreateWebinar, useUpdateWebinar } from '../../hooks/useWebinars'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Checkbox } from '../../components/ui/Checkbox'
import { Alert } from '../../components/ui/Alert'
import { LoadingState, ErrorState } from '../../components/ui/States'
import type { CreateWebinarInput } from '../../hooks/useWebinars'

// ── Timezone list (common zones for Indian/Global use) ─────────────

const TIMEZONES = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Los_Angeles',
  'UTC',
]

// ── Form ─────────────────────────────────────────────────────────

const DEFAULT_INTEREST_SUGGESTIONS = [
  'Buy a home microgreens kit',
  'Bulk supply for restaurant / hotel',
  'Corporate wellness program',
  'Consulting & commercial growing',
  'Become a reseller / distributor',
]

type FormData = {
  title: string
  description: string
  hostName: string
  startDate: string
  startTime: string
  endTime: string
  timezone: string
  youtubeVideoId: string
  maxParticipants: string
  registrationOpen: boolean
  feedbackInterests: string[]
}

const EMPTY_FORM: FormData = {
  title: '',
  description: '',
  hostName: '',
  startDate: '',
  startTime: '10:00',
  endTime: '11:00',
  timezone: 'Asia/Kolkata',
  youtubeVideoId: '',
  maxParticipants: '100',
  registrationOpen: true,
  feedbackInterests: DEFAULT_INTEREST_SUGGESTIONS,
}

function webinarToForm(w: any): FormData {
  return {
    title: w.title,
    description: w.description ?? '',
    hostName: w.hostName,
    startDate: w.startDate,
    startTime: w.startTime,
    endTime: w.endTime,
    timezone: w.timezone ?? 'Asia/Kolkata',
    youtubeVideoId: w.youtubeVideoId ?? '',
    maxParticipants: w.maxParticipants?.toString() ?? '100',
    registrationOpen: w.registrationOpen ?? true,
    feedbackInterests: Array.isArray(w.feedbackInterests) && w.feedbackInterests.length > 0
      ? w.feedbackInterests
      : DEFAULT_INTEREST_SUGGESTIONS,
  }
}

// ── Main ─────────────────────────────────────────────────────────

export default function AdminWebinarFormPage() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id
  const navigate = useNavigate()

  const { data: existingWebinar, isLoading: loadingWebinar, error: loadError } = useWebinar(id)
  const createMutation = useCreateWebinar()
  const updateMutation = useUpdateWebinar(id!)

  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [newInterest, setNewInterest] = useState('')
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [savedAsDraft, setSavedAsDraft] = useState(false)

  // Populate form when editing
  useEffect(() => {
    if (existingWebinar) {
      setForm(webinarToForm(existingWebinar))
    }
  }, [existingWebinar])

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  const handleAddInterest = () => {
    const trimmed = newInterest.trim()
    if (!trimmed) return
    if (!form.feedbackInterests.includes(trimmed)) {
      setForm((f) => ({ ...f, feedbackInterests: [...f.feedbackInterests, trimmed] }))
    }
    setNewInterest('')
  }

  const handleRemoveInterest = (indexToRemove: number) => {
    setForm((f) => ({
      ...f,
      feedbackInterests: f.feedbackInterests.filter((_, idx) => idx !== indexToRemove),
    }))
  }

  const toPayload = (): CreateWebinarInput => ({
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    hostName: form.hostName.trim(),
    startDate: form.startDate,
    startTime: form.startTime,
    endTime: form.endTime,
    timezone: form.timezone,
    youtubeVideoId: form.youtubeVideoId.trim() || undefined,
    maxParticipants: form.maxParticipants ? parseInt(form.maxParticipants, 10) : undefined,
    registrationOpen: form.registrationOpen,
    feedbackInterests: form.feedbackInterests.filter(Boolean),
  })

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setGlobalError(null)
    try {
      if (isEdit) {
        await updateMutation.mutateAsync(toPayload())
        setSavedAsDraft(true)
        setTimeout(() => setSavedAsDraft(false), 2000)
      } else {
        const webinar = await createMutation.mutateAsync(toPayload())
        navigate(`/admin/webinars/${webinar.id}`, { replace: true })
      }
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Save failed')
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  if (isEdit && loadingWebinar) return <LoadingState label="Loading webinar…" />
  if (isEdit && loadError) return <ErrorState error={loadError as Error} />
  if (isEdit && existingWebinar && (existingWebinar.status === 'LIVE' || existingWebinar.status === 'ENDED')) {
    return (
      <div className="admin-form-page">
        <Alert variant="warning" title="Read-only">
          This webinar is {existingWebinar.status}. It can no longer be edited.
          <button type="button" className="admin-link" onClick={() => navigate(`/admin/webinars/${id}`)}>
            {' '}View details →
          </button>
        </Alert>
      </div>
    )
  }

  return (
    <div className="admin-form-page">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{isEdit ? 'Edit Webinar' : 'Create Webinar'}</h1>
          <p className="admin-page-subtitle">
            {isEdit ? 'Changes auto-save on submit' : 'Webinar starts as a draft — publish when ready'}
          </p>
        </div>
        <div className="admin-page-actions">
          <Button id="form-cancel" variant="ghost" size="md" onClick={() => navigate(isEdit ? `/admin/webinars/${id}` : '/admin/webinars')}>
            Cancel
          </Button>
        </div>
      </div>

      {globalError && (
        <Alert variant="error" onClose={() => setGlobalError(null)}>
          {globalError}
        </Alert>
      )}
      {savedAsDraft && (
        <Alert variant="success">Changes saved ✓</Alert>
      )}

      <form onSubmit={handleSave} className="admin-form" noValidate>
        {/* Basic info */}
        <section className="admin-form-section">
          <h2 className="admin-form-section-title">Basic Information</h2>
          <div className="admin-form-grid">
            <Input
              id="wf-title"
              label="Webinar title"
              type="text"
              placeholder="Microgreens 101: Grow Your Own"
              value={form.title}
              onChange={set('title')}
              required
            />
            <label className="input-label" htmlFor="wf-description">
              Description
              <textarea
                id="wf-description"
                className="input-field"
                placeholder="What will attendees learn?"
                rows={3}
                value={form.description}
                onChange={set('description')}
              />
            </label>
            <Input
              id="wf-host"
              label="Host name"
              type="text"
              placeholder="Priya Sharma"
              value={form.hostName}
              onChange={set('hostName')}
              required
            />
          </div>
        </section>

        {/* Schedule */}
        <section className="admin-form-section">
          <h2 className="admin-form-section-title">Schedule</h2>
          <div className="admin-form-grid-4">
            <Input
              id="wf-date"
              label="Date"
              type="date"
              value={form.startDate}
              onChange={set('startDate')}
              required
            />
            <Input
              id="wf-start-time"
              label="Start time"
              type="time"
              value={form.startTime}
              onChange={set('startTime')}
              required
            />
            <Input
              id="wf-end-time"
              label="End time"
              type="time"
              value={form.endTime}
              onChange={set('endTime')}
              required
            />
            <label className="input-label" htmlFor="wf-timezone">
              Timezone
              <select id="wf-timezone" className="input-field" value={form.timezone} onChange={set('timezone')}>
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {/* Stream + capacity */}
        <section className="admin-form-section">
          <h2 className="admin-form-section-title">Stream &amp; Capacity</h2>
          <div className="admin-form-grid-2">
            <Input
              id="wf-youtube"
              label="YouTube Video ID (optional)"
              type="text"
              placeholder="e.g. dQw4w9WgXcQ"
              value={form.youtubeVideoId}
              onChange={set('youtubeVideoId')}
              hint="The ID from youtube.com/watch?v=VIDEO_ID — add before going live"
            />
            <Input
              id="wf-max"
              label="Max participants"
              type="number"
              min="1"
              max="10000"
              value={form.maxParticipants}
              onChange={set('maxParticipants')}
              hint="Leave at 100 for the free plan"
            />
          </div>
          <Checkbox
            id="wf-reg-open"
            label="Registration is open"
            checked={form.registrationOpen}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, registrationOpen: e.target.checked }))}
            hint="Uncheck to pause registrations without unpublishing"
          />
        </section>

        {/* Post-Webinar Feedback & Interest Areas */}
        <section className="admin-form-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div>
              <h2 className="admin-form-section-title" style={{ margin: 0 }}>Feedback Survey Interests</h2>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                Configure the interest areas attendees can choose when submitting feedback for this webinar.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setForm((f) => ({ ...f, feedbackInterests: DEFAULT_INTEREST_SUGGESTIONS }))}
            >
              Reset Suggestions
            </Button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Consulting & commercial growing, Starter kit, Bulk supply..."
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddInterest()
                }
              }}
            />
            <Button type="button" variant="secondary" size="md" onClick={handleAddInterest}>
              + Add
            </Button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {form.feedbackInterests.map((interest, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.75rem',
                  background: 'var(--color-surface, #f8fafc)',
                  border: '1px solid var(--color-border, #e2e8f0)',
                  borderRadius: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)', width: '20px' }}>
                    {idx + 1}.
                  </span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--color-text)' }}>{interest}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveInterest(idx)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    padding: '2px 8px',
                  }}
                  title="Remove interest"
                >
                  ✕
                </button>
              </div>
            ))}
            {form.feedbackInterests.length === 0 && (
              <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', fontStyle: 'italic', margin: 0 }}>
                No custom interests added. Default general questions will be shown.
              </p>
            )}
          </div>
        </section>

        {/* Actions */}
        <div className="admin-form-actions">
          <Button id="wf-cancel-bottom" type="button" variant="ghost" size="md" onClick={() => navigate(isEdit ? `/admin/webinars/${id}` : '/admin/webinars')}>
            Cancel
          </Button>
          <Button id="wf-save" type="submit" variant="primary" size="md" loading={isPending}>
            {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create webinar'}
          </Button>
        </div>
      </form>
    </div>
  )
}
