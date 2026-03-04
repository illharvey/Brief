---
phase: 05-scheduling-and-delivery
plan: "03"
subsystem: api
tags: [dispatch, cron, scheduling, drizzle, timezone, intl, idempotency, retry]

# Dependency graph
requires:
  - phase: 05-01
    provides: deliveries table with (userId, deliveryDate) unique constraint as DB-enforced idempotency gate
  - phase: 05-02
    provides: sendBriefingEmail() helper and BriefingTopicSection interface
  - phase: 04-ai-summarisation
    provides: generateBriefingForUser() returning BriefingResult with flat BriefingItem[]
  - phase: 03-content-pipeline
    provides: ingestForUser() pulling articles for a user across all sources
provides:
  - "runDispatch() — main cron entry point orchestrating ingest → summarise → send → record for all due users"
  - "DispatchResult interface — typed result with processed/sent/skipped/failed/errors counts"
  - "isUserDue() — timezone-aware 2-hour catch-up window check using Intl.DateTimeFormat"
  - "Idempotency via deliveries table: sent/skipped rows block repeat sends; failed rows with retryCount<1 are retried once"
  - "Zero-content briefings recorded as status=skipped — never silently dropped"
  - "Structured JSON log lines for cron_start, dispatch_sent, dispatch_skipped, dispatch_failed, cron_complete"
affects:
  - "05-04 (cron route imports runDispatch from this module)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Intl.DateTimeFormat en-CA locale for YYYY-MM-DD in user's local timezone — never UTC .toISOString().slice(0,10)"
    - "Intl.DateTimeFormat hour12:false with hour=24 midnight guard normalised to 0"
    - "Catch-up window: diffMs = (currentMinuteOfDay - targetMinuteOfDay) * 60 * 1000; valid if 0 <= diffMs <= 2h"
    - "Delivery idempotency: db.query.deliveries.findFirst check then onConflictDoNothing on insert"
    - "One-retry policy: retryCount=0 → retry on next tick; retryCount>=1 → skip for the day"
    - "Serial per-user processing — appropriate for 10-20 beta users; each user isolated in try/catch"
    - "buildTopicSections groups BriefingItem[] by topic order, strips markdown bullet prefixes, caps at 5 per topic"

key-files:
  created:
    - src/lib/dispatch.ts
  modified: []

key-decisions:
  - "sourceName used as headline in BriefingTopicSection — article title is not carried through BriefingItem, using sourceName is the clean fallback"
  - "Serial processing in runDispatch — beta scale (10-20 users) doesn't warrant parallel complexity; per-user catch ensures one failure doesn't abort others"
  - "re-throw err inside dispatchForUser after recording failure — runDispatch catches it to populate result.errors without losing stack context"
  - "not_due treated as skipped in DispatchResult — both should not increment sent or failed; callers see correct aggregate counts"

patterns-established:
  - "Dispatch pipeline: isUserDue → deliveries idempotency check → ingestForUser → generateBriefingForUser → buildTopicSections → sendBriefingEmail → insert delivery record"
  - "All structured log lines are JSON via console.log/console.error — ready for log aggregator ingestion"

requirements-completed: [MAIL-01]

# Metrics
duration: 2min
completed: 2026-03-04
---

# Phase 5 Plan 03: Dispatch Orchestrator Summary

**runDispatch() orchestrator with timezone-aware scheduling, per-day idempotency via deliveries table, one-retry-on-next-tick failure policy, and structured JSON logging for the full ingest-summarise-send pipeline**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-04T13:17:10Z
- **Completed:** 2026-03-04T13:19:12Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `src/lib/dispatch.ts` with `runDispatch()` and all supporting helpers in a single production-ready file
- Timezone-aware `isUserDue()` using `Intl.DateTimeFormat` with `hour12:false`, 2-hour catch-up window, and midnight hour=24 guard
- `getUserLocalDate()` using `en-CA` locale for YYYY-MM-DD in user's local timezone — never UTC
- Full idempotency gate: existing `sent`/`skipped` rows skip; `failed` rows with `retryCount<MAX_RETRIES` are retried once; exhausted retries skip for the day
- Zero-content briefings recorded as `status=skipped` with `failureReason='zero_content'` — not silently dropped
- `buildTopicSections()` groups flat `BriefingItem[]` by topic, caps at 5 items/topic, strips markdown bullet prefixes, uses `sourceName` as `headline`
- Structured JSON log lines emitted for all 5 events: `cron_start`, `dispatch_sent`, `dispatch_skipped`, `dispatch_failed`, `cron_complete`
- TypeScript compilation passes with zero errors

## Task Commits

1. **Task 1: Create src/lib/dispatch.ts** - `b5b9ee1` (feat)

**Plan metadata:** (included in docs commit)

## Files Created/Modified

- `src/lib/dispatch.ts` — Complete dispatch orchestrator: imports, timezone helpers, BriefingItem transformer, per-user dispatcher, `runDispatch()` main export

## Decisions Made

- `sourceName` used as `headline` in `BriefingTopicSection.items[]` — `BriefingItem` does not carry the article title through the pipeline; `sourceName` ("The Guardian", "BBC News") is the clean, available fallback without requiring an extra DB join
- Serial processing (`for...of` loop) in `runDispatch()` — at 10-20 user beta scale, the simplicity outweighs any parallelism benefit; per-user try/catch ensures one user's failure doesn't abort others
- `dispatchForUser()` re-throws after recording failure — `runDispatch()` catches and populates `result.errors` maintaining error context without losing original stack trace
- `not_due` outcome treated identically to `skipped` in aggregate counts — from the scheduler's perspective, a user who isn't due is simply not processed; the distinction is internal

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. TypeScript compilation passed on first attempt with zero errors.

## User Setup Required

None — no external service configuration required. All environment variables (`GEMINI_API_KEY`, `RESEND_API_KEY`, `DATABASE_URL`, etc.) were established in prior phases.

## Next Phase Readiness

- `runDispatch()` is importable from `@/lib/dispatch` (barrel via `src/lib/dispatch.ts`) — Plan 05-04 cron route can call it with no arguments
- `DispatchResult` interface is exported for the cron route to return structured JSON response
- All scheduling decisions (timezone-aware due check, idempotency, retry, zero-content) are fully encapsulated — cron route remains a thin HTTP wrapper

## Self-Check: PASSED

- `src/lib/dispatch.ts` — FOUND
- `05-03-SUMMARY.md` — FOUND
- Commit `b5b9ee1` — FOUND
- `npx tsc --noEmit` — 0 errors

---
*Phase: 05-scheduling-and-delivery*
*Completed: 2026-03-04*
