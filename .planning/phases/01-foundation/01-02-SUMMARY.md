---
phase: 01-foundation
plan: 02
subsystem: auth
tags: [next-auth, jwt, bcryptjs, drizzle-adapter, upstash, ratelimit, edge-middleware]

# Dependency graph
requires:
  - phase: 01-foundation plan 01
    provides: "db client, users schema, signInSchema Zod validation"
provides:
  - "auth.config.ts: edge-safe Auth.js config with JWT strategy and /dashboard protection"
  - "auth.ts: full server Auth.js instance with DrizzleAdapter, bcrypt Credentials authorize"
  - "handlers, auth, signIn, signOut exports"
  - "middleware.ts: Edge middleware protecting /dashboard with callbackUrl redirect"
  - "rate-limit.ts: Upstash sliding window loginRatelimit (5 attempts / 30s)"
  - "Auth.js catch-all API route at /api/auth/[...nextauth]"
affects:
  - 01-03 (login server action will use signIn, loginRatelimit)
  - 01-04 (registration action will use signIn)
  - 01-05 (password reset needs auth context)
  - all dashboard-protected routes

# Tech tracking
tech-stack:
  added: [next-auth@5.0.0-beta.30, @auth/drizzle-adapter, bcryptjs, @upstash/ratelimit, @upstash/redis]
  patterns:
    - "Auth.js v5 split-config: auth.config.ts (Edge-safe) + auth.ts (full Node.js)"
    - "JWT-only sessions with Credentials provider (database sessions cause JWTSessionError)"
    - "Upstash Redis sliding window for rate limiting login attempts"

key-files:
  created:
    - src/lib/auth.config.ts
    - src/lib/auth.ts
    - src/lib/rate-limit.ts
    - src/app/api/auth/[...nextauth]/route.ts
    - middleware.ts
  modified: []

key-decisions:
  - "authorize() is in auth.ts only — auth.config.ts has authorize: undefined to prevent Edge runtime crash from crypto module"
  - "JWT strategy set in both config files for consistency — DrizzleAdapter used only for user/account persistence, not session rows"
  - "loginRatelimit uses analytics: false to preserve Upstash free tier headroom"

patterns-established:
  - "Split auth config: all Edge middleware code imports only from auth.config.ts, never auth.ts"
  - "Rate limit identifier pattern: 'login:{email}' or 'login:{ip}' set at action call site"

requirements-completed: [AUTH-02, AUTH-03, AUTH-05]

# Metrics
duration: 1min
completed: 2026-02-28
---

# Phase 1 Plan 02: Auth.js v5 Split Config and Middleware Summary

**Auth.js v5 split-config pattern with bcrypt Credentials authorize in server instance, JWT 30-day rolling sessions, Edge middleware protecting /dashboard, and Upstash sliding-window rate limiter**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-28T19:51:45Z
- **Completed:** 2026-02-28T19:53:09Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Implemented Auth.js v5 split-config pattern: auth.config.ts is strictly edge-safe (no bcrypt/drizzle imports), auth.ts has full Node.js access with DrizzleAdapter and bcrypt authorize logic
- Edge middleware at middleware.ts protects /dashboard routes by importing only auth.config.ts, with callbackUrl preservation on redirect to /login
- Upstash Redis sliding window rate limiter initialized at src/lib/rate-limit.ts for use in login server actions (5 attempts / 30s per identifier)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create split Auth.js config** - `4ea55d1` (feat)
2. **Task 2: Create middleware and rate limiter** - `4e9f50d` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/lib/auth.config.ts` - Edge-safe NextAuthConfig: Credentials provider stub, authorized callback, JWT session strategy, /login page config
- `src/lib/auth.ts` - Full server NextAuth instance: DrizzleAdapter, Credentials provider with bcrypt authorize, handlers/auth/signIn/signOut exports
- `src/app/api/auth/[...nextauth]/route.ts` - Auth.js catch-all route exporting GET and POST from handlers
- `middleware.ts` - Edge middleware importing only auth.config.ts; matcher excludes api/_next/static/_next/image/favicon
- `src/lib/rate-limit.ts` - Upstash Ratelimit sliding window 5/30s with brief:ratelimit prefix, analytics disabled

## Decisions Made

- `authorize: undefined` in auth.config.ts is the correct pattern for Auth.js beta.30 to prevent Edge runtime from loading Node.js crypto module via the Credentials provider
- JWT strategy specified explicitly in both auth.config.ts and auth.ts to guarantee consistency — auth.ts session block overrides the spread but both must agree
- `analytics: false` on Upstash Ratelimit to avoid consuming free tier analytics write quota

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compiled with zero errors on first attempt.

## User Setup Required

The rate limiter reads `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from environment variables. These must be set in `.env.local` before the login action (Plan 03) can be tested. Placeholder values were added in Plan 01; real values come from the Upstash console.

## Next Phase Readiness

- All auth exports (`handlers`, `auth`, `signIn`, `signOut`) ready for Plan 03 login action
- `loginRatelimit` ready for use in Plan 03 login server action
- Edge middleware active: all /dashboard routes protected immediately
- No blockers for Plan 03

---
*Phase: 01-foundation*
*Completed: 2026-02-28*

## Self-Check: PASSED

- FOUND: src/lib/auth.config.ts
- FOUND: src/lib/auth.ts
- FOUND: src/app/api/auth/[...nextauth]/route.ts
- FOUND: middleware.ts
- FOUND: src/lib/rate-limit.ts
- FOUND: .planning/phases/01-foundation/01-02-SUMMARY.md
- FOUND: commit 4ea55d1 (Task 1)
- FOUND: commit 4e9f50d (Task 2)
