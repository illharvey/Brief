---
phase: 03-content-pipeline
plan: 02
subsystem: api
tags: [rss, reddit, rss-parser, news-ingestion, feed-adapter]

# Dependency graph
requires:
  - phase: 03-01
    provides: RawArticle type, ingestion types (types.ts)
provides:
  - fetchRssSource(url, sourceName) returning RawArticle[] from any RSS/Atom feed
  - BBC_RSS_FEEDS constant with 5 curated BBC topic feeds
  - fetchRedditRss(subreddit) returning external-linked articles from subreddit RSS
  - fetchRedditHot(subreddit) returning external-linked hot posts from Reddit JSON API
  - findSubredditsForTopic(topic) returning up to 3 subreddit names for a keyword
affects: [03-04-orchestrator, content-pipeline]

# Tech tracking
tech-stack:
  added: [rss-parser@3.13.0 (bundles own TypeScript declarations)]
  patterns:
    - Per-source throw pattern — each adapter throws on failure; orchestrator wraps in try/catch
    - User-Agent header required for all Reddit API calls to avoid 429 (User-Agent filtering, not rate limiting)
    - Self-post filter uses both is_self flag (hot.json) and reddit.com URL check (RSS)
    - findSubredditsForTopic returns [] gracefully — never throws

key-files:
  created:
    - src/lib/ingestion/sources/rss.ts
    - src/lib/ingestion/sources/reddit.ts
  modified:
    - package.json (added rss-parser dependency)
    - package-lock.json

key-decisions:
  - "@types/rss-parser does not exist on npm — rss-parser ships its own index.d.ts, no @types package needed"
  - "REDDIT_USER_AGENT set on both rss-parser instance and raw fetch calls — Reddit filters by User-Agent not just rate-limits"
  - "findSubredditsForTopic wraps entire body in try/catch and returns [] — resilience over partial data for topic discovery"
  - "fetchRedditRss self-post filter uses URL pattern (reddit.com/r/) not is_self flag — RSS feed does not expose is_self field"

patterns-established:
  - "Feed adapter pattern: throws on failure, caller orchestrates try/catch isolation"
  - "Reddit User-Agent: REDDIT_USER_AGENT constant used across all Reddit requests (parser headers + fetch headers)"

requirements-completed: [CONT-01]

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 3 Plan 02: RSS and Reddit Source Adapters Summary

**rss-parser-backed BBC RSS ingestion and Reddit three-function adapter (RSS feed + hot.json + subreddit search) normalised to RawArticle[]**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-02T09:10:26Z
- **Completed:** 2026-03-02T09:12:28Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- rss-parser installed (bundles own TypeScript types; @types/rss-parser does not exist on npm)
- RSS adapter with BBC_RSS_FEEDS (5 curated feeds: world, tech, business, science, health) and generic fetchRssSource() for any RSS/Atom URL
- Reddit adapter with three functions: fetchRedditRss(), fetchRedditHot(), findSubredditsForTopic() — all using correct REDDIT_USER_AGENT to avoid 429 responses
- Self-post filtering: is_self flag in hot.json path, reddit.com/r/ URL pattern in RSS path
- TypeScript compiles cleanly with strict mode; both files fully typed

## Task Commits

Each task was committed atomically:

1. **Task 1: Install rss-parser and implement RSS source adapter with BBC feeds** - `1d1050f` (feat — bundled in prior 03-03 session commit)
2. **Task 2: Implement Reddit source adapter** - `cb6a2bf` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/lib/ingestion/sources/rss.ts` - fetchRssSource() generic RSS/Atom parser; BBC_RSS_FEEDS constant with 5 curated BBC feed URLs
- `src/lib/ingestion/sources/reddit.ts` - findSubredditsForTopic(), fetchRedditRss(), fetchRedditHot() with REDDIT_USER_AGENT on all requests
- `package.json` - Added rss-parser@^3.13.0 dependency
- `package-lock.json` - Lockfile updated

## Decisions Made
- `@types/rss-parser` does not exist on npm — rss-parser v3 ships its own `index.d.ts`; no separate types package needed
- REDDIT_USER_AGENT set on both the rss-parser instance headers and raw fetch() calls — Reddit filters requests by User-Agent header, not only by rate limit
- `findSubredditsForTopic` has full try/catch returning [] — topic discovery is best-effort; failing silently allows orchestrator to skip Reddit for that topic without propagating an error
- RSS-based self-post filter uses `link.includes('reddit.com/r/')` — RSS feed items expose `link` pointing to the Reddit thread for self-posts, not `is_self`; hot.json exposes `is_self` flag directly

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed @types/rss-parser from install command**
- **Found during:** Task 1 (rss-parser installation)
- **Issue:** `@types/rss-parser` does not exist on npm (404 Not Found); plan's user_setup block referenced it
- **Fix:** Skipped the @types/rss-parser install — rss-parser ships its own TypeScript declarations in `index.d.ts`; no separate types package required
- **Files modified:** None (package.json unchanged from fix; rss-parser already the correct install)
- **Verification:** `npx tsc --noEmit` passes with no errors using bundled types
- **Committed in:** 1d1050f (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — non-existent @types package)
**Impact on plan:** Deviation was necessary; rss-parser bundles its own types so no package is missing. No scope creep.

## Issues Encountered
- rss.ts was pre-committed during a prior session (03-03 commit 1d1050f) that ran ahead of plan order. File content matched the plan spec exactly; no rework needed.

## User Setup Required
None - RSS and Reddit public feeds require no API keys or environment variables.

## Next Phase Readiness
- Both source adapters complete and TypeScript-verified
- Plan 03 (Guardian API adapter) and Plan 04 (orchestrator) can import from these files
- Reddit low-confidence note: subreddit search JSON response format based on community examples — orchestrator should handle [] return gracefully

---
*Phase: 03-content-pipeline*
*Completed: 2026-03-02*

## Self-Check: PASSED

- FOUND: src/lib/ingestion/sources/rss.ts
- FOUND: src/lib/ingestion/sources/reddit.ts
- FOUND: .planning/phases/03-content-pipeline/03-02-SUMMARY.md
- FOUND commit: cb6a2bf (Task 2 — Reddit adapter)
- FOUND commit: 1d1050f (Task 1 — RSS adapter, bundled in prior 03-03 session)
