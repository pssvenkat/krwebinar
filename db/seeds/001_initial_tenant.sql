-- ─────────────────────────────────────────────────────────────────
-- Phase 7 Seed: Initial Tenant + Admin Users + Sample Webinar
-- ─────────────────────────────────────────────────────────────────

-- Tenant
INSERT OR IGNORE INTO tenants (id, slug, name, plan, status, created_at, updated_at)
VALUES (
  '01JCRM0000000000000KRAVETEN',
  'krave',
  'Krave Microgreens',
  'starter',
  'active',
  datetime('now'),
  datetime('now')
);

-- Vendor Admin User (Krave Microgreens)
-- Email: admin@kravemicrogreens.in | Password: ChangeMe123!
INSERT OR IGNORE INTO users (
  id, tenant_id, email, name, password_hash, role, is_active, created_at, updated_at
) VALUES (
  '01HZ0000000000000000000004',
  '01JCRM0000000000000KRAVETEN',
  'admin@kravemicrogreens.in',
  'Krave Admin',
  'pbkdf2:sha256:100000:054bfc96a87189ada1509b587c577a8a:fe47b927227ac01321c04a9190b2a8f6582e1b460698adf716077e9e9eba97c4',
  'VENDOR_ADMIN',
  1,
  datetime('now'),
  datetime('now')
);

-- Platform Owner User
-- Email: owner@krwebinar.com | Password: ChangeMe123!
INSERT OR IGNORE INTO users (
  id, tenant_id, email, name, password_hash, role, is_active, created_at, updated_at
) VALUES (
  '01HZ0000000000000000000009',
  NULL,
  'owner@krwebinar.com',
  'Platform Owner',
  'pbkdf2:sha256:100000:054bfc96a87189ada1509b587c577a8a:fe47b927227ac01321c04a9190b2a8f6582e1b460698adf716077e9e9eba97c4',
  'PLATFORM_OWNER',
  1,
  datetime('now'),
  datetime('now')
);

-- Sample published webinar
INSERT OR IGNORE INTO webinars (
  id, tenant_id, title, description, host_name,
  start_date, start_time, end_time, timezone,
  status, max_participants, registration_open,
  youtube_video_id,
  created_at, updated_at
) VALUES (
  '01HZ0000000000000000000005',
  '01JCRM0000000000000KRAVETEN',
  'Introduction to Urban Microgreens',
  'Learn how to grow nutrient-dense microgreens at home with minimal setup. Perfect for beginners and enthusiasts!',
  'Priya Sharma',
  date('now', '+3 days'),
  '10:00',
  '11:30',
  'Asia/Kolkata',
  'PUBLISHED',
  100,
  1,
  'dQw4w9WgXcQ',
  datetime('now'),
  datetime('now')
);

-- Sample registration & token for attendee live room testing
INSERT OR IGNORE INTO webinar_registrations (
  id, tenant_id, webinar_id, email, name, phone_e164, country_code,
  access_token, attended, registered_at
) VALUES (
  '01HZ0000000000000000000010',
  '01JCRM0000000000000KRAVETEN',
  '01HZ0000000000000000000005',
  'attendee@example.com',
  'Demo Attendee',
  '+919876543210',
  'IN',
  'demo-token',
  0,
  datetime('now')
);
