---
phase: 02-email-infrastructure
plan: "02"
subsystem: email
tags: [resend, react-email, hmac, rfc8058, webhook, unsubscribe, can-spam, gdpr]

# Dependency graph
requires:
  - phase: 02-01
    provides: "React Email templates (VerifyEmail, ResetPassword), emailSuppressions schema"
provides:
  - "sendVerificationEmail and sendPasswordResetEmail helpers with HTML+text+List-Unsubscribe headers"
  - "isSuppressed() pre-send suppression check against emailSuppressions table"
  - "generateUnsubscribeToken() and validateUnsubscribeToken() HMAC-SHA256 stateless tokens"
  - "POST /api/webhooks/resend: svix-verified bounce/complaint handler"
  - "GET + POST /api/unsubscribe: RFC 8058 one-click unsubscribe endpoint"
  - "/unsubscribed confirmation page"
affects:
  - 03-content-pipeline
  - 05-dispatch-pipeline

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pre-send suppression check via isSuppressed() before every resend.emails.send() call"
    - "Stateless HMAC-SHA256 unsubscribe tokens with 30-day expiry and timingSafeEqual verification"
    - "RFC 8058 one-click: POST handler returns 200 with null body; GET redirects to confirmation page"
    - "Webhook raw body pattern: req.text() required before svix HMAC verification"
    - "useSearchParams() wrapped in Suspense in Next.js App Router client components"

key-files:
  created:
    - src/app/api/webhooks/resend/route.ts
    - src/app/api/unsubscribe/route.ts
    - src/app/(auth)/unsubscribed/page.tsx
  modified:
    - src/lib/email.ts
    - src/actions/auth.ts
    - src/app/(auth)/login/page.tsx
    - src/app/(auth)/reset-password/page.tsx

key-decisions:
  - "HMAC-SHA256 stateless tokens for unsubscribe — no DB table needed, 30-day expiry, timingSafeEqual prevents timing attacks"
  - "FROM_ADDRESS and APP_URL centralized as constants in email.ts — not repeated in auth.ts"
  - "Webhook always returns 200 for unhandled event types — Resend retries on non-2xx responses"
  - "GET /api/unsubscribe redirects silently on invalid/expired tokens — does not leak token state"

patterns-established:
  - "Pre-send suppression check pattern: isSuppressed(email) before every resend.emails.send()"
  - "Webhook raw body: use req.text() never req.json() before svix HMAC verification"
  - "RFC 8058 one-click: POST returns 200 null body; GET redirects to human-readable confirmation"
  - "Suspense wrapper pattern for Next.js client components using useSearchParams()"

requirements-completed: [AUTH-07, MAIL-03, MAIL-04]

# Metrics
duration: 6min
completed: 2026-03-01
---

# Phase 2 Plan 02: Email Send Helpers, Unsubscribe & Webhook Summary

**HMAC-SHA256 stateless unsubscribe tokens, RFC 8058 one-click endpoint, svix webhook handler, and typed HTML+text send helpers with pre-send suppression checks completing CAN-SPAM/GDPR email compliance**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-03-01T15:17:51Z
- **Completed:** 2026-03-01T15:23:26Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Upgraded `src/lib/email.ts` with full send helpers: `sendVerificationEmail` and `sendPasswordResetEmail` each check suppression, render HTML+text via React Email, and attach `List-Unsubscribe` + `List-Unsubscribe-Post` headers per RFC 8058
- Added stateless HMAC-SHA256 unsubscribe token generation/validation (`generateUnsubscribeToken`, `validateUnsubscribeToken`) with 30-day expiry and constant-time signature comparison via `timingSafeEqual`
- Created `POST /api/webhooks/resend` that verifies svix HMAC from raw request body and upserts bounce/complaint events into `emailSuppressions`
- Created `GET + POST /api/unsubscribe` implementing RFC 8058 one-click (POST returns 200 null body) and browser-click redirect flow to `/unsubscribed` confirmation page
- Updated `src/actions/auth.ts` to delegate all email sending to typed helpers — no direct `resend.emails.send()` calls remain

## Task Commits

Each task was committed atomically:

1. **Task 1: Upgrade email.ts and update auth.ts** - `c9e789b` (feat)
2. **Task 2: Webhook, unsubscribe routes, /unsubscribed page** - `6dce0b1` (feat)

**Plan metadata:** _(docs commit hash — see below)_

## Files Created/Modified

- `src/lib/email.ts` - Replaced with typed send helpers, suppression check, HMAC token utilities
- `src/actions/auth.ts` - Updated to use `sendVerificationEmail`/`sendPasswordResetEmail`; removed inline `resend.emails.send()` calls
- `src/app/api/webhooks/resend/route.ts` - POST handler: svix signature verify via `req.text()`, upsert to emailSuppressions on bounce/complaint
- `src/app/api/unsubscribe/route.ts` - GET (redirect to /unsubscribed) + POST (RFC 8058 one-click, 200 null body)
- `src/app/(auth)/unsubscribed/page.tsx` - Static confirmation page showing unsubscribed email from searchParams
- `src/app/(auth)/login/page.tsx` - Auto-fixed: wrapped LoginForm in Suspense (Rule 1 bug fix)
- `src/app/(auth)/reset-password/page.tsx` - Auto-fixed: wrapped ResetPasswordForm in Suspense (Rule 1 bug fix)

## Decisions Made

- HMAC-SHA256 stateless unsubscribe tokens chosen over DB-stored tokens — no additional table, self-contained validation, 30-day expiry in payload
- `timingSafeEqual` used for signature comparison with matching-length buffer guard — prevents timing side-channel attacks
- Webhook always returns 200 for unrecognized event types — Resend retries on non-2xx which would cause duplicate suppression inserts
- GET unsubscribe redirects home silently on invalid/expired tokens — avoids leaking whether a token was ever valid

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed useSearchParams() not wrapped in Suspense in login/page.tsx**
- **Found during:** Task 2 (npm run build verification)
- **Issue:** Pre-existing build error documented in STATE.md — `useSearchParams()` outside Suspense boundary causes Next.js production build to fail with prerender error
- **Fix:** Split `LoginPage` into outer page component (wraps Suspense) and inner `LoginForm` client component using `useSearchParams()`
- **Files modified:** `src/app/(auth)/login/page.tsx`
- **Verification:** `npm run build` passes, `/login` renders as static prerendered page
- **Committed in:** `6dce0b1` (Task 2 commit)

**2. [Rule 1 - Bug] Fixed useSearchParams() not wrapped in Suspense in reset-password/page.tsx**
- **Found during:** Task 2 (npm run build verification — second failure after login fix)
- **Issue:** Same pattern as above — `useSearchParams()` without Suspense boundary in reset-password page
- **Fix:** Split into outer `ResetPasswordPage` (Suspense wrapper) and inner `ResetPasswordForm` client component
- **Files modified:** `src/app/(auth)/reset-password/page.tsx`
- **Verification:** `npm run build` passes, `/reset-password` renders as static prerendered page
- **Committed in:** `6dce0b1` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — pre-existing bugs that blocked `npm run build`)
**Impact on plan:** Both fixes necessary to satisfy the plan's `npm run build` success criterion. No scope creep — the Suspense pattern is the correct Next.js App Router approach for client components reading search params.

## Issues Encountered

- `npm run build` revealed two additional pre-existing Suspense boundary issues beyond login (reset-password also affected). Both fixed in same commit as Task 2 new files.

## User Setup Required

The following environment variables must be configured before the email and webhook features are operational:

- `RESEND_WEBHOOK_SECRET` — Resend dashboard webhook signing secret (for `/api/webhooks/resend` svix verification)
- `UNSUBSCRIBE_SECRET` — HMAC signing secret for unsubscribe tokens; generate with `openssl rand -hex 32`
- `APP_URL` — Canonical app URL (used in List-Unsubscribe headers and redirect targets)

## Next Phase Readiness

- Email channel is fully compliant: HTML+text, List-Unsubscribe headers, pre-send suppression checks, bounce/complaint webhook processing, and one-click unsubscribe
- Phase 3 (content pipeline) can safely call `sendVerificationEmail`/`sendPasswordResetEmail` and rely on suppression being handled automatically
- Phase 5 (dispatch pipeline) should use the same `isSuppressed()` + helper pattern for briefing emails

---
*Phase: 02-email-infrastructure*
*Completed: 2026-03-01*

## Self-Check: PASSED

- `src/lib/email.ts` — FOUND
- `src/actions/auth.ts` — FOUND
- `src/app/api/webhooks/resend/route.ts` — FOUND
- `src/app/api/unsubscribe/route.ts` — FOUND
- `src/app/(auth)/unsubscribed/page.tsx` — FOUND
- Commit `c9e789b` — FOUND
- Commit `6dce0b1` — FOUND
