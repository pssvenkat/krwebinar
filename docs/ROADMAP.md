# Implementation Roadmap

## Platform: Multi-Tenant White-Label Webinar Platform

---

## Phase Status

| Phase | Title | Status | Session |
|---|---|---|---|
| 0 | Repository Audit | ✅ Complete | Session 1 |
| 1 | Project Foundation | ⬜ Pending | Session 2 |
| 2 | Design System | ⬜ Pending | Session 2 |
| 3 | Multi-Tenant Foundation | ⬜ Pending | Session 3 |
| 4 | Vendor Business Profile | ⬜ Pending | Session 3 |
| 5 | Vendor Branding | ⬜ Pending | Session 4 |
| 6 | Webinar Management | ⬜ Pending | Session 4 |
| 7 | International Registration | ⬜ Pending | Session 5 |
| 8 | Privacy / Consent Foundation | ⬜ Pending | Session 5 |
| 9 | Secure Webinar Access | ⬜ Pending | Session 6 |
| 10 | Public Webinar Experience | ⬜ Pending | Session 6 |
| 11 | Realtime Durable Object | ⬜ Pending | Session 7 |
| 12 | Chat | ⬜ Pending | Session 7 |
| 13 | Q&A | ⬜ Pending | Session 7 |
| 14 | Polls | ⬜ Pending | Session 8 |
| 15 | Host Control Center | ⬜ Pending | Session 8 |
| 16 | Attendance | ⬜ Pending | Session 9 |
| 17 | Feedback + Lead Page | ⬜ Pending | Session 9 |
| 18 | Lead Management | ⬜ Pending | Session 9 |
| 19 | Analytics | ⬜ Pending | Session 10 |
| 20 | Privacy / Data Rights | ⬜ Pending | Session 10 |
| 21 | Security Hardening | ⬜ Pending | Session 11 |
| 22 | $0 Quota Protection | ⬜ Pending | Session 11 |
| 23 | Mobile + Accessibility | ⬜ Pending | Session 12 |
| 24 | End-to-End Testing | ⬜ Pending | Session 12 |
| 25 | Production Readiness | ⬜ Pending | Session 13 |

---

## Phase 0 — Repository Audit ✅

**Goal:** Inspect repo, research visual direction, create architecture plan.

**Deliverables:**
- `docs/PROJECT_OVERVIEW.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `SESSION_HANDOFF.md`

**Repository State:** Empty (no commits, no files)

---

## Phase 1 — Project Foundation

**Goal:** Working React/Vite app with Cloudflare Worker backend.

**Deliverables:**
- Vite + React + TypeScript project
- Tailwind CSS
- ESLint + Prettier
- Vitest + Playwright test setup
- Wrangler + `wrangler.toml`
- D1 database created
- `GET /api/health` endpoint
- Application shell (routing, layout)
- `.env.example`

**Test targets:** typecheck, lint, unit tests, build

---

## Phase 2 — Design System

**Goal:** Complete, themed UI component library.

**Design Direction:** KraveFresh-inspired (natural greens, warm off-white, golden accent)

**Deliverables:**
- CSS design tokens (all via CSS variables)
- Typography system (Inter/Nunito from Google Fonts)
- Button, Input, Select, PhoneInput, CountrySelect
- Textarea, Checkbox, Radio, Card, Badge
- Modal, Drawer, Tabs, Table, Pagination
- Toast, Alert, Dropdown, Avatar
- EmptyState, LoadingState, ErrorState
- StarRating, Progress, ThemePreview
- Vendor theme override support

---

## Phase 3 — Multi-Tenant Foundation

**Goal:** Working multi-tenant isolation with RBAC.

**Deliverables:**
- `tenants`, `users` D1 tables
- Tenant resolution middleware
- JWT admin authentication
- RBAC enforcement middleware
- Tenant isolation test suite
- Demo tenant (Krave) seeded

---

## Phase 4 — Vendor Business Profile

**Goal:** Vendor admin can configure their business details.

**Deliverables:**
- Admin `/admin/profile` page
- Business info form (name, description, website, etc.)
- Contact info fields
- Privacy contacts (DPDP requirements)
- Validation frontend + backend

---

## Phase 5 — Vendor Branding

**Goal:** Full brand customization per tenant.

**Deliverables:**
- `/admin/branding` page
- Logo and favicon upload to R2
- Color picker for all design tokens
- Live preview of registration/room/feedback pages
- Branding stored in D1, assets in R2

---

## Phase 6 — Webinar Management

**Goal:** Complete webinar CRUD with status management.

**Deliverables:**
- `webinars` D1 table + migrations
- Admin webinar list, create, edit, archive
- Status machine: DRAFT → PUBLISHED → LIVE → ENDED → ARCHIVED
- Single-active-webinar enforcement
- Feature toggles per webinar

---

## Phase 7 — International Registration

**Goal:** Public registration with international phone support.

**Deliverables:**
- Public registration page
- Country selector (all countries)
- International phone input with `libphonenumber-js`
- E.164 storage
- State/City fields
- Frontend + backend validation

---

## Phase 8 — Privacy / Consent Foundation

**Goal:** DPDP-ready consent tracking.

**Deliverables:**
- `consent_records` table
- Consent capture at registration (necessary vs. optional)
- Privacy notice versioning
- Consent withdrawal support

---

## Phase 9 — Secure Webinar Access

**Goal:** Secure token-based participant access.

**Deliverables:**
- Secure access URL generation (`/w/{random_token}`)
- Phone-based participant verification
- `participant_sessions` table
- HttpOnly session cookies
- Session expiration and revocation

---

## Phase 10 — Public Webinar Experience

**Goal:** Polished, branded participant-facing webinar room.

**Deliverables:**
- Branded webinar room page
- YouTube IFrame embed
- Chat panel
- Q&A panel
- Poll panel
- Announcements
- Mobile-responsive layout

---

## Phase 11 — Realtime Durable Object

**Goal:** WebSocket-based real-time layer.

**Deliverables:**
- `WebinarRoom` Durable Object
- WebSocket connection management
- Typed message protocol
- Presence tracking
- Participant count broadcasting

---

## Phase 12 — Chat

**Goal:** Moderated, rate-limited real-time chat.

**Deliverables:**
- Send, receive, delete, clear
- Mute and ban participants
- Enable/disable chat per webinar
- Slow mode (configurable)
- Server-side rate limiting (5 msg/10s)

---

## Phase 13 — Q&A

**Goal:** Moderated Q&A with upvoting.

**Deliverables:**
- Ask question, anonymous option
- Upvote questions
- Sort by votes
- Approve, reject, highlight, pin, mark answered, remove

---

## Phase 14 — Polls

**Goal:** Interactive polls with result visualization.

**Deliverables:**
- Poll types: single, multiple, yes/no, rating
- Create, start, close, results, hide results
- Duplicate vote prevention
- Participant poll UI

---

## Phase 15 — Host Control Center

**Goal:** Live moderation dashboard for hosts.

**Deliverables:**
- Live host dashboard
- Participant count, chat activity, Q&A, poll stats
- All moderation controls in one place

---

## Phase 16 — Attendance

**Goal:** Granular attendance tracking.

**Deliverables:**
- `attendance_sessions` table
- Join/leave timestamps
- Heartbeat tracking
- Reconnect handling
- Attendance analytics

---

## Phase 17 — Feedback + Lead Page

**Goal:** Single combined post-webinar page.

**Deliverables:**
- Star rating
- Suggestion textarea
- Interest categories (checkboxes)
- Contact preference
- Explicit marketing consent checkbox
- `feedback` and `lead_interests` tables

---

## Phase 18 — Lead Management

**Goal:** Vendor lead dashboard with export.

**Deliverables:**
- `/admin/leads` dashboard
- Search and filters
- CSV export with audit trail

---

## Phase 19 — Analytics

**Goal:** Per-webinar analytics dashboard.

**Deliverables:**
- Key metrics (registrations, attendees, leads, etc.)
- Geographic breakdown
- Lead interest breakdown
- Lightweight charts

---

## Phase 20 — Privacy / Data Rights

**Goal:** Self-service data rights for participants.

**Deliverables:**
- `privacy_requests` table
- Access, correction, erasure, withdrawal, grievance workflows
- Retention configuration
- Admin review interface

---

## Phase 21 — Security Hardening

**Goal:** Comprehensive security testing and hardening.

**Deliverables:**
- Tenant isolation tests
- RBAC tests
- IDOR tests
- Rate limit tests
- WebSocket auth tests

---

## Phase 22 — $0 Quota Protection

**Goal:** Stay within Cloudflare free tier.

**Deliverables:**
- Usage monitoring
- Degraded mode at 90%+ quota
- Admin quota alerts

---

## Phase 23 — Mobile + Accessibility

**Goal:** Excellent mobile and accessible experience.

**Deliverables:**
- Mobile participant experience audit
- Keyboard navigation
- Screen reader support
- WCAG 2.1 AA compliance target

---

## Phase 24 — End-to-End Testing

**Goal:** Full participant journey E2E tests.

**Deliverables:**
- Complete Playwright E2E suite
- All 20+ journey steps passing

---

## Phase 25 — Production Readiness

**Goal:** All documentation, all tests passing, production build.

**Deliverables:**
- Full documentation suite
- All tests passing
- Production build
- Deployment guide

---

## Open Questions / Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Custom domain strategy for tenants? | TBD in Phase 3 |
| 2 | Admin JWT issuer (self-signed vs. Cloudflare Access)? | Self-signed for Phase 3, revisit |
| 3 | Chat message persistence (D1 vs. ephemeral)? | Store in D1 with TTL purge |
| 4 | R2 presigned URL generation approach? | Worker-side presigned URLs |
| 5 | Email notifications? | Out of scope ($0 constraint) — document limitation |
| 6 | WhatsApp registration reminders? | Out of scope for now |
| 7 | Cloudflare Turnstile integration point? | Registration form + phone verification |
