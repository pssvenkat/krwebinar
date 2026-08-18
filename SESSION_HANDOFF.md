# SESSION HANDOFF

## Platform: Multi-Tenant White-Label Webinar Platform
## Repository: https://github.com/pssvenkat/krwebinar.git

---

## Current Phase: PHASE 3 COMPLETE ✅

## Next Phase: PHASE 4 — Public Registration Flow

---

## Repository State

| Item | Status |
|---|---|
| GitHub repo | Active — 5 commits on `main` |
| Local clone | `c:\Users\venka\.gemini\antigravity\scratch\kfwebinar` |
| Last commit | `feat: add multi-tenant API foundation (Phase 3)` — `64290a0` |

---

## Phase 3 Summary — Multi-Tenant API Foundation

### D1 Migration Added
`db/migrations/0002_webinars.sql` — 5 new tables:
- `webinars` — tenant-scoped, status: DRAFT→PUBLISHED→LIVE→ENDED→ARCHIVED
- `webinar_registrations` — participant rows, unique `access_token` for /w/:token access
- `lead_captures` — post-webinar interest signals
- `consent_records` — **immutable** DPDP/GDPR audit trail (insert-only)
- `refresh_tokens` — JWT refresh token rotation with revocation

### Server Library (`src/server/lib/`)

| File | Purpose |
|---|---|
| `jwt.ts` | HMAC-SHA256 JWT sign/verify, `generateSecureToken`, `hashToken` — Web Crypto, zero deps |
| `password.ts` | PBKDF2-SHA256 hash/verify (100k iterations, 16-byte salt) — constant-time compare |
| `db.ts` | Typed D1 queries + ULID generator — ALL queries require `tenant_id` |

### Server Middleware (`src/server/middleware/`)

| File | Purpose |
|---|---|
| `tenant.ts` | Resolves tenant from X-Tenant-Slug header → subdomain → custom domain. Sets `c.get('tenant')` |
| `auth.ts` | `requireAuth()` — verifies Bearer JWT, blocks cross-tenant tokens. `requireRole()` — RBAC |

### Server Routes (`src/server/routes/`)

| Route | Method | Auth | Description |
|---|---|---|---|
| `/api/v1/tenant` | GET | None | Public branding + settings |
| `/api/v1/auth/login` | POST | None | email+password → access token + httpOnly refresh cookie |
| `/api/v1/auth/refresh` | POST | Cookie | Rotate refresh token → new access token |
| `/api/v1/auth/logout` | POST | Cookie | Revoke refresh token, clear cookie |
| `/api/v1/auth/me` | GET | Bearer | Current user profile |
| `/api/v1/admin/webinars` | GET | Bearer | List with pagination + status filter |
| `/api/v1/admin/webinars` | POST | Bearer | Create webinar |
| `/api/v1/admin/webinars/:id` | GET | Bearer | Get one |
| `/api/v1/admin/webinars/:id` | PUT | Bearer | Update (blocked for LIVE/ENDED) |
| `/api/v1/admin/webinars/:id` | DELETE | VENDOR_ADMIN | Archive |
| `/api/v1/admin/webinars/:id/publish` | POST | Bearer | DRAFT → PUBLISHED |
| `/api/v1/admin/webinars/:id/go-live` | POST | Bearer | PUBLISHED → LIVE |
| `/api/v1/admin/webinars/:id/end` | POST | Bearer | LIVE → ENDED |

### Client (`src/client/`)

| File | Purpose |
|---|---|
| `lib/api.ts` | Typed fetch wrapper — in-memory token, silent refresh on 401, X-Tenant-Slug dev header |
| `contexts/AuthContext.tsx` | Login/logout state, session restore on mount via silent refresh |
| `hooks/useAuth.ts` | Convenience re-export of `useAuthContext` |
| `hooks/useTenant.ts` | React Query tenant hook — fetches branding, applies CSS vars to document root |

### Security Architecture
- Access tokens: **15-minute expiry**, HMAC-SHA256, in-memory only (never localStorage)
- Refresh tokens: **7-day expiry**, httpOnly cookie, SHA-256 hash stored in D1
- Token rotation: old refresh token revoked on every use
- Cross-tenant protection: JWT `tenantId` must match resolved tenant on every request
- Password: PBKDF2-SHA256 100k iterations + random salt + constant-time compare
- Timing-safe login: always runs hash check even for missing users

---

## Verification Results (Phase 3)

| Check | Result |
|---|---|
| `tsc --noEmit` | ✅ 0 errors |
| `eslint` | ✅ 0 errors, 0 warnings |
| `vitest run` | ✅ **74/74 tests pass** (6 files) |
| `vite build` | ✅ 220 modules, 0 warnings, 6.75s |
| `git push` | ✅ Commit `64290a0` |

**New test files (17 tests):**
- `src/server/lib/jwt.test.ts` — 10 tests (sign/verify, tamper, expiry, malformed)
- `src/server/lib/password.test.ts` — 4 tests (hash/verify, salt uniqueness, malformed)
- `src/server/lib/db.test.ts` — 3 tests (ULID format, uniqueness, time ordering)

---

## Next Phase Instructions — Phase 4: Public Registration Flow

### Goal
Build the complete public-facing webinar registration experience.

### New API Routes
```
GET  /api/v1/webinars/:id/public     → Public webinar info (title, date, host, status)
POST /api/v1/webinars/:id/register   → Register a participant
GET  /api/v1/attend/:token           → Validate access token → webinar details + YouTube ID
POST /api/v1/webinars/:id/feedback   → Submit post-webinar feedback + lead capture
```

### New DB Helpers (add to `src/server/lib/db.ts`)
- `getPublicWebinar(db, tenantId, webinarId)` — only if PUBLISHED or LIVE
- `findRegistrationByToken(db, token)` — for the attend route
- `createRegistration(db, tenantId, webinarId, data)` — check max_participants first
- `createLeadCapture(db, tenantId, webinarId, data)`
- `createConsentRecord(db, tenantId, email, type, granted, meta)` — DPDP/GDPR

### New Routes
- `src/server/routes/public/webinar.ts` — public webinar + register + attend + feedback

### Rate Limiting
- Registration: 3 registrations per IP per webinar per 10 minutes (use DO or D1 counter)
- Feedback: 1 per registration token

### Client Pages
- `src/client/pages/public/RegisterPage.tsx` — registration form using Phase 2 components
  - PhoneInput, CountrySelect, Input, Checkbox (consent), RadioGroup (interest)
  - Zod validation matching the server schema
  - Success state: show confirmation + calendar links (Google/Apple/Outlook ICS)
- `src/client/pages/attend/AttendPage.tsx` — `/w/:token` — YouTube embed + chat sidebar stub
- `src/client/pages/public/FeedbackPage.tsx` — StarRating, Textarea, RadioGroup (interest), Checkbox (contact_requested)

### Tests to Add
- Registration route tests (capacity check, duplicate detection, Turnstile bypass for dev)
- Attend route tests (valid/invalid/expired tokens)
- Feedback route tests

### Rules
- ALL registration forms must record at least `necessary` consent in `consent_records`
- Registration confirmation email stub (Phase 7 sends real email — Phase 4 just logs it)
- `access_token` is 48 random bytes → hex (same `generateSecureToken(48)`)
- For Phase 4, skip real Turnstile verification in development (`ENVIRONMENT === 'development'`)

---

## Cumulative Commands

```bash
npm run dev          # Vite dev server → localhost:5173
npm run dev:worker   # Wrangler → localhost:8787
npm test             # 74 unit tests
npm run build        # Production build
```

---

*Last updated: Phase 3 complete*
*Awaiting approval to proceed with Phase 4*
