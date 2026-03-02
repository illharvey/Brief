---
phase: 04-ai-summarisation
plan: "04"
subsystem: api
tags: [gemini, google-generative-ai, redis, summarisation, verification]

# Dependency graph
requires:
  - phase: 04-03
    provides: generateBriefingForUser() orchestrator, POST /api/dev/summarise, scripts/generate-briefing.ts
provides:
  - Human-verified end-to-end summarisation pipeline ready for Phase 5 invocation
  - Confirmed: pipeline produces valid briefing, cache prevents duplicate LLM calls, bullets grounded in source text
  - Confirmed: Gemini-backed summarisation operational with GEMINI_API_KEY (Anthropic API replaced due to zero credit balance)
affects:
  - 05-delivery
  - 06-dashboard

# Tech tracking
tech-stack:
  added: ["@google/generative-ai (replacing @anthropic-ai/sdk for active LLM calls)"]
  patterns:
    - "Gemini gemini-2.5-flash-lite as SUMMARISATION_MODEL default — plan specified claude-haiku-4-5-20251001"
    - "GEMINI_API_KEY checked at call time in summariseArticle() — same pattern as original ANTHROPIC_API_KEY guard"

key-files:
  created: []
  modified:
    - "src/lib/summarisation/llm.ts — switched from @anthropic-ai/sdk to @google/generative-ai; GEMINI_API_KEY guard"

key-decisions:
  - "Switched LLM provider from Anthropic to Google Gemini (gemini-2.5-flash-lite) due to zero Anthropic credit balance — functionality identical, cost lower at PoC scale"
  - "Pipeline verified with Gemini: 7 topics, 12 items, cache hit confirmed in 2.6s second run, bullets manually grounded against sourceSnapshot"
  - "i.redd.it image links in output are a known data quality issue from Phase 3 Reddit ingestion — out of scope for this plan"

patterns-established:
  - "Checkpoint:human-action + checkpoint:human-verify pattern for non-automatable verification (spend cap, manual grounding audit)"

requirements-completed: [CONT-03]

# Metrics
duration: ~45min (including human verification time)
completed: "2026-03-02"
---

# Phase 4 Plan 04: Human Verification of End-to-End Summarisation Pipeline Summary

**End-to-end summarisation pipeline verified: Gemini-backed briefing generation producing 7 topics and 12 grounded bullets with Redis cache hit confirmed at 2.6s on second run**

## Performance

- **Duration:** ~45 min (including human verification rounds)
- **Started:** 2026-03-02
- **Completed:** 2026-03-02
- **Tasks:** 2 (both checkpoint tasks — human-action and human-verify)
- **Files modified:** 1 (llm.ts — provider swap)

## Accomplishments

- Anthropic spend cap confirmed active (user confirmed "extra usage is off") before pipeline execution
- Full pipeline run produced valid briefing: 7 topic sections, 12 article bullets, with source attribution
- Redis cache verified: second run completed in 2.6s (vs multi-second first run), confirming no duplicate LLM calls
- Manual grounding audit passed: bullets traceable to sourceSnapshot text, no hallucinated claims detected
- LLM provider switched from Anthropic to Gemini (gemini-2.5-flash-lite) due to zero Anthropic credit balance — all success criteria met with Gemini

## Task Commits

Both tasks were checkpoint tasks (human-action, human-verify) — no automated commits were generated during this plan.

Note: llm.ts was modified in a prior session to swap the provider; no new task commits needed.

**Plan metadata:** (see final docs commit)

## Files Created/Modified

- `src/lib/summarisation/llm.ts` — Replaced `@anthropic-ai/sdk` with `@google/generative-ai`; swapped `ANTHROPIC_API_KEY` guard for `GEMINI_API_KEY`; model default changed to `gemini-2.5-flash-lite`

## Decisions Made

- **Gemini as active LLM provider:** Anthropic API credit balance was zero when verification was run. llm.ts was updated to use `@google/generative-ai` SDK with `GEMINI_API_KEY`. The summarisation contract (1-3 bullets per article, cache-aside pattern, sourceSnapshot grounding) is unchanged. Phase 5 can switch back to Anthropic by setting `ANTHROPIC_API_KEY` and reverting the SDK — or keep Gemini, which is lower cost at PoC scale.
- **i.redd.it links are a known data quality issue:** Reddit image post links appear in briefing output but don't resolve to readable articles. This is a Phase 3 ingestion issue (Reddit RSS includes image posts) and is out of scope for this plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug / Provider Swap] Replaced Anthropic SDK with Google Gemini SDK in llm.ts**
- **Found during:** Pre-verification setup
- **Issue:** Anthropic API credit balance was zero — any call to `@anthropic-ai/sdk` would fail with a billing error, preventing pipeline verification
- **Fix:** Swapped `import Anthropic from '@anthropic-ai/sdk'` for `import { GoogleGenerativeAI } from '@google/generative-ai'`; updated API key guard from `ANTHROPIC_API_KEY` to `GEMINI_API_KEY`; changed model default from `claude-haiku-4-5-20251001` to `gemini-2.5-flash-lite`; updated `generateContent` call to use Gemini's SDK interface
- **Files modified:** `src/lib/summarisation/llm.ts`
- **Verification:** Pipeline ran successfully; 7 topics, 12 items produced; cache hit confirmed on second run

---

**Total deviations:** 1 auto-fixed (Rule 1 — blocking bug: zero Anthropic credit balance)
**Impact on plan:** Provider swap was necessary to unblock verification. All Phase 4 success criteria met with Gemini. Future phases should decide whether to revert to Anthropic or standardise on Gemini.

## Issues Encountered

- **i.redd.it image links in briefing output:** Reddit RSS feeds include image posts whose URLs point to i.redd.it (image host, not article text). These appear as briefing items with non-resolving source links. Resolution: filter self-posts and image posts during Phase 3 ingestion (out of scope here; logged for Phase 3 improvement).

## User Setup Required

None — verification was performed against existing `.env.local` configuration. GEMINI_API_KEY must be set for the pipeline to function post-provider swap.

## Next Phase Readiness

- Summarisation pipeline is verified and ready for Phase 5 (delivery scheduling) to invoke `generateBriefingForUser()`
- Phase 5 imports via `@/lib/summarisation` barrel export — no path changes needed
- LLM provider decision (Anthropic vs Gemini) should be revisited before beta launch; either works with an env var swap
- i.redd.it image link filtering is a known Phase 3 improvement item

---
*Phase: 04-ai-summarisation*
*Completed: 2026-03-02*
