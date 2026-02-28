---
phase: 01-foundation
plan: 03
subsystem: auth
tags: [next-auth, bcryptjs, resend, drizzle-orm, zod, rate-limit, gdpr, password-reset, onboarding]

# Dependency graph
requires:
  - phase: 01-foundation plan 01
    provides: "db client, 7-table schema (users, userConsents, passwordResetTokens, verificationTokens, userTopics, deliveryPreferences), Zod validation schemas"
  - phase: 01-foundation plan 02
    provides: "signIn, signOut, auth exports from Auth.js v5; loginRatelimit Upstash sliding window"
provides:
  - "src/actions/auth.ts: signUpAction, signInAction, signOutAction, requestPasswordResetAction, consumePasswordResetAction, sendVerificationEmailAction"
  - "src/actions/preferences.ts: saveTopicsAction, saveDeliveryPreferenceAction"
  - "src/lib/email.ts: Resend client singleton"
affects:
  - 01-04 (onboarding UI pages call signUpAction, saveTopicsAction, saveDeliveryPreferenceAction)
  - 01-05 (login/reset UI pages call signInAction, requestPasswordResetAction, consumePasswordResetAction)
  - all phases using email dispatch (email.ts resend singleton)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server actions with 'use server' directive — all data mutation goes through typed FormData actions"
    - "GDPR consent recording at signup — two consent types (marketing_email, terms_of_service) with IP and userAgent"
    - "Password reset: high-entropy 64-char hex token, 1-hour expiry, transaction-guarded consumption"
    - "Email enumeration prevention: requestPasswordResetAction always returns success"
    - "Onboarding cookie pattern: onboarding_user_id HttpOnly cookie set post-Step1, resolved by resolveUserId helper"
    - "Atomic topic replacement: saveTopicsAction wraps delete+insert in transaction"

key-files:
  created:
    - src/actions/auth.ts
    - src/actions/preferences.ts
    - src/lib/email.ts
  modified: []

key-decisions:
  - "signUpAction does not auto-sign-in after registration — email verification must happen first, but does not block UI; it blocks briefing dispatch only"
  - "signUpAction returns userId so calling page can set onboarding_user_id cookie for multi-step onboarding"
  - "resolveUserId checks Auth.js session first, falls back to onboarding_user_id cookie — same action code used during and after onboarding"
  - "saveDeliveryPreferenceAction returns userId on success so delivery page can pass ?uid= to confirmation page"
  - "deliveryTime stored as HH:MM string in IANA timezone; DST conversion deferred to pipeline dispatch time"
  - "Rate limit identifier is login:{email} — per-email not per-IP (soft lock prevents enumeration without blocking shared IPs)"

patterns-established:
  - "Auth actions: all return { error: string } | { success: true, ...extras } shaped objects"
  - "resolveUserId pattern: session-first then onboarding cookie — reusable for any action called during or after onboarding"
  - "Transaction pattern for multi-table writes: consumePasswordResetAction and saveTopicsAction both use db.transaction"

requirements-completed: [AUTH-01, AUTH-04, AUTH-05, AUTH-06, PREF-01, PREF-02]

# Metrics
duration: 2min
completed: 2026-02-28
---

# Phase 1 Plan 03: Server Actions Summary

**Auth server actions with GDPR consent recording, rate-limited sign-in, transaction-guarded password reset, and atomic topic replacement — complete data mutation layer for Phase 1 UI**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-28T20:15:59Z
- **Completed:** 2026-02-28T20:18:06Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Implemented all 6 auth server actions: signUpAction (with GDPR consent + verification email), rate-limited signInAction, signOutAction, requestPasswordResetAction (email-enumeration-safe), consumePasswordResetAction (transaction-guarded), and sendVerificationEmailAction
- Implemented 2 preference server actions: saveTopicsAction (atomic delete+insert transaction) and saveDeliveryPreferenceAction (upsert, marks onboardingComplete, returns userId)
- Created Resend client singleton at src/lib/email.ts used by both auth email flows

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement auth server actions and email module** - `4ba9c3e` (feat)
2. **Task 2: Implement preference server actions** - `8c08158` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/actions/auth.ts` - All 6 auth server actions: signUpAction inserts into users + userConsents with IP recording; signInAction rate-limited via loginRatelimit; consumePasswordResetAction uses db.transaction wrapping password update + token invalidation
- `src/actions/preferences.ts` - saveTopicsAction wraps delete+insert in transaction for atomic replacement; saveDeliveryPreferenceAction upserts via onConflictDoUpdate and marks onboardingComplete
- `src/lib/email.ts` - Resend client singleton initialized from RESEND_API_KEY env var

## Decisions Made

- `signUpAction` returns `userId` (not just `success`) so the onboarding page can store it in an `onboarding_user_id` HttpOnly cookie — this userId is needed by Steps 2 and 3 to associate topics and delivery preferences without requiring login
- `resolveUserId` helper checks Auth.js session first, then falls back to the onboarding cookie — same action code serves both mid-onboarding and post-onboarding calls without duplication
- `saveDeliveryPreferenceAction` returns `userId` on success so the delivery time page can append `?uid=` to the redirect URL, letting the server-rendered confirmation page query the user's actual topics and time without a session
- Rate limit identifier is `login:{email}` (not `login:{ip}`) — prevents per-email brute force without blocking shared NAT/VPN IPs from unrelated users

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compiled with zero errors on first attempt for both tasks.

## User Setup Required

The Resend client reads `RESEND_API_KEY` from environment variables. This must be set in `.env.local` before any auth emails (verification, password reset) will actually send. `APP_URL` must also be set for verification and reset links to resolve correctly. Placeholder values were added in Plan 01.

## Next Phase Readiness

- All auth server actions ready for Plan 04 (onboarding UI) and Plan 05 (login/reset UI)
- `saveTopicsAction` and `saveDeliveryPreferenceAction` ready to be called from onboarding step pages
- `signUpAction` returns `userId` — Plan 04 must set this as `onboarding_user_id` HttpOnly cookie
- No blockers for Plan 04

---
*Phase: 01-foundation*
*Completed: 2026-02-28*

## Self-Check: PASSED

- FOUND: src/actions/auth.ts
- FOUND: src/actions/preferences.ts
- FOUND: src/lib/email.ts
- FOUND: .planning/phases/01-foundation/01-03-SUMMARY.md
- FOUND: commit 4ba9c3e (Task 1)
- FOUND: commit 8c08158 (Task 2)
