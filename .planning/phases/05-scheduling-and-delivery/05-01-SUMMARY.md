---
phase: 05-scheduling-and-delivery
plan: "01"
subsystem: database
tags: [drizzle, neon, postgres, schema, migration]

# Dependency graph
requires:
  - phase: 04-ai-summarisation
    provides: briefings table (briefingId FK target in deliveries)
  - phase: 01-foundation
    provides: users table (userId FK target in deliveries)
provides:
  - deliveries table live in Neon with unique constraint on (userId, deliveryDate)
  - Drizzle migration file drizzle/0001_great_the_captain.sql
  - Idempotency gate for Phase 5 dispatch pipeline
affects:
  - 05-02 (dispatch library imports deliveries from schema)
  - 05-03 (cron handler reads/writes deliveries for idempotency)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Drizzle pgTable with table-level unique() constraint for composite idempotency keys
    - deliveryDate stored as text YYYY-MM-DD string in user's local timezone (not UTC timestamp) to avoid DST drift

key-files:
  created:
    - drizzle/0001_great_the_captain.sql
    - drizzle/meta/0001_snapshot.json
  modified:
    - src/lib/db/schema.ts

key-decisions:
  - "deliveryDate stored as YYYY-MM-DD text in user's local timezone — UTC timestamps would shift date across DST boundaries causing false duplicate detection"
  - "retryCount as integer column defaulting to 0 — dispatch library uses 0=first attempt/failure, 1=retried once (max retries per day)"
  - "briefingId FK uses onDelete: set null — delivery record persists even if briefing row is pruned"

patterns-established:
  - "Delivery idempotency via unique constraint on (userId, deliveryDate) — DB-enforced, onConflictDoNothing in dispatcher"
  - "status enum values: sent | skipped | failed — text column with convention documented in schema comment"

requirements-completed: [MAIL-01]

# Metrics
duration: 2min
completed: 2026-03-04
---

# Phase 5 Plan 01: Deliveries Schema Summary

**Drizzle deliveries table with (userId, deliveryDate) unique constraint as DB-enforced idempotency gate for the daily briefing dispatch pipeline, pushed live to Neon.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-04T10:51:37Z
- **Completed:** 2026-03-04T10:53:08Z
- **Tasks:** 2
- **Files modified:** 4 (schema.ts, migration SQL, meta snapshot, journal)

## Accomplishments

- Added deliveries table definition to schema.ts after briefingItems with all 10 columns
- Generated drizzle migration 0001_great_the_captain.sql with unique constraint and foreign keys
- Pushed migration to Neon — confirmed 10 columns present via information_schema query
- Unique constraint `deliveries_user_id_delivery_date_unique` enforced at DB level

## Task Commits

Each task was committed atomically:

1. **Task 1: Add deliveries table to schema.ts** - `6cfd495` (feat)
2. **Task 2: Generate migration and push to Neon** - `265f1a6` (feat)

**Plan metadata:** (included in this docs commit)

## Files Created/Modified

- `src/lib/db/schema.ts` - Added deliveries table definition at end of file; all imports (integer, unique) were already present
- `drizzle/0001_great_the_captain.sql` - Generated SQL migration: CREATE TABLE deliveries with 10 columns, unique constraint, 2 FKs
- `drizzle/meta/0001_snapshot.json` - Drizzle schema snapshot after migration
- `drizzle/meta/_journal.json` - Updated migration journal

## Decisions Made

- deliveryDate stored as `text('delivery_date')` YYYY-MM-DD string in user's local timezone — a UTC timestamp would shift the calendar date across DST boundaries, causing false duplicate detection (two rows on same day treated as different)
- briefingId uses `onDelete: 'set null'` rather than cascade — delivery audit record must persist independently of briefing content lifecycle
- retryCount column with `.default(0)` — dispatch library interprets 0=first attempt/failure, 1=retried once and stop

## Deviations from Plan

None — plan executed exactly as written.

Note: Task 2 required loading DATABASE_URL from .env.local explicitly (drizzle-kit does not auto-load .env.local). Applied `export $(grep DATABASE_URL .env.local | xargs)` before running push. This is expected environment behavior, not a deviation.

## Issues Encountered

- drizzle-kit push failed initially with "connection url required" — resolved by explicitly exporting DATABASE_URL from .env.local. The config reads `process.env.DATABASE_URL` but drizzle-kit does not automatically load .env files in this shell context.

## User Setup Required

None — no external service configuration required beyond what was already in .env.local.

## Next Phase Readiness

- deliveries table live in Neon — Plan 05-02 (dispatch library) can immediately import `deliveries` from `@/lib/db/schema` and perform idempotency checks
- Unique constraint enforced at DB level — dispatcher can safely use `onConflictDoNothing` without application-level locking
- No blockers for Phase 5 continuation

---
*Phase: 05-scheduling-and-delivery*
*Completed: 2026-03-04*
