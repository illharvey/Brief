---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in-progress
last_updated: "2026-03-04T14:00:00Z"
progress:
  total_phases: 5
  completed_phases: 5
  total_plans: 22
  completed_plans: 22
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** A person picks their interests once, and every day at their chosen time, Brief delivers everything they need to know — without toxicity, ads, or algorithmic manipulation.
**Current focus:** Phase 5 complete — full dispatch pipeline live and verified

## Current Position

Phase: 5 of 5 (Scheduling and Delivery) — complete (5 of 5 plans done)
Plan: 05-05 complete — end-to-end inbox delivery verified
Status: Phase 5 complete — briefing email delivered to real inbox; idempotency confirmed; GitHub Actions cron live
Last activity: 2026-03-04 — live email delivery verified at will.harvey@me.com; FROM_ADDRESS corrected to noreply@briefnews.online; GitHub Actions cron replacing Vercel Cron; MAIL-01 satisfied

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 22
- Average duration: ~4 min
- Total execution time: ~37 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 5 | 14 min | 3 min |
| 02-email-infrastructure | 3 | ~51 min | ~17 min |
| 03-content-pipeline | 4 | ~97 min | ~24 min |
| 04-ai-summarisation | 4 (complete) | ~51 min | ~13 min |
| 05-scheduling-and-delivery | 5 (complete) | ~60 min | ~12 min |

**Recent Trend:**
- Last 5 plans: 04-03 (2 min), 04-04 (2 min), 05-03 (2 min), 05-04 (2 min), 05-05 (~30 min incl. human verify)
- Trend: Stable

*Updated after each plan completion*
| Phase 05-scheduling-and-delivery P05 | ~30min | 3 tasks | 2 files |

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
- [02-03]: DNS verified via dig (authoritative) rather than waiting for MXToolbox web UI — equivalent resolution mechanism
- [02-03]: Resend dashboard shows Pending (normal — polls independently); DNS confirmed live via dig, will auto-resolve
- [02-03]: DMARC p=none monitoring-only for Phase 2 — satisfies Gmail/Yahoo/Microsoft 2025 bulk sender requirements; escalate after delivery patterns established
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
- [04-04]: Switched LLM provider from Anthropic to Google Gemini (gemini-2.5-flash-lite) due to zero Anthropic credit balance — functionality identical, GEMINI_API_KEY required
- [04-04]: Pipeline verified with Gemini: 7 topics, 12 items, cache hit at 2.6s, bullets grounded — Phase 4 complete
- [01-06]: signOutAction must use redirectTo:/login not redirect:false — Auth.js v5 signOut() server-side redirect parameter
- [01-06]: FROM_ADDRESS set to onboarding@resend.dev for testing — noreply@mail.brief.app must be verified in Resend before production
- [01-06]: TopicInput Popover focus bug deferred — freeform typing blocked; Popular Topics buttons workaround; fix before Phase 6
- [05-03]: sourceName used as BriefingTopicSection headline — article title not carried through BriefingItem; clean fallback without extra DB join
- [05-03]: Serial runDispatch() processing — beta scale (10-20 users) doesn't warrant parallelism; per-user try/catch isolates failures
- [05-03]: not_due counted as skipped in DispatchResult — internal distinction, external aggregate counts remain correct
- [Phase 05-04]: maxDuration=300 for cron route — Vercel Pro plan fluid compute supports serial dispatch for ~20 beta users
- [Phase 05-04]: */15 * * * * Vercel Cron schedule requires Pro plan — Hobby limited to daily; CRON_SECRET must be set as Vercel env var before deployment
- [Phase 05-05]: FROM_ADDRESS corrected to noreply@briefnews.online — briefnews.online is the Resend-verified domain; mail.brief.app was not verified and caused silent delivery failure
- [Phase 05-05]: GitHub Actions cron replaces Vercel Cron — Hobby plan does not support sub-daily schedules; GitHub Actions free tier supports arbitrary cron expressions
- [Phase 05-05]: MAIL-01 satisfied — live email delivery confirmed to will.harvey@me.com with correct HTML structure; idempotency verified (skipped=1 on second dispatch)

### Pending Todos

None yet.

### Blockers/Concerns

None — Phase 5 complete, all planned work delivered.

## Session Continuity

Last session: 2026-03-04
Stopped at: Completed 05-05-PLAN.md — live email delivery verified to will.harvey@me.com; MAIL-01 satisfied; Phase 5 (Scheduling and Delivery) fully complete
Resume file: None
