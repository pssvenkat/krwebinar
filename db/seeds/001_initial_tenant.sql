-- ─────────────────────────────────────────────────────────────────
-- Phase 7 Seed: Initial Tenant + Admin User
-- ─────────────────────────────────────────────────────────────────
-- Run AFTER all migrations:
--   wrangler d1 execute krwebinar-db --file=db/seeds/001_initial_tenant.sql
--
-- IMPORTANT: Replace the password_hash value with output from:
--   npx tsx scripts/hash-password.ts "YourSecurePassword"
--
-- IDs use a fixed ULID format for idempotent re-seeding.
-- ─────────────────────────────────────────────────────────────────

-- Tenant
INSERT OR IGNORE INTO tenants (id, slug, name, plan_tier, status, created_at, updated_at)
VALUES (
  '01HZ0000000000000000000001',
  'krave',
  'Krave Microgreens',
  'starter',
  'active',
  datetime('now'),
  datetime('now')
);

-- Tenant Branding (green-forward palette)
INSERT OR IGNORE INTO tenant_branding (
  id, tenant_id,
  primary_color, secondary_color, accent_color,
  background_color, surface_color,
  text_color, muted_color, border_color,
  font_heading, font_body,
  border_radius_base,
  created_at, updated_at
) VALUES (
  '01HZ0000000000000000000002',
  '01HZ0000000000000000000001',
  '#16a34a',   -- green-600
  '#15803d',   -- green-700
  '#4ade80',   -- green-400
  '#f9fafb',   -- gray-50
  '#ffffff',   -- white
  '#111827',   -- gray-900
  '#6b7280',   -- gray-500
  '#e5e7eb',   -- gray-200
  'Inter, sans-serif',
  'Inter, sans-serif',
  '0.5rem',
  datetime('now'),
  datetime('now')
);

-- Tenant Settings
INSERT OR IGNORE INTO tenant_settings (
  id, tenant_id,
  max_webinars_per_month,
  max_participants_per_webinar,
  registration_fields,
  consent_purposes,
  support_email,
  timezone,
  locale,
  created_at, updated_at
) VALUES (
  '01HZ0000000000000000000003',
  '01HZ0000000000000000000001',
  10,
  500,
  '["name","email","phone","country"]',
  '["data_processing","marketing"]',
  'hello@kravemicrogreens.in',
  'Asia/Kolkata',
  'en-IN',
  datetime('now'),
  datetime('now')
);

-- Admin User
-- Default password: ChangeMe123!  ← CHANGE THIS BEFORE GOING LIVE
-- To regenerate: npx tsx scripts/hash-password.ts "YourSecurePassword"
INSERT OR IGNORE INTO users (
  id, tenant_id, email, name, password_hash, role, is_active, created_at, updated_at
) VALUES (
  '01HZ0000000000000000000004',
  '01HZ0000000000000000000001',
  'admin@kravemicrogreens.in',
  'Krave Admin',
  'pbkdf2:sha256:310000:59bf6b737685e7c2ec8942af6a46ad8a:efac9e15abc14184059052ef4aadccae31da20c8ea15b5cd35427803a48ce03e',
  'VENDOR_ADMIN',
  1,
  datetime('now'),
  datetime('now')
);

-- Sample published webinar (optional — remove for production)
INSERT OR IGNORE INTO webinars (
  id, tenant_id, title, description, host_name,
  start_date, start_time, end_time, timezone,
  status, max_participants, registration_open,
  created_at, updated_at
) VALUES (
  '01HZ0000000000000000000005',
  '01HZ0000000000000000000001',
  'Introduction to Microgreens',
  'Learn how to grow microgreens at home with minimal setup. Perfect for beginners!',
  'Priya Sharma',
  date('now', '+7 days'),
  '10:00',
  '11:30',
  'Asia/Kolkata',
  'DRAFT',
  100,
  1,
  datetime('now'),
  datetime('now')
);
