# Phase 4: AI Summarisation - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Generate a personalised prose briefing for a user from ingested articles. The pipeline runs on-demand at briefing generation time: fetch the user's relevant articles from the DB, rank and cap them, summarise via LLM (with global cache), assemble into a topic-structured briefing, and store it. Delivery scheduling is Phase 5. Dashboard display is Phase 6.

</domain>

<decisions>
## Implementation Decisions

### Briefing structure
- Topic headers with bullet summaries beneath each (e.g. `## Technology`, then article bullets)
- Omit topics entirely if no articles were fetched for that topic today
- Intro section ("Today in brief" overview) is at Claude's discretion — add if it improves the experience

### Summary depth & tone
- Variable number of bullets per article based on article length — LLM judges
- Tone: neutral / journalistic (matter-of-fact, no editorialising)
- Direct quotes allowed when they add value — prompt must enforce attribution accuracy
- Input: full body text when available (Phase 3 extracts this), fall back to title + description from RSS when body extraction failed
- Input truncated to a token limit (~2,000 tokens) before sending to LLM to control cost on long articles

### Source attribution
- Inline link at end of each bullet: `"Apple announces new chip [The Guardian]→"`
- One bullet per article — sources are not merged even if they cover the same story
- Briefings stored in the DB (required by Phase 6 dashboard)
- Source text snapshot stored alongside each summary to support grounding audits (success criterion 4)

### Article ranking and cap
- Top 5 articles per topic section included in the briefing
- Ranking signal: cross-topic relevance first (articles tagged under multiple of the user's topics rank higher), then recency as tiebreaker
- Within the section, ordered most-recent first (top article is newest)

### Model selection
- Model: `claude-haiku-4-5` — summarisation is a straightforward extraction task, Haiku is sufficient
- Readable from env var `SUMMARISATION_MODEL` with Haiku as default

### Summary cache
- Global cache (shared across all users) — one cached summary per article URL
- Cache TTL: 7 days
- Cache lookup before any LLM call; on cache hit, reuse verbatim

### Cost safety and error handling
- Every LLM call has `max_tokens` set (output cap)
- Anthropic spend cap must be active before any beta user triggers the pipeline
- On partial failure (e.g. Anthropic API timeout mid-pipeline): send the partial briefing with what completed; note in briefing that some topics couldn't be fetched

### Summarisation pipeline trigger
- On-demand at briefing generation time (not a background pre-summarisation job)
- Exposed as a callable TypeScript function (for Phase 5 to invoke)
- Includes a manual test script (`scripts/generate-briefing.ts` or similar) for development testing with a userId

### Claude's Discretion
- Exact `max_tokens` value per call
- Whether to include a "Today in brief" intro paragraph
- DB schema for briefings and briefing items tables
- Prompt engineering for the summarisation instruction
- How to handle articles where body extraction partially failed (truncated text)

</decisions>

<specifics>
## Specific Ideas

- Trending topics as a ranking signal was raised — noted as deferred (requires external trending data not available in Phase 4)
- The briefing data model should support Phase 6 reading individual briefing items with their source URLs

</specifics>

<deferred>
## Deferred Ideas

- Trending topics ranking — requires external signal (social/search trend data); candidate for a future phase
- Background pre-summarisation job (proactive summarisation after fetch) — raised but deferred; on-demand is the Phase 4 approach

</deferred>

---

*Phase: 04-ai-summarisation*
*Context gathered: 2026-03-02*
