-- ─────────────────────────────────────────────────────────────────
-- CUSTOM DOMAINS (Phase 13)
-- Allows tenants to map custom domains (e.g. webinar.kravemicrogreens.in)
-- with automated SSL and CNAME / TXT verification.
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tenant_domains (
  id                  TEXT PRIMARY KEY,              -- ULID
  tenant_id           TEXT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  domain              TEXT NOT NULL UNIQUE,          -- FQDN, lowercase e.g. "webinar.client.com"
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'active', 'failed', 'deactivated')),
  ssl_status          TEXT NOT NULL DEFAULT 'pending'
                      CHECK (ssl_status IN ('pending', 'active', 'failed', 'issuing')),
  verification_token  TEXT NOT NULL,                 -- Random hex / string for TXT verification
  cname_target        TEXT NOT NULL DEFAULT 'custom.krwebinar.com',
  created_at          DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at          DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tenant_domains_tenant ON tenant_domains (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_domains_domain ON tenant_domains (domain);
