# Phase 5: Scheduling and Delivery - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the pipeline built in Phases 3–4 into automated daily delivery. A cron job fans out to all users, running the full ingest → summarise → assemble → send pipeline for each user at their chosen local time, with guaranteed idempotency. Email infrastructure (SPF/DKIM, unsubscribe headers) comes from Phase 2.

</domain>

<decisions>
## Implementation Decisions

### Briefing email design
- Subject line: `"Good morning, [Name] — your Brief is ready"` (personalised, warm)
- Body structure: named topic sections with headers (e.g., `## AI & Tech`), not one continuous narrative
- Each article entry: headline + 1–2 sentence summary + source link
- Email header: Brief logo/name + date, with a warm greeting
- Email footer: preferences link + one-click unsubscribe (legally required)
- Tone: warm but minimal — friendly greeting, then content, then out of the way
- Stories per topic: fixed cap (Claude's discretion on exact number, suggested 5)
- Empty topic section: omit entirely — no mention if no stories for that topic
- Zero-content day: skip sending entirely — no email if all topics are empty

### Scheduling precision & fan-out
- Cron fires every 15 minutes; delivery window is ±15 min of user's chosen time
- Cron service: Vercel Cron Jobs (configured via `vercel.json`)
- Fan-out: process all ready users serially in one job (appropriate for beta scale)
- Pipeline timing: just-in-time — ingest + summarise immediately before each user's delivery
- Content lookback window: 24 hours of articles, regardless of user delivery time

### Failure & retry behavior
- Per-user failure: retry once on the next cron tick (~15 min later)
- If retry also fails: log it, skip that user for the day — no email sent
- Infrastructure crash / cron missed: catch-up window of 2 hours — if scheduled delivery was within the past 2 hours, still run; beyond 2 hours, skip that day

### Monitoring & observability
- Logging: structured logs per cron run with user ID, status, scheduled time, sent_at
- Delivery history: `deliveries` table in database — columns: user, date, status, sent_at (also serves as the idempotency gate)
- Health check endpoint: `/api/health/scheduler` — returns last cron run timestamp and status, pingable from uptime monitors
- No admin dashboard in this phase (Phase 6 scope if needed)

### Claude's Discretion
- Exact email HTML/CSS styling and component structure (within warm-minimal tone direction)
- Vercel Cron schedule expression to achieve every-15-min firing
- Exact `deliveries` table schema and indexes
- Idempotency check implementation (query deliveries table before pipeline start)
- Structured log format and fields

</decisions>

<specifics>
## Specific Ideas

- "Good morning, [Name] — your Brief is ready" should be the literal subject line
- Deliveries table doubles as the idempotency gate — check before running, insert after sending
- Health endpoint should be simple enough to plug into UptimeRobot or similar free monitors

</specifics>

<deferred>
## Deferred Ideas

- Admin dashboard showing pipeline run history — Phase 6 web app scope
- Email alerting to admin on delivery failures — not in scope for Phase 5
- Per-user retry configuration — future enhancement
- Scheduled backup / retention of old briefings — future phase

</deferred>

---

*Phase: 05-scheduling-and-delivery*
*Context gathered: 2026-03-04*
