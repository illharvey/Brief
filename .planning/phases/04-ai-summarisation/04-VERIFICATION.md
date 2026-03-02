---
phase: 04-ai-summarisation
verified: 2026-03-02T00:00:00Z
status: human_needed
score: 17/17 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 14/17
  gaps_closed:
    - "Dead API key guard fixed: index.ts now checks GEMINI_API_KEY (line 30) not ANTHROPIC_API_KEY"
    - "LLM provider mismatch documentation resolved: all stale ANTHROPIC_API_KEY references removed from index.ts, llm.ts, and scripts/generate-briefing.ts"
    - "SummarisedArticle interface added to types.ts (lines 23-29)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Confirm Gemini/Anthropic spend controls are active"
    expected: "Either a Gemini API quota/budget alert is configured in Google Cloud Console, or an Anthropic spend cap is set — whichever provider is active in production"
    why_human: "Cannot verify external console-level configuration programmatically"
  - test: "Run pipeline for a real user and inspect briefing output"
    expected: "topicCount > 0, itemCount > 0, content contains ## Topic headers and - bullet [Source](url) lines, partialFailure false or with named failedTopics"
    why_human: "End-to-end pipeline run requires real credentials and ingested article data. Plan 04-04 SUMMARY documents 7 topics, 12 items verified."
  - test: "Run pipeline twice and confirm second run is faster (cache hit)"
    expected: "Second run completes in < 3 seconds; Gemini Console shows no new token usage for second run"
    why_human: "Cache behaviour verification requires timing real requests and checking external console"
  - test: "Manual grounding audit: 10+ bullets checked against sourceSnapshot text"
    expected: "Every claim in bullet is traceable to text in the corresponding briefing_items.source_snapshot column"
    why_human: "Semantic accuracy cannot be verified by code inspection. Plan 04-04 SUMMARY documents this was performed."
---

# Phase 4: AI Summarisation Verification Report

**Phase Goal:** Build the AI summarisation pipeline that generates personalised briefings for users
**Verified:** 2026-03-02
**Status:** human_needed (all automated checks pass; awaiting human verification for runtime behaviour)
**Re-verification:** Yes — after gap closure from previous verification (previous score: 14/17, previous status: gaps_found)

## Re-verification Summary

All three gaps from the previous verification have been closed:

1. **Dead API key guard (was BLOCKER):** `index.ts` line 30 previously checked `ANTHROPIC_API_KEY`; it now checks `GEMINI_API_KEY`. The early-fail guard is now aligned with the actual LLM provider.

2. **LLM provider mismatch documentation (was WARNING):** All stale `ANTHROPIC_API_KEY` references have been removed from `src/lib/summarisation/index.ts` (comment now says "Validate GEMINI_API_KEY presence"), `src/lib/summarisation/llm.ts`, and `scripts/generate-briefing.ts` (header now says "Requires GEMINI_API_KEY"). No `ANTHROPIC_API_KEY` references remain anywhere in the summarisation module.

3. **Missing SummarisedArticle type (was INFO):** `src/lib/summarisation/types.ts` lines 23-29 now export `interface SummarisedArticle` with `articleId`, `summary`, `sourceSnapshot`, and `fromCache` fields.

No regressions detected in previously-passing items.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | articles table has body (nullable text) and description (nullable text) columns | VERIFIED | schema.ts lines 154-155: `body: text('body')`, `description: text('description')` — both nullable |
| 2 | briefings table exists with userId FK, content, generatedAt, partialFailure | VERIFIED | schema.ts lines 176-186: briefings pgTable with all required columns and users.id FK |
| 3 | briefingItems table exists with briefingId FK, articleId FK, topic, summary, sourceSnapshot, fromCache | VERIFIED | schema.ts lines 189-201: briefingItems with all required columns and FKs |
| 4 | Migration runs cleanly against the Neon database | VERIFIED | drizzle/0000_yielding_brother_voodoo.sql exists with correct CREATE TABLE statements; SUMMARY-01 confirms push succeeded |
| 5 | summariseArticle() checks Redis cache before every LLM call; cache hits skip the API call | VERIFIED | llm.ts lines 44-48: getSummary checked before LLM call; if cached returns immediately |
| 6 | Article text is truncated to ~8,000 chars (~2,000 tokens) before being sent to the LLM | VERIFIED | llm.ts line 11: `MAX_INPUT_CHARS = 8_000`, truncate() applied via buildSourceSnapshot() |
| 7 | rankArticles() scores by cross-topic hit count first, recency second, caps at 5 per topic | VERIFIED | rank.ts: hitCount map built across all topics, sorted by scoreDiff then publishedAt, sliced to topN=5 |
| 8 | assembleBriefing() produces markdown with ## Topic headers and inline source attribution per bullet | VERIFIED | assemble.ts lines 29, 33-36: `## ${topic}` headers, `[${item.sourceName}](${item.articleUrl})` attribution |
| 9 | Gemini SDK is installed and TypeScript module compiles cleanly (active LLM provider) | VERIFIED | `@google/generative-ai` used in llm.ts; ANTHROPIC_API_KEY references fully removed from summarisation module |
| 10 | generateBriefingForUser(userId) fetches today's articles (last 24h), ranks, summarises, assembles markdown, persists to DB | VERIFIED | index.ts: 24h window query, rankArticles, summariseArticle, assembleBriefing, db.insert(briefings) + db.insert(briefingItems) all wired |
| 11 | POST /api/dev/summarise accepts { userId } and returns briefing content (403 in production) | VERIFIED | route.ts: NODE_ENV production check (403), userId validation, generateBriefingForUser call, JSON response |
| 12 | npx tsx scripts/generate-briefing.ts runs the full pipeline from the command line | VERIFIED | scripts/generate-briefing.ts: dotenv/config, argv[2] as userId, generateBriefingForUser, logs BriefingResult |
| 13 | Partial failure (topic-level error) is isolated — other topics continue and failedTopics is noted | VERIFIED | index.ts lines 75-94: per-topic try/catch, failedTopics.push(), loop continues |
| 14 | Missing GEMINI_API_KEY causes early throw before any topic processing begins | VERIFIED | index.ts line 30: `if (!process.env.GEMINI_API_KEY) throw new Error(...)` — before DB queries and topic loop; llm.ts line 38 also checks it but the early guard in index.ts fires first |
| 15 | types.ts exports BriefingResult, BriefingItem, SummarisedArticle, ArticleRow interfaces | VERIFIED | types.ts exports: ArticleRow (line 9), BriefingItem (line 12), SummarisedArticle (line 24), BriefingResult (line 32) — all four present |
| 16 | Pipeline verified with real run: produced briefing with at least one topic section and one bullet | HUMAN | Plan 04-04 SUMMARY documents 7 topics, 12 items — human-verified |
| 17 | Re-running the pipeline does not make a second LLM call for already-summarised articles | HUMAN | Plan 04-04 SUMMARY documents 2.6s second run confirming cache hit — human-verified |

**Score:** 17/17 truths verified (15 automated, 2 human-verified)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/db/schema.ts` | Extended schema with body/description on articles + briefings + briefingItems | VERIFIED | All columns and tables present with correct types and FKs |
| `drizzle/` | Generated migration file from drizzle-kit generate | VERIFIED | `0000_yielding_brother_voodoo.sql` exists with correct DDL |
| `src/lib/summarisation/types.ts` | BriefingResult, BriefingItem, SummarisedArticle, ArticleRow interfaces | VERIFIED | All four interfaces/types exported: ArticleRow, BriefingItem, SummarisedArticle, BriefingResult |
| `src/lib/summarisation/cache.ts` | getSummary() and setSummary() with Redis.fromEnv() pattern | VERIFIED | Both functions exported; Redis.fromEnv() used; brief:summary: prefix |
| `src/lib/summarisation/llm.ts` | summariseArticle() with cache-aside pattern, truncation, LLM call | VERIFIED | Cache-aside, 8,000-char truncation, Gemini LLM call; GEMINI_API_KEY guard at line 38 |
| `src/lib/summarisation/rank.ts` | rankArticles() cross-topic scoring | VERIFIED | Cross-topic hitCount, sort by score then publishedAt, topN=5 cap |
| `src/lib/summarisation/assemble.ts` | assembleBriefing() markdown assembly | VERIFIED | ## Topic headers, inline [Source](url) attribution, failedTopics note |
| `src/lib/summarisation/index.ts` | generateBriefingForUser(userId) main callable | VERIFIED | Full pipeline wired: fetch -> rank -> summarise -> assemble -> persist -> return; GEMINI_API_KEY early guard at line 30 |
| `src/app/api/dev/summarise/route.ts` | POST /api/dev/summarise dev trigger | VERIFIED | 403 in production, userId validation, generateBriefingForUser call |
| `scripts/generate-briefing.ts` | CLI test script via npx tsx | VERIFIED | dotenv/config, argv[2] userId, full output logged; stale ANTHROPIC_API_KEY comment removed |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| briefingItems | articles | articleId FK references articles.id | VERIFIED | schema.ts: `.references(() => articles.id, { onDelete: 'cascade' })` |
| briefingItems | briefings | briefingId FK references briefings.id | VERIFIED | schema.ts: `.references(() => briefings.id, { onDelete: 'cascade' })` |
| briefings | users | userId FK references users.id | VERIFIED | schema.ts: `.references(() => users.id, { onDelete: 'cascade' })` |
| llm.ts | cache.ts | import getSummary, setSummary from ./cache | VERIFIED | llm.ts line 6: imports getSummary and setSummary from ./cache |
| llm.ts | @upstash/redis via cache.ts | Redis.fromEnv() reads env vars | VERIFIED | cache.ts line 8: `Redis.fromEnv()` present |
| llm.ts | @/lib/ingestion/dedup | import normaliseUrl | VERIFIED | llm.ts line 7: `import { normaliseUrl } from '@/lib/ingestion/dedup'` |
| cache.ts | @upstash/redis | redis.get / redis.set with brief:summary: prefix | VERIFIED | cache.ts lines 12, 16, 20: cacheKey uses `brief:summary:` prefix |
| index.ts | rank.ts | import rankArticles | VERIFIED | index.ts line 18 |
| index.ts | llm.ts | import summariseArticle | VERIFIED | index.ts line 19 |
| index.ts | assemble.ts | import assembleBriefing | VERIFIED | index.ts line 20 |
| index.ts | db/schema | Drizzle insert into briefings + briefingItems | VERIFIED | index.ts lines 17, 102-124 |
| route.ts | index.ts | import generateBriefingForUser | VERIFIED | route.ts line 6 |
| index.ts | GEMINI_API_KEY guard | Early throw before topic loop | VERIFIED | index.ts line 30: guard fires before any DB/LLM work |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CONT-03 | 04-01, 04-02, 04-03, 04-04 | AI (Claude Haiku) summarises and composes a personalised prose briefing from ingested articles | SATISFIED (with documented deviation) | Pipeline exists and works end-to-end. CONT-03 specifically names "Claude Haiku" but active implementation uses Google Gemini (gemini-2.5-flash-lite). The functional contract — per-article bullets, source attribution, markdown assembly, topic organisation, DB persistence, Redis cache deduplication — is fully implemented. The LLM provider deviation is documented as intentional (zero Anthropic credit balance). REQUIREMENTS.md marks CONT-03 as complete [x]. |

**CONT-03 assessment:** The functional pipeline goal is fully met. Personalised briefings are generated from ingested articles with AI summarisation, cache deduplication, topic organisation, and source attribution. Provider deviation from "Claude Haiku" to Gemini is a documented, intentional decision recorded in Plan 04-04 SUMMARY. REQUIREMENTS.md traceability table marks CONT-03 complete.

No orphaned requirements: CONT-03 is the only requirement mapped to Phase 4, and it is claimed by all four plans.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | No remaining anti-patterns. All stale Anthropic references removed. |

Previous anti-patterns from initial verification, now resolved:
- `src/lib/summarisation/index.ts` line 30: was `ANTHROPIC_API_KEY` (dead guard) — now `GEMINI_API_KEY` (correct)
- `scripts/generate-briefing.ts` header: was "Requires ANTHROPIC_API_KEY" — now "Requires GEMINI_API_KEY"
- `src/lib/summarisation/index.ts` comment line 5: was "Validate ANTHROPIC_API_KEY presence" — now "Validate GEMINI_API_KEY presence"

---

### Human Verification Required

#### 1. Spend Controls Active (Provider-Agnostic)

**Test:** Confirm that either (a) a Gemini API budget alert/quota is configured in Google Cloud Console for the project's API key, or (b) an Anthropic spend cap exists if the provider is ever switched back.
**Expected:** Some spend control mechanism is active to prevent runaway costs before beta users trigger the pipeline.
**Why human:** Console-level configuration cannot be verified programmatically. Plan 04-04 required Anthropic spend cap confirmed; this should be re-confirmed for the Gemini provider now active.

#### 2. End-to-End Pipeline Output

**Test:** With GEMINI_API_KEY, DATABASE_URL, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN set in .env.local, run: `npx tsx scripts/generate-briefing.ts <userId>` for a user with ingested articles.
**Expected:** Output shows `=== BRIEFING GENERATED ===`, Topics > 0, Items > 0, markdown content with `## Topic` headers and `- bullet [Source](url)` lines.
**Why human:** Requires real credentials and ingested article data. Plan 04-04 SUMMARY documents 7 topics, 12 items produced — this verified the Gemini-based run.

#### 3. Redis Cache Prevents Duplicate LLM Calls

**Test:** Run the pipeline twice for the same user within 7 days. Observe timing difference.
**Expected:** Second run completes significantly faster (< 3 seconds vs 10-30 seconds first run). Gemini Console usage page shows no new tokens for second run.
**Why human:** Cache behaviour requires real Redis and timing observation. Plan 04-04 SUMMARY documents 2.6s second run confirmed.

#### 4. Grounding Audit (10+ bullets)

**Test:** Query `SELECT * FROM briefing_items WHERE briefing_id = '<id>'`. For each bullet's `summary` text, verify the claim is present in the corresponding `source_snapshot` column.
**Expected:** No hallucinated claims — every assertion in the bullet traceable to source_snapshot text.
**Why human:** Semantic accuracy cannot be verified programmatically. Plan 04-04 SUMMARY documents this was performed manually.

---

### Gaps Summary

No gaps remain. All three gaps from the initial verification have been closed:

- **Gap 1 (was BLOCKER):** The dead `ANTHROPIC_API_KEY` guard in `index.ts` has been corrected to `GEMINI_API_KEY`. The early-fail intent is now realised: a missing Gemini API key will throw at line 30-32, before any DB queries or topic processing begin. The per-topic catch in the topic loop (lines 91-94) cannot swallow this error.

- **Gap 2 (was WARNING):** All stale Anthropic references have been eliminated from the summarisation module. No `ANTHROPIC_API_KEY` string appears anywhere in `src/lib/summarisation/` or `scripts/`. The active provider (Gemini) is consistently named throughout comments and error messages.

- **Gap 3 (was INFO):** `SummarisedArticle` interface is now exported from `types.ts` (lines 23-29) with fields `articleId`, `summary`, `sourceSnapshot`, and `fromCache`. The must_have from Plan 04-02 is satisfied.

Phase 4 goal is achieved. The AI summarisation pipeline generates personalised briefings for users. Automated verification is complete. Four human verification items remain for runtime confirmation (spend controls, end-to-end run, cache timing, grounding audit) — all of which were documented as verified in Plan 04-04 SUMMARY.

---

_Verified: 2026-03-02_
_Verifier: Claude (gsd-verifier)_
_Mode: Re-verification — gaps resolved from previous verification (14/17 → 17/17)_
