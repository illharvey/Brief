---
phase: 03-content-pipeline
plan: 03
subsystem: api
tags: [guardian, newsdata, ingestion, fetch, news-api, rss, typescript]

# Dependency graph
requires:
  - phase: 03-content-pipeline
    plan: 01
    provides: RawArticle interface from src/lib/ingestion/types.ts

provides:
  - fetchGuardianApi(query) in src/lib/ingestion/sources/guardian.ts — queries content.guardianapis.com/search, returns RawArticle[]
  - fetchNewsdataApi(query) in src/lib/ingestion/sources/newsdata.ts — queries newsdata.io/api/1/latest, returns RawArticle[]

affects:
  - 03-04 (orchestrator imports both fetchGuardianApi and fetchNewsdataApi per user topic)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Source adapters return RawArticle[] with sourceName + sourceUrl set on every item (CONT-04)
    - Adapters throw on non-2xx; orchestrator isolates errors per source via try/catch
    - Articles with no link field filtered at adapter level before mapping (NewsData)

key-files:
  created:
    - src/lib/ingestion/sources/guardian.ts
    - src/lib/ingestion/sources/newsdata.ts
  modified: []

key-decisions:
  - "Guardian uses GUARDIAN_API_KEY env var with api-key param; NewsData uses NEWSDATA_API_KEY env var with apikey param — both read from process.env"
  - "Guardian sourceName hardcoded to 'The Guardian'; NewsData sourceName comes from source_id field (varies by publication)"
  - "NewsData articles with null/empty link are filtered before mapping — avoids RawArticle.url being empty string"
  - "NewsAPI.org is NOT used — free tier prohibits non-localhost/production use; Guardian (5000/day) and NewsData (200/day) are both production-permitted"

patterns-established:
  - "Adapter pattern: const url = new URL(BASE), set params, fetch, throw on !resp.ok, map results to RawArticle[]"
  - "Fail-fast on API errors: throw Error with status code and body — orchestrator decides whether to continue or abort"

requirements-completed: [CONT-02, CONT-04]

# Metrics
duration: 3min
completed: 2026-03-02
---

# Phase 3 Plan 03: News API Source Adapters Summary

**Guardian API adapter (5,000 calls/day) and NewsData.io adapter (200 credits/day) normalising keyword-search results to RawArticle[] with per-source error isolation**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-02T09:10:32Z
- **Completed:** 2026-03-02T09:13:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Implemented fetchGuardianApi() querying content.guardianapis.com/search with q, api-key, page-size=10, order-by=newest params
- Implemented fetchNewsdataApi() querying newsdata.io/api/1/latest with apikey, q, language=en params; filters articles missing a link field
- Both adapters set sourceName and sourceUrl on every RawArticle (satisfying CONT-04), throw on non-2xx for orchestrator error isolation, and read API keys from process.env

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement The Guardian API source adapter** - `30344f1` (feat)
2. **Task 2: Implement NewsData.io source adapter** - `1d1050f` (feat)

## Files Created/Modified

- `src/lib/ingestion/sources/guardian.ts` - fetchGuardianApi(query): queries Guardian Content API, maps to RawArticle[], sourceName='The Guardian'
- `src/lib/ingestion/sources/newsdata.ts` - fetchNewsdataApi(query): queries NewsData.io latest API, filters linkless articles, maps to RawArticle[]

## Decisions Made

- Guardian sourceName is hardcoded to `'The Guardian'` and sourceUrl to `'https://www.theguardian.com'` — Guardian is a single known publication so static values are correct
- NewsData sourceName maps from `source_id` (e.g. `'bbc-news'`, `'reuters'`) — NewsData aggregates many publishers so the source_id identifies the actual outlet
- NewsData articles without a `link` field are filtered before mapping — avoids creating RawArticle rows with an empty url which would fail the DB unique constraint and pollute dedup state
- NewsAPI.org explicitly excluded — its free tier terms prohibit use outside localhost/development environments

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**External services require manual API key configuration before the ingestion pipeline can run end-to-end.**

Two API keys must be set in `.env.local`:

| Variable | Source | Notes |
|---|---|---|
| `GUARDIAN_API_KEY` | https://developer.theguardian.com/access | Free Open Platform access, instant approval, 5,000 calls/day |
| `NEWSDATA_API_KEY` | https://newsdata.io/register | Free tier signup, 200 credits/day, production-permitted |

Both keys are only needed at runtime (Vercel environment variables for production, `.env.local` for local dev). TypeScript compilation does not require them.

## Next Phase Readiness

- Both adapters are ready for Plan 04 (ingestion orchestrator) to import and call per user topic
- Pattern established: `const articles = await fetchGuardianApi(topic)` — orchestrator wraps each call in try/catch using SourceError type from types.ts
- TypeScript compiles cleanly across entire codebase

---
*Phase: 03-content-pipeline*
*Completed: 2026-03-02*

## Self-Check: PASSED

- FOUND: src/lib/ingestion/sources/guardian.ts
- FOUND: src/lib/ingestion/sources/newsdata.ts
- FOUND: .planning/phases/03-content-pipeline/03-03-SUMMARY.md
- FOUND commit: 30344f1 (Task 1 - Guardian adapter)
- FOUND commit: 1d1050f (Task 2 - NewsData adapter)
