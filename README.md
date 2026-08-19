# KR Webinar — Multi-Tenant White-Label Webinar Platform

A production-quality, $0-infrastructure webinar platform built on:
- **Cloudflare Workers** (Hono) — server + edge runtime
- **Cloudflare D1** — SQLite database
- **Cloudflare R2** — asset storage
- **Vite + React** — client SPA
- **MailChannels** — transactional email (free tier via Cloudflare)
- **YouTube** — live stream delivery

---

## Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Create local secrets file (never commit this)
cat > .dev.vars << 'EOF'
JWT_SECRET=local-dev-secret-at-least-32-chars-xxxxx
REFRESH_TOKEN_SECRET=local-dev-refresh-secret-32-chars-xx
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
PLATFORM_DOMAIN=localhost:5173
EOF

# 3. Apply DB migrations locally
wrangler d1 migrations apply krwebinar-db --local

# 4. Seed initial tenant + admin (local)
wrangler d1 execute krwebinar-db --local --file=db/seeds/001_initial_tenant.sql

# 5. Start the Cloudflare Worker
npm run dev:worker   # http://localhost:8787

# 6. Start the Vite dev server (separate terminal)
npm run dev          # http://localhost:5173
```

Default admin credentials (local only):
- **Email:** `admin@kravemicrogreens.in`
- **Password:** `ChangeMe123!`

---

## Production Deployment

### Step 1 — Cloudflare Account Setup

1. Log in: `wrangler login`
2. Verify: `wrangler whoami`

### Step 2 — Provision D1 Database

```bash
wrangler d1 create krwebinar-db
```

Copy the `database_id` from the output and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "krwebinar-db"
database_id = "PASTE_ID_HERE"   # ← update this
```

### Step 3 — Run Migrations

```bash
# Apply all migrations to production D1
wrangler d1 migrations apply krwebinar-db
```

Migrations in order:
| File | Description |
|---|---|
| `0001_schema.sql` | Core schema (tenants, users, webinars) |
| `0002_…` | (subsequent migrations) |
| `0006_email_opt_out.sql` | Email opt-out column (Phase 6) |

### Step 4 — Provision R2 Bucket

```bash
wrangler r2 bucket create krwebinar-assets
```

### Step 5 — Set Secrets

```bash
# Generate strong secrets (use a password manager or openssl rand -hex 32)
wrangler secret put JWT_SECRET
wrangler secret put REFRESH_TOKEN_SECRET
wrangler secret put TURNSTILE_SECRET_KEY
```

### Step 6 — Set the Admin Password

```bash
# Generate a hash for your chosen password
npx tsx scripts/hash-password.ts "YourStrongPassword"

# Copy the output hash, then update db/seeds/001_initial_tenant.sql
# Replace the password_hash value in the INSERT OR IGNORE INTO users block
```

### Step 7 — Seed Production Data

```bash
wrangler d1 execute krwebinar-db --file=db/seeds/001_initial_tenant.sql
```

### Step 8 — Configure Turnstile

1. Go to [Cloudflare Dashboard → Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile)
2. Create a new site for your webinar domain
3. Copy the **Site Key** (public) and **Secret Key** (private)
4. Set the secret: `wrangler secret put TURNSTILE_SECRET_KEY`
5. Add the site key to your Vite build:

```bash
# In .env.production (or set as a Cloudflare Pages env var)
VITE_TURNSTILE_SITE_KEY=your_site_key_here
```

### Step 9 — Build and Deploy

```bash
npm run build        # Builds client to dist/client/
wrangler deploy      # Deploys Worker + static assets to Cloudflare
```

### Step 10 — Custom Domain

1. In Cloudflare dashboard: **Workers & Pages → krwebinar → Settings → Domains & Routes**
2. Add your domain: `webinar.kravemicrogreens.in`
3. For multi-tenant routing, add a **Transform Rule** to inject `X-Tenant-Slug` from the hostname

### Step 11 — Email Domain (MailChannels)

Add DNS records for MailChannels DKIM:

```
Type: TXT
Name: _dmarc.yourdomain.com
Value: v=DMARC1; p=none; rua=mailto:admin@yourdomain.com

Type: TXT
Name: mailchannels._domainkey.yourdomain.com
Value: v=DKIM1; p=... (get from MailChannels docs)
```

---

## Live Production Deployment

- **Production URL:** [https://krwebinar.pssvenkat2.workers.dev](https://krwebinar.pssvenkat2.workers.dev)
- **Runtime:** Cloudflare Workers + Durable Objects + D1 SQLite
- **Database:** `krwebinar-db` (D1)
- **Active Version:** `a84589e8-03e0-4237-be48-0f5dcaa6f91f`

Default demo credentials:
- **Tenant Admin:** `admin@kravemicrogreens.in` / `ChangeMe123!`
- **Platform Owner:** `owner@krwebinar.com` / `ChangeMe123!`
- **Demo Live Webinar:** [https://krwebinar.pssvenkat2.workers.dev/w/01HZ0000000000000000000005](https://krwebinar.pssvenkat2.workers.dev/w/01HZ0000000000000000000005)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (React SPA — Vite)                                 │
│  /admin/*           → AdminLayout & Studio (auth-guarded)   │
│  /platform/*        → Platform Owner Dashboard              │
│  /register/:id      → RegisterPage (public)                 │
│  /w/:token          → AttendPage (YouTube + Real-Time DO)   │
└──────────────────────┬──────────────────────────────────────┘
                       │ fetch /api/v1/*  &  WebSocket /api/v1/ws/*
┌──────────────────────▼──────────────────────────────────────┐
│  Cloudflare Worker (Hono)                                   │
│  ├── /api/v1/auth/*         → Auth (JWT + WebCrypto PBKDF2) │
│  ├── /api/v1/admin/*        → Tenant Admin (requireAuth)    │
│  ├── /api/v1/platform/*     → Platform Owner Multi-Tenant   │
│  ├── /api/v1/webinars/*     → Public registration          │
│  ├── /api/v1/attend/*       → Attend token validation       │
│  ├── /api/v1/ws/webinar/*   → WebSocket Upgrade to DO       │
│  ├── /api/v1/unsubscribe/*  → Email opt-out (DPDP)          │
│  └── scheduled              → Cron: 30-min reminders        │
│                                                             │
│  Bindings:                                                  │
│  ├── D1 (DB)                → SQLite database               │
│  ├── R2 (ASSETS_BUCKET)     → Logo/favicon storage          │
│  └── DO (WEBINAR_ROOM)      → WebinarRoom Durable Object    │
└─────────────────────────────────────────────────────────────┘
```

### Multi-Tenancy & Real-Time Engine

1. **Tenant Resolution**:
   - Reads `X-Tenant-Slug` header (dev) or hostname/custom domain (prod).
   - All D1 queries enforce `WHERE tenant_id = ?` for strict data isolation.
2. **Durable Objects Real-Time Room (`WebinarRoom`)**:
   - Deterministic room ID: `{tenantId}:{webinarId}`.
   - Cloudflare WebSocket Hibernation API with `serializeAttachment` and `state.getWebSockets()`.
   - Real-time live chat, interactive live polls, upvotable Q&A with written host answers, live viewer count, and pinned announcements.

---

## Email Notifications

Powered by MailChannels (free via Cloudflare Workers):

| Event | Template |
|---|---|
| Registration confirmed | Confirmation + attend link |
| Webinar goes LIVE | Alert with join link |
| 30 min before start (cron) | Reminder email |
| Webinar ended | Feedback request (attended only) |
| New registration | Vendor admin alert |

Cron runs every 15 minutes (`*/15 * * * *`) and dispatches reminders for webinars starting in 25–35 minutes. All emails include a one-click unsubscribe link compliant with RFC 8058 and Indian DPDP Act 2023.

---

## Test Suite

```bash
npm test     # 157 tests across 18 test files
```

| File | Tests | Coverage Area |
|---|---|---|
| `durable-objects/WebinarRoom.bench.test.ts` | 3 | Concurrency benchmark & 500 participant load |
| `server/routes/health.test.ts` | 3 | Shallow probe & deep D1 latency check |
| `server/middleware/rate-limit.test.ts` | 3 | Edge rate limiter & sliding window |
| `server/routes/admin/domains.test.ts` | 5 | Custom domain verification & SSL |
| `server/routes/platform/tenants.test.ts` | 5 | Platform owner multi-tenant management |
| `server/routes/admin/leads.test.ts` | 4 | CSV export & lead filtering |
| `server/routes/admin/branding.test.ts` | 5 | Tenant branding & CSS variable injection |
| `server/routes/admin/analytics.test.ts` | 5 | Attendance rates & engagement analytics |
| `client/hooks/useWebSocket.test.ts` | 18 | WebSocket reconnection, backoff, cleanup |
| `server/lib/email-templates.test.ts` | 18 | All 5 transactional email builders |
| `server/routes/public/webinar.test.ts` | 13 | Registration & attendee token validation |
| `shared/schemas/schemas.test.ts` | 18 | Zod schema validation rules |
| `client/components/ui/components.test.tsx` | 33 | Design system & accessible UI library |
| `server/lib/jwt.test.ts` | 10 | JWT sign, verify, and expiration |
| `server/lib/password.test.ts` | 4 | PBKDF2 WebCrypto hash & verify |
| `server/lib/db.test.ts` | 3 | D1 database helpers |
| `shared/constants/constants.test.ts` | 6 | Platform constants & default configs |
| `client/App.test.tsx` | 1 | SPA route rendering & auth provider |

---

## Scripts

```bash
npm run dev          # Vite dev server (port 5173)
npm run dev:worker   # Wrangler dev (port 8787)
npm run build        # Production bundle (tsc + vite)
npm test             # Vitest test suite
npm run lint         # ESLint
npx tsx scripts/hash-password.ts <password>   # Generate PBKDF2 hash
```

---

## Complete Phase Roadmap

| Phase | Description | Status |
|---|---|---|
| 0 | Project foundation + architecture audit | ✅ |
| 1 | Web Crypto Auth, JWT, & Zod schemas | ✅ |
| 2 | Accessible UI component library & Design system | ✅ |
| 3 | Multi-tenant API + Tenant resolution middleware | ✅ |
| 4 | Public registration + Attend + Feedback flow | ✅ |
| 5 | Admin dashboard + Webinar lifecycle management | ✅ |
| 6 | Transactional email + Cron reminders + Unsubscribe | ✅ |
| 7 | Cloudflare deployment + D1 migrations + Turnstile | ✅ |
| 8 | Durable Objects WebSocket real-time chat & state | ✅ |
| 9 | Analytics dashboard + CSV export + Attendance metrics | ✅ |
| 10 | White-label tenant branding & live theme injection | ✅ |
| 11 | Post-webinar feedback surveys & lead capture | ✅ |
| 12 | Platform owner dashboard & Tenant provisioning | ✅ |
| 13 | Custom domain SSL management & Edge rate limiting | ✅ |
| 14 | Performance optimization, load benchmarks, & readiness | ✅ |

---

## Security & Compliance

- **JWT Auth**: HS256, 15-minute access tokens, 7-day httpOnly refresh cookies.
- **Passwords**: PBKDF2-SHA256, 100,000 iterations (Cloudflare WebCrypto standard), 16-byte random salt.
- **Turnstile**: Bot protection on public registration (server-side verified).
- **Tenant Isolation**: Server-enforced `WHERE tenant_id = ?` scoping on all queries.
- **DPDP Act 2023**: Explicit consent recording, one-click unsubscribe headers (RFC 8058), data erasure endpoints.
