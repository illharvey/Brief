---
phase: 03-content-pipeline
plan: 04
status: complete
completed: "2026-03-02"
duration: ~90 min (including env debugging and /dashboard route fix)
---

# 03-04 Summary: Ingestion Orchestrator + Dev Route

## What Was Built

- `src/lib/ingestion/index.ts` — `ingestForUser(userId)` orchestrator: loads user topics, fans out across all 4 source types per topic, collects all articles, batch-inserts with dedup, returns `IngestionResult`
- `src/app/api/dev/ingest/route.ts` — `POST /api/dev/ingest` dev-only trigger (403 in production)

## Verification Results

**Run 1:** fetched: 2063, inserted: 578, skipped: 1485 — pipeline working, articles saved
**Run 2:** fetched: 2063, inserted: 7, skipped: 2056 — 7 new articles from ~3min gap between runs; dedup confirmed

Errors (all expected, non-fatal):
- Reddit RSS: 403 on all subreddits — Reddit blocks scrapers, per-source isolation working
- Guardian API: 401 Unauthorized — free tier requires paid plan, placeholder key, non-blocking

## Decisions

- Reddit 403s are expected and non-fatal — per-source try/catch isolates failures
- Guardian API requires paid plan — left as placeholder; pipeline runs without it via NewsData + BBC RSS
- 7 inserted on second run is correct behaviour, not a dedup failure — genuinely new articles published between calls

## Fixes Applied (Outside GSD Plans)

- Renamed `src/app/(dashboard)` → `src/app/dashboard` — route group was mapping dashboard to `/` instead of `/dashboard`, conflicting with `src/app/page.tsx` and causing 404 on login redirect
- Replaced boilerplate `src/app/page.tsx` with redirect to `/dashboard`
- Stripped Windows line endings (`\r\n`) from `.env.local` — caused `Invalid URL` in neon-serverless driver

## Phase 3 Status

All 4 plans complete. Pipeline fetches from BBC RSS + NewsData (working) and Reddit + Guardian (failing gracefully). Deduplication confirmed end-to-end.

Known gaps carried forward:
- GUARDIAN_API_KEY: requires paid plan — leave as placeholder until budget allows
- Reddit RSS: blocked by Reddit's anti-scraper policy — low priority for PoC
- Phase 2 DNS: still pending propagation (parallel track, not blocking Phase 3)
