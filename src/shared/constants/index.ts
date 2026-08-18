/**
 * Shared constants used by both client and server.
 */

export const APP_VERSION = '0.1.0'

// ─────────────────────────────────────────────────────────────────
// ROLES
// ─────────────────────────────────────────────────────────────────

export const ROLES = {
  PLATFORM_OWNER: 'PLATFORM_OWNER',
  VENDOR_OWNER: 'VENDOR_OWNER',
  VENDOR_ADMIN: 'VENDOR_ADMIN',
  MODERATOR: 'MODERATOR',
  PRESENTER: 'PRESENTER',
} as const

export const ROLE_HIERARCHY: Record<string, number> = {
  PLATFORM_OWNER: 100,
  VENDOR_OWNER: 80,
  VENDOR_ADMIN: 60,
  MODERATOR: 40,
  PRESENTER: 20,
}

// ─────────────────────────────────────────────────────────────────
// WEBINAR STATUS MACHINE
// ─────────────────────────────────────────────────────────────────

export const WEBINAR_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  LIVE: 'LIVE',
  ENDED: 'ENDED',
  ARCHIVED: 'ARCHIVED',
} as const

export const WEBINAR_STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['PUBLISHED'],
  PUBLISHED: ['LIVE', 'DRAFT'],
  LIVE: ['ENDED'],
  ENDED: ['ARCHIVED'],
  ARCHIVED: [],
}

// ─────────────────────────────────────────────────────────────────
// RATE LIMITS (defaults — can be overridden per tenant)
// ─────────────────────────────────────────────────────────────────

export const CHAT_RATE_LIMIT_MESSAGES = 5
export const CHAT_RATE_LIMIT_WINDOW_SECONDS = 10

// ─────────────────────────────────────────────────────────────────
// PRIVACY
// ─────────────────────────────────────────────────────────────────

export const CONSENT_PURPOSES = {
  WEBINAR_PROCESSING: 'webinar_processing', // Necessary
  MARKETING_CONTACT: 'marketing_contact', // Optional
} as const

export const PRIVACY_REQUEST_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
} as const

export const PRIVACY_REQUEST_TYPES = {
  ACCESS: 'access',
  CORRECTION: 'correction',
  ERASURE: 'erasure',
  CONSENT_WITHDRAWAL: 'consent_withdrawal',
  GRIEVANCE: 'grievance',
} as const

// ─────────────────────────────────────────────────────────────────
// FILE UPLOADS
// ─────────────────────────────────────────────────────────────────

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']
export const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024 // 2MB
export const MAX_FAVICON_SIZE_BYTES = 512 * 1024 // 512KB

// ─────────────────────────────────────────────────────────────────
// LEAD INTERESTS
// ─────────────────────────────────────────────────────────────────

export const LEAD_INTERESTS = {
  OFFLINE_TRAINING: 'offline_training',
  ONLINE_TRAINING: 'online_training',
  FRANCHISE: 'franchise',
  SETUP_ASSISTANCE: 'setup_assistance',
} as const

export const LEAD_INTEREST_LABELS: Record<string, string> = {
  offline_training: 'Offline Training',
  online_training: 'Online Training',
  franchise: 'Franchise',
  setup_assistance: 'Setup Assistance',
}

// ─────────────────────────────────────────────────────────────────
// DEMO THEME (KraveFresh-inspired defaults)
// ─────────────────────────────────────────────────────────────────

export const DEFAULT_THEME = {
  primaryColor: '#1a4731',
  secondaryColor: '#2d7a3a',
  accentColor: '#f5a623',
  backgroundColor: '#faf9f6',
  surfaceColor: '#ffffff',
  textColor: '#1c2b1e',
  mutedColor: '#6b7c6e',
  borderColor: '#e2e8e4',
  successColor: '#22c55e',
  warningColor: '#f59e0b',
  errorColor: '#ef4444',
  fontHeading: 'Nunito',
  fontBody: 'Inter',
} as const
