---
phase: 07-beta-polish
plan: "01"
subsystem: infra
tags: [logging, vercel, console-error, json-structured, ingestion, summarisation]

# Dependency graph
requires:
  - phase: 03-content-pipeline
    provides: ingestForUser with in-memory result.errors
  - phase: 04-ai-summarisation
    provides: generateBriefingForUser with template-string console.error

provides:
  - Structured JSON console.error logs for per-feed ingestion failures (stage, source, userId, error, timestamp)
  - Structured JSON console.error logs for per-topic summarisation failures (stage, userId, topic, error, timestamp)
  - Both pipeline stages now emit machine-parseable Vercel log drain output

affects: [vercel-log-drain, beta-observability, pipeline-monitoring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "console.error(JSON.stringify({stage, ...context, error, timestamp})) for pipeline error logging"
    - "stage field identifies pipeline origin: 'ingestion' | 'summarisation' | 'dispatch'"

key-files:
  created: []
  modified:
    - src/lib/ingestion/index.ts
    - src/lib/summarisation/index.ts

key-decisions:
  - "recordError closure captures userId from ingestForUser parameter — no signature change needed"
  - "result.errors in-memory array preserved alongside new console.error — callers (Phase 5 scheduler) unaffected"
  - "All four pipeline stages (ingestion, summarisation, dispatch + existing) now emit consistent structured JSON"

patterns-established:
  - "Structured error log pattern: {stage, userId, contextFields, error, timestamp} matches dispatch.ts reference"

requirements-completed: []

# Metrics
duration: 2min
completed: 2026-03-09
---

# Phase 7 Plan 01: Structured Pipeline Error Logging Summary

**Ingestion recordError and summarisation catch block upgraded from silent in-memory errors and template strings to console.error(JSON.stringify({stage, userId, ...})) parseable by Vercel log drain**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-09T12:56:45Z
- **Completed:** 2026-03-09T12:57:40Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `recordError` in `ingestForUser` now emits structured JSON to console.error in addition to populating result.errors array
- Topic failure catch block in `generateBriefingForUser` replaced template-string log with structured JSON matching dispatch.ts pattern
- All four pipeline stages (ingestion, summarisation, dispatch) now emit uniform `{stage, userId, ..., error, timestamp}` logs
- TypeScript compiles cleanly, no type changes, no interface breaks

## Task Commits

Each task was committed atomically:

1. **Task 1: Add structured console.error to ingestion recordError** - `a0cd9b2` (feat)
2. **Task 2: Replace template-string console.error in summarisation with structured JSON** - `4ad629e` (feat)

## Files Created/Modified
- `src/lib/ingestion/index.ts` - recordError now calls console.error(JSON.stringify({stage:'ingestion', source, userId, error, timestamp})) before pushing to result.errors
- `src/lib/summarisation/index.ts` - topic catch block replaced with console.error(JSON.stringify({stage:'summarisation', userId, topic, error, timestamp}))

## Decisions Made
- `userId` was already in closure scope for both functions — no signature changes needed
- The in-memory `result.errors` array was preserved unchanged in ingestion — Phase 5 scheduler still reads it for IngestionResult reporting
- Pattern matches src/lib/dispatch.ts reference exactly (the pre-existing correct implementation)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Gate criterion 5 (all pipeline stages emit structured JSON) is now met for ingestion and summarisation
- Vercel log drain can now parse and alert on per-feed and per-topic failures
- Phase 7 Plan 02 can proceed

---
*Phase: 07-beta-polish*
*Completed: 2026-03-09*
