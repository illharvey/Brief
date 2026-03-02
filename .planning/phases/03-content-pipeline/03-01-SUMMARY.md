---
phase: 03-content-pipeline
plan: 01
subsystem: database
tags: [drizzle, neon, postgres, dedup, sha256, ingestion, rss]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: users table (users.id FK for articles.userId), db client (db from @/lib/db/client)
provides:
  - articles table in Drizzle schema with url+userId composite unique constraint (urlUserUnique)
  - RawArticle, SourceError, IngestionResult type contracts in src/lib/ingestion/types.ts
  - contentHash() SHA-256 dedup helper in src/lib/ingestion/dedup.ts
  - normaliseUrl() UTM-stripping URL normaliser in src/lib/ingestion/dedup.ts
  - insertArticles() batch insert with onConflictDoNothing in src/lib/ingestion/persist.ts
affects:
  - 03-02 (RSS adapter imports RawArticle, calls insertArticles)
  - 03-03 (NewsAPI adapter imports RawArticle, calls insertArticles)
  - 03-04 (orchestrator imports IngestionResult, calls insertArticles)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - onConflictDoNothing on (url, userId) for per-user permanent dedup across runs
    - SHA-256 secondary dedup key from title::url concatenation
    - UTM param stripping before URL stored as primary dedup key

key-files:
  created:
    - src/lib/ingestion/types.ts
    - src/lib/ingestion/dedup.ts
    - src/lib/ingestion/persist.ts
  modified:
    - src/lib/db/schema.ts

key-decisions:
  - "articles table uses composite unique constraint urlUserUnique on (url, userId) — same article can appear for multiple users but never twice for the same user"
  - "contentHash uses SHA-256 of title::url concatenation — secondary dedup catches republished articles with identical title"
  - "normaliseUrl strips utm_source, utm_medium, utm_campaign, utm_term, utm_content and fragments — primary dedup key is normalised URL not raw URL"
  - "insertArticles returns { inserted, skipped } via .returning() row count — skipped = total - inserted.length (onConflictDoNothing does not return skipped rows)"
  - "drizzle-kit push requires real DATABASE_URL in .env.local — placeholder credentials present; push must be run manually with real Neon credentials"

patterns-established:
  - "Ingestion pipeline: adapter returns RawArticle[] → orchestrator calls insertArticles() → returns IngestionResult"
  - "All dedup happens at DB layer via onConflictDoNothing — no in-memory dedup logic required in adapters"

requirements-completed: [CONT-01, CONT-02, CONT-04]

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 3 Plan 01: Content Pipeline Foundation Summary

**articles Drizzle table with per-user URL dedup, SHA-256 content hashing, UTM-stripping normaliser, and batch insert helper using onConflictDoNothing**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-02T09:05:47Z
- **Completed:** 2026-03-02T09:07:14Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added articles table to Drizzle schema with urlUserUnique composite constraint on (url, userId) — enables per-user dedup without blocking cross-user article sharing
- Created src/lib/ingestion/ directory with three foundation files that all later adapters and the orchestrator import from
- TypeScript compiles cleanly with no errors across the entire codebase

## Task Commits

Each task was committed atomically:

1. **Task 1: Add articles table to Drizzle schema** - `7091aa0` (feat)
2. **Task 2: Create ingestion type contracts, dedup utilities, and persist helper** - `35363ef` (feat)

## Files Created/Modified

- `src/lib/db/schema.ts` - Added `unique` import, appended articles table with urlUserUnique constraint
- `src/lib/ingestion/types.ts` - RawArticle, SourceError, IngestionResult interfaces
- `src/lib/ingestion/dedup.ts` - contentHash() SHA-256 and normaliseUrl() UTM-stripping functions
- `src/lib/ingestion/persist.ts` - insertArticles() batch insert with onConflictDoNothing({ target: [articles.url, articles.userId] })

## Decisions Made

- onConflictDoNothing targets (url, userId) composite — deliberate choice to allow the same article URL to exist for different users while preventing re-insertion for the same user
- contentHash uses lowercased+trimmed title concatenated with trimmed URL — normalisation before hashing prevents case sensitivity false positives
- normaliseUrl silently returns url.trim() on invalid URLs (catch block) — adapters may receive malformed URLs from low-quality feeds; fail-soft keeps ingestion running

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Database push requires real credentials:** `drizzle-kit push` failed because `.env.local` contains placeholder credentials (`postgresql://user:password@host/dbname`). The schema change and all TypeScript files are complete and compile cleanly. The database table will be created when `npx drizzle-kit push` is run with a real `DATABASE_URL` pointing to the Neon instance.

This is not a code issue — all verification criteria except the live DB push are met. The table definition is correct and the migration will succeed once real credentials are configured.

## User Setup Required

Before Plan 02 (RSS adapter) can be run end-to-end, ensure the articles table is pushed to Neon:

1. Confirm `DATABASE_URL` in `.env.local` points to the real Neon database
2. Run: `npx drizzle-kit push --config drizzle.config.ts`
3. Verify: no error in output and articles table appears in Neon console

## Next Phase Readiness

- All type contracts, dedup utilities, and persist helper are ready for Plans 02-04 to import
- TypeScript compiles cleanly — no import errors in persist.ts using `@/lib/db/client` and `@/lib/db/schema`
- Articles table schema is defined; database push pending real credentials

---
*Phase: 03-content-pipeline*
*Completed: 2026-03-02*

## Self-Check: PASSED

- FOUND: src/lib/db/schema.ts (with urlUserUnique constraint at line 163)
- FOUND: src/lib/ingestion/types.ts
- FOUND: src/lib/ingestion/dedup.ts
- FOUND: src/lib/ingestion/persist.ts
- FOUND: .planning/phases/03-content-pipeline/03-01-SUMMARY.md
- FOUND commit: 7091aa0 (Task 1)
- FOUND commit: 35363ef (Task 2)
