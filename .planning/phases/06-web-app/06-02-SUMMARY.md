---
phase: 06-web-app
plan: "02"
subsystem: ui
tags: [react-markdown, remark-gfm, drizzle, nextjs, server-actions, sonner]

# Dependency graph
requires:
  - phase: 06-web-app plan 01
    provides: react-markdown installed, extractBriefingHeadline utility, design tokens, dashboard route
  - phase: 01-foundation
    provides: auth, db schema (briefings, userTopics, deliveryPreferences), db client
provides:
  - Briefing viewer with react-markdown custom renderers (BriefingViewer)
  - 14-day reverse-chronological briefing archive list (BriefingList)
  - Adjacent topic suggestion pills with add-to-topics interaction (TopicSuggestions)
  - addTopicAction server action for appending single topics
  - Hardcoded topic adjacency graph with getAdjacentTopics() (topic-graph.ts)
  - /dashboard page fully replaced with real briefing data
  - /dashboard/briefings/[id] individual briefing viewer with ownership guard
affects: [06-03, 06-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server Component data fetching with Promise.all for parallel DB queries
    - Client Component pill interaction with local Set state for optimistic removal
    - Async props.params pattern for Next.js 16 dynamic route pages
    - Ownership guard with and(eq(id), eq(userId)) in Drizzle query

key-files:
  created:
    - src/lib/topic-graph.ts
    - src/actions/topics.ts
    - src/components/briefing/briefing-viewer.tsx
    - src/components/briefing/briefing-list.tsx
    - src/components/briefing/topic-suggestions.tsx
    - src/app/dashboard/briefings/[id]/page.tsx
  modified:
    - src/app/dashboard/page.tsx

key-decisions:
  - "addTopicAction is a separate new file — does NOT modify saveTopicsAction in preferences.ts which deletes and replaces all topics"
  - "Duplicate topic prevention is client-side (filter existing topics before showing pills) — userTopics table has no unique constraint on (userId, topic)"
  - "Today-check uses Intl.DateTimeFormat en-CA (YYYY-MM-DD) in user's timezone — avoids UTC date boundary mismatch"
  - "BriefingPage uses await props.params per Next.js 16 async params requirement"

patterns-established:
  - "BriefingViewer: custom react-markdown renderers using design tokens (text-espresso, border-steam, font-playfair, font-dm-sans)"
  - "TopicSuggestions: optimistic pill removal with local Set state, no server refetch needed"
  - "Dashboard page: fetch briefings + topics + prefs in parallel, determine today's briefing by date string comparison in user's timezone"

requirements-completed: [PREF-04, WEB-01, WEB-02]

# Metrics
duration: 2min
completed: 2026-03-06
---

# Phase 06 Plan 02: Briefing Viewer, Archive, and Topic Suggestions Summary

**Dashboard replaced with real briefing data: react-markdown viewer, 14-day archive list, adjacent topic suggestion pills, and /dashboard/briefings/[id] individual briefing route with ownership guard**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-06T13:58:45Z
- **Completed:** 2026-03-06T14:01:09Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- BriefingViewer client component renders markdown briefings with styled h2/ul/li/a/p renderers using design tokens
- BriefingList shows reverse-chronological archive with date + headline rows linking to /dashboard/briefings/[id]
- TopicSuggestions renders up to 4 adjacent topic pills; clicking Add fires addTopicAction + sonner toast + optimistic pill removal
- /dashboard page fully replaced: fetches briefings, topics, prefs in parallel; shows today's briefing or "on the way" placeholder
- /dashboard/briefings/[id] route with ownership guard (and(eq(id), eq(userId))) and async props.params pattern

## Task Commits

Each task was committed atomically:

1. **Task 1: Create topic-graph.ts, addTopicAction, and briefing components** - `eb34375` (feat)
2. **Task 2: Replace dashboard placeholder and add [id] briefing route** - `755dd26` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/lib/topic-graph.ts` - Hardcoded TOPIC_ADJACENCY map with getAdjacentTopics() returning up to N adjacent topics excluding already-followed ones
- `src/actions/topics.ts` - addTopicAction server action: auth check, validation, single-topic DB insert
- `src/components/briefing/briefing-viewer.tsx` - Client component wrapping react-markdown with custom renderers for briefing styling
- `src/components/briefing/briefing-list.tsx` - Client component rendering clickable archive rows with date + headline
- `src/components/briefing/topic-suggestions.tsx` - Client component with pill buttons; local Set tracks added topics to hide them immediately
- `src/app/dashboard/page.tsx` - Server component: parallel fetch, today-check by timezone-aware date string comparison, renders viewer or placeholder
- `src/app/dashboard/briefings/[id]/page.tsx` - Server component: ownership guard via and() Drizzle query, async props.params, notFound() on miss

## Decisions Made
- `addTopicAction` is a new file separate from `saveTopicsAction` (in preferences.ts) — the existing action deletes and replaces all topics; the new one only appends a single topic
- Duplicate prevention is client-side: existing user topics are filtered before passing to `TopicSuggestions`, so no DB unique constraint is needed
- Today's briefing is determined by comparing `YYYY-MM-DD` strings formatted in the user's timezone — avoids UTC boundary mismatches
- `/dashboard/briefings/[id]` uses `await props.params` per Next.js 16's async params requirement

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- All three briefing UI components are ready for reuse in future plans
- /dashboard and /dashboard/briefings/[id] are fully functional pending live briefing data
- Plans 03 and 04 can proceed: settings, onboarding, and any remaining Phase 6 work

## Self-Check: PASSED

- FOUND: src/lib/topic-graph.ts
- FOUND: src/actions/topics.ts
- FOUND: src/components/briefing/briefing-viewer.tsx
- FOUND: src/components/briefing/briefing-list.tsx
- FOUND: src/components/briefing/topic-suggestions.tsx
- FOUND: src/app/dashboard/page.tsx
- FOUND: src/app/dashboard/briefings/[id]/page.tsx
- FOUND commit: eb34375 (feat(06-02): create topic-graph, addTopicAction, and briefing components)
- FOUND commit: 755dd26 (feat(06-02): replace dashboard placeholder and add briefings/[id] route)
- TypeScript: exits 0
- Build: passes — /dashboard and /dashboard/briefings/[id] appear as dynamic routes

---
*Phase: 06-web-app*
*Completed: 2026-03-06*
