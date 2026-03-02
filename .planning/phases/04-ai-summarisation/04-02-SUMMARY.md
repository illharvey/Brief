---
phase: 04-ai-summarisation
plan: 02
subsystem: api
tags: [anthropic, llm, redis, cache, summarisation, typescript]

# Dependency graph
requires:
  - phase: 04-01
    provides: briefings and briefingItems schema tables, body/description columns on articles
  - phase: 03-01
    provides: articles table schema, normaliseUrl from dedup.ts
  - phase: 01-01
    provides: Redis.fromEnv() pattern from rate-limit.ts
provides:
  - src/lib/summarisation/types.ts with ArticleRow, BriefingItem, BriefingResult contracts
  - src/lib/summarisation/cache.ts with getSummary/setSummary Redis cache-aside helpers
  - src/lib/summarisation/llm.ts with summariseArticle() LLM wrapper
  - src/lib/summarisation/rank.ts with rankArticles() cross-topic scorer
  - src/lib/summarisation/assemble.ts with assembleBriefing() markdown assembler
  - "@anthropic-ai/sdk installed"
affects:
  - 04-03 (generateBriefingForUser orchestrator imports all 5 modules)
  - 04-04 (briefing dispatch uses assembled content)

# Tech tracking
tech-stack:
  added: ["@anthropic-ai/sdk ^0.78.0"]
  patterns:
    - "Cache-aside LLM pattern: check Redis before every API call, write back on miss"
    - "Global per-URL cache keyed by normaliseUrl output — shared across all users"
    - "Input truncation at 8,000 chars (~2,000 tokens) with word-boundary cut"
    - "Cross-topic hit count ranking with recency tiebreaker"
    - "Inline source attribution: [Source Name](url) appended to last bullet line per article"

key-files:
  created:
    - src/lib/summarisation/types.ts
    - src/lib/summarisation/cache.ts
    - src/lib/summarisation/llm.ts
    - src/lib/summarisation/rank.ts
    - src/lib/summarisation/assemble.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "SUMMARISATION_MODEL env var with claude-haiku-4-5-20251001 as hardcoded default — versioned model ID, not alias"
  - "Cache key is brief:summary:{normaliseUrl} — global per article, not per-user; saves LLM cost when multiple users follow same stories"
  - "ANTHROPIC_API_KEY checked at call time (not module load) — clean error message before any LLM work begins"
  - "sourceSnapshot is empty string on cache hit — avoids re-reading article text; grounding audit only needed on fresh LLM calls"

patterns-established:
  - "summariseArticle() always queries Redis before constructing Anthropic client — client creation is deferred to miss path only"
  - "buildSourceSnapshot() preference order: body > title+description > title — matches plan CONTEXT.md fall-back chain"
  - "assembleBriefing() silently omits zero-item topics — caller does not need to pre-filter"

requirements-completed: [CONT-03]

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 4 Plan 02: AI Summarisation Library Summary

**Five-module summarisation library (types, Redis cache, Anthropic LLM wrapper, cross-topic ranker, markdown assembler) with @anthropic-ai/sdk installed and all TypeScript compiling cleanly**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-02T14:11:42Z
- **Completed:** 2026-03-02T14:13:15Z
- **Tasks:** 2
- **Files modified:** 7 (5 created, 2 modified)

## Accomplishments
- Installed `@anthropic-ai/sdk` (v0.78.0) and confirmed TypeScript types available
- Created all five single-concern summarisation modules in `src/lib/summarisation/`
- LLM wrapper implements cache-aside: Redis lookup before every Anthropic call, write-back on miss, 7-day TTL
- Ranker implements cross-topic hit count scoring with recency tiebreaker and per-topic dedup
- Assembler produces spec-compliant markdown with `## Topic` headers and inline `[Source](url)` attribution per article

## Task Commits

Each task was committed atomically:

1. **Task 1: Install @anthropic-ai/sdk and create types.ts + cache.ts** - `20c238f` (feat)
2. **Task 2: Create llm.ts, rank.ts, and assemble.ts** - `9766c9a` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/lib/summarisation/types.ts` - ArticleRow (DrizzleORM inferred), BriefingItem, BriefingResult type contracts
- `src/lib/summarisation/cache.ts` - getSummary/setSummary with Redis.fromEnv(), brief:summary: prefix, 7-day TTL
- `src/lib/summarisation/llm.ts` - summariseArticle() with cache-aside, 8,000-char truncation, ANTHROPIC_API_KEY guard, max_tokens: 256
- `src/lib/summarisation/rank.ts` - rankArticles() cross-topic hit count scoring, recency tiebreaker, per-topic dedup, topN cap
- `src/lib/summarisation/assemble.ts` - assembleBriefing() with topic-ordered ## sections, inline attribution, failed-topic note
- `package.json` - @anthropic-ai/sdk added to dependencies
- `package-lock.json` - lockfile updated

## Decisions Made
- Versioned model ID `claude-haiku-4-5-20251001` hardcoded as default (not alias) — per CONTEXT.md locked decision
- Cache is global per normalised URL across all users — cost-efficient when multiple subscribers follow the same stories
- `ANTHROPIC_API_KEY` validated at call time so pipeline fails fast with a clear message rather than at module import
- `sourceSnapshot` returns empty string on cache hit — grounding audit text only captured on fresh LLM calls

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration before Plan 03 can run end-to-end:**

- `ANTHROPIC_API_KEY` — Anthropic Console → API Keys (https://console.anthropic.com/settings/keys)
- `SUMMARISATION_MODEL` — Optional; defaults to `claude-haiku-4-5-20251001` if not set
- Workspace spend limit — Anthropic Console → Settings → Limits (required before any beta user triggers the pipeline)

These are documented in the plan `user_setup` frontmatter. No separate USER-SETUP.md was generated as the plan already documents them.

## Next Phase Readiness
- All five modules are independently callable; Plan 03 (`generateBriefingForUser`) can import from all five
- TypeScript compiles cleanly with no errors across the full project
- Redis cache helpers use the same `Redis.fromEnv()` pattern as existing rate-limiter — no new infra needed
- Anthropic SDK is ready; user must supply `ANTHROPIC_API_KEY` before live summarisation runs

---
*Phase: 04-ai-summarisation*
*Completed: 2026-03-02*
