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

---

## Real-Time Engine (Cloudflare Durable Objects)

The platform utilizes Cloudflare Durable Objects (`WebinarRoom`) with the **WebSocket Hibernation API** for zero-idle-cost real-time state synchronization:

```
Participant / Host Browser (WebSocket)
            │
            ▼ (HTTP Upgrade GET /api/v1/ws/webinar/:id/ws)
Cloudflare Worker (Hono Route)
   ├── Authenticates token / session
   ├── Bypasses header mutation middleware
   └── Proxies Request: stub.fetch(new Request(doUrl, c.req.raw))
            │
            ▼
Durable Object instance: {tenantId}:{webinarId}
   ├── state.acceptWebSocket(server, [sessionId])
   ├── server.serializeAttachment({ sessionId, name, isHost })
   ├── Manages in-memory state (Chat, Polls, Q&A, Host Name, Announcements)
   └── Broadcasts via state.getWebSockets()
```

### Real-Time Protocol & Event Schemas

| Event Type | Direction | Payload Description |
|---|---|---|
| `JOIN` / `GET_STATE` | Client → DO | Request current room state snapshot |
| `ROOM_STATE` | DO → Client | Full room snapshot (`chatHistory`, `polls`, `questions`, `hostName`, `pinnedAnnouncement`, `viewerCount`) |
| `CHAT_MESSAGE` | Bidirectional | Chat entry with participant name, content, timestamp, and host badge |
| `POLL_CREATE` / `POLL_STARTED` | Bidirectional | Live poll creation with choices and initial 0-count tallies |
| `POLL_VOTE` / `POLL_UPDATED` | Bidirectional | Real-time option vote increment and aggregated distribution |
| `QUESTION_CREATE` / `QUESTION_CREATED` | Bidirectional | Question submitted by participant with author metadata |
| `QUESTION_VOTE` / `QUESTION_UPDATED` | Bidirectional | Upvote tally increment for priority sorting |
| `QUESTION_ANSWER` / `QUESTION_UPDATED` | Bidirectional | Host written answer or "Answered Live" flag broadcast to room |
| `HOST_NAME_UPDATE` / `HOST_NAME_UPDATED` | Bidirectional | Dynamic host name change broadcast to attendee header |
| `ANNOUNCEMENT` | DO → Client | Pinned banner announcement broadcast to all viewers |

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
- `webinar_registrations` — webinar registration records
- `leads` — post-webinar qualified leads
- `feedback` — post-webinar ratings and suggestions
- `domains` — custom domain configurations
