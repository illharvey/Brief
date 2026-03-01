---
phase: 01-foundation
plan: "04"
subsystem: ui
tags: [next.js, react, shadcn, chip-input, timezone, onboarding, email-verification]

# Dependency graph
requires:
  - phase: 01-03
    provides: signUpAction, saveTopicsAction, saveDeliveryPreferenceAction server actions and verificationTokens schema

provides:
  - TopicInput chip component with Enter/comma add, X remove, suggestion dropdown, freeform entry
  - TimePicker component with Intl API browser timezone auto-detection
  - Auth layout (centered max-w-md, no sidebar)
  - Step 1 signup page (email+password, onboarding_user_id cookie, duplicate_email error with login link)
  - Step 2 topics page (TopicInput, JSON hidden field, saveTopicsAction)
  - Step 3 delivery page (TimePicker, clears cookie, redirects to confirmation?uid=)
  - Confirmation page (server component querying DB for actual user topics + delivery time)
  - Email verification page (validates token, marks emailVerified, deletes used token)

affects:
  - 01-05 (login/dashboard pages use auth layout)
  - 01-06 (any protected pages rely on onboardingComplete being set by Step 3)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useActionState for progressive enhancement on client pages calling server actions
    - onboarding_user_id cookie set client-side after Step 1, cleared after Step 3
    - Confirmation as server component reading searchParams.uid to query real DB data
    - Intl.DateTimeFormat().resolvedOptions().timeZone for zero-dependency timezone detection
    - Hidden input carrying JSON-serialized state (topics array) to server action

key-files:
  created:
    - src/components/ui/topic-input.tsx
    - src/components/ui/time-picker.tsx
    - src/app/(auth)/layout.tsx
    - src/app/(auth)/signup/page.tsx
    - src/app/(auth)/signup/topics/page.tsx
    - src/app/(auth)/signup/delivery/page.tsx
    - src/app/(auth)/signup/confirmation/page.tsx
    - src/app/(auth)/verify-email/page.tsx
  modified: []

key-decisions:
  - "TopicInput uses shadcn Command+Popover+Badge — no external chip library; freeform topics always allowed"
  - "TimePicker auto-detects timezone via standard Intl API, no library needed"
  - "delivery/page.tsx passes userId as ?uid= search param to confirmation — avoids cookie dependency on server component"
  - "confirmation/page.tsx is a server component querying real DB data, not a static placeholder"
  - "Emoji checkmarks replaced with HTML entity &#x2713; to avoid lint/encoding issues"

patterns-established:
  - "useActionState pattern: async wrapper fn passed to useActionState, useEffect watches state for success redirect"
  - "Cookie lifecycle: set client-side after Step 1 (signUpAction returns userId), cleared client-side after Step 3"
  - "Server component confirmation: reads searchParams Promise (Next.js 15 async searchParams), queries DB with uid"

requirements-completed: [AUTH-01, AUTH-06, PREF-01, PREF-02]

# Metrics
duration: 8min
completed: 2026-03-01
---

# Phase 01 Plan 04: Onboarding Flow Summary

**3-step onboarding UI (signup, topic chips, delivery time picker) plus confirmation and email verification screens, using TopicInput and TimePicker components backed by shadcn primitives**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-01T00:01:09Z
- **Completed:** 2026-03-01T00:09:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Built TopicInput (chip add/remove, suggestion dropdown, freeform entry) and TimePicker (Intl timezone auto-detect, formatted display) as reusable shadcn-based components
- Built the complete 3-step onboarding page flow: Step 1 creates the account and sets the onboarding cookie; Step 2 saves topics; Step 3 saves delivery time, clears the cookie, and redirects with userId as ?uid= param
- Confirmation screen is a server component that queries the real DB for the user's chosen topics and delivery time, displaying them as chips and formatted time+timezone
- Email verification page validates token expiry, marks emailVerified on the user, and deletes the used token to prevent replay

## Task Commits

1. **Task 1: Build TopicInput and TimePicker reusable components** - `b171696` (feat)
2. **Task 2: Build 4-screen onboarding flow pages** - `3bb4bfc` (feat)

## Files Created/Modified
- `src/components/ui/topic-input.tsx` - Tag chip input with Enter/comma add, X remove, suggestion dropdown, freeform topics
- `src/components/ui/time-picker.tsx` - Time picker with Intl API browser timezone auto-detection and "8:00am — Europe/London" format
- `src/app/(auth)/layout.tsx` - Auth layout: min-h-screen centered container, max-w-md, no sidebar
- `src/app/(auth)/signup/page.tsx` - Step 1: email+password form, useActionState, sets onboarding_user_id cookie client-side, duplicate_email error with login link
- `src/app/(auth)/signup/topics/page.tsx` - Step 2: TopicInput chip entry, topics serialised as JSON hidden field for saveTopicsAction
- `src/app/(auth)/signup/delivery/page.tsx` - Step 3: TimePicker, saveDeliveryPreferenceAction, clears cookie, redirects to /signup/confirmation?uid={userId}
- `src/app/(auth)/signup/confirmation/page.tsx` - Server component: reads searchParams.uid, queries userTopics + deliveryPreferences, renders actual topic chips and formatted delivery time
- `src/app/(auth)/verify-email/page.tsx` - Token validation against verificationTokens, marks emailVerified on users, deletes used token

## Decisions Made
- TopicInput built from shadcn Command+Popover+Badge primitives — no external chip library, reducing bundle size and keeping the dependency list minimal
- Timezone detection uses the standard Intl API (`Intl.DateTimeFormat().resolvedOptions().timeZone`) — no library needed, works in all modern browsers
- The confirmation page receives userId as a `?uid=` search param from the delivery page redirect rather than reading a cookie — server components cannot read client-set cookies set immediately before navigation, so the param approach is more reliable
- Emoji characters replaced with HTML entities to avoid potential encoding/lint issues across editors and CI environments

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All onboarding screens are complete and wired to server actions from Plan 03
- The auth layout is in place and available to login/forgot-password/reset-password pages (Plan 05)
- onboardingComplete flag is set by saveDeliveryPreferenceAction after Step 3, making it available for post-login redirect logic in any future phase

---
*Phase: 01-foundation*
*Completed: 2026-03-01*
