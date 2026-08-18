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
}

function webinarToForm(w: CreateWebinarInput): FormData {
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
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [savedAsDraft, setSavedAsDraft] = useState(false)

  // Populate form when editing
  useEffect(() => {
    if (existingWebinar) {
      setForm(webinarToForm(existingWebinar as unknown as CreateWebinarInput))
    }
  }, [existingWebinar])

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
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
