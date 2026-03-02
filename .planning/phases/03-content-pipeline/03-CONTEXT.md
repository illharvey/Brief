# Phase 3: Content Pipeline - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Backend ingestion pipeline: fetch articles from RSS feeds and news APIs for each user's topics, deduplicate them, and store them in the database ready for summarisation. No UI in this phase. The pipeline must be idempotent (re-running for the same topics produces no duplicate rows), resilient (one failing source does not abort the run), and callable standalone for testing. Scheduling and fan-out are Phase 5.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
The user has delegated all implementation decisions to Claude. The researcher and planner should apply best-practice defaults for a reliable, idempotent news ingestion pipeline:

- **Feed sources & topic mapping:** Choose a combination of free/low-cost RSS feeds (e.g. Guardian RSS, BBC RSS, Reuters RSS) and at least one news search API (e.g. NewsAPI.org or The Guardian API) that supports keyword/topic queries. Topic-to-source mapping should be query-based (pass user topic as search term) rather than hardcoded per-topic, so any freeform topic works without configuration.

- **Deduplication:** Use a URL-based unique constraint as the primary dedup mechanism (same article URL = same article). Back it with a content hash (title + URL) as a secondary check for articles republished under different URLs. Dedup should be permanent (across all runs, not just within a run) — insert-on-conflict-do-nothing pattern.

- **Pipeline invocation:** Expose the pipeline as a callable async function (`ingestForUser(userId)`) and wire it to a dev-only API route (`/api/dev/ingest`) for manual triggering during development and testing. Phase 5 will call the function from the cron scheduler.

- **Error handling:** Per-source isolation — each feed/API source is fetched independently inside a try/catch. A failing source logs the error (source name, error message, timestamp) but does not throw to the caller. The pipeline returns a structured result: `{ fetched, inserted, skipped, errors[] }`. No automatic retries in Phase 3 — Phase 5 can retry at the scheduler level.

</decisions>

<specifics>
## Specific Ideas

No specific requirements beyond the above defaults — open to whatever sources and dedup strategy the researcher identifies as most reliable and cost-effective for a small-scale news product.

</specifics>

<deferred>
## Deferred Ideas

- Scheduling and cron-driven fan-out — Phase 5
- Per-user ingestion frequency controls — Phase 5 or Phase 6
- Admin dashboard for pipeline run visibility — Phase 6 or later

</deferred>

---

*Phase: 03-content-pipeline*
*Context gathered: 2026-03-02*
