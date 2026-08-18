# Architecture — Multi-Tenant White-Label Webinar Platform

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cloudflare Edge                           │
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │ Cloudflare   │    │ Cloudflare   │    │   Cloudflare     │   │
│  │   Workers    │    │     D1       │    │ Durable Objects  │   │
│  │  (API + UI)  │    │  (Database)  │    │  (WebSockets)    │   │
│  └──────┬───────┘    └──────────────┘    └──────────────────┘   │
│         │                                                         │
│  ┌──────┴───────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │ Cloudflare   │    │ Cloudflare   │    │   Cloudflare     │   │
│  │     R2       │    │  Turnstile   │    │      DNS         │   │
│  │  (Storage)   │    │ (Bot Guard)  │    │   (Routing)      │   │
│  └──────────────┘    └──────────────┘    └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
              │                     │
    ┌─────────┴──────┐    ┌────────┴────────┐
    │  React/Vite    │    │  YouTube Live   │
    │  Frontend      │    │  (Video Only)   │
    │  (SPA)         │    │                 │
    └────────────────┘    └─────────────────┘
```

---

## Multi-Tenancy Model

```
Platform (PLATFORM_OWNER)
├── Tenant A — Krave Microgreens (VENDOR_OWNER, VENDOR_ADMIN)
│   ├── Branding (logo, colors, fonts)
│   ├── Webinars
│   │   ├── Registrations
│   │   ├── Participants
│   │   ├── Chat Messages
│   │   ├── Q&A
│   │   ├── Polls
│   │   ├── Attendance
│   │   └── Feedback / Leads
│   └── Privacy Config
├── Tenant B — Another Business
└── Tenant C — Yet Another Business
```

**Tenant Resolution Strategy:**
- Subdomain: `krave.webinar.platform.com` → `tenant_id = krave`
- Path prefix: `/t/krave/...` (fallback for custom domain configurations)
- Custom domains: `webinars.kravemicrogreens.in` → `tenant_id = krave`
- All tenant resolution is **server-side only**

**Tenant Isolation Rule:**  
Every query that touches tenant-owned data MUST include a `WHERE tenant_id = ?` clause using the server-resolved tenant context. Never trust client-supplied tenant IDs.

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18.x | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool and dev server |
| Tailwind CSS | 3.x | Utility-first styling |
| React Router | 6.x | Client-side routing |
| React Query | 5.x | Server state management |
| libphonenumber-js | Latest | International phone validation |
| Zod | Latest | Schema validation (shared) |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Cloudflare Workers | Latest | Edge API runtime |
| TypeScript | 5.x | Type safety |
| Hono | Latest | Lightweight web framework for Workers |
| Zod | Latest | Request validation |

### Infrastructure
| Service | Tier | Purpose |
|---|---|---|
| Cloudflare Workers | Free (100K req/day) | API and SSR |
| Cloudflare D1 | Free (5M reads/day) | Relational database |
| Cloudflare Durable Objects | Free (1M req/month) | WebSocket real-time |
| Cloudflare R2 | Free (10GB storage) | Logo and asset storage |
| Cloudflare Turnstile | Free | Bot protection |
| YouTube Live | Free | Video streaming |

---

## Directory Structure

```
krwebinar/
├── src/
│   ├── client/                 # React frontend
│   │   ├── components/         # Reusable UI components
│   │   │   ├── ui/             # Design system primitives
│   │   │   ├── forms/          # Form components
│   │   │   ├── layout/         # Layout components
│   │   │   └── webinar/        # Webinar-specific components
│   │   ├── pages/              # Route page components
│   │   │   ├── public/         # Participant-facing pages
│   │   │   └── admin/          # Vendor admin pages
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Frontend utilities
│   │   ├── store/              # Client state (Zustand)
│   │   └── main.tsx            # Entry point
│   ├── server/                 # Cloudflare Worker API
│   │   ├── routes/             # API route handlers
│   │   ├── middleware/         # Auth, tenant, CORS middleware
│   │   ├── db/                 # D1 query helpers
│   │   └── index.ts            # Worker entry point
│   ├── durable-objects/        # Cloudflare Durable Objects
│   │   └── WebinarRoom.ts      # Real-time WebSocket handler
│   └── shared/                 # Shared types and utilities
│       ├── types/              # TypeScript interfaces
│       ├── schemas/            # Zod schemas
│       └── constants/          # Shared constants
├── db/
│   └── migrations/             # D1 SQL migration files
├── public/                     # Static assets
├── docs/                       # Documentation
├── tests/
│   ├── unit/                   # Vitest unit tests
│   ├── integration/            # API integration tests
│   └── e2e/                    # Playwright E2E tests
├── wrangler.toml               # Cloudflare configuration
├── vite.config.ts              # Vite build config
├── tsconfig.json               # TypeScript config
├── tailwind.config.ts          # Tailwind config
├── .env.example                # Environment variables template
└── SESSION_HANDOFF.md          # Phase handoff state
```

---

## Real-Time Architecture

```
Participant Browser
      │
      │ WebSocket
      ▼
Cloudflare Worker (upgrade handler)
      │
      │ DO stub
      ▼
WebinarRoom Durable Object
  (one per active webinar: WEBINAR_ROOM:{tenant_id}:{webinar_id})
      │
      │ Broadcasts to all connected participants
      ▼
All Participant Browsers
```

**WebinarRoom Durable Object responsibilities:**
- Maintain participant presence (connect/disconnect)
- Broadcast chat messages
- Broadcast Q&A events (create, vote, approve, answer)
- Broadcast poll events (start, vote, end, results)
- Broadcast announcements
- Track and broadcast participant count
- Rate-limit chat messages per participant

---

## Authentication & Authorization

### Role Hierarchy
```
PLATFORM_OWNER     — full platform access
VENDOR_OWNER       — full access to own tenant
VENDOR_ADMIN       — manages webinars, registrations, leads
MODERATOR          — live webinar controls (chat, Q&A, polls)
PRESENTER          — view-only host panel
```

### Session Model
- Admin users: JWT in HttpOnly cookie (1-hour expiry, refresh)
- Participants: Secure opaque token in HttpOnly session cookie
- Sessions stored in D1 `participant_sessions` table
- Phone number is NEVER used as session identifier
- Sessions can be revoked server-side

### Participant Access Flow
```
Dynamic URL (/w/{token})
      │
      ▼
Enter phone number
      │
      ▼
Server normalizes to E.164
      │
      ▼
Server looks up registration by (tenant_id, webinar_id, phone_e164)
      │
      ▼
Server creates participant_session record
      │
      ▼
Sets HttpOnly cookie with session_id
      │
      ▼
WebSocket upgrade with session validation
      │
      ▼
Participant enters webinar room
```

---

## Data Privacy Architecture

### Consent Layers
1. **Necessary** — webinar participation processing (no opt-out)
2. **Optional** — contact/marketing (explicit opt-in with checkboxes)
3. **Lead** — interest and follow-up preference (explicit per-category)

### Data Rights (DPDP-Ready)
- Access requests (view all stored data)
- Correction requests
- Erasure requests (anonymization, not always hard delete)
- Consent withdrawal
- Grievance submissions

All requests tracked in `privacy_requests` table with workflow states.

---

## Security Architecture

### Tenant Isolation
- All API handlers receive `tenantContext` from middleware
- `tenantContext.tenantId` is resolved from request, never from body
- All D1 queries include `tenant_id = tenantContext.tenantId`
- Automated tests verify cross-tenant data access is rejected

### API Security
- Cloudflare Turnstile on registration and phone-entry forms
- Rate limiting at Worker level (per-IP, per-participant)
- Input validation with Zod on all endpoints
- Parameterized D1 queries (no string concatenation)
- CORS restricted to known origins
- HttpOnly, Secure, SameSite=Strict cookies

### File Upload Security
- R2 upload via presigned URLs only
- File type validation (allow-list: jpg, png, svg, ico)
- Max file size enforced
- Virus/malware scanning not included (document this limitation)

---

## YouTube Live Integration

```
Admin creates webinar → enters YouTube Live Video ID
      │
      ▼
Platform stores video ID (tenant-isolated)
      │
      ▼
Participant joins webinar room
      │
      ▼
Room renders YouTube IFrame player
(https://www.youtube-nocookie.com/embed/{videoId})
      │
      ▼
Platform handles everything else around the video
(chat, Q&A, polls, attendance, feedback)
```

No video proxying. No media server. YouTube handles all streaming.

---

## Database Architecture (D1)

All tables include:
- `id TEXT PRIMARY KEY` (ULID format)
- `tenant_id TEXT NOT NULL` (foreign key to `tenants`)
- `created_at DATETIME`
- `updated_at DATETIME`

Key tables:
- `tenants` — vendor accounts
- `tenant_branding` — logo, colors, fonts per tenant
- `tenant_settings` — feature flags per tenant
- `users` — admin users (VENDOR_OWNER, VENDOR_ADMIN, etc.)
- `webinars` — webinar records
- `participants` — registered participant profiles
- `registrations` — webinar registration records
- `consent_records` — granular consent tracking
- `participant_sessions` — secure session tokens
- `attendance_sessions` — join/leave/heartbeat tracking
- `chat_messages` — persisted chat (optional, rate-limited)
- `questions` — Q&A questions
- `question_votes` — upvotes per question
- `polls` — poll definitions
- `poll_options` — poll choices
- `poll_votes` — participant votes
- `feedback` — post-webinar ratings and suggestions
- `lead_interests` — interest categories per participant
- `privacy_requests` — DPDP data rights requests
- `audit_logs` — immutable action audit trail
- `security_incidents` — security event log

Full schema in `docs/DATABASE_SCHEMA.md` (Phase 25).
