import { describe, it, expect } from 'vitest'
import { registrationSchema, feedbackSchema, createWebinarSchema } from '../../shared/schemas'

describe('Registration Schema', () => {
  const validInput = {
    name: 'Priya Sharma',
    email: 'priya@example.com',
    phoneE164: '+919876543210',
    countryCode: 'IN',
    stateProvince: 'Tamil Nadu',
    city: 'Coimbatore',
    consentNecessary: true as const,
    consentMarketing: false,
  }

  it('accepts a valid Indian registration', () => {
    const result = registrationSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('accepts a valid US registration', () => {
    const result = registrationSchema.safeParse({
      ...validInput,
      phoneE164: '+14155551234',
      countryCode: 'US',
    })
    expect(result.success).toBe(true)
  })

  it('accepts a valid UK registration', () => {
    const result = registrationSchema.safeParse({
      ...validInput,
      phoneE164: '+447700900123',
      countryCode: 'GB',
    })
    expect(result.success).toBe(true)
  })

  it('accepts a valid UAE registration', () => {
    const result = registrationSchema.safeParse({
      ...validInput,
      phoneE164: '+971501234567',
      countryCode: 'AE',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid E.164 phone number', () => {
    const result = registrationSchema.safeParse({
      ...validInput,
      phoneE164: '09876543210', // Missing +
    })
    expect(result.success).toBe(false)
  })

  it('rejects local phone number format', () => {
    const result = registrationSchema.safeParse({
      ...validInput,
      phoneE164: '9876543210', // No country code
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = registrationSchema.safeParse({
      ...validInput,
      email: 'not-an-email',
    })
    expect(result.success).toBe(false)
  })

  it('rejects lowercase country code', () => {
    const result = registrationSchema.safeParse({
      ...validInput,
      countryCode: 'in', // must be uppercase
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing necessary consent', () => {
    const result = registrationSchema.safeParse({
      ...validInput,
      consentNecessary: false,
    })
    expect(result.success).toBe(false)
  })

  it('requires name to be at least 2 characters', () => {
    const result = registrationSchema.safeParse({
      ...validInput,
      name: 'A',
    })
    expect(result.success).toBe(false)
  })
})

describe('Feedback Schema', () => {
  it('accepts a valid 5-star feedback', () => {
    const result = feedbackSchema.safeParse({
      rating: 5,
      suggestion: 'Excellent webinar!',
      interests: ['offline_training', 'franchise'],
      contactRequested: true,
      preferredContact: 'whatsapp',
      consentContact: true,
    })
    expect(result.success).toBe(true)
  })

  it('rejects rating below 1', () => {
    const result = feedbackSchema.safeParse({ rating: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects rating above 5', () => {
    const result = feedbackSchema.safeParse({ rating: 6 })
    expect(result.success).toBe(false)
  })

  it('rejects invalid interest category', () => {
    const result = feedbackSchema.safeParse({
      rating: 4,
      interests: ['invalid_category'],
    })
    expect(result.success).toBe(false)
  })
})

describe('Create Webinar Schema', () => {
  const validWebinar = {
    title: 'Microgreens Masterclass',
    startDate: '2025-01-15',
    startTime: '18:00',
    endTime: '20:00',
    timezone: 'Asia/Kolkata',
    youtubeVideoId: 'dQw4w9WgXcQ',
  }

  it('accepts a valid webinar', () => {
    const result = createWebinarSchema.safeParse(validWebinar)
    expect(result.success).toBe(true)
  })

  it('rejects invalid date format', () => {
    const result = createWebinarSchema.safeParse({
      ...validWebinar,
      startDate: '15-01-2025', // Wrong format
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid time format', () => {
    const result = createWebinarSchema.safeParse({
      ...validWebinar,
      startTime: '6:00 PM', // Wrong format
    })
    expect(result.success).toBe(false)
  })

  it('rejects title shorter than 3 characters', () => {
    const result = createWebinarSchema.safeParse({
      ...validWebinar,
      title: 'AB',
    })
    expect(result.success).toBe(false)
  })
})
