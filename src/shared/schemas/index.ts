import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────
// COMMON
// ─────────────────────────────────────────────────────────────────

export const ulidSchema = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/, 'Invalid ULID')

export const phoneE164Schema = z
  .string()
  .regex(/^\+[1-9]\d{6,14}$/, 'Phone must be in E.164 format (e.g. +919876543210)')

export const countryCodeSchema = z
  .string()
  .length(2)
  .regex(/^[A-Z]{2}$/, 'Country code must be 2 uppercase letters (ISO 3166-1 alpha-2)')

// ─────────────────────────────────────────────────────────────────
// REGISTRATION
// ─────────────────────────────────────────────────────────────────

export const registrationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(120),
  email: z.string().email('Invalid email address').max(255),
  phoneE164: phoneE164Schema,
  countryCode: countryCodeSchema,
  stateProvince: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  consentNecessary: z.literal(true, {
    errorMap: () => ({ message: 'Necessary consent is required to register' }),
  }),
  consentMarketing: z.boolean().default(false),
})

export type RegistrationInput = z.infer<typeof registrationSchema>

// ─────────────────────────────────────────────────────────────────
// FEEDBACK + LEADS
// ─────────────────────────────────────────────────────────────────

export const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  suggestion: z.string().max(1000).optional(),
  interests: z
    .array(z.enum(['offline_training', 'online_training', 'franchise', 'setup_assistance']))
    .default([]),
  contactRequested: z.boolean().default(false),
  preferredContact: z.enum(['phone', 'whatsapp', 'email']).optional(),
  consentContact: z.boolean().default(false),
})

export type FeedbackInput = z.infer<typeof feedbackSchema>

// ─────────────────────────────────────────────────────────────────
// WEBINAR (ADMIN)
// ─────────────────────────────────────────────────────────────────

export const createWebinarSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM'),
  timezone: z.string().min(1, 'Timezone is required'),
  youtubeVideoId: z.string().max(20).optional(),
  featuresChat: z.boolean().default(true),
  featuresQa: z.boolean().default(true),
  featuresPolls: z.boolean().default(true),
  featuresFeedback: z.boolean().default(true),
  featuresLeads: z.boolean().default(true),
  featuresRegistration: z.boolean().default(true),
})

export type CreateWebinarInput = z.infer<typeof createWebinarSchema>
