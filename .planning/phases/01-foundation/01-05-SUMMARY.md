---
phase: 01-foundation
plan: 05
subsystem: auth
tags: [next-auth, react, useActionState, server-actions, password-reset, session, dashboard]

# Dependency graph
requires:
  - phase: 01-foundation plan 03
    provides: "signInAction, signOutAction, requestPasswordResetAction, consumePasswordResetAction server actions; auth() session helper"
  - phase: 01-foundation plan 02
    provides: "auth() export from Auth.js v5 JWT strategy"
provides:
  - "src/app/(auth)/login/page.tsx: Login form with credential/rate-limit error display and callbackUrl redirect"
  - "src/app/(auth)/forgot-password/page.tsx: Password reset request form with email-enumeration-safe success message"
  - "src/app/(auth)/reset-password/page.tsx: Token-consuming password reset form with expired-token handling"
  - "src/app/(dashboard)/layout.tsx: Auth-guarded dashboard layout via auth() server call"
  - "src/app/(dashboard)/page.tsx: Placeholder dashboard proving session persistence with signOut"
affects:
  - 01-06 (remaining foundation — shares no files but completes auth UI surface)
  - all phases using dashboard route (Phase 6 replaces dashboard/page.tsx)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useActionState wrapper pattern: wraps server action in async function to satisfy prevState parameter"
    - "callbackUrl redirect pattern: login page reads ?callbackUrl= query param, decodes on success"
    - "Auth-guarded layout: server component calls auth(), uses Next.js redirect() for unauthenticated users"
    - "Form action for signOut: uses <form action={signOutAction}> — server action called directly from JSX"

key-files:
  created:
    - src/app/(auth)/login/page.tsx
    - src/app/(auth)/forgot-password/page.tsx
    - src/app/(auth)/reset-password/page.tsx
    - src/app/(dashboard)/layout.tsx
    - src/app/(dashboard)/page.tsx
  modified: []

key-decisions:
  - "login/page.tsx uses useEffect to detect success state and router.push — client component redirect pattern with useActionState"
  - "forgot-password always shows 'Check your inbox' on success — matches requestPasswordResetAction behavior (never leaks email existence)"
  - "reset-password passes token via hidden input to consumePasswordResetAction — token read from ?token= URL param"
  - "dashboard/layout.tsx redirects to /login (not /login?callbackUrl=) — simple redirect; middleware handles callbackUrl injection"

patterns-established:
  - "useActionState wrapper: all client-side form pages use async wrapper function (prevState: unknown, formData: FormData) => ServerAction(formData)"
  - "Auth guard pattern: DashboardLayout calls auth() at top level, redirects immediately on null session"

requirements-completed: [AUTH-02, AUTH-03, AUTH-04, AUTH-05]

# Metrics
duration: 5min
completed: 2026-02-28
---

# Phase 1 Plan 05: Auth UI Pages Summary

**Login, forgot-password, reset-password pages plus auth-guarded dashboard placeholder — complete auth UI surface using useActionState with callbackUrl redirect and email-enumeration-safe flows**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-28T20:01:06Z
- **Completed:** 2026-02-28T20:06:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Built login page with credential error display ("Email or password is incorrect" — user decision: locked), rate-limit message, and callbackUrl redirect on success
- Built forgot-password and reset-password pages completing the full password reset flow — email-enumeration-safe success messaging, token passed via hidden input, expired-token error handling
- Built auth-guarded dashboard layout and placeholder page that proves session persistence (shows email, has signOut form action) — satisfies AUTH-02 and AUTH-05

## Task Commits

Each task was committed atomically:

1. **Task 1: Build login page and password reset pages** - `5b96c85` (feat)
2. **Task 2: Build protected dashboard layout and placeholder page** - `968980a` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/app/(auth)/login/page.tsx` - Login form: useActionState wrapping signInAction, callbackUrl from searchParams, credential + rate-limit error display, redirect on success via useEffect + router.push
- `src/app/(auth)/forgot-password/page.tsx` - Reset request form: useActionState wrapping requestPasswordResetAction, shows generic "Check your inbox" on success regardless of email existence
- `src/app/(auth)/reset-password/page.tsx` - Token consumption form: reads ?token= from URL, passes via hidden input to consumePasswordResetAction, handles invalid_or_expired_token and invalid_input field errors, redirects to /login?reset=success on success
- `src/app/(dashboard)/layout.tsx` - Server component auth guard: calls auth(), redirects to /login on null session, wraps children in min-h-screen div
- `src/app/(dashboard)/page.tsx` - Placeholder dashboard: shows session.user.email, signOut form action button (AUTH-05 verifiable)

## Decisions Made

- Login page uses `useEffect` watching the action state and `router.push` for redirect — necessary because `useActionState` is a client hook and `redirect()` must be called from server context; the client-side redirect is the correct pattern here
- Dashboard layout redirects to `/login` without appending `callbackUrl` — middleware already handles injecting `callbackUrl` for protected routes, so the layout redirect keeps the code simple
- Dashboard page is intentionally minimal — its only purpose in Phase 1 is to verify session persistence and signOut; Phase 6 will replace it entirely

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compiled with zero errors on first attempt for both tasks.

## User Setup Required

None - no external service configuration required. Auth pages wire into server actions and auth() already configured in Plans 02 and 03.

## Next Phase Readiness

- All auth UI pages complete — login, signup (Plan 04), forgot-password, reset-password, dashboard
- AUTH-02, AUTH-03, AUTH-04, AUTH-05 requirements satisfied
- Plan 06 (remaining foundation task) can proceed — shares no files with this plan
- Session persistence verifiable by visiting /dashboard after login

---
*Phase: 01-foundation*
*Completed: 2026-02-28*

## Self-Check: PASSED

- FOUND: src/app/(auth)/login/page.tsx
- FOUND: src/app/(auth)/forgot-password/page.tsx
- FOUND: src/app/(auth)/reset-password/page.tsx
- FOUND: src/app/(dashboard)/layout.tsx
- FOUND: src/app/(dashboard)/page.tsx
- FOUND: .planning/phases/01-foundation/01-05-SUMMARY.md
- FOUND: commit 5b96c85 (Task 1)
- FOUND: commit 968980a (Task 2)
