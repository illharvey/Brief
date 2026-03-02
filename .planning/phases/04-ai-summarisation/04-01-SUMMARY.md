---
phase: 04-ai-summarisation
plan: 01
subsystem: database
tags: [drizzle, postgres, neon, schema, migration]

# Dependency graph
requires:
  - phase: 03-content-pipeline
    provides: articles table with dedup logic that this schema extends
provides:
  - articles.body and articles.description columns for LLM input in Phase 4 pipeline
  - briefings table for storing assembled markdown briefings per user/run
  - briefingItems table for per-article summaries with source snapshots and grounding audit trail
  - Generated Drizzle migration pushed to Neon database
affects:
  - 04-ai-summarisation (pipeline reads articles.body/description, writes to briefings/briefingItems)
  - 06-dashboard (displays briefingItems joined to articles for source URLs)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "New tables defined after the tables they reference to avoid forward-reference issues in Drizzle FK closures"
    - "Nullable text columns for optional data (body, description) — null means not available, not empty string"

key-files:
  created:
    - drizzle/0000_yielding_brother_voodoo.sql
    - drizzle/meta/0000_snapshot.json
    - drizzle/meta/_journal.json
  modified:
    - src/lib/db/schema.ts

key-decisions:
  - "briefings and briefingItems placed after articles table in schema.ts to avoid Drizzle forward-reference issues with briefingItems.articleId FK"
  - "body and description columns are nullable text — null signals extraction not attempted or failed, enabling pipeline to distinguish from empty content"
  - "sourceSnapshot column on briefingItems stores the exact article text sent to LLM for grounding audits in Phase 6"

patterns-established:
  - "Table ordering matters in Drizzle schema: define referenced tables before referencing tables"

requirements-completed: [CONT-03]

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 4 Plan 01: Schema Extension for AI Summarisation Summary

**Drizzle schema extended with briefings and briefing_items tables plus nullable body/description on articles, migration generated and pushed to Neon**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-02T14:07:33Z
- **Completed:** 2026-03-02T14:09:08Z
- **Tasks:** 2
- **Files modified:** 4 (schema.ts + 3 migration files created)

## Accomplishments

- Added `body` and `description` nullable text columns to articles table — Phase 4 pipeline reads body first, falls back to description then title as LLM input
- Added `briefings` table with userId FK, assembled markdown content, topic/item counts, and partialFailure flag for monitoring
- Added `briefing_items` table with briefingId + articleId FKs, topic, summary, sourceSnapshot (grounding audit), and fromCache flag
- Generated migration `0000_yielding_brother_voodoo.sql` with correct ALTER TABLE and CREATE TABLE statements
- Migration pushed to Neon database successfully

## Task Commits

Each task was committed atomically:

1. **Task 1: Add body and description columns to articles table** - `1b63b78` (feat)
2. **Task 2: Add briefings and briefingItems tables, generate and push migration** - `457411d` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `src/lib/db/schema.ts` - Added body/description to articles; added briefings and briefing_items tables after articles to avoid FK forward-reference issues
- `drizzle/0000_yielding_brother_voodoo.sql` - Generated migration with full schema (all tables from baseline through Phase 4 additions)
- `drizzle/meta/0000_snapshot.json` - Drizzle schema snapshot
- `drizzle/meta/_journal.json` - Drizzle migration journal

## Decisions Made

- **Table ordering:** briefings and briefingItems defined after articles in schema.ts. Drizzle FK references use arrow functions `() => table.id` for lazy evaluation, but ordering tables in dependency order avoids potential issues and makes schema easier to read top-to-bottom.
- **Nullable body/description:** Both columns are nullable text. `null` means data was not available (extraction failed, feed did not provide it). This is semantically distinct from an empty string and allows the pipeline to make precise fallback decisions.
- **sourceSnapshot on briefingItems:** Stores the exact text sent to the LLM per article. This supports Phase 6 grounding audits where users can verify a bullet point against its source material.

## Deviations from Plan

None - plan executed exactly as written, with one minor deviation handled inline:

The plan showed briefings/briefingItems before articles in the code block, but since `briefingItems` references `articles.id`, the tables were placed after the articles table definition. This is a correctness requirement, not a scope change.

## Issues Encountered

- `drizzle-kit push` failed when DATABASE_URL was not loaded in the shell environment — resolved by sourcing `.env.local` before the push command.

## User Setup Required

None - no external service configuration required beyond the DATABASE_URL already in `.env.local`.

## Next Phase Readiness

- Schema is fully ready for Phase 4 pipeline implementation
- `articles.body` is queryable (may be null — pipeline must handle graceful fallback to description then title)
- `briefings` and `briefingItems` tables ready to accept inserts from the summarisation pipeline
- Phase 6 dashboard can join `briefingItems → articles` to get source URLs for display

## Self-Check: PASSED

All created files confirmed on disk. Both task commits verified in git log.

---
*Phase: 04-ai-summarisation*
*Completed: 2026-03-02*
