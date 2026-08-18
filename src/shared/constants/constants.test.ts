import { describe, it, expect } from 'vitest'
import {
  APP_VERSION,
  ROLES,
  ROLE_HIERARCHY,
  WEBINAR_STATUS_TRANSITIONS,
  DEFAULT_THEME,
  CHAT_RATE_LIMIT_MESSAGES,
  CHAT_RATE_LIMIT_WINDOW_SECONDS,
} from '../../shared/constants'

describe('Shared Constants', () => {
  it('has a valid app version', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('defines all required roles', () => {
    expect(ROLES.PLATFORM_OWNER).toBe('PLATFORM_OWNER')
    expect(ROLES.VENDOR_OWNER).toBe('VENDOR_OWNER')
    expect(ROLES.VENDOR_ADMIN).toBe('VENDOR_ADMIN')
    expect(ROLES.MODERATOR).toBe('MODERATOR')
    expect(ROLES.PRESENTER).toBe('PRESENTER')
  })

  it('has correct role hierarchy ordering', () => {
    expect(ROLE_HIERARCHY.PLATFORM_OWNER).toBeGreaterThan(ROLE_HIERARCHY.VENDOR_OWNER)
    expect(ROLE_HIERARCHY.VENDOR_OWNER).toBeGreaterThan(ROLE_HIERARCHY.VENDOR_ADMIN)
    expect(ROLE_HIERARCHY.VENDOR_ADMIN).toBeGreaterThan(ROLE_HIERARCHY.MODERATOR)
    expect(ROLE_HIERARCHY.MODERATOR).toBeGreaterThan(ROLE_HIERARCHY.PRESENTER)
  })

  it('has valid webinar status transitions', () => {
    expect(WEBINAR_STATUS_TRANSITIONS.DRAFT).toContain('PUBLISHED')
    expect(WEBINAR_STATUS_TRANSITIONS.PUBLISHED).toContain('LIVE')
    expect(WEBINAR_STATUS_TRANSITIONS.LIVE).toContain('ENDED')
    expect(WEBINAR_STATUS_TRANSITIONS.ENDED).toContain('ARCHIVED')
    expect(WEBINAR_STATUS_TRANSITIONS.ARCHIVED).toHaveLength(0)
  })

  it('has a complete default theme', () => {
    expect(DEFAULT_THEME.primaryColor).toMatch(/^#[0-9a-f]{6}$/i)
    expect(DEFAULT_THEME.secondaryColor).toMatch(/^#[0-9a-f]{6}$/i)
    expect(DEFAULT_THEME.accentColor).toMatch(/^#[0-9a-f]{6}$/i)
    expect(DEFAULT_THEME.backgroundColor).toMatch(/^#[0-9a-f]{6}$/i)
    expect(DEFAULT_THEME.fontHeading).toBe('Nunito')
    expect(DEFAULT_THEME.fontBody).toBe('Inter')
  })

  it('has sensible chat rate limits', () => {
    expect(CHAT_RATE_LIMIT_MESSAGES).toBe(5)
    expect(CHAT_RATE_LIMIT_WINDOW_SECONDS).toBe(10)
  })
})
