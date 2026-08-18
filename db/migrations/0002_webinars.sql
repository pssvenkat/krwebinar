-- Migration: 0002_webinars.sql
-- Phase 3: Webinar, registration, lead, and consent tables

PRAGMA foreign_keys = ON;

-- ─────────────────────────────────────────────────────────────────
-- WEBINARS
-- One row per scheduled webinar session. Always scoped to a tenant.
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS webinars (
  id                TEXT PRIMARY KEY,          -- ULID
  tenant_id         TEXT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT,
  host_name         TEXT NOT NULL DEFAULT '',
  start_date        TEXT NOT NULL,             -- ISO date YYYY-MM-DD
  start_time        TEXT NOT NULL,             -- HH:MM (24h)
  end_time          TEXT NOT NULL,             -- HH:MM (24h)
  timezone          TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  youtube_video_id  TEXT,                      -- live stream ID
  status            TEXT NOT NULL DEFAULT 'DRAFT'
                    CHECK (status IN ('DRAFT','PUBLISHED','LIVE','ENDED','ARCHIVED')),
  max_participants  INTEGER NOT NULL DEFAULT 300,
  registration_open INTEGER NOT NULL DEFAULT 1, -- boolean
  created_by        TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at        DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at        DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_webinars_tenant_id       ON webinars (tenant_id);
CREATE INDEX IF NOT EXISTS idx_webinars_status          ON webinars (status);
CREATE INDEX IF NOT EXISTS idx_webinars_tenant_status   ON webinars (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_webinars_start_date      ON webinars (start_date);

-- ─────────────────────────────────────────────────────────────────
-- WEBINAR REGISTRATIONS
-- One row per participant registration. Tenant-isolated.
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS webinar_registrations (
  id               TEXT PRIMARY KEY,           -- ULID
  tenant_id        TEXT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  webinar_id       TEXT NOT NULL REFERENCES webinars (id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  email            TEXT NOT NULL,
  phone_e164       TEXT,                       -- E.164 e.g. +919876543210
  country_code     TEXT,                       -- ISO 3166-1 alpha-2
  state_province   TEXT,
  city             TEXT,
  access_token     TEXT NOT NULL UNIQUE,       -- secure random, used for /w/:token
  attended         INTEGER NOT NULL DEFAULT 0, -- boolean
  registered_at    DATETIME NOT NULL DEFAULT (datetime('now')),
  attended_at      DATETIME
);

CREATE INDEX IF NOT EXISTS idx_registrations_tenant_id   ON webinar_registrations (tenant_id);
CREATE INDEX IF NOT EXISTS idx_registrations_webinar_id  ON webinar_registrations (webinar_id);
CREATE INDEX IF NOT EXISTS idx_registrations_email       ON webinar_registrations (tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_registrations_token       ON webinar_registrations (access_token);

-- ─────────────────────────────────────────────────────────────────
-- LEAD CAPTURES
-- Post-webinar interest signals from participants.
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lead_captures (
  id                  TEXT PRIMARY KEY,         -- ULID
  tenant_id           TEXT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  webinar_id          TEXT REFERENCES webinars (id) ON DELETE SET NULL,
  registration_id     TEXT REFERENCES webinar_registrations (id) ON DELETE SET NULL,
  name                TEXT NOT NULL,
  email               TEXT NOT NULL,
  phone_e164          TEXT,
  country_code        TEXT,
  interests           TEXT NOT NULL DEFAULT '[]', -- JSON array
  rating              INTEGER CHECK (rating BETWEEN 1 AND 5),
  suggestion          TEXT,
  contact_requested   INTEGER NOT NULL DEFAULT 0,
  preferred_contact   TEXT CHECK (preferred_contact IN ('email','whatsapp','call') OR preferred_contact IS NULL),
  created_at          DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leads_tenant_id    ON lead_captures (tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_webinar_id   ON lead_captures (webinar_id);
CREATE INDEX IF NOT EXISTS idx_leads_email        ON lead_captures (tenant_id, email);

-- ─────────────────────────────────────────────────────────────────
-- CONSENT RECORDS
-- Immutable audit trail for DPDP / GDPR compliance.
-- One row per consent event — never updated, only inserted.
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS consent_records (
  id                TEXT PRIMARY KEY,           -- ULID
  tenant_id         TEXT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  subject_email     TEXT NOT NULL,
  subject_phone     TEXT,
  consent_type      TEXT NOT NULL
                    CHECK (consent_type IN ('necessary','marketing','analytics','contact')),
  granted           INTEGER NOT NULL,           -- 1 = granted, 0 = withdrawn
  ip_address        TEXT,
  user_agent        TEXT,
  source_url        TEXT,
  legal_basis       TEXT NOT NULL DEFAULT 'consent',
  recorded_at       DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_consent_tenant_email  ON consent_records (tenant_id, subject_email);
CREATE INDEX IF NOT EXISTS idx_consent_type          ON consent_records (consent_type);

-- ─────────────────────────────────────────────────────────────────
-- REFRESH TOKENS
-- Tracks issued refresh tokens for rotation + revocation.
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          TEXT PRIMARY KEY,                 -- ULID
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  tenant_id   TEXT REFERENCES tenants (id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,             -- SHA-256 of raw token
  expires_at  DATETIME NOT NULL,
  revoked     INTEGER NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_refresh_user_id    ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_token_hash ON refresh_tokens (token_hash);
