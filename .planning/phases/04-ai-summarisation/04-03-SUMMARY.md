---
phase: 04-ai-summarisation
plan: 03
subsystem: api
tags: [anthropic, drizzle-orm, next.js, typescript, summarisation, briefing]

# Dependency graph
requires:
  - phase: 04-02
    provides: summariseArticle, rankArticles, assembleBriefing, BriefingResult types, Redis cache
  - phase: 04-01
    provides: briefings and briefingItems DB schema, articles table with body/description
  - phase: 01-01
    provides: userTopics table, DB client
provides:
  - generateBriefingForUser(userId) — full pipeline callable for Phase 5 import
  - POST /api/dev/summarise — dev-only manual trigger returning BriefingResult JSON
  - scripts/generate-briefing.ts — CLI test script via npx tsx
affects: [05-scheduling-delivery]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Orchestrator function wires library modules (rank, llm, assemble) into a single callable"
    - "Per-topic try/catch isolation — partial failure preserved, other topics continue"
    - "Early env var validation before any DB/LLM work begins"
    - "Dev API route mirrors existing /api/dev/ingest pattern (403 in production)"
    - "CLI script uses dotenv/config for .env.local loading with npx tsx"

key-files:
  created:
    - src/lib/summarisation/index.ts
    - src/app/api/dev/summarise/route.ts
    - scripts/generate-briefing.ts
  modified: []

key-decisions:
  - "dotenv already available as transitive dependency — no explicit install needed for CLI script"
  - "generateBriefingForUser exported from @/lib/summarisation — Phase 5 imports by module path not file"
  - "topicCount stored as (total topics - failed topics) in briefings row — represents topics successfully included"

patterns-established:
  - "Pipeline orchestrator pattern: single async function wires feature modules without duplicating logic"
  - "Per-topic error isolation: topic-level try/catch appends to failedTopics[], other topics unaffected"

requirements-completed: [CONT-03]

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 4 Plan 03: Summarisation Pipeline Wiring Summary

**generateBriefingForUser(userId) orchestrator wires fetch → rank → summarise → assemble → DB persist with per-topic failure isolation, exposed via dev API route and CLI script**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-02T14:15:41Z
- **Completed:** 2026-03-02T14:17:02Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- `generateBriefingForUser(userId)` orchestrates the complete Phase 4 pipeline: fetch last-24h articles, group by topic keyword match, rank, summarise with cache-aside, assemble markdown, persist briefing + briefingItems rows, return `BriefingResult`
- Early `ANTHROPIC_API_KEY` validation throws before any DB or LLM work begins
- Per-topic `try/catch` isolation: topic failures are collected in `failedTopics[]`, other topics continue and partial briefings are persisted
- `POST /api/dev/summarise` follows the established `/api/dev/ingest` pattern — 403 in production, returns full `BriefingResult` JSON
- `scripts/generate-briefing.ts` provides CLI test entry point runnable with `npx tsx scripts/generate-briefing.ts <userId>`

## Task Commits

Each task was committed atomically:

1. **Task 1: Create generateBriefingForUser() orchestrator** - `4a10ee2` (feat)
2. **Task 2: Create dev API route and CLI test script** - `1be4590` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `src/lib/summarisation/index.ts` - Main pipeline orchestrator, exported `generateBriefingForUser(userId)`
- `src/app/api/dev/summarise/route.ts` - Dev-only POST route, 403 in production
- `scripts/generate-briefing.ts` - CLI test script, reads from .env.local via dotenv/config

## Decisions Made
- `dotenv` was already installed as a transitive dependency — no explicit `npm install` needed for the CLI script
- `generateBriefingForUser` exported from `@/lib/summarisation` (module path) so Phase 5 imports the module barrel, not the file directly
- `topicCount` in the briefings row is stored as `(topicNames.length - failedTopics.length)` — represents topics successfully included in briefing, not total user topics

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `generateBriefingForUser` is ready for Phase 5 (Scheduling and Delivery) to import directly from `@/lib/summarisation`
- Dev route available at `POST /api/dev/summarise` for manual pipeline testing with real credentials
- CLI script available at `npx tsx scripts/generate-briefing.ts <userId>` for end-to-end validation
- Phase 4 fully complete — all summarisation pipeline components built and wired

---
*Phase: 04-ai-summarisation*
*Completed: 2026-03-02*
