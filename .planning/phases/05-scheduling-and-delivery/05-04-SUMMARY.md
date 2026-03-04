---
phase: 05-scheduling-and-delivery
plan: 04
subsystem: infra
tags: [vercel, cron, nextjs, app-router]

# Dependency graph
requires:
  - phase: 05-03
    provides: runDispatch() orchestrator and DispatchResult interface from src/lib/dispatch.ts
provides:
  - Vercel Cron handler at /api/cron/dispatch with Bearer auth guard and maxDuration=300
  - Health check endpoint at /api/health/scheduler returning lastRun and timestamp from deliveries table
  - vercel.json configuring 15-minute cron schedule pointing to /api/cron/dispatch
affects: [06-user-experience, deployment]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Vercel Cron authentication via Bearer CRON_SECRET header check
    - maxDuration=300 for long-running cron route (Pro plan fluid compute)
    - Health endpoint queries deliveries table for lastRun/lastStatus monitoring

key-files:
  created:
    - src/app/api/cron/dispatch/route.ts
    - src/app/api/health/scheduler/route.ts
    - vercel.json
  modified: []

key-decisions:
  - "CRON_SECRET generated with openssl rand -hex 32 and added to .env.local — must also be set as Vercel env var before deployment"
  - "maxDuration=300 (5 minutes) — Vercel Pro plan fluid compute supports serial dispatch for ~20 beta users"
  - "*/15 * * * * schedule requires Vercel Pro plan — Hobby plan only supports daily cron (0 0 * * *)"

patterns-established:
  - "Cron route: always return 401 on auth mismatch before any side effects"
  - "Health endpoint: query deliveries table orderBy createdAt desc to surface last pipeline run"

requirements-completed: [MAIL-01]

# Metrics
duration: 2min
completed: 2026-03-04
---

# Phase 5 Plan 04: Cron Handler, Health Endpoint, and Vercel Configuration Summary

**Vercel Cron route with Bearer CRON_SECRET auth calling runDispatch() every 15 minutes, plus UptimeRobot-ready health endpoint and vercel.json cron schedule**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-04T13:22:20Z
- **Completed:** 2026-03-04T13:24:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Cron dispatch route (`/api/cron/dispatch`) with Bearer auth guard, `maxDuration=300`, full error handling, and structured JSON logging
- Health check endpoint (`/api/health/scheduler`) querying deliveries table for `lastRun`, `lastStatus`, and `timestamp` — ready for UptimeRobot
- `vercel.json` configuring 15-minute cron schedule (`*/15 * * * *`) pointing to `/api/cron/dispatch`
- `CRON_SECRET` generated and added to `.env.local`

## Task Commits

Each task was committed atomically:

1. **Task 1: Create cron dispatch route and health endpoint** - `52c7943` (feat)
2. **Task 2: Create vercel.json with cron configuration** - `24ec608` (feat)

## Files Created/Modified
- `src/app/api/cron/dispatch/route.ts` - Vercel Cron handler: validates Bearer CRON_SECRET, calls runDispatch(), returns DispatchResult as JSON, maxDuration=300
- `src/app/api/health/scheduler/route.ts` - Health check: queries deliveries table for most recent record, returns lastRun/lastStatus/timestamp
- `vercel.json` - Vercel Cron Jobs config: `/api/cron/dispatch` on `*/15 * * * *` schedule

## Decisions Made
- `CRON_SECRET` generated via `openssl rand -hex 32` — must be added as a Vercel environment variable before deployment (it is in `.env.local` for local dev only)
- `*/15 * * * *` schedule requires Vercel Pro plan — Hobby plan only supports `0 0 * * *` (daily); deployment to Hobby will fail at build time

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

Before deploying to Vercel, add `CRON_SECRET` as an environment variable in the Vercel dashboard:
1. Copy the value from `.env.local` (line starting with `CRON_SECRET=`)
2. Add it at: Vercel Dashboard → Project Settings → Environment Variables
3. Verify the cron is active after deployment at: Vercel Dashboard → Project → Cron Jobs tab

Ensure the project is on a Vercel Pro plan — the `*/15 * * * *` schedule will fail on Hobby.

## Next Phase Readiness
- Phase 5 complete — the full dispatch pipeline is wired: Vercel Cron fires every 15 minutes → `/api/cron/dispatch` → `runDispatch()` → ingestion → summarisation → email send
- Deploying to Vercel with a Pro plan will activate live briefing delivery
- Health endpoint ready to plug into UptimeRobot: `GET /api/health/scheduler` → `{ ok: true, lastRun, lastStatus, timestamp }`
- Phase 6 (user experience) can proceed — pipeline is complete

---
*Phase: 05-scheduling-and-delivery*
*Completed: 2026-03-04*
