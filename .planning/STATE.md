---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in-progress
last_updated: "2026-03-02T14:17:02Z"
progress:
  total_phases: 7
  completed_phases: 3
  total_plans: 14
  completed_plans: 14
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** A person picks their interests once, and every day at their chosen time, Brief delivers everything they need to know — without toxicity, ads, or algorithmic manipulation.
**Current focus:** Phase 4 — AI Summarisation

## Current Position

Phase: 4 of 7 (AI Summarisation) — IN PROGRESS
Plan: 04-03 complete (3 of N plans)
Status: In progress — Phase 4 Plan 03 complete
Last activity: 2026-03-02 — Pipeline wired: generateBriefingForUser() orchestrator created, dev API route and CLI script added

Progress: [█████░░░░░] ~55%

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
| 03-content-pipeline | 4 | ~97 min | ~24 min |
| 04-ai-summarisation | 3 (in progress) | 6 min | 2 min |

**Recent Trend:**
- Last 5 plans: 03-02 (2 min), 03-03 (3 min), 04-01 (2 min), 04-02 (2 min)
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
- [Phase 01-05]: dashboard route group renamed from (dashboard) to dashboard — route group was at / conflicting with app/page.tsx; /dashboard is the correct URL
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
- [04-01]: briefings and briefingItems defined after articles in schema.ts — Drizzle FK closures are lazy but table ordering avoids forward-reference confusion
- [04-01]: body and description on articles are nullable text — null signals extraction not attempted/failed; pipeline falls back to description then title
- [04-01]: sourceSnapshot on briefingItems stores exact LLM input text per article — enables Phase 6 grounding audits
- [04-02]: SUMMARISATION_MODEL env var with claude-haiku-4-5-20251001 as hardcoded default — versioned model ID, not alias
- [04-02]: Cache key is brief:summary:{normaliseUrl} — global per article, not per-user; saves LLM cost when multiple users follow same stories
- [04-02]: ANTHROPIC_API_KEY checked at call time (not module load) — clean error message before any LLM work begins
- [04-02]: sourceSnapshot is empty string on cache hit — avoids re-reading article text; grounding audit only needed on fresh LLM calls
- [04-03]: dotenv already available as transitive dependency — no explicit install needed for CLI script
- [04-03]: generateBriefingForUser exported from @/lib/summarisation module barrel — Phase 5 imports by module path not file
- [04-03]: topicCount stored as (total topics - failed topics) in briefings row — represents topics successfully included

### Pending Todos

None yet.

### Blockers/Concerns

- [Research] Auth.js v5 stable release status — was beta at August 2025 training cutoff; verify before Phase 1 planning
- [Research] Phase 2: Verify current Resend free tier limits and Google/Yahoo bulk sender enforcement thresholds
- [Research] Phase 3: Article body extraction library choice has LOW confidence — verify @extractus/article-extractor vs readability maintenance status; verify NewsAPI free tier limits
- [Research] Phase 5: QStash stage-chaining API specifics have LOW confidence — read current Upstash docs before Phase 5 planning

## Session Continuity

Last session: 2026-03-02
Stopped at: Completed 04-03-PLAN.md — generateBriefingForUser() wired, dev route + CLI script created
Resume file: None
