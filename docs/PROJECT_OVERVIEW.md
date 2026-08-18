# Multi-Tenant White-Label Webinar Platform

## Project Overview

A production-quality, multi-tenant, white-label webinar platform built on Cloudflare's edge infrastructure with $0/month infrastructure cost. Designed to power live webinars for businesses of all sizes, initially demoed with Krave Microgreens as the first tenant.

---

## What This Platform Does

The platform enables businesses (vendors) to:

- Host live webinars using YouTube Live as the video backbone
- Register and manage participants internationally
- Run real-time chat, Q&A, and polls during live sessions
- Collect feedback and qualified leads at the end of each webinar
- Manage their brand (logo, colors, fonts) so participants see a fully white-labeled experience
- Track attendance, analytics, and participant data
- Handle privacy compliance (DPDP-ready) including consent, access requests, and data erasure

Participants experience:

- A branded webinar room (not a generic platform)
- Easy phone-based registration and access
- Smooth YouTube Live video with surrounding engagement features
- A single, polished exit page that captures feedback and lead intent

---

## Target Audience

**Vendors (Platform Customers):**
- Small and medium businesses
- Training providers
- Agricultural/health companies (Krave Microgreens is the demo tenant)
- Coaching and consulting firms
- Any business wanting branded live events

**Participants (End Users):**
- International audience — India, Middle East, UK, US, and beyond
- Mobile-first users
- Non-technical participants

---

## Key Principles

| Principle | Implementation |
|---|---|
| Multi-tenant | Every record carries `tenant_id`. Isolation enforced server-side. |
| White-label | Vendor branding applied at runtime. No platform branding visible to participants. |
| $0 infrastructure | Cloudflare Workers, D1, Durable Objects, R2 free tier |
| YouTube-powered | No custom video streaming; embeds YouTube Live |
| International | libphonenumber-js, E.164, country/state/city fields |
| Privacy-aware | DPDP-ready consent records, purpose tracking, data rights |
| Mobile-first | Responsive participant experience; admin is desktop-optimized |
| Secure | RBAC server-side, secure sessions, tenant isolation tests |

---

## Initial Demo Tenant

**Vendor:** Krave Microgreens  
**Website:** https://kravemicrogreens.in  
**Location:** Coimbatore, Tamil Nadu, India  
**Use case:** Live webinars for microgreens training, DIY workshops, franchise information sessions

The demo theme is inspired by Krave Microgreens' visual language:
- Natural deep green primary
- Fresh leaf green secondary
- Warm golden accent
- Off-white organic background

This theme is the **default demo theme only**. Any vendor can override every token.

---

## Platform Constraints

- **Target concurrency:** 300 simultaneous participants per webinar
- **Infrastructure budget:** $0/month (Cloudflare free tier)
- **Video provider:** YouTube Live only (no WebRTC, no SFU)
- **Database:** Cloudflare D1 (SQLite at the edge)
- **Real-time:** Cloudflare Durable Objects + WebSockets
- **Storage:** Cloudflare R2 for logos and assets
- **Bot protection:** Cloudflare Turnstile

---

## Repository

**GitHub:** https://github.com/pssvenkat/krwebinar.git

---

## Document Map

| Document | Purpose |
|---|---|
| `docs/PROJECT_OVERVIEW.md` | This document — product and business context |
| `docs/ARCHITECTURE.md` | Technical architecture and system design |
| `docs/ROADMAP.md` | Implementation phases and milestones |
| `docs/DATABASE_SCHEMA.md` | D1 schema with all tables (Phase 25) |
| `docs/API_SPEC.md` | REST + WebSocket API specification (Phase 25) |
| `docs/SECURITY.md` | Security model, threat model, controls |
| `docs/DPDP_READINESS.md` | Privacy compliance technical readiness |
| `docs/CLOUDFLARE_SETUP.md` | Cloudflare account and service configuration |
| `docs/DEPLOYMENT.md` | Deployment instructions |
| `docs/TESTING.md` | Test strategy and test commands |
| `SESSION_HANDOFF.md` | Session-to-session handoff state |
