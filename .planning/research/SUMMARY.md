# Project Research Summary

**Project:** Brief — personalised daily news briefing SaaS
**Domain:** AI-powered email newsletter / news briefing
**Researched:** 2026-02-25
**Confidence:** MEDIUM

## Executive Summary

Brief is a personalised daily news briefing product delivered via email and web, with AI summarisation as its core differentiator. The product occupies a genuine gap: no named competitor synthesises full article content into a unified prose briefing per user-defined topic. Competitors either use human editors (Morning Brew), aggregate headlines only (Mailbrew), or apply algorithmic re-ranking without synthesis (Feedly Leo). The recommended approach is a fully serverless monorepo — Next.js 15 on Vercel, Neon Postgres, QStash for queuing, Resend for email, and Claude Haiku for summarisation — deployable as a single repo with zero separate infrastructure at PoC scale (10-20 users). The entire system fits within free tiers, making it viable to validate the core loop before any spend is committed.

The recommended architecture is a three-stage async pipeline: feed ingestion, AI summarisation, and email delivery, each as a separate queued job. This is non-negotiable — running the pipeline synchronously inside a cron job or HTTP request will fail at the point where LLM latency (5-30 seconds per call) and feed fetch variability collide with serverless timeouts. The fan-out pattern (cron dispatches per-user jobs to a queue) enables independent retry per user and clean concurrency scaling. The hardest dependency to get right is source-to-topic mapping: translating a user's freeform topic entry into high-quality RSS feeds and news API queries is editorial as much as technical, and it must precede everything downstream.

The primary risks are email deliverability (SPF/DKIM/DMARC must be configured before the first beta send, not after), AI cost runaway (summarise at article level, not user level, to avoid O(users * topics * articles) cost scaling), and content trust (hallucination grounding in prompts is required, not optional, for a product whose value is information accuracy). These risks are all preventable with explicit up-front design — none require complex solutions, but all require deliberate sequencing in the roadmap.

---

## Key Findings

### Recommended Stack

The stack is a tight, serverless-first set of technologies that deliberately avoids infrastructure that would require a persistent server. Next.js 15 (App Router) serves both the web UI and API routes from a single monorepo on Vercel. Drizzle ORM with Neon (serverless Postgres) handles the data layer without Prisma's cold-start and bundle-size problems in serverless contexts. Auth.js v5 (beta) provides App Router-native magic link auth — appropriate for a newsletter product where users return infrequently and password management is friction.

The email delivery choice (Resend + React Email) is the most important infrastructure decision beyond the framework: it directly affects the product's ability to reach inboxes. For queuing, QStash (Upstash) replaces BullMQ because Vercel's serverless environment cannot maintain the persistent Redis connections BullMQ requires. Vercel Cron handles the trigger, QStash handles per-user job dispatch and retry. Claude Haiku is recommended for AI summarisation due to cost (approximately $0.001 per briefing at PoC scale) and sufficient quality for news summarisation tasks.

**Core technologies:**
- Next.js 15 + React 19: full-stack framework — single repo for web app and API routes, App Router for server components
- TypeScript 5.x: language — type safety across DB queries, API schemas, email templates; all major deps are TS-first
- PostgreSQL 16 (Neon): primary data store — relational structure for users, topics, briefings, subscriptions; serverless with built-in pooling
- Drizzle ORM 0.30.x: database access — TypeScript-native, lighter than Prisma, edge-compatible with Neon's serverless driver
- Tailwind CSS 4.x: styling — zero PostCSS config, excellent Next.js 15 integration
- Auth.js v5: authentication — App Router-native, magic link login removes password management
- Resend + React Email 3.x: email delivery and templating — developer-first, React Email JSX templates, 3,000 emails/month free
- Claude Haiku (via Vercel AI SDK): AI summarisation — cheapest capable model, ~$0.001/briefing at PoC scale
- QStash (Upstash): job queue — serverless HTTP queue, no persistent connections, 500 messages/day free tier
- Vercel Cron: scheduling — built-in, free, fires the daily dispatch webhook

**Critical version constraints:**
- next-auth must be v5 (beta), not v4 — v4 is incompatible with App Router middleware patterns
- Next.js 15 requires React 19 for App Router; Pages Router still supports React 18
- BullMQ must NOT be used on Vercel (requires persistent Redis connections)

### Expected Features

No named competitor synthesises full article content into prose briefings from user-typed freeform topics. This gap is real and defensible if executed well. Source quality (the editorial problem of mapping topics to trustworthy RSS/API sources) is the hardest ongoing burden — it is not solved once; it requires ongoing curation. Email HTML rendering across clients (Gmail, Outlook, Apple Mail) is consistently underestimated and must be tested before any beta send.

**Must have (table stakes) — v1 launch:**
- User account with email/password signup — required for personalisation
- Freeform topic selection (not a category picker) — core differentiator and personalisation mechanism
- Delivery time configuration with timezone — the daily habit formation hook; timezone bugs are a common churn driver
- RSS + NewsAPI feed aggregation per topic — the content backbone
- AI summarisation into a unified prose briefing per topic (Claude Haiku) — the product's core differentiator
- Email delivery at scheduled time (Resend) — the product is the email
- Web view per briefing (accessible via link in email) — required for feedback capture, archive, and preference management
- Briefing history (last 14 days) — basic user expectation
- Source attribution per briefing section — low-cost trust signal that editorial newsletters lack
- Preference editing (topics + delivery time) — retention requirement
- One-click unsubscribe with List-Unsubscribe header — legal requirement (CAN-SPAM, GDPR); Gmail now enforces this

**Should have (differentiators) — add after v1 validation:**
- Adjacent topic suggestions — reduces churn when topics feel thin
- Per-section feedback ("more/less like this") in web view — improves personalisation without separate preference sessions
- Digest-level rating (star rating, 1-5) — lightweight quality signal
- Briefing tone option (bullets vs prose) — prompt-level feature with preference UI
- OAuth login (Google) — add if signup friction is reported in beta

**Defer to v2+:**
- Paid subscription billing — explicitly out of scope for PoC
- Mobile app — explicitly out of scope per PROJECT.md
- Audio/podcast briefing — high cost, requires proven text retention first
- Custom user-supplied RSS URLs — power user feature, validate core product first
- Weekly frequency mode — risks weakening daily habit; users can disable individual days instead
- Real-time news alerts — contradicts the signal-over-noise core value proposition
- Social/community features — enormous scope increase; Artifact built this and it did not save the product

**Explicit anti-features (never build):**
- Advertiser-sponsored sections — corrupts the "no ads, no manipulation" value proposition
- Infinite scroll / "keep reading" — contradicts the product ethos; Brief replaces the endless feed
- Full RSS reader — Feedly does this better; Brief targets users who don't want to manage a feed reader

### Architecture Approach

The correct architecture is a three-stage pipeline executed via an async job queue: (1) feed ingestion per topic, (2) AI summarisation per user, (3) email delivery per user. A single Vercel Cron fires every 15 minutes, queries for users whose delivery window falls within the next interval and who have not yet received a briefing today, and enqueues one `ingest-feeds` job per due user. Each job stage enqueues the next on completion, passing only IDs between stages. This pattern provides independent retry, parallelism, and failure isolation between stages. The anti-pattern to avoid is running any part of this pipeline synchronously inside a cron job or HTTP request handler — LLM latency alone will cause timeout failures at even moderate scale.

Build order has hard dependencies dictated by the pipeline: database schema and auth must exist before preferences, preferences before ingestion, ingestion before summarisation, summarisation before delivery, and scheduling last to tie the pipeline together. The recommended MVP approach is to build and validate the headless pipeline (ingestion through email send) via scripts before building the web UI, proving the core value loop before investing in frontend polish.

**Major components:**
1. Web App (Next.js App Router) — auth pages, topic preference management, briefing viewer, history archive
2. API Layer (Next.js API Routes) — CRUD for user data, briefings retrieval, preference updates, bounce/unsubscribe webhooks
3. Job Queue + Scheduler (Vercel Cron + QStash) — 15-minute fan-out cron, per-user job dispatch with retry
4. Ingestion Worker (serverless function via QStash) — RSS + NewsAPI fetch per topic, content hash deduplication, normalised article storage
5. AI Summarisation Worker (serverless function) — article grouping per user topic set, LLM prompt construction, briefing composition and storage
6. Email Delivery Worker (serverless function) — React Email template rendering, Resend send, send-record creation for idempotency
7. Data Layer (Neon PostgreSQL) — users, preferences, articles (with content hash), briefings, briefing_sends (idempotency), user_consents (GDPR)

### Critical Pitfalls

1. **Email deliverability collapse (SPF/DKIM/DMARC not configured before first send)** — Configure DNS records on the sending subdomain (e.g. `mail.brief.app`) before any email is sent; verify with MXToolbox; register for Google Postmaster Tools on day one. This is non-recoverable once the domain is blocklisted.

2. **AI cost runaway from per-user summarisation** — Summarise at article level, not user level. Cache article summaries keyed on article URL. Separate the topic-scoped article pipeline from the user-scoped briefing assembly. Set `max_tokens` on every LLM call. Set a hard spend cap in the Anthropic dashboard before first beta user.

3. **RSS feed failures producing empty or stale briefings silently** — Wrap every feed fetch in try/catch with per-feed error tracking. Store last-known-good per feed as fallback. Implement circuit breaker (pause polling a feed after 3 consecutive failures). Never let one failing feed abort the entire pipeline run.

4. **Duplicate emails from job retries** — Implement idempotency on briefing sends using a `briefing_sends` table with a unique constraint on (user_id + date). Before sending, check if a record exists; if so, skip and return success. Queue retries must be idempotent — this is not optional for an email product.

5. **GDPR/CAN-SPAM non-compliance from treating legal requirements as post-launch work** — Unsubscribe link + List-Unsubscribe header in every email from day one. Consent timestamp logged at signup in a `user_consents` table. Immediate unsubscribe processing (seconds, not days). Right-to-erasure flow required before beta launch even if initially manual.

---

## Implications for Roadmap

Based on the combined research, the pipeline's hard dependencies and pitfall-to-phase mapping suggest the following phase structure:

### Phase 1: Foundation — Database, Auth, and User Model

**Rationale:** Nothing else can be built without the data layer and user identity. Auth must include consent recording (GDPR) from the start — retrofitting this is painful. Database schema must be designed for the full pipeline from the outset (articles, briefings, briefing_sends, user_consents) to avoid costly migrations later.

**Delivers:** Working Next.js app with Neon Postgres, Drizzle schema migrations, Auth.js v5 magic link login, user signup with consent record, basic preference model (topics + delivery time + timezone).

**Addresses:** User account, preference editing, one-click unsubscribe foundation, GDPR consent recording.

**Avoids:** GDPR/CAN-SPAM non-compliance (consent at signup); auth v4/v5 compatibility trap.

**Research flag:** Standard patterns — Auth.js v5 with Drizzle adapter is well-documented. Skip phase-level research; verify Auth.js v5 stable release status at implementation time.

---

### Phase 2: Email Infrastructure and Deliverability

**Rationale:** Email deliverability must be configured before any email is sent — it cannot be added after. The sending domain, DNS records (SPF/DKIM/DMARC), and bounce/complaint webhook infrastructure must all be in place before Phase 3 (pipeline) sends its first email to a real address. This phase establishes the email channel as a foundation, not a feature.

**Delivers:** Sending subdomain configured, SPF/DKIM/DMARC DNS records verified via MXToolbox, Resend account and API key, React Email template (briefing layout, mobile-first, tested across Gmail/Outlook/Apple Mail), bounce and complaint webhook endpoint wired to database suppression, List-Unsubscribe header in all emails, one-click unsubscribe landing page.

**Addresses:** Email deliverability (pitfall 1), bounce/complaint webhook gap (pitfall 6), email HTML rendering across clients, unsubscribe legal requirement.

**Avoids:** Domain blocklisting, CAN-SPAM violation, silent bounce accumulation.

**Research flag:** Needs validation — verify current Resend pricing/free tier limits and current Google/Yahoo bulk sender enforcement thresholds before implementation.

---

### Phase 3: Content Pipeline — Ingestion and Deduplication

**Rationale:** This is the most complex phase and the hardest dependency in the system. Feed ingestion must exist before summarisation can run; deduplication must be designed in from the start (retrofitting it breaks cost assumptions). The topic-to-source mapping problem (translating freeform user topics to RSS feeds and NewsAPI queries) is the central editorial-technical challenge of the product and needs resolution here.

**Delivers:** RSS feed fetcher (rss-parser with try/catch per feed, circuit breaker, last-known-good fallback), NewsAPI and Guardian API integration, content hash deduplication on article storage, article body extraction (for LLM prompt quality), topic-to-source mapping for an initial curated set of topics, feed resilience (one failing feed does not abort the pipeline).

**Addresses:** Source aggregation per topic (table stakes), feed deduplication, RSS feed reliability pitfall.

**Avoids:** RSS failure cascades, anti-pattern of fetching all feeds on every run without caching, N+1 database queries in article assembly.

**Research flag:** Needs research at implementation — article body extraction library (@extractus/article-extractor vs readability) has LOW confidence from research; verify which is actively maintained. Also validate NewsAPI and Guardian API current rate limits and free tier terms.

---

### Phase 4: AI Summarisation Pipeline

**Rationale:** Summarisation depends on ingested articles existing in the database. The AI layer is Brief's core differentiator and its biggest cost risk — the caching and grounding architecture must be designed correctly here, not retrofitted. The article-level caching strategy (summarise once per article, not once per user) is architecturally distinct and must be implemented in this phase.

**Delivers:** LLM integration (Claude Haiku via Vercel AI SDK), prompt construction with source grounding instruction ("use only information from the provided article text"), article-level summary caching, briefing composition from per-topic summaries, max_tokens cap on every call, spend cap configured in Anthropic dashboard, named entity spot-check for hallucination detection, source attribution metadata passed through to briefing output.

**Addresses:** AI summarisation (core differentiator), source transparency (differentiator), AI cost runaway (pitfall), hallucination risk (pitfall).

**Avoids:** Per-user summarisation anti-pattern (O(users * topics * articles) cost), full article HTML in prompt (10-100x token inflation), chained summarisation (summary of summaries amplifies hallucination).

**Research flag:** Standard patterns — Vercel AI SDK with Anthropic provider is well-documented. The grounding prompt pattern is established. Skip phase-level research; verify claude-3-5-haiku current pricing at anthropic.com/pricing at implementation time.

---

### Phase 5: Job Queue, Scheduling, and Delivery Orchestration

**Rationale:** Once the ingestion and summarisation services exist as tested functions, the scheduling layer ties them into the daily pipeline. QStash fan-out, idempotency, and the 15-minute cron dispatch pattern must all be implemented together — these components are tightly coupled and should not be split across phases.

**Delivers:** Vercel Cron job (every 15 minutes), due-user query (delivery_time window + no briefing_sends record for today), QStash per-user job dispatch (ingest → summarise → deliver stage chaining), briefing_sends idempotency table with unique constraint on (user_id + date), timezone-correct delivery time calculation and UTC storage, retry logic with exponential backoff for LLM and email provider calls, duplicate-email prevention verified by re-running jobs against same date.

**Addresses:** Delivery time configuration (table stakes), timezone handling, job queue architecture, duplicate email sends (pitfall), all-users-in-one-cron anti-pattern.

**Avoids:** Synchronous pipeline inside HTTP request (anti-pattern 1), one big cron job (anti-pattern 2), missing idempotency causing duplicate sends.

**Research flag:** Needs validation — verify QStash free tier message limit (500/day) and stage-chaining API pattern in current Upstash documentation before implementation.

---

### Phase 6: Web App — Preference Management and Briefing Viewer

**Rationale:** The web app is built last because it depends on the data model and pipeline being stable. Building UI on a shifting data schema is expensive. The briefing viewer is required for reliable feedback capture — email click-tracking for feedback signals is fragile; the web view is the correct capture surface. This phase also surfaces the "next briefing at X" dashboard signal that reduces user anxiety and support requests.

**Delivers:** Topic selection UI (freeform text entry, suggested max 5 topics), delivery time + timezone selector, briefing history list (last 14 days), per-briefing web view (rendered from stored briefing data), source attribution display, "next briefing at X" dashboard indicator, preference editing flow, account deletion (right-to-erasure, even if initially manual process).

**Addresses:** Web view (table stakes), briefing history (table stakes), preference editing (table stakes), source transparency (differentiator), UX pitfall of no read-confirmation signal.

**Avoids:** Email-only product feeling incomplete, feedback capture depending on fragile email link tracking.

**Research flag:** Standard patterns — Next.js App Router with shadcn/ui is well-documented. Skip phase-level research.

---

### Phase 7: Beta Polish and Validation

**Rationale:** Before opening to 10-20 beta users, a targeted hardening pass across the full system is warranted. This phase is not about new features — it is about making everything already built robust enough for real users whose data and trust are on the line.

**Delivers:** Email template tested across Gmail, Outlook, and Apple Mail (Litmus or Mail Tester), full unsubscribe flow verified (link → immediate suppression → no further sends), MXToolbox SPF/DKIM/DMARC pass verified, timezone delivery tested with synthetic users across UTC+12 / UTC / UTC-8, 20+ AI summaries manually audited against source articles for hallucination, LLM spend cap active and tested, feed resilience tested (inject a 500-returning feed URL; confirm pipeline continues), basic observability (error logging per pipeline stage, daily briefing count metric).

**Addresses:** All "looks done but isn't" checklist items from PITFALLS.md, email rendering across clients.

**Avoids:** Discovering deliverability problems after the first beta send; hallucination reaching real users without detection.

**Research flag:** No research needed — this is a verification and hardening phase against already-established requirements.

---

### Phase Ordering Rationale

- **Foundation before everything:** Auth and database schema must be stable before any downstream component is built. Schema changes after the pipeline is running are expensive.
- **Email infrastructure before pipeline:** A working delivery channel must exist before the pipeline produces content to deliver. Configuring DNS and testing email rendering before first send is non-negotiable.
- **Content pipeline before scheduling:** The ingestion and summarisation services must be individually testable as functions before the scheduling layer wires them into a cron-driven pipeline.
- **Pipeline before web UI:** The core value loop (ingestion → AI → email) must be validated as a working headless system before frontend investment. This is explicitly the recommendation from ARCHITECTURE.md.
- **Beta polish as a distinct phase:** The hardening checklist from PITFALLS.md is substantial enough that treating it as a dedicated phase (rather than scattered cleanup) ensures nothing is shipped to real users in a state that damages deliverability or trust.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Email Infrastructure):** Verify current Resend free tier limits and Google/Yahoo bulk sender enforcement thresholds — these change frequently and training data is August 2025.
- **Phase 3 (Content Pipeline):** Article body extraction library choice has LOW confidence — verify @extractus/article-extractor vs readability active maintenance status. Validate current NewsAPI and Guardian API rate limits and free tier terms.
- **Phase 5 (Scheduling/Delivery):** Verify QStash free tier message limit (500/day) and stage-chaining API pattern in current Upstash documentation — QStash API has iterated since training data cutoff.

Phases with standard patterns (skip deep research):
- **Phase 1 (Foundation):** Auth.js v5 + Drizzle + Neon is a well-documented combination. Verify Auth.js v5 stable vs beta status at implementation time.
- **Phase 4 (AI Summarisation):** Vercel AI SDK + Anthropic provider is well-documented. Verify current Haiku pricing before implementation.
- **Phase 6 (Web App):** Next.js 15 App Router + shadcn/ui is the dominant pattern for this stack; standard documentation applies.
- **Phase 7 (Beta Polish):** Verification phase against established requirements; no new technology research needed.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Next.js 15 verified via official blog; Drizzle/QStash/Resend/Auth.js v5 from training data (August 2025 cutoff) — pricing and free tier limits must be re-verified before implementation |
| Features | MEDIUM | Competitor analysis from training data; Morning Brew/Feedly/Mailbrew/Artifact HIGH confidence; Refind MEDIUM; feature gap (AI summarisation from freeform topics) is well-supported across multiple sources |
| Architecture | MEDIUM | Pipeline with staged job queue is a HIGH-confidence established distributed systems pattern; QStash-specific implementation details (fan-out, stage chaining) are MEDIUM — verify against current Upstash docs |
| Pitfalls | MEDIUM | Google/Yahoo bulk sender requirements (2024 enforcement) HIGH confidence; CAN-SPAM/GDPR authoritative references HIGH confidence; AI cost and RSS reliability patterns from engineering post-mortems MEDIUM confidence |

**Overall confidence:** MEDIUM

The research findings are internally consistent and cross-referenced across all four files. The main confidence gap is external service pricing, free tier limits, and API specifics that can change independently of the architectural recommendations, which are stable.

### Gaps to Address

- **Auth.js v5 stable release status:** Was in beta at August 2025 training cutoff. Verify whether it has reached stable release and whether the Drizzle adapter is production-ready before committing to it.
- **QStash stage-chaining API:** The fan-out scheduling pattern (cron → per-user QStash jobs → stage chaining) has LOW confidence in implementation specifics. Read current Upstash QStash documentation before Phase 5 planning.
- **NewsAPI free tier:** Verify current request limits (100 req/day was the training data figure) at newsapi.org before building the content pipeline — this directly affects PoC viability.
- **Article body extraction:** @extractus/article-extractor was listed with LOW confidence (maintenance status uncertain). Evaluate readability (Mozilla's library) as an alternative before Phase 3 implementation.
- **Resend pricing:** Free tier was 3,000 emails/month as of training data. Verify current limits at resend.com before committing to Resend as the email provider.
- **Topic-to-source mapping:** The editorial problem of mapping user-typed topics to high-quality RSS feeds is partially unsolved by research. A curated source list for common topics (Tech, Politics, Finance, Sports, Climate) will need to be hand-built before the pipeline can serve beta users.

---

## Sources

### Primary (HIGH confidence)
- Next.js 15 official blog (nextjs.org/blog/next-15, Oct 2024) — verified stable release, React 19 requirement, App Router, caching changes
- Google Bulk Sender Requirements 2024 (support.google.com/mail/answer/81126) — DMARC enforcement, complaint rate thresholds, List-Unsubscribe requirement
- CAN-SPAM Act FTC guidance (ftc.gov) — unsubscribe requirements, 10-day processing window
- GDPR Art.6 and Art.17 (gdpr-info.eu) — lawful basis, right to erasure
- RFC 8058 (datatracker.ietf.org) — one-click unsubscribe standard, required by Gmail

### Secondary (MEDIUM confidence)
- Training data (August 2025 cutoff) — Drizzle ORM adoption, Resend positioning, Auth.js v5 beta, QStash/Upstash pricing, AI SDK patterns, Mailbrew/Feedly/Morning Brew feature analysis, Artifact shutdown (Feb 2024, well-documented in tech press)
- Distributed systems patterns — pipeline with staged job queue is a well-established pattern with HIGH confidence; QStash-specific implementation is MEDIUM

### Tertiary (LOW confidence)
- NewsAPI free tier limits (100 req/day) — training data only; verify at newsapi.org before implementation
- @extractus/article-extractor maintenance status — training data only; verify active maintenance before adopting
- QStash stage-chaining API specifics — training data; verify against current Upstash QStash documentation
- Auth.js v5 stable release status — was beta at training cutoff; verify current status

---
*Research completed: 2026-02-25*
*Ready for roadmap: yes*
