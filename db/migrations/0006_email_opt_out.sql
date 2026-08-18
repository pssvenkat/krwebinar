-- Phase 6: Email opt-out support
-- Add email_opt_out column to webinar_registrations
-- This column is immutable once set (DPDP compliance)

ALTER TABLE webinar_registrations
  ADD COLUMN email_opt_out INTEGER NOT NULL DEFAULT 0;

-- Index for fast opt-out filtering in bulk-send queries
CREATE INDEX IF NOT EXISTS idx_registrations_opt_out
  ON webinar_registrations (webinar_id, email_opt_out);
