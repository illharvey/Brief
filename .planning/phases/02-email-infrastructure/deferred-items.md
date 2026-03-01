# Deferred Items — Phase 02 Email Infrastructure

## Pre-existing Build Issue (out of scope for 02-01)

**Found during:** Task 2 verification (npm run build)
**Issue:** `/(auth)/login/page` fails to build due to `useSearchParams()` not wrapped in a Suspense boundary
**Error:** `useSearchParams() should be wrapped in a suspense boundary at page "/login"`
**Origin:** Pre-dates Phase 02 — login page was built in Plan 01-05
**Impact:** `npm run build` currently fails; `next dev` works fine
**Fix required:** Wrap the component using `useSearchParams()` in `src/app/(auth)/login/page.tsx` with `<Suspense>`, or use `next/navigation` `useSearchParams` with a Suspense fallback per Next.js docs
**Recommended for:** Plan 01-05 fix or a dedicated cleanup plan before production deployment
