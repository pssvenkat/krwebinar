-- Migration: 0009_trainer_profile.sql
-- Adds trainer_profiles table for landing page trainer management

CREATE TABLE IF NOT EXISTS trainer_profiles (
  id                      TEXT PRIMARY KEY,
  tenant_id               TEXT NOT NULL UNIQUE REFERENCES tenants (id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  title                   TEXT,
  bio                     TEXT,
  avatar_url              TEXT,
  highlights              TEXT NOT NULL DEFAULT '[]',
  experience_years        TEXT,
  whatsapp_community_url  TEXT,
  social_links            TEXT NOT NULL DEFAULT '{}',
  updated_at              DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_trainer_profiles_tenant_id ON trainer_profiles (tenant_id);

-- Seed initial trainer profile for default demo tenant (krave)
INSERT OR IGNORE INTO trainer_profiles (
  id,
  tenant_id,
  name,
  title,
  bio,
  avatar_url,
  highlights,
  experience_years,
  whatsapp_community_url,
  social_links
) VALUES (
  '01JCRM0000000000000KRAVETRN',
  '01JCRM0000000000000KRAVETEN',
  'Shanthi Ramakrishnamurthy',
  'Lead Trainer & Microgreens Specialist, Krave Microgreens',
  'Shanthi is a passionate urban farming advocate and lead trainer at Krave Microgreens, helping home growers turn small balcony spaces into thriving, profitable microgreens businesses.',
  null,
  '["2,000+ students trained", "Microgreens Pioneer in Coimbatore", "Hands-on Commercial & Home Setup Expert"]',
  '8+ Years Experience',
  'https://chat.whatsapp.com/krave-community',
  '{"website": "https://kravemicrogreens.in"}'
);
