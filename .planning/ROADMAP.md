# Roadmap: Brief

## Overview

Brief is a personalised daily news briefing delivered by email and web. The build sequence is dictated by hard pipeline dependencies: the data layer and auth must exist before preferences, preferences before content ingestion, ingestion before AI summarisation, summarisation before delivery scheduling, and the web app last (built on a stable data model). Email infrastructure is established before the pipeline sends any real email — deliverability cannot be recovered once a domain is blocklisted. The final phase hardens the full system for 10-20 real beta users.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Database, auth, and user preference model — everything else builds on this (completed 2026-03-04)
- [x] **Phase 2: Email Infrastructure** - Sending domain, DNS records, email template, and compliance before any real email is sent (completed 2026-03-04)
- [ ] **Phase 3: Content Pipeline** - RSS and API feed ingestion, deduplication, and topic-to-source mapping
- [x] **Phase 4: AI Summarisation** - Article-level LLM summarisation with caching, source grounding, and cost controls
 (completed 2026-03-02)
- [x] **Phase 5: Scheduling and Delivery** - Cron-driven fan-out pipeline that assembles and sends the daily briefing (completed 2026-03-04)
- [x] **Phase 5.1: Settings Page** *(gap closure — INSERTED)* - Dashboard settings page so users can update topics and delivery time post-signup (completed 2026-03-04)
- [ ] **Phase 6: Web App** - Briefing viewer, archive, preference management, and public landing page
- [ ] **Phase 7: Beta Polish** - Full-system hardening before opening to beta users

## Phase Details

### Phase 1: Foundation
**Goal**: Users can create accounts, log in, and set their topic and delivery preferences — the complete data model and auth layer that every downstream phase depends on
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, PREF-01, PREF-02
**Success Criteria** (what must be TRUE):
  1. A user can sign up with email and password and their consent timestamp and IP are recorded
  2. A logged-in user stays logged in across browser refresh and can log out from any page
  3. A user who has forgotten their password can reset it via an emailed link
  4. A user can enter freeform topics of interest and set a daily delivery time
**Plans**: 6 plans

Plans:
- [x] 01-01-PLAN.md — Scaffold Next.js 15 project, install all dependencies, define Drizzle schema and Zod validation schemas
- [x] 01-02-PLAN.md — Configure Auth.js v5 split-config (edge-safe + full server), JWT sessions, middleware, rate limiter
- [x] 01-03-PLAN.md — Implement auth server actions (signup, sign-in, sign-out, password reset) and preference actions
- [x] 01-04-PLAN.md — Build 3-step onboarding flow UI (signup, topics, delivery time, confirmation) and reusable components
- [x] 01-05-PLAN.md — Build login, forgot-password, reset-password pages and protected dashboard placeholder
- [x] 01-06-PLAN.md — Human verification of complete auth and preference flows against live infrastructure

### Phase 2: Email Infrastructure
**Goal**: The email channel is fully configured and legally compliant before any briefing email reaches a real inbox
**Depends on**: Phase 1
**Requirements**: AUTH-07, MAIL-02, MAIL-03, MAIL-04
**Success Criteria** (what must be TRUE):
  1. Sending domain passes SPF, DKIM, and DMARC checks on MXToolbox before any email is sent to a real address
  2. Every outgoing email includes a plain text alternative and a List-Unsubscribe header
  3. A user clicking the one-click unsubscribe link is immediately suppressed with no further emails sent
  4. A bounce or complaint event from the email provider automatically updates the suppression list via webhook
**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md — Install React Email packages, add emailSuppressions schema, build VerifyEmail and ResetPassword templates
- [x] 02-02-PLAN.md — Upgrade email helpers with HTML+text+headers, update auth sends, create webhook and unsubscribe routes
- [x] 02-03-PLAN.md — DNS setup: configure mail.brief.app in Resend, add SPF/DKIM/MX/DMARC records, verify with MXToolbox

### Phase 3: Content Pipeline
**Goal**: The system reliably ingests articles from RSS feeds and news APIs for user topics, deduplicates them, and stores them ready for summarisation
**Depends on**: Phase 1
**Requirements**: CONT-01, CONT-02, CONT-04
**Success Criteria** (what must be TRUE):
  1. Running the ingestion pipeline for a user's topics produces a set of deduplicated articles in the database with source name and original URL attached to each
  2. A single failing RSS feed or API source does not abort the pipeline run — other sources continue and errors are logged per feed
  3. Re-running ingestion for the same topics does not insert duplicate articles (content hash deduplication works)
**Plans**: 4 plans

Plans:
- [ ] 03-01-PLAN.md — Add articles table to Drizzle schema, define ingestion types, implement dedup helpers and persist helper
- [ ] 03-02-PLAN.md — Implement RSS source adapter (BBC curated feeds) and Reddit adapter (RSS + hot.json + subreddit search)
- [x] 03-03-PLAN.md — Implement Guardian API and NewsData.io source adapters
- [ ] 03-04-PLAN.md — Wire ingestForUser() orchestrator, create POST /api/dev/ingest dev trigger, human verify end-to-end

### Phase 4: AI Summarisation
**Goal**: The system generates a personalised prose briefing for a user from ingested articles, with source grounding and cost-safe caching
**Depends on**: Phase 3
**Requirements**: CONT-03
**Success Criteria** (what must be TRUE):
  1. Running the summarisation pipeline for a user produces a complete prose briefing organised by topic, with source attribution linking to original articles
  2. Summarising the same article twice does not make a second LLM call — the cached summary is reused
  3. Every LLM call has a max_tokens cap set and the Anthropic spend cap is active before any beta user triggers the pipeline
  4. A manually reviewed sample of 10+ briefing items contains no claims that cannot be traced to the source article text
**Plans**: 4 plans

Plans:
- [ ] 04-01-PLAN.md — Extend Drizzle schema: body/description columns on articles, briefings and briefingItems tables, migration
- [ ] 04-02-PLAN.md — Summarisation library: install @anthropic-ai/sdk, types, Redis cache, LLM wrapper, ranker, assembler
- [ ] 04-03-PLAN.md — Pipeline orchestrator: generateBriefingForUser(), dev API route, CLI test script
- [ ] 04-04-PLAN.md — Human verification: run pipeline end-to-end, confirm cache, audit 10+ bullets for grounding

### Phase 5: Scheduling and Delivery
**Goal**: The full pipeline runs automatically every day, delivering each user's briefing at their chosen time with guaranteed idempotency
**Depends on**: Phase 4, Phase 2
**Requirements**: MAIL-01
**Success Criteria** (what must be TRUE):
  1. A user receives their briefing email at approximately their chosen delivery time on each day the pipeline runs
  2. Re-running or retrying any pipeline job for a user on a given date does not result in a second email being sent to that user that day
  3. A user whose delivery time falls in a non-UTC timezone receives their briefing at the correct local time
**Plans**: 5 plans

Plans:
- [ ] 05-01-PLAN.md — Add deliveries table to Drizzle schema and push migration to Neon
- [ ] 05-02-PLAN.md — Create BriefingEmail react-email template and sendBriefingEmail helper
- [ ] 05-03-PLAN.md — Implement dispatch.ts: timezone check, idempotency gate, per-user pipeline orchestration
- [ ] 05-04-PLAN.md — Create cron route, health endpoint, and vercel.json cron configuration
- [ ] 05-05-PLAN.md — Deploy to Vercel and human-verify end-to-end email delivery

### Phase 5.1: Settings Page *(gap closure — INSERTED)*
**Goal**: Users can update their topics and delivery time from the dashboard, and the Preferences link in briefing emails resolves to a working page
**Depends on**: Phase 5
**Requirements**: PREF-03
**Success Criteria** (what must be TRUE):
  1. A logged-in user can navigate to /dashboard/settings and see their current topics and delivery time
  2. A user can update their topics and save — the next briefing reflects the change
  3. A user can update their delivery time and save — dispatch respects the new time
  4. Clicking "Preferences" in a briefing email navigates to /dashboard/settings (no 404)
**Plans**: 3 plans

Plans:
- [x] 05.1-01-PLAN.md — Add design system tokens + editorial fonts, build DashboardSidebar, replace dashboard shell layout
- [x] 05.1-02-PLAN.md — Install sonner + select, build /dashboard/settings Server Component + SettingsForm Client Component
- [x] 05.1-03-PLAN.md — TypeScript build check + human verify complete settings page feature

### Phase 6: Web App
**Goal**: Users can read their briefings, browse their history, manage preferences, and find Brief — all from the web
**Depends on**: Phase 5
**Requirements**: PREF-03, PREF-04, WEB-01, WEB-02, WEB-03, WEB-04
**Success Criteria** (what must be TRUE):
  1. A user can open today's briefing in the web app and read it with source attribution links to original articles
  2. A user can browse their last 14 days of briefings in an archive and open any past briefing
  3. A user can update their topics and delivery time from a settings page and have those changes reflected in the next briefing
  4. A visitor who has not signed up can read what Brief does and express interest in the beta from a public landing page
  5. The web app suggests adjacent topics based on a user's existing selections
**Plans**: 4 plans

Plans:
- [x] 06-01-PLAN.md — Foundation: proxy.ts migration, install react-markdown + remark-gfm, add Libre Baskerville font + ticker keyframe, fix signup email pre-fill, add extractBriefingHeadline utility
- [ ] 06-02-PLAN.md — Briefing viewer + archive: replace /dashboard placeholder, BriefingViewer/BriefingList/TopicSuggestions components, [id] route, addTopicAction, topic-graph.ts
- [ ] 06-03-PLAN.md — Public landing page: all 8 sections, CSS ticker, email CTA routing, root page.tsx with auth redirect
- [ ] 06-04-PLAN.md — Human verification of all 6 phase success criteria in live browser

### Phase 7: Beta Polish
**Goal**: Every system component is verified to be robust and legally compliant before real beta users are onboarded
**Depends on**: Phase 6
**Requirements**: (No new requirements — cross-cutting quality gate across all 23 v1 requirements)
**Success Criteria** (what must be TRUE):
  1. The briefing email renders correctly in Gmail, Outlook, and Apple Mail (tested via Litmus or Mail Tester)
  2. The full unsubscribe flow is verified end-to-end: link click → immediate suppression → no further sends
  3. Injecting a permanently-failing feed URL into the pipeline confirms the pipeline continues and the failure is logged
  4. AI briefing summaries pass a manual spot-check audit confirming no hallucinated claims against source articles
  5. Basic observability is in place: per-stage error logging and a daily briefing count metric are visible before first beta send
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 5.1 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 6/6 | Complete   | 2026-03-04 |
| 2. Email Infrastructure | 3/3 | Complete   | 2026-03-04 |
| 3. Content Pipeline | 3/4 | In Progress|  |
| 4. AI Summarisation | 4/4 | Complete   | 2026-03-02 |
| 5. Scheduling and Delivery | 4/5 | In Progress|  |
| 5.1. Settings Page | 3/3 | Complete    | 2026-03-04 |
| 6. Web App | 1/4 | In Progress | - |
| 7. Beta Polish | 0/TBD | Not started | - |
