---
phase: 07-beta-polish
plan: "02"
subsystem: api
tags: [drizzle-orm, typescript, admin-scripts, observability, audit]

# Dependency graph
requires:
  - phase: 04-ai-summarisation
    provides: briefingItems table with sourceSnapshot and fromCache columns
  - phase: 05-scheduling-and-delivery
    provides: deliveries table with deliveryDate and status columns
provides:
  - scripts/briefing-count.ts — CLI admin tool for daily sent briefing counts by date
  - scripts/audit-briefing.ts — CLI admin tool generating Markdown AI audit documents per briefing
affects:
  - 07-05 (AI audit checkpoint — uses audit-briefing.ts output for side-by-side verification)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Admin CLI scripts follow generate-briefing.ts pattern: import dotenv/config, async main(), process.exit(0/1)
    - Drizzle sql template literal used for mixed AND conditions on text columns
    - sourceSnapshot truncation at 500 chars guards audit docs against unwieldy LLM context dumps

key-files:
  created:
    - scripts/briefing-count.ts
    - scripts/audit-briefing.ts
  modified: []

key-decisions:
  - "briefing-count.ts uses sql template literal for combined status+deliveryDate filter — avoids combining eq() with gte() on a text column across drizzle type constraints"
  - "audit-briefing.ts filters fromCache = false client-side after query rather than adding a Drizzle boolean where clause — simpler and correct for small result sets"
  - "sourceSnapshot truncated at 500 chars with '... [truncated]' marker — keeps audit docs readable without losing attribution reference"
  - "audit-briefing.ts prints cache-miss guidance message when all items are cache hits — actionable next step for developer"

patterns-established:
  - "Admin CLI scripts: import dotenv/config + async main() + .then(() => process.exit(0)).catch(err => { ... process.exit(1) })"
  - "Audit Markdown: topic-grouped sections with per-item PASS/FAIL/UNVERIFIABLE verdict checkboxes"

requirements-completed: []

# Metrics
duration: 2min
completed: 2026-03-09
---

# Phase 07 Plan 02: Admin Scripts Summary

**Two Drizzle-based CLI admin scripts: daily sent briefing count table and per-briefing AI claim audit document with sourceSnapshot comparison**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-09T08:40:00Z
- **Completed:** 2026-03-09T08:42:09Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `scripts/briefing-count.ts` queries deliveries table for sent briefings grouped by delivery date, with `--days N` flag (default 7), prints formatted table and running total
- `scripts/audit-briefing.ts` generates a Markdown audit document per briefing ID, joining briefingItems with articles, filtering fromCache=false, grouping by topic with PASS/FAIL/UNVERIFIABLE verdict checkboxes per item
- Both scripts follow the existing generate-briefing.ts pattern (dotenv/config, async main, process.exit)
- TypeScript compiles cleanly with both scripts present

## Task Commits

Each task was committed atomically:

1. **Task 1: Create scripts/briefing-count.ts** - `8a49fc5` (feat)
2. **Task 2: Create scripts/audit-briefing.ts** - `2ae08c3` (feat)

## Files Created/Modified
- `scripts/briefing-count.ts` - Admin query: sent briefing count by date from deliveries table, `--days` flag support
- `scripts/audit-briefing.ts` - AI audit document generator: briefingId -> Markdown with claim/source pairs, fromCache=false filter

## Decisions Made
- Used `sql` template literal for the combined status+deliveryDate filter in briefing-count.ts rather than chaining `and(eq(...), gte(...))` — cleaner for text column string comparison
- Client-side `fromCache === false` filter in audit-briefing.ts after query fetch — correct and simpler for small result sets at beta scale
- sourceSnapshot truncated at 500 chars with "... [truncated]" suffix — prevents audit document from becoming unwieldy for long article bodies

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Both scripts read DATABASE_URL from .env.local via tsx dotenv/config.

## Next Phase Readiness
- Gate criterion 4 (AI audit): `audit-briefing.ts` is ready for Plan 05 audit checkpoint — run against a real briefingId and pipe output to a Markdown file
- Gate criterion 5 (observability): `briefing-count.ts` provides at-a-glance pipeline health metric for daily monitoring
- Both scripts usable immediately with existing .env.local configuration

---
*Phase: 07-beta-polish*
*Completed: 2026-03-09*
