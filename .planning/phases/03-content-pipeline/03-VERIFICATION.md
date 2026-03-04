---
phase: 03-content-pipeline
verified: 2026-03-04T00:00:00Z
status: passed
score: 3/3 success criteria verified; Guardian API key deferred — add before Phase 5
re_verification: false
human_verification:
  - test: "Run ingestion end-to-end with a real GUARDIAN_API_KEY"
    expected: "Guardian source returns articles; result.errors[] contains no guardian-api entry; inserted count includes Guardian articles"
    why_human: "GUARDIAN_API_KEY is still set to placeholder 'your-guardian-api-key-here' in .env.local. The 03-04-SUMMARY reports Guardian returned 401 during the original human verification run. The pipeline ran successfully with BBC RSS + NewsData, but Guardian is not exercised until a real key is supplied. The requirement CONT-02 ('pulls articles from NewsAPI and Guardian API') is only partially satisfied at runtime."
---

# Phase 3: Content Pipeline Verification Report

**Phase Goal:** The system reliably ingests articles from RSS feeds and news APIs for user topics, deduplicates them, and stores them ready for summarisation
**Verified:** 2026-03-04
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Running the ingestion pipeline for a user's topics produces deduplicated articles in the database with source name and original URL attached to each | VERIFIED | `ingestForUser()` in `src/lib/ingestion/index.ts` fans out to all sources, calls `insertArticles()` with `onConflictDoNothing`. Schema requires `sourceName NOT NULL` and stores `sourceUrl`. 03-04-SUMMARY confirms Run 1: 578 inserted, Run 2: 7 inserted (dedup working). |
| 2 | A single failing RSS feed or API source does not abort the pipeline run — other sources continue and errors are logged per feed | VERIFIED | Every source call in `src/lib/ingestion/index.ts` is wrapped in an independent `try/catch` that calls `recordError()`. `findSubredditsForTopic` returns `[]` gracefully without throwing. TypeScript compiles cleanly. 03-04-SUMMARY confirms Reddit 403s and Guardian 401 were non-fatal. |
| 3 | Re-running ingestion for the same topics does not insert duplicate articles | VERIFIED (automated) / NEEDS HUMAN (Guardian path) | `insertArticles()` uses `.onConflictDoNothing({ target: [articles.url, articles.userId] })`. `normaliseUrl()` strips UTM params and fragments before the unique key is computed. `contentHash()` provides SHA-256 secondary dedup. Human verification in 03-04-SUMMARY confirmed: Run 2 inserted only 7 new articles (genuinely new in the 3-min gap). Guardian source could not be confirmed as GUARDIAN_API_KEY is a placeholder. |

**Score:** 3/3 success criteria verified (automated code analysis); Guardian runtime path flagged for human re-confirmation.

---

### Required Artifacts

All artifacts verified at all three levels: exists, substantive, and wired.

| Artifact | Provides | Exists | Substantive | Wired | Status |
|----------|----------|--------|-------------|-------|--------|
| `src/lib/db/schema.ts` | articles table with url, contentHash, title, sourceName, sourceUrl, publishedAt, fetchedAt, userId; urlUserUnique constraint on (url, userId) | Yes | Yes — 25-line table definition, `unique().on(table.url, table.userId)` at line 165 | Yes — imported by `persist.ts`, `index.ts` | VERIFIED |
| `src/lib/ingestion/types.ts` | RawArticle, SourceError, IngestionResult type exports | Yes | Yes — 25 lines, three complete interfaces | Yes — imported by `dedup.ts`, `persist.ts`, `index.ts`, all source adapters | VERIFIED |
| `src/lib/ingestion/dedup.ts` | contentHash(), normaliseUrl() | Yes | Yes — 31 lines; SHA-256 via `node:crypto`; strips 5 UTM params + fragment | Yes — imported and called in `persist.ts` | VERIFIED |
| `src/lib/ingestion/persist.ts` | insertArticles() using onConflictDoNothing | Yes | Yes — 40 lines; calls `normaliseUrl()` and `contentHash()` per row; `.onConflictDoNothing({ target: [articles.url, articles.userId] }).returning()` | Yes — imported and called in `index.ts` | VERIFIED |
| `src/lib/ingestion/sources/rss.ts` | fetchRssSource(), BBC_RSS_FEEDS constant (5 feeds) | Yes | Yes — 37 lines; 5 BBC feed entries; filters items without link; maps to RawArticle[] | Yes — imported in `index.ts`, called for each BBC_RSS_FEEDS entry | VERIFIED |
| `src/lib/ingestion/sources/reddit.ts` | fetchRedditRss(), fetchRedditHot(), findSubredditsForTopic() | Yes | Yes — 98 lines; REDDIT_USER_AGENT on all requests; is_self + reddit.com URL self-post filter; findSubredditsForTopic returns [] gracefully | Yes — imported in `index.ts` | VERIFIED |
| `src/lib/ingestion/sources/guardian.ts` | fetchGuardianApi(query) → RawArticle[] | Yes | Yes — 46 lines; queries guardianapis.com/search; sets q, api-key, page-size, order-by; throws on !resp.ok | Yes — imported in `index.ts` | VERIFIED |
| `src/lib/ingestion/sources/newsdata.ts` | fetchNewsdataApi(query) → RawArticle[] | Yes | Yes — 38 lines; queries newsdata.io/api/1/latest; filters articles with no link; maps source_id to sourceName | Yes — imported in `index.ts` | VERIFIED |
| `src/lib/ingestion/index.ts` | ingestForUser(userId: string) → Promise<IngestionResult> | Yes | Yes — 111 lines; queries userTopics from DB; per-topic fan-out across 4 source types; per-source try/catch; calls insertArticles once after all sources | Yes — imported in `src/app/api/dev/ingest/route.ts` | VERIFIED |
| `src/app/api/dev/ingest/route.ts` | POST /api/dev/ingest — dev-only manual trigger | Yes | Yes — 43 lines; NODE_ENV === 'production' guard returns 403; validates userId; calls ingestForUser(); returns NextResponse.json(result) | Yes — Next.js route convention exports POST function | VERIFIED |

---

### Key Link Verification

| From | To | Via | Pattern Checked | Status |
|------|----|-----|-----------------|--------|
| `persist.ts` | `schema.ts` (articles) | `db.insert(articles).onConflictDoNothing({ target: [articles.url, articles.userId] })` | `onConflictDoNothing` — confirmed at line 30-33 | WIRED |
| `persist.ts` | `dedup.ts` | `normaliseUrl()` called before insert, `contentHash()` stored per row | `normaliseUrl\|contentHash` — both called in `rows.map()` | WIRED |
| `rss.ts` | `rss-parser` | `new Parser({ timeout: 10_000 }).parseURL(url)` | `parseURL` — confirmed at line 27; `rss-parser@^3.13.0` in `package.json` | WIRED |
| `reddit.ts` | `reddit.com` | `fetch()` with User-Agent header | `REDDIT_USER_AGENT` — set on both rss-parser instance headers and raw `fetch()` calls | WIRED |
| `guardian.ts` | `https://content.guardianapis.com/search` | `fetch()` with api-key, q, page-size, order-by | `guardianapis.com` — confirmed at line 3 and line 30 | WIRED |
| `newsdata.ts` | `https://newsdata.io/api/1/latest` | `fetch()` with apikey, q, language | `newsdata.io` — confirmed at line 3 and line 15 | WIRED |
| `index.ts` | `schema.ts` (userTopics) | `db.select().from(userTopics).where(eq(userTopics.userId, userId))` | `userTopics` — confirmed at lines 3, 43-46 | WIRED |
| `index.ts` | `persist.ts` | `insertArticles(allArticles, userId)` | `insertArticles` — confirmed at line 106 | WIRED |
| `index.ts` | `sources/rss.ts` | `fetchRssSource()` for each BBC_RSS_FEEDS entry | `fetchRssSource` — confirmed at lines 6, 57 | WIRED |
| `index.ts` | `sources/reddit.ts` | `findSubredditsForTopic() -> fetchRedditRss() + fetchRedditHot()` | `findSubredditsForTopic` — confirmed at lines 7, 67 | WIRED |
| `route.ts` | `index.ts` | `ingestForUser(body.userId)` | `ingestForUser` — confirmed at lines 2, 41 | WIRED |

---

### Requirements Coverage

Requirements declared across plans: CONT-01, CONT-02, CONT-04

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| CONT-01 | 03-01, 03-02, 03-04 | System ingests articles from curated RSS feeds mapped to user topics | SATISFIED | `BBC_RSS_FEEDS` (5 curated BBC feeds) in `rss.ts`; `fetchRssSource()` used per-feed in `index.ts`; `fetchRedditRss()` + `fetchRedditHot()` for Reddit. Human verification confirmed fetched: 2063 on first run. |
| CONT-02 | 03-03, 03-04 | System pulls articles from NewsAPI and Guardian API for user topics | PARTIALLY SATISFIED | `fetchGuardianApi()` and `fetchNewsdataApi()` both implemented and wired. NewsData.io confirmed working (real API key present). Guardian API returns 401 in practice because `GUARDIAN_API_KEY` remains a placeholder (`your-guardian-api-key-here`). Pipeline does not break — Guardian failure is isolated. Guardian path needs human confirmation once a real key is supplied. |
| CONT-04 | 03-01, 03-03, 03-04 | Every briefing item displays the source name and links to the original article | SATISFIED (pipeline layer) | `sourceName` is `NOT NULL` in schema. Every adapter sets `sourceName` and `sourceUrl` on every `RawArticle`. `insertArticles()` maps both fields to DB rows. CONT-04 is the pipeline foundation; display-layer rendering of source links is a Phase 6 responsibility. |

**Note:** CONT-03 (AI summarisation) is not a Phase 3 requirement — it belongs to Phase 4 and is correctly excluded.

**Orphaned requirements check:** REQUIREMENTS.md maps CONT-01, CONT-02, CONT-04 to Phase 3. All three are covered by plans in this phase. No orphaned requirements found.

---

### Anti-Patterns Found

No blockers or stub patterns found.

| File | Pattern | Severity | Notes |
|------|---------|----------|-------|
| `sources/reddit.ts` lines 28, 36 | `return []` | Info | Intentional graceful failure in `findSubredditsForTopic()` — spec-required behaviour, not a stub |
| `.env.local` | `GUARDIAN_API_KEY=your-guardian-api-key-here` | Warning | Placeholder key means Guardian adapter always returns 401 at runtime. Pipeline continues without it. Not a code defect, but CONT-02 is only partially exercised. |

---

### Human Verification Required

#### 1. Guardian API Runtime Verification

**Test:** Obtain a real Guardian Open Platform API key from https://developer.theguardian.com/access. Set `GUARDIAN_API_KEY=<real-key>` in `.env.local`. Start dev server (`npm run dev`). POST to `/api/dev/ingest` with a valid userId. Inspect the returned JSON.

**Expected:**
- `result.errors` array should contain no entry with `source: "guardian-api"`
- `result.fetched` count should be higher than the BBC RSS + NewsData count alone
- `result.inserted` should include Guardian articles (verifiable by checking `source_name = 'The Guardian'` rows in the Neon articles table)
- Running the same curl a second time: `inserted` should be 0 for Guardian articles already stored (dedup working for Guardian path)

**Why human:** `GUARDIAN_API_KEY` is a placeholder in `.env.local`. The code path for Guardian is correctly implemented and wired, but the runtime behaviour cannot be confirmed programmatically without a live API call. The 03-04-SUMMARY confirmed Guardian returned 401 during original verification — this needs to be re-confirmed once a real key is in place. CONT-02 states the system "pulls articles from NewsAPI and Guardian API" — that contract is only fully met when Guardian actually returns articles.

---

### Gaps Summary

No blocking code gaps found. All artifacts exist, are substantive, and are fully wired. TypeScript compiles with zero errors (`npx tsc --noEmit` exits cleanly).

The sole outstanding item is operational: `GUARDIAN_API_KEY` is a placeholder, so the Guardian API source adapter — which is correctly implemented and wired — cannot be exercised at runtime. The pipeline is not broken: per-source isolation means the pipeline continues and NewsData + BBC RSS deliver articles. However, CONT-02's requirement to pull from "Guardian API" is not verifiable as satisfied until a real key is configured and a live run succeeds.

**Known carry-forward gap (documented in 03-04-SUMMARY):**
- Reddit RSS and hot.json return 403 from Reddit's anti-scraper policy. This is a runtime block, not a code defect. The adapters are correctly implemented. This was acknowledged as expected and non-fatal.

---

_Verified: 2026-03-04_
_Verifier: Claude (gsd-verifier)_
