---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in-progress
last_updated: "2026-03-02T09:14:00Z"
progress:
  total_phases: 7
  completed_phases: 1
  total_plans: 9
  completed_plans: 9
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** A person picks their interests once, and every day at their chosen time, Brief delivers everything they need to know — without toxicity, ads, or algorithmic manipulation.
**Current focus:** Phase 3 — Content Pipeline

## Current Position

Phase: 3 of 7 (Content Pipeline)
Plan: 4 of 4 in current phase (03-01, 03-02, 03-03 complete — 03-04 tasks 1+2 complete, awaiting checkpoint)
Status: In progress — checkpoint:human-verify
Last activity: 2026-03-02 — 03-04 Tasks 1+2 complete: ingestForUser() orchestrator + POST /api/dev/ingest route. Awaiting human verification of end-to-end pipeline.

Progress: [████░░░░░░] ~28%

## Performance Metrics

**Velocity:**
- Total plans completed: 9
- Average duration: ~4 min
- Total execution time: ~37 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 5 | 14 min | 3 min |
| 02-email-infrastructure | 2 | 21 min | 10 min |
| 03-content-pipeline | 3 | 7 min | 2.3 min |

**Recent Trend:**
- Last 5 plans: 02-02 (6 min), 03-01 (2 min), 03-02 (2 min), 03-03 (3 min)
- Trend: Stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- No X/Twitter integration — API cost prohibitive; conflicts with anti-toxicity goal
- Closed beta for PoC — validate with 10-20 real users before public infrastructure
- RSS + AI summarisation — best quality/cost ratio at small scale
- [01-01] Used neon-http driver over neon-serverless WebSocket — simpler, no connection pooling needed at this scale
- [01-01] Auth.js tables extended with custom columns (passwordHash, onboardingComplete) — DrizzleAdapter ignores unknown columns
- [01-01] deliveryTime stored as HH:MM string in IANA timezone — converts to UTC at dispatch time to avoid DST bugs
- [01-01] userTopics normalized as rows not jsonb — enables Phase 6 co-occurrence queries for PREF-04
- [Phase 01-02]: authorize() is in auth.ts only — auth.config.ts has authorize: undefined to prevent Edge runtime crash from Node.js crypto module
- [Phase 01-02]: JWT strategy specified in both auth.config.ts and auth.ts — DrizzleAdapter used only for user/account persistence, not session rows
- [Phase 01-02]: loginRatelimit uses analytics: false to preserve Upstash free tier headroom
- [Phase 01-03]: signUpAction returns userId for onboarding_user_id cookie — no auto-sign-in; email verification blocks briefing dispatch, not UI
- [Phase 01-03]: resolveUserId checks session first then onboarding cookie — same action code works during and after onboarding
- [Phase 01-03]: saveDeliveryPreferenceAction returns userId on success for confirmation page ?uid= query param
- [Phase 01-03]: Rate limit identifier is login:{email} not login:{ip} — per-email soft lock without blocking shared IPs
- [Phase 01-04]: TopicInput built from shadcn Command+Popover+Badge — no external chip library; freeform topics always allowed
- [Phase 01-04]: TimePicker uses Intl.DateTimeFormat().resolvedOptions().timeZone — no library needed for browser timezone detection
- [Phase 01-04]: confirmation/page.tsx receives userId as ?uid= search param from delivery page — server components cannot read cookies set immediately before navigation
- [Phase 01-05]: login/page.tsx uses useEffect + router.push for redirect — correct pattern when useActionState is a client hook
- [Phase 01-05]: dashboard/layout.tsx redirects to /login without callbackUrl — middleware handles callbackUrl injection for protected routes
- [Phase 01-05]: dashboard/page.tsx intentionally minimal placeholder — Phase 6 will replace entirely
- [02-01]: react-email installed as devDependency only — preview server not needed in production
- [02-01]: No image assets in email templates — text-only branding per user preference for simplicity
- [02-01]: emailSuppressions.email has unique constraint — one row per address; Plan 02-02 webhook handler uses upsert pattern
- [Phase 02-02]: HMAC-SHA256 stateless tokens for unsubscribe — no DB table needed, 30-day expiry, timingSafeEqual prevents timing attacks
- [Phase 02-02]: Webhook always returns 200 for unhandled event types — Resend retries on non-2xx responses causing duplicate suppression inserts
- [Phase 02-02]: FROM_ADDRESS and APP_URL centralized as constants in email.ts — not repeated in auth.ts or other callers
- [03-01]: articles table uses composite unique constraint urlUserUnique on (url, userId) — same article can appear for multiple users but never twice for the same user
- [03-01]: contentHash uses SHA-256 of title::url concatenation — secondary dedup catches republished articles with identical title
- [03-01]: normaliseUrl strips utm_source/medium/campaign/term/content and fragments — primary dedup key is normalised URL not raw URL
- [03-01]: insertArticles returns { inserted, skipped } via .returning() row count — skipped = total - inserted.length (onConflictDoNothing does not return skipped rows)
- [03-02]: @types/rss-parser does not exist on npm — rss-parser v3 ships its own index.d.ts; no separate types package needed
- [03-02]: REDDIT_USER_AGENT set on both rss-parser instance headers and raw fetch() calls — Reddit filters by User-Agent, not rate-limits
- [03-02]: findSubredditsForTopic wraps full body in try/catch returning [] — topic discovery is best-effort; never throws to orchestrator
- [03-02]: fetchRedditRss self-post filter uses URL pattern (reddit.com/r/) — RSS feed items don't expose is_self flag
- [03-03]: Guardian sourceName hardcoded to 'The Guardian' (single publication); NewsData sourceName maps from source_id (multi-publisher aggregator)
- [03-03]: NewsData articles with null/empty link filtered before mapping — avoids RawArticle.url being empty string which would break DB dedup
- [03-03]: NewsAPI.org NOT used — free tier prohibits non-localhost use; Guardian (5000/day) and NewsData (200/day) are production-permitted

### Pending Todos

None yet.

### Blockers/Concerns

- [Research] Auth.js v5 stable release status — was beta at August 2025 training cutoff; verify before Phase 1 planning
- [Research] Phase 2: Verify current Resend free tier limits and Google/Yahoo bulk sender enforcement thresholds
- [Research] Phase 3: Article body extraction library choice has LOW confidence — verify @extractus/article-extractor vs readability maintenance status; verify NewsAPI free tier limits
- [Research] Phase 5: QStash stage-chaining API specifics have LOW confidence — read current Upstash docs before Phase 5 planning

## Session Continuity

Last session: 2026-03-02
Stopped at: 03-04 Task 3 checkpoint — ingestForUser() + /api/dev/ingest implemented; awaiting human verification of end-to-end pipeline with real API keys
Resume file: None
