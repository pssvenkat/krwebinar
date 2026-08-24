-- 0011_dpdp_erasure_requests.sql
-- Table for Digital Personal Data Protection (DPDP) attendee data erasure & purge requests

CREATE TABLE IF NOT EXISTS dpdp_erasure_requests (
  id                TEXT PRIMARY KEY,                  -- ULID
  tenant_id         TEXT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  email             TEXT,
  phone             TEXT,
  reason            TEXT,
  status            TEXT NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'COMPLETED', 'REJECTED')),
  ip_address        TEXT,
  user_agent        TEXT,
  created_at        DATETIME NOT NULL DEFAULT (datetime('now')),
  processed_at      DATETIME,
  processed_by      TEXT,
  resolution_notes  TEXT
);

CREATE INDEX IF NOT EXISTS idx_dpdp_tenant_status ON dpdp_erasure_requests (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_dpdp_tenant_email  ON dpdp_erasure_requests (tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_dpdp_tenant_created ON dpdp_erasure_requests (tenant_id, created_at DESC);
