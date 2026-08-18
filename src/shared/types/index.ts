/**
 * Shared TypeScript types used by both client and server.
 * These are the core domain types for the webinar platform.
 */

// ─────────────────────────────────────────────────────────────────
// TENANT / VENDOR
// ─────────────────────────────────────────────────────────────────

export type TenantStatus = 'active' | 'suspended' | 'trial'

export interface Tenant {
  id: string
  slug: string // URL-safe identifier e.g. "krave"
  name: string
  status: TenantStatus
  plan: string
  createdAt: string
  updatedAt: string
}

export interface TenantBranding {
  id: string
  tenantId: string
  logoUrl: string | null
  faviconUrl: string | null
  primaryColor: string | null
  secondaryColor: string | null
  accentColor: string | null
  backgroundColor: string | null
  surfaceColor: string | null
  textColor: string | null
  mutedColor: string | null
  borderColor: string | null
  successColor: string | null
  warningColor: string | null
  errorColor: string | null
  fontHeading: string | null
  fontBody: string | null
  updatedAt: string
}

export interface TenantSettings {
  id: string
  tenantId: string
  allowedCountries: string[] // ISO 3166-1 alpha-2 codes, [] = all
  maxWebinars: number
  maxParticipants: number
  chatRateLimitMessages: number
  chatRateLimitWindowSeconds: number
  updatedAt: string
}

// ─────────────────────────────────────────────────────────────────
// USERS (ADMIN)
// ─────────────────────────────────────────────────────────────────

export type UserRole = 'PLATFORM_OWNER' | 'VENDOR_OWNER' | 'VENDOR_ADMIN' | 'MODERATOR' | 'PRESENTER'

export interface User {
  id: string
  tenantId: string | null // null for PLATFORM_OWNER
  email: string
  name: string
  role: UserRole
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ─────────────────────────────────────────────────────────────────
// WEBINAR
// ─────────────────────────────────────────────────────────────────

export type WebinarStatus = 'DRAFT' | 'PUBLISHED' | 'LIVE' | 'ENDED' | 'ARCHIVED'

export interface Webinar {
  id: string
  tenantId: string
  title: string
  description: string | null
  startDate: string // ISO date string
  startTime: string // HH:MM
  endTime: string // HH:MM
  timezone: string // IANA timezone e.g. "Asia/Kolkata"
  youtubeVideoId: string | null
  status: WebinarStatus
  accessToken: string // random secure token for /w/{token}
  featuresChat: boolean
  featuresQa: boolean
  featuresPolls: boolean
  featuresFeedback: boolean
  featuresLeads: boolean
  featuresRegistration: boolean
  createdAt: string
  updatedAt: string
}

// ─────────────────────────────────────────────────────────────────
// PARTICIPANT
// ─────────────────────────────────────────────────────────────────

export interface Participant {
  id: string
  tenantId: string
  name: string
  email: string
  phoneE164: string // E.164 format e.g. +919876543210
  countryCode: string // ISO 3166-1 alpha-2 e.g. "IN"
  stateProvince: string | null
  city: string | null
  createdAt: string
  updatedAt: string
}

export interface Registration {
  id: string
  tenantId: string
  webinarId: string
  participantId: string
  registeredAt: string
  consentVersion: string
}

// ─────────────────────────────────────────────────────────────────
// REALTIME / WEBSOCKET MESSAGES
// ─────────────────────────────────────────────────────────────────

export type ClientMessageType =
  | 'JOIN_ROOM'
  | 'CHAT_SEND'
  | 'QUESTION_CREATE'
  | 'QUESTION_VOTE'
  | 'POLL_VOTE'
  | 'HEARTBEAT'
  | 'LEAVE_ROOM'

export type ServerMessageType =
  | 'ROOM_STATE'
  | 'CHAT_MESSAGE'
  | 'CHAT_DELETED'
  | 'QUESTION_CREATED'
  | 'QUESTION_UPDATED'
  | 'POLL_STARTED'
  | 'POLL_UPDATED'
  | 'POLL_ENDED'
  | 'ANNOUNCEMENT'
  | 'PARTICIPANT_COUNT'
  | 'ERROR'

export interface BaseClientMessage {
  type: ClientMessageType
  sessionId: string
}

export interface JoinRoomMessage extends BaseClientMessage {
  type: 'JOIN_ROOM'
  webinarId: string
}

export interface ChatSendMessage extends BaseClientMessage {
  type: 'CHAT_SEND'
  content: string
}

export interface QuestionCreateMessage extends BaseClientMessage {
  type: 'QUESTION_CREATE'
  content: string
  anonymous: boolean
}

export interface QuestionVoteMessage extends BaseClientMessage {
  type: 'QUESTION_VOTE'
  questionId: string
}

export interface PollVoteMessage extends BaseClientMessage {
  type: 'POLL_VOTE'
  pollId: string
  optionIds: string[]
}

export interface HeartbeatMessage extends BaseClientMessage {
  type: 'HEARTBEAT'
}

export interface LeaveRoomMessage extends BaseClientMessage {
  type: 'LEAVE_ROOM'
}

export type ClientMessage =
  | JoinRoomMessage
  | ChatSendMessage
  | QuestionCreateMessage
  | QuestionVoteMessage
  | PollVoteMessage
  | HeartbeatMessage
  | LeaveRoomMessage

export interface BaseServerMessage {
  type: ServerMessageType
  timestamp: string
}

export interface RoomStateMessage extends BaseServerMessage {
  type: 'ROOM_STATE'
  participantCount: number
  chatEnabled: boolean
  qaEnabled: boolean
  activePollId: string | null
}

export interface ChatMessage extends BaseServerMessage {
  type: 'CHAT_MESSAGE'
  id: string
  participantId: string
  participantName: string
  content: string
}

export interface ChatDeletedMessage extends BaseServerMessage {
  type: 'CHAT_DELETED'
  messageId: string
}

export interface ParticipantCountMessage extends BaseServerMessage {
  type: 'PARTICIPANT_COUNT'
  count: number
}

export interface AnnouncementMessage extends BaseServerMessage {
  type: 'ANNOUNCEMENT'
  id: string
  content: string
}

export interface ErrorMessage extends BaseServerMessage {
  type: 'ERROR'
  code: string
  message: string
}

export type ServerMessage =
  | RoomStateMessage
  | ChatMessage
  | ChatDeletedMessage
  | ParticipantCountMessage
  | AnnouncementMessage
  | ErrorMessage

// ─────────────────────────────────────────────────────────────────
// API RESPONSE WRAPPERS
// ─────────────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  ok: true
  data: T
}

export interface ApiError {
  ok: false
  error: {
    code: string
    message: string
    details?: Record<string, string[]>
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

export interface HealthResponse {
  status: 'ok'
  version: string
  environment: string
  timestamp: string
}
