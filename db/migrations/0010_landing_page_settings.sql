-- Migration: 0010_landing_page_settings.sql
-- Adds landing_page_settings table for customizable landing page CMS & fallback redirect

CREATE TABLE IF NOT EXISTS landing_page_settings (
  id                        TEXT PRIMARY KEY,
  tenant_id                 TEXT NOT NULL UNIQUE REFERENCES tenants (id) ON DELETE CASCADE,
  fallback_redirect_url     TEXT NOT NULL DEFAULT 'https://kravemicrogreens.in',
  fallback_redirect_secs    INTEGER NOT NULL DEFAULT 5,
  fallback_title            TEXT NOT NULL DEFAULT 'No Live Webinar Scheduled At The Moment',
  fallback_message          TEXT NOT NULL DEFAULT 'We are currently preparing our next live masterclass batch. You will be redirected to our main website shortly.',
  hero_headline_override    TEXT,
  hero_subheading_override  TEXT,
  hero_badge_text           TEXT DEFAULT 'FREE LIVE WEBINAR',
  hero_social_proof_text    TEXT DEFAULT '2,000+ entrepreneurs already registered',
  hero_primary_cta_text     TEXT DEFAULT '🎯 Reserve My Free Spot',
  hero_secondary_cta_text   TEXT DEFAULT '💬 Join WhatsApp Community',
  benefits_json             TEXT NOT NULL DEFAULT '[]',
  testimonials_json         TEXT NOT NULL DEFAULT '[]',
  faqs_json                 TEXT NOT NULL DEFAULT '[]',
  footer_links_json         TEXT NOT NULL DEFAULT '[]',
  updated_at                DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_landing_settings_tenant_id ON landing_page_settings (tenant_id);

-- Seed default landing page configuration for demo tenant (krave)
INSERT OR IGNORE INTO landing_page_settings (
  id,
  tenant_id,
  fallback_redirect_url,
  fallback_redirect_secs,
  fallback_title,
  fallback_message,
  hero_headline_override,
  hero_subheading_override,
  hero_badge_text,
  hero_social_proof_text,
  hero_primary_cta_text,
  hero_secondary_cta_text,
  benefits_json,
  testimonials_json,
  faqs_json
) VALUES (
  '01JCRM0000000000000KRAVELND',
  '01JCRM0000000000000KRAVETEN',
  'https://kravemicrogreens.in',
  5,
  'No Live Webinar Scheduled At The Moment',
  'We are currently scheduling our next high-yield live masterclass. You will be redirected to our main website shortly.',
  null,
  null,
  'FREE LIVE WEBINAR',
  '2,000+ entrepreneurs already registered',
  '🎯 Reserve My Free Spot',
  '💬 Join WhatsApp Community',
  '[]',
  '[]',
  '[]'
);
