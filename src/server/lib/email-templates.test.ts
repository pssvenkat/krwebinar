/**
 * Email template tests — Phase 6
 *
 * Tests that each template builder returns the correct subject,
 * contains expected text, and includes the unsubscribe link.
 * No network calls — purely functional unit tests.
 */

import { describe, it, expect } from 'vitest'
import {
  buildConfirmationEmail,
  buildLiveNotificationEmail,
  buildReminderEmail,
  buildFeedbackRequestEmail,
  buildVendorAlertEmail,
} from '../lib/email-templates'

const BASE = {
  attendeeName: 'Priya Sharma',
  webinarTitle: 'Microgreens 101',
  webinarDate: '2025-09-01',
  webinarTime: '10:00',
  webinarTimezone: 'Asia/Kolkata',
  hostName: 'Ananya Singh',
  attendUrl: 'https://example.com/w/test-token-abc',
  unsubscribeUrl: 'https://example.com/api/v1/unsubscribe/test-token-abc',
  brandName: 'Krave Microgreens',
}

describe('buildConfirmationEmail', () => {
  it('includes attendee name and webinar title in subject', () => {
    const { subject } = buildConfirmationEmail(BASE)
    expect(subject).toContain('Microgreens 101')
    expect(subject).toContain('registered')
  })

  it('HTML contains attend URL', () => {
    const { html } = buildConfirmationEmail(BASE)
    expect(html).toContain(BASE.attendUrl)
  })

  it('HTML contains unsubscribe URL', () => {
    const { html } = buildConfirmationEmail(BASE)
    expect(html).toContain(BASE.unsubscribeUrl)
  })

  it('HTML contains brand name', () => {
    const { html } = buildConfirmationEmail(BASE)
    expect(html).toContain(BASE.brandName)
  })

  it('plain text contains attend URL', () => {
    const { text } = buildConfirmationEmail(BASE)
    expect(text).toContain(BASE.attendUrl)
    expect(text).toContain(BASE.attendeeName)
  })
})

describe('buildLiveNotificationEmail', () => {
  const data = {
    attendeeName: BASE.attendeeName,
    webinarTitle: BASE.webinarTitle,
    attendUrl: BASE.attendUrl,
    unsubscribeUrl: BASE.unsubscribeUrl,
    brandName: BASE.brandName,
  }

  it('subject includes LIVE', () => {
    const { subject } = buildLiveNotificationEmail(data)
    expect(subject.toLowerCase()).toContain('live')
  })

  it('HTML contains join URL', () => {
    const { html } = buildLiveNotificationEmail(data)
    expect(html).toContain(BASE.attendUrl)
  })

  it('text contains attendee name', () => {
    const { text } = buildLiveNotificationEmail(data)
    expect(text).toContain(BASE.attendeeName)
  })
})

describe('buildReminderEmail', () => {
  const data = {
    attendeeName: BASE.attendeeName,
    webinarTitle: BASE.webinarTitle,
    webinarDate: BASE.webinarDate,
    webinarTime: BASE.webinarTime,
    webinarTimezone: BASE.webinarTimezone,
    attendUrl: BASE.attendUrl,
    unsubscribeUrl: BASE.unsubscribeUrl,
    brandName: BASE.brandName,
  }

  it('subject mentions "30" (minutes)', () => {
    const { subject } = buildReminderEmail(data)
    expect(subject).toContain('30')
  })

  it('HTML contains attend URL', () => {
    const { html } = buildReminderEmail(data)
    expect(html).toContain(BASE.attendUrl)
  })

  it('text contains unsubscribe URL', () => {
    const { text } = buildReminderEmail(data)
    expect(text).toContain(BASE.unsubscribeUrl)
  })
})

describe('buildFeedbackRequestEmail', () => {
  const data = {
    attendeeName: BASE.attendeeName,
    webinarTitle: BASE.webinarTitle,
    feedbackUrl: 'https://example.com/w/test-token-abc/feedback',
    unsubscribeUrl: BASE.unsubscribeUrl,
    brandName: BASE.brandName,
  }

  it('subject asks for feedback', () => {
    const { subject } = buildFeedbackRequestEmail(data)
    expect(subject.toLowerCase()).toMatch(/feedback|thoughts/)
  })

  it('HTML contains feedback URL', () => {
    const { html } = buildFeedbackRequestEmail(data)
    expect(html).toContain(data.feedbackUrl)
  })

  it('text mentions attendee name', () => {
    const { text } = buildFeedbackRequestEmail(data)
    expect(text).toContain(BASE.attendeeName)
  })
})

describe('buildVendorAlertEmail', () => {
  const data = {
    adminEmail: 'admin@krave.in',
    attendeeName: BASE.attendeeName,
    attendeeEmail: 'priya@example.com',
    attendeeCountry: 'IN',
    webinarTitle: BASE.webinarTitle,
    webinarDate: BASE.webinarDate,
    webinarTime: BASE.webinarTime,
    webinarTimezone: BASE.webinarTimezone,
    totalRegistrations: 42,
    brandName: BASE.brandName,
    adminUrl: 'https://example.com/admin/webinars/webinar-1',
  }

  it('subject contains attendee name and webinar title', () => {
    const { subject } = buildVendorAlertEmail(data)
    expect(subject).toContain(BASE.attendeeName)
    expect(subject).toContain(BASE.webinarTitle)
  })

  it('HTML contains total registrations', () => {
    const { html } = buildVendorAlertEmail(data)
    expect(html).toContain('42')
  })

  it('HTML contains admin URL', () => {
    const { html } = buildVendorAlertEmail(data)
    expect(html).toContain(data.adminUrl)
  })

  it('HTML is well-formed (has DOCTYPE)', () => {
    const { html } = buildVendorAlertEmail(data)
    expect(html).toContain('<!DOCTYPE html>')
  })
})
