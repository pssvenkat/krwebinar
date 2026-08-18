-- Migration: 0001_initial_schema.sql
-- Phase 1: Bootstrap tables
-- Creates the core tenant and health tables needed for the platform to boot.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ─────────────────────────────────────────────────────────────────
-- TENANTS (VENDORS)
-- The root entity. Every other table references this.
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tenants (
  id          TEXT PRIMARY KEY,          -- ULID
  slug        TEXT NOT NULL UNIQUE,      -- URL-safe, e.g. "krave"
  name        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'trial'  -- trial | active | suspended
               CHECK (status IN ('trial', 'active', 'suspended')),
  plan        TEXT NOT NULL DEFAULT 'free',
  created_at  DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at  DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants (slug);

-- ─────────────────────────────────────────────────────────────────
-- TENANT BRANDING
-- One row per tenant. Stores all visual customization.
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tenant_branding (
  id                TEXT PRIMARY KEY,    -- ULID
  tenant_id         TEXT NOT NULL UNIQUE REFERENCES tenants (id) ON DELETE CASCADE,
  logo_url          TEXT,
  favicon_url       TEXT,
  primary_color     TEXT,
  secondary_color   TEXT,
  accent_color      TEXT,
  background_color  TEXT,
  surface_color     TEXT,
  text_color        TEXT,
  muted_color       TEXT,
  border_color      TEXT,
  success_color     TEXT,
  warning_color     TEXT,
  error_color       TEXT,
  font_heading      TEXT,
  font_body         TEXT,
  updated_at        DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────────────────────────
-- TENANT SETTINGS
-- Feature flags and quotas per tenant.
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tenant_settings (
  id                              TEXT PRIMARY KEY,  -- ULID
  tenant_id                       TEXT NOT NULL UNIQUE REFERENCES tenants (id) ON DELETE CASCADE,
  allowed_countries               TEXT NOT NULL DEFAULT '[]',  -- JSON array of ISO codes
  max_webinars                    INTEGER NOT NULL DEFAULT 10,
  max_participants                INTEGER NOT NULL DEFAULT 300,
  chat_rate_limit_messages        INTEGER NOT NULL DEFAULT 5,
  chat_rate_limit_window_seconds  INTEGER NOT NULL DEFAULT 10,
  updated_at                      DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────────────────────────
-- USERS (ADMIN)
-- Platform and vendor admin users. NOT participants.
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,   -- ULID
  tenant_id   TEXT REFERENCES tenants (id) ON DELETE CASCADE,  -- NULL for PLATFORM_OWNER
  email       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role        TEXT NOT NULL
               CHECK (role IN ('PLATFORM_OWNER', 'VENDOR_OWNER', 'VENDOR_ADMIN', 'MODERATOR', 'PRESENTER')),
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at  DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users (tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ─────────────────────────────────────────────────────────────────
-- SEED: Demo tenant (Krave Microgreens)
-- This is the initial demo vendor for development/testing.
-- In production, vendors are created through the platform admin UI.
-- ─────────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO tenants (id, slug, name, status, plan)
VALUES (
  '01JCRM0000000000000KRAVETEN',
  'krave',
  'Krave Microgreens',
  'active',
  'demo'
);

INSERT OR IGNORE INTO tenant_branding (id, tenant_id)
VALUES (
  '01JCRM0000000000000KRAVEBRD',
  '01JCRM0000000000000KRAVETEN'
);

INSERT OR IGNORE INTO tenant_settings (id, tenant_id)
VALUES (
  '01JCRM0000000000000KRAVESET',
  '01JCRM0000000000000KRAVETEN'
);
