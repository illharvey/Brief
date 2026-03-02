# Phase 3: Content Pipeline - Research

**Researched:** 2026-03-02
**Domain:** RSS feed parsing, news APIs, content deduplication, Next.js route handlers, Drizzle ORM insert patterns
**Confidence:** MEDIUM-HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Phase Boundary:** Backend ingestion pipeline only. No UI in this phase. The pipeline must be idempotent (re-running for the same topics produces no duplicate rows), resilient (one failing source does not abort the run), and callable standalone for testing. Scheduling and fan-out are Phase 5.

**Feed sources & topic mapping:** Use a combination of free/low-cost RSS feeds (e.g. Guardian RSS, BBC RSS, Reuters RSS) and at least one news search API (e.g. NewsAPI.org or The Guardian API) that supports keyword/topic queries. Topic-to-source mapping should be query-based (pass user topic as search term) rather than hardcoded per-topic, so any freeform topic works without configuration. Reddit is a required source (see below).

**Reddit as a source:** Reddit must be included as a content source alongside news feeds. Two modes:
1. **Topic subreddit RSS** — for a given topic, fetch the top posts from the most relevant subreddit(s) via Reddit's free RSS (`r/{subreddit}/.rss`). The researcher should identify a topic-to-subreddit mapping strategy (e.g. searching Reddit's API for matching subreddits, or a curated seed map for common topics).
2. **Reddit hot topics** — surface what's trending on Reddit relevant to the user's topics. Use Reddit's JSON API (`r/{subreddit}/hot.json`) to fetch hot posts, extracting the linked article URL (not the Reddit discussion URL) as the content item. This gives a "what Reddit is buzzing about" signal alongside traditional news. Posts that are self-posts (no external URL) should be skipped.

**Deduplication:** Use a URL-based unique constraint as the primary dedup mechanism (same article URL = same article). Back it with a content hash (title + URL) as a secondary check for articles republished under different URLs. Dedup should be permanent (across all runs, not just within a run) — insert-on-conflict-do-nothing pattern.

**Pipeline invocation:** Expose the pipeline as a callable async function (`ingestForUser(userId)`) and wire it to a dev-only API route (`/api/dev/ingest`) for manual triggering during development and testing. Phase 5 will call the function from the cron scheduler.

**Error handling:** Per-source isolation — each feed/API source is fetched independently inside a try/catch. A failing source logs the error (source name, error message, timestamp) but does not throw to the caller. The pipeline returns a structured result: `{ fetched, inserted, skipped, errors[] }`. No automatic retries in Phase 3 — Phase 5 can retry at the scheduler level.

### Claude's Discretion

All implementation decisions have been delegated to Claude. Apply best-practice defaults.

### Deferred Ideas (OUT OF SCOPE)

- Scheduling and cron-driven fan-out — Phase 5
- Per-user ingestion frequency controls — Phase 5 or Phase 6
- Admin dashboard for pipeline run visibility — Phase 6 or later
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CONT-01 | System ingests articles from curated RSS feeds mapped to user topics | rss-parser library covers RSS/Atom parsing; BBC RSS + Guardian RSS as curated feeds; Reddit RSS as additional source |
| CONT-02 | System pulls articles from NewsAPI and Guardian API for user topics | Guardian API free tier (5,000 calls/day) is production-usable; NewsData.io free tier (200 credits/day) as NewsAPI.org alternative since NewsAPI.org free plan is dev-only; Guardian content search endpoint supports `q` keyword |
| CONT-04 | Every briefing item displays the source name and links to the original article | `articles` table schema must store `sourceUrl`, `sourceName`, `originalUrl`; Guardian API returns `webTitle` + `webUrl`; NewsData.io returns `source_id` + `link`; RSS feeds return item link + feed title |
</phase_requirements>

---

## Summary

Phase 3 builds the content ingestion backbone: fetch articles from multiple source types (RSS feeds, news APIs, Reddit), deduplicate them by URL, and persist them ready for Phase 4 summarisation. The key architecture is a single `ingestForUser(userId)` async function that fans out across all source adapters in parallel, each isolated in try/catch so individual failures do not abort the run.

**Critical discovery:** NewsAPI.org's free developer plan explicitly prohibits production use — it is development-only, even for a small PoC. The Guardian API (free, 5,000 calls/day, production-usable) is the primary API source for keyword-based search. NewsData.io (200 credits/day free, commercially permitted) is the recommended secondary API source. Reuters officially discontinued their RSS feeds in 2020, so they cannot be used as a named curated feed source. BBC RSS feeds are alive and current at `feeds.bbci.co.uk`.

Reddit's public JSON endpoints (`/hot.json`) return 429 errors from server IPs without a proper User-Agent header. The Reddit `.rss` endpoint has similar sensitivity. All Reddit requests must include a descriptive User-Agent string (e.g. `brief:news-ingestion:v0.1 (by /u/brief-app)`). Unauthenticated Reddit requests are rate-limited to ~10 req/min — at Phase 3 scale this is sufficient.

**Primary recommendation:** Use `rss-parser` v3 for all RSS/Atom parsing, The Guardian API for keyword-based news search, NewsData.io as secondary API, BBC RSS feeds as curated sources, and Reddit RSS + hot.json for community signal. Store articles in a new `articles` table with a unique constraint on `url` using Drizzle's `.onConflictDoNothing({ target: articles.url })`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| rss-parser | 3.13.0 | Parse RSS/Atom feed XML from URL or string | 533k weekly downloads, TypeScript support built-in, supports custom fields, timeout config |
| node:crypto | built-in | SHA-256 content hash for deduplication | No install needed, used in existing codebase (HMAC in Phase 2) |
| The Guardian Content API | REST | Keyword-based news article search | 5,000 free calls/day, production-permitted, no payment wall, returns full metadata |
| NewsData.io API | REST | Secondary keyword-based news search | 200 free credits/day (2,000 articles), explicitly permits production/commercial use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| drizzle-orm | ^0.45.1 (already installed) | Insert articles with onConflictDoNothing | Already in project — use existing db client |
| node fetch (built-in Next.js) | native | HTTP calls to Reddit JSON and news APIs | Already available in Next.js 16 runtime |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Guardian API | NewsAPI.org | NewsAPI.org free tier is dev-only; cannot be used in production even for PoC |
| NewsData.io | newsapi.ai | newsapi.ai paid-only from day one; NewsData.io free tier is commercially permitted |
| rss-parser | feedsmith | feedsmith is newer and faster but far fewer downloads (~low adoption); rss-parser has proven TypeScript types and 533k/week downloads |
| Built-in node:crypto | external SHA library | node:crypto already used in project (Phase 2 HMAC); zero dependency overhead |

**Installation:**
```bash
npm install rss-parser
npm install --save-dev @types/rss-parser
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── ingestion/
│   │   ├── index.ts           # ingestForUser(userId) — public entry point
│   │   ├── types.ts           # IngestionResult, RawArticle, SourceError types
│   │   ├── dedup.ts           # contentHash(), normaliseUrl() helpers
│   │   ├── sources/
│   │   │   ├── rss.ts         # fetchRssSource(url, sourceName) → RawArticle[]
│   │   │   ├── guardian.ts    # fetchGuardianApi(query) → RawArticle[]
│   │   │   ├── newsdata.ts    # fetchNewsdataApi(query) → RawArticle[]
│   │   │   └── reddit.ts      # fetchRedditRss(subreddit) + fetchRedditHot(subreddit) → RawArticle[]
│   │   └── persist.ts         # insertArticles(articles[]) → { inserted, skipped }
│   └── db/
│       ├── client.ts          # existing
│       └── schema.ts          # add articles table
├── app/
│   └── api/
│       └── dev/
│           └── ingest/
│               └── route.ts   # POST /api/dev/ingest — dev-only trigger
└── actions/
    └── preferences.ts         # existing
```

### Pattern 1: Per-Source Isolation with Structured Result

**What:** Each source adapter is called with `Promise.allSettled` or individual try/catch. Errors are collected into an `errors[]` array on the result object rather than thrown.

**When to use:** Any pipeline where partial failure must not abort the run and callers need a machine-readable summary.

**Example:**
```typescript
// src/lib/ingestion/index.ts
// Source: architecture pattern verified via CONTEXT.md requirements

export interface IngestionResult {
  fetched: number
  inserted: number
  skipped: number
  errors: Array<{ source: string; message: string; timestamp: string }>
}

export async function ingestForUser(userId: string): Promise<IngestionResult> {
  const result: IngestionResult = { fetched: 0, inserted: 0, skipped: 0, errors: [] }

  // Load user's topics
  const topics = await db.query.userTopics.findMany({ where: eq(userTopics.userId, userId) })

  // Fan out per topic — collect all raw articles
  const allArticles: RawArticle[] = []

  for (const { topic } of topics) {
    // RSS sources (per-source isolation)
    for (const feed of RSS_FEEDS_FOR_TOPIC(topic)) {
      try {
        const items = await fetchRssSource(feed.url, feed.sourceName)
        allArticles.push(...items)
        result.fetched += items.length
      } catch (err) {
        result.errors.push({
          source: feed.sourceName,
          message: err instanceof Error ? err.message : String(err),
          timestamp: new Date().toISOString(),
        })
      }
    }

    // API sources
    try {
      const guardianItems = await fetchGuardianApi(topic)
      allArticles.push(...guardianItems)
      result.fetched += guardianItems.length
    } catch (err) {
      result.errors.push({ source: 'guardian-api', message: String(err), timestamp: new Date().toISOString() })
    }
  }

  // Persist with deduplication
  const { inserted, skipped } = await insertArticles(allArticles, userId)
  result.inserted = inserted
  result.skipped = skipped

  return result
}
```

### Pattern 2: Drizzle insert-on-conflict-do-nothing Deduplication

**What:** Use a unique constraint on the `url` column of the `articles` table. On every insert, use `.onConflictDoNothing({ target: articles.url })`. Drizzle silently skips rows that conflict.

**When to use:** Any idempotent insert where re-inserting an existing row must be a no-op.

**Example:**
```typescript
// Source: https://orm.drizzle.team/docs/insert

// Schema addition to src/lib/db/schema.ts
export const articles = pgTable("articles", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  url: text("url").notNull().unique(),        // PRIMARY dedup key
  contentHash: text("content_hash").notNull(), // SECONDARY dedup: SHA256(title + url)
  title: text("title").notNull(),
  sourceName: text("source_name").notNull(),
  sourceUrl: text("source_url"),
  publishedAt: timestamp("published_at"),
  fetchedAt: timestamp("fetched_at").defaultNow(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
})

// Insert pattern
async function insertArticles(articles: RawArticle[], userId: string) {
  if (articles.length === 0) return { inserted: 0, skipped: 0 }

  const rows = articles.map(a => ({
    url: normaliseUrl(a.url),
    contentHash: contentHash(a.title, a.url),
    title: a.title,
    sourceName: a.sourceName,
    sourceUrl: a.sourceUrl ?? null,
    publishedAt: a.publishedAt ?? null,
    userId,
  }))

  // Note: .onConflictDoNothing().returning() returns empty array for conflicted rows
  // Count inserted = returned rows length; skipped = total - inserted
  const inserted = await db
    .insert(articlesTable)
    .values(rows)
    .onConflictDoNothing({ target: articlesTable.url })
    .returning({ id: articlesTable.id })

  return { inserted: inserted.length, skipped: rows.length - inserted.length }
}
```

### Pattern 3: RSS Source Adapter

**What:** Wrap `rss-parser` with per-feed timeout and normalise to `RawArticle`.

**When to use:** All RSS and Atom feed sources.

**Example:**
```typescript
// Source: https://github.com/rbren/rss-parser + Context7 pattern

import Parser from 'rss-parser'

const parser = new Parser({ timeout: 10_000 }) // 10s per feed — fail fast

export async function fetchRssSource(url: string, sourceName: string): Promise<RawArticle[]> {
  const feed = await parser.parseURL(url)
  return feed.items
    .filter(item => Boolean(item.link))
    .map(item => ({
      url: item.link!,
      title: item.title ?? 'Untitled',
      sourceName,
      sourceUrl: feed.link ?? url,
      publishedAt: item.pubDate ? new Date(item.pubDate) : null,
    }))
}
```

### Pattern 4: Reddit User-Agent Requirement

**What:** All Reddit HTTP requests (both `.rss` and `.json` endpoints) MUST include a custom User-Agent. Requests without a custom User-Agent from server IPs return 429.

**When to use:** All Reddit fetches.

**Example:**
```typescript
// Source: Reddit API documentation pattern verified by multiple sources

const REDDIT_USER_AGENT = 'brief:news-ingestion:v0.1 (automated news aggregator)'

// RSS endpoint
const rssUrl = `https://www.reddit.com/r/${subreddit}/.rss?limit=25`
const response = await fetch(rssUrl, {
  headers: { 'User-Agent': REDDIT_USER_AGENT },
})

// Hot JSON endpoint
const hotUrl = `https://www.reddit.com/r/${subreddit}/hot.json?limit=25`
const hotResponse = await fetch(hotUrl, {
  headers: { 'User-Agent': REDDIT_USER_AGENT },
})
const data = await hotResponse.json()
// Filter out self-posts (no external URL)
const externalPosts = data.data.children
  .map((c: any) => c.data)
  .filter((post: any) => post.url && !post.is_self && post.url.startsWith('http'))
```

### Pattern 5: Dev-only API Route

**What:** Next.js App Router route handler at `app/api/dev/ingest/route.ts` that calls `ingestForUser`. Returns the `IngestionResult` as JSON.

**When to use:** Development-only manual trigger; Phase 5 will call `ingestForUser` directly from the scheduler function.

**Example:**
```typescript
// Source: https://nextjs.org/docs/app/getting-started/route-handlers

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ingestForUser } from '@/lib/ingestion'

export async function POST(request: NextRequest) {
  // Dev-only guard
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const body = await request.json()
  const userId: string = body.userId

  const result = await ingestForUser(userId)
  return NextResponse.json(result)
}
```

### Pattern 6: Content Hash for Deduplication

**What:** Compute SHA-256 of `title + url` as secondary dedup key using built-in `node:crypto` — no external dependency.

**When to use:** Storing each article row to detect republished articles under slightly different URLs.

**Example:**
```typescript
// Source: https://nodejs.org/api/crypto.html

import { createHash } from 'node:crypto'

export function contentHash(title: string, url: string): string {
  return createHash('sha256')
    .update(`${title.toLowerCase().trim()}::${url.trim()}`)
    .digest('hex')
}

export function normaliseUrl(url: string): string {
  try {
    const u = new URL(url)
    u.hash = ''          // strip fragments
    u.searchParams.delete('utm_source')
    u.searchParams.delete('utm_medium')
    u.searchParams.delete('utm_campaign')
    return u.toString()
  } catch {
    return url.trim()
  }
}
```

### Anti-Patterns to Avoid

- **Throwing on source failure:** Never let a single feed error propagate to the caller. Wrap every source fetch in try/catch and push to `errors[]`.
- **Global parser timeout:** rss-parser's `timeout` option has known edge cases on slow feeds. Set it per-parser instance at 10 seconds to fail fast rather than relying on defaults.
- **Not normalising URLs before dedup:** UTM parameters and URL fragments cause the same article to be inserted multiple times. Always normalise before computing the unique key.
- **Inserting one row at a time:** Use Drizzle's batch insert (`.values([...array])`) to insert all articles from a topic's sources in one call, not a loop of individual inserts.
- **Using NewsAPI.org in production:** The free plan explicitly prohibits non-localhost use. Do not include NewsAPI.org as a source.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| RSS/Atom XML parsing | Custom XML parser | rss-parser | Handles malformed feeds, encoding issues, namespaced elements (media:content), redirect following |
| SHA-256 hashing | Custom hash function | node:crypto createHash | Built-in, FIPS-compliant, already used in project |
| URL normalisation edge cases | Regex URL cleaner | `new URL()` constructor | Handles encoding, relative paths, malformed input with try/catch |
| Drizzle dedup inserts | Manual SELECT-then-INSERT | `.onConflictDoNothing()` | Race-condition-safe, single round trip to DB |

**Key insight:** RSS parsing has dozens of edge cases (CDATA wrapping, timezone-ambiguous dates, relative URLs, chunked transfer encoding). Using a battle-tested library saves days of debugging.

---

## Common Pitfalls

### Pitfall 1: NewsAPI.org Free Tier Is Dev-Only
**What goes wrong:** Using NewsAPI.org in a deployed (even PoC) environment returns 426 errors or blocks requests from non-localhost origins.
**Why it happens:** Their terms explicitly limit the free "developer" key to `localhost` — any deployed URL fails.
**How to avoid:** Use The Guardian API (free, production-permitted) as the primary news API. Use NewsData.io (200 credits/day free, commercially permitted) as secondary.
**Warning signs:** If you see 401/426 responses from NewsAPI.org in a deployed environment, this is why.

### Pitfall 2: Reddit 429 Without Custom User-Agent
**What goes wrong:** Reddit returns HTTP 429 Too Many Requests for server-side fetches without a proper User-Agent.
**Why it happens:** Reddit filters bot-like requests. Default fetch() has no User-Agent header.
**How to avoid:** Always set `User-Agent: brief:news-ingestion:v0.1 (automated news aggregator)` on all Reddit requests.
**Warning signs:** 429 responses from `reddit.com` on first request (not rate limiting, it's User-Agent filtering).

### Pitfall 3: Dedup Counting Is Inaccurate with .onConflictDoNothing().returning()
**What goes wrong:** `returning()` after `onConflictDoNothing()` only returns rows that were actually inserted. Conflicted (skipped) rows return nothing. If you count inserted rows by `result.length`, you can track inserted vs skipped correctly — but only if you also track the total attempted.
**Why it happens:** PostgreSQL DO NOTHING means the row never reaches the RETURNING clause.
**How to avoid:** `skipped = rows.length - inserted.length` — always compute from the total attempted batch size.
**Warning signs:** Inserted + skipped counts not summing to fetched count.

### Pitfall 4: Reuters RSS Feeds Are Dead
**What goes wrong:** Any code referencing `feeds.reuters.com` will fail with 404/connection refused.
**Why it happens:** Reuters discontinued official RSS feeds in June 2020.
**How to avoid:** Use BBC RSS (`feeds.bbci.co.uk/news/[topic]/rss.xml`) and Guardian RSS as curated sources. For breaking news coverage, use the Guardian API keyword search.
**Warning signs:** Connection errors to any `feeds.reuters.com` URL.

### Pitfall 5: rss-parser Timeout Has a Known Bug
**What goes wrong:** The `timeout` option in rss-parser can fail to trigger on some slow feeds — the request hangs indefinitely.
**Why it happens:** The timeout is applied at the HTTP request level but some feeds use chunked transfer encoding that can stall.
**How to avoid:** Wrap each `parser.parseURL()` call in `Promise.race([parseURL(), sleep(12000).then(() => { throw new Error('Feed timeout') })])` as a belt-and-suspenders measure, or trust the try/catch to catch the eventual failure. Per-source isolation already handles this (other sources continue).
**Warning signs:** Long-running ingestion where one source never resolves.

### Pitfall 6: Reddit Hot Posts Include Self-Posts
**What goes wrong:** `r/{subreddit}/hot.json` includes self-posts (Reddit discussions, not external articles). Self-posts have `url = "https://www.reddit.com/r/..."` — inserting them pollutes the articles table with Reddit discussion links.
**Why it happens:** Reddit's API returns all post types.
**How to avoid:** Filter with `post.is_self === false` AND `!post.url.startsWith('https://www.reddit.com')`.
**Warning signs:** Articles table rows with `url` pointing to `reddit.com`.

### Pitfall 7: Topic-to-Subreddit Mapping for Arbitrary Topics
**What goes wrong:** Freeform user topics (e.g. "UK housing market") may not map to any subreddit. Hard-coded maps fail for unexpected topics.
**Why it happens:** Reddit subreddits are community-named, not standardised.
**How to avoid:** Use Reddit's own search API (`https://www.reddit.com/subreddits/search.json?q={topic}&limit=3`) to find the top matching subreddits for any topic. Cache results per topic for the session. If no subreddits found, skip Reddit for that topic without error. This is the query-based mapping strategy the CONTEXT.md specifies.
**Warning signs:** Empty Reddit results for every topic (subreddit search returning 0 results is expected for niche topics — handle gracefully).

---

## Code Examples

Verified patterns from official sources:

### Guardian API Search Request
```typescript
// Source: https://publicapi.dev/the-guardian-api + verified response field names

const GUARDIAN_BASE = 'https://content.guardianapis.com/search'

interface GuardianResult {
  webTitle: string
  webUrl: string
  sectionName: string
  webPublicationDate: string
}

async function fetchGuardianApi(query: string): Promise<RawArticle[]> {
  const url = new URL(GUARDIAN_BASE)
  url.searchParams.set('q', query)
  url.searchParams.set('api-key', process.env.GUARDIAN_API_KEY!)
  url.searchParams.set('page-size', '10')
  url.searchParams.set('show-fields', 'trailText')

  const resp = await fetch(url.toString())
  if (!resp.ok) throw new Error(`Guardian API ${resp.status}: ${await resp.text()}`)

  const json = await resp.json()
  const results: GuardianResult[] = json.response.results ?? []

  return results.map(r => ({
    url: r.webUrl,
    title: r.webTitle,
    sourceName: 'The Guardian',
    sourceUrl: 'https://www.theguardian.com',
    publishedAt: new Date(r.webPublicationDate),
  }))
}
```

### NewsData.io API Search Request
```typescript
// Source: https://newsdata.io/blog/news-api-response-object/ for field names

const NEWSDATA_BASE = 'https://newsdata.io/api/1/latest'

async function fetchNewsdataApi(query: string): Promise<RawArticle[]> {
  const url = new URL(NEWSDATA_BASE)
  url.searchParams.set('apikey', process.env.NEWSDATA_API_KEY!)
  url.searchParams.set('q', query)
  url.searchParams.set('language', 'en')

  const resp = await fetch(url.toString())
  if (!resp.ok) throw new Error(`NewsData API ${resp.status}: ${await resp.text()}`)

  const json = await resp.json()
  const results = json.results ?? []

  return results
    .filter((r: any) => Boolean(r.link))
    .map((r: any) => ({
      url: r.link,
      title: r.title ?? 'Untitled',
      sourceName: r.source_id ?? 'Unknown',
      sourceUrl: r.source_url ?? null,
      publishedAt: r.pubDate ? new Date(r.pubDate) : null,
    }))
}
```

### Drizzle Articles Table Schema Addition
```typescript
// Source: https://orm.drizzle.team/docs/insert — verified insert and conflict patterns

import { pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'

export const articles = pgTable(
  'articles',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    url: text('url').notNull(),
    contentHash: text('content_hash').notNull(),
    title: text('title').notNull(),
    sourceName: text('source_name').notNull(),
    sourceUrl: text('source_url'),
    publishedAt: timestamp('published_at'),
    fetchedAt: timestamp('fetched_at').defaultNow(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    urlUserUnique: unique().on(table.url, table.userId), // per-user dedup
  })
)
```

Note on dedup scope: The unique constraint should be on `(url, userId)` rather than `url` alone. This allows the same article to be stored for different users (each user's briefing is independent), but prevents the same user seeing duplicate articles.

### BBC RSS Curated Feeds
```typescript
// Source: verified via https://rss.app/en/rss-feed/bbc-rss-feed

// BBC provides section-based RSS feeds — use as curated "always relevant" sources
// These are broad enough to be relevant to most topics via the API search
const BBC_RSS_FEEDS = [
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', sourceName: 'BBC News - World' },
  { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', sourceName: 'BBC News - Technology' },
  { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', sourceName: 'BBC News - Business' },
  { url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', sourceName: 'BBC News - Science' },
  { url: 'https://feeds.bbci.co.uk/news/health/rss.xml', sourceName: 'BBC News - Health' },
] as const
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Reuters RSS feeds | Guardian API + BBC RSS | Reuters killed feeds June 2020 | Cannot reference Reuters as an RSS source at all |
| NewsAPI.org as default API | Guardian API + NewsData.io | NewsAPI.org tightened free tier restrictions | Free plan is dev-localhost only; use Guardian API for production |
| Manual XML parsing | rss-parser v3 (stable) | ~2016 | 533k weekly downloads; battle-tested TypeScript types |
| SELECT-then-INSERT dedup | `onConflictDoNothing()` | PostgreSQL 9.5+ / Drizzle ORM | Race-condition-safe, single round trip, idiomatic |

**Deprecated/outdated:**
- `feeds.reuters.com` — dead since 2020, all URLs return 404 or connection refused
- NewsAPI.org free tier in production — explicitly prohibited by their terms
- rss-parser v2 — old API; use v3 which includes `parseURL()` with Promise support

---

## Open Questions

1. **Reddit subreddit search reliability for niche topics**
   - What we know: `reddit.com/subreddits/search.json?q={topic}` returns matching subreddits without auth
   - What's unclear: Response format and reliability for very specific topics (e.g. "UK housing market") — may return 0 results
   - Recommendation: Implement graceful skip (no error) when subreddit search returns 0 results; include in the structured result as `{ source: 'reddit-{topic}', message: 'No matching subreddits found' }` in a warnings array (separate from errors)

2. **NewsData.io API key acquisition**
   - What we know: Free tier is available, 200 credits/day, production-permitted
   - What's unclear: Whether sign-up is instant or requires manual approval
   - Recommendation: Acquire key early; if delayed, Guardian API alone covers CONT-02 for initial testing

3. **articles table per-user vs global dedup scope**
   - What we know: CONTEXT.md says dedup is permanent across all runs
   - What's unclear: Whether the same article should be inserted once globally or once per user
   - Recommendation: Use `(url, userId)` unique constraint — same article can appear for different users but not twice for the same user. This is the correct model for personalised briefings.

4. **Guardian RSS vs Guardian API**
   - What we know: Guardian provides both RSS feeds AND a content search API
   - What's unclear: Whether to use both or just the API
   - Recommendation: Use Guardian API exclusively for Guardian content (it supports keyword search so it satisfies CONT-01's topic-mapping requirement AND CONT-02's API requirement simultaneously). No need for separate Guardian RSS adapter.

---

## Sources

### Primary (HIGH confidence)
- https://orm.drizzle.team/docs/insert — onConflictDoNothing, batch insert, returning patterns
- https://nextjs.org/docs/app/getting-started/route-handlers — Route Handler POST pattern (Next.js 16.1.6 docs, fetched directly)
- https://nodejs.org/api/crypto.html — node:crypto createHash SHA-256 (built-in, no version concern)
- GitHub: rbren/rss-parser — timeout, TypeScript, parseURL, error handling (direct README)
- https://newsdata.io/blog/news-api-response-object/ — response fields article_id, title, link, source_id, pubDate

### Secondary (MEDIUM confidence)
- https://publicapi.dev/the-guardian-api — Guardian API `q` parameter, response fields webTitle/webUrl/sectionName (verified by multiple sources)
- https://newsdata.io/blog/latest-news-endpoint/ — base URL and query parameters confirmed
- rss.app + feeder.co articles on BBC RSS URLs — BBC feed URLs at `feeds.bbci.co.uk` confirmed by multiple sources
- FiveFilters.org post on Reuters RSS — Reuters discontinued RSS in 2020, confirmed by multiple sources
- Multiple sources (goproxy.com, bazqux.com, github issues) — Reddit 429 without custom User-Agent

### Tertiary (LOW confidence)
- Reddit subreddit search endpoint (`/subreddits/search.json`) — response format not directly verified from official docs, based on community examples
- rss-parser timeout bug workaround — based on GitHub issues, not official documentation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — rss-parser and Drizzle patterns verified from official docs; Guardian API field names confirmed from multiple sources
- Architecture: HIGH — all patterns follow established project conventions (existing db/client, auth patterns, route handlers)
- Pitfalls: MEDIUM-HIGH — NewsAPI.org restriction verified via terms page; Reddit 429 confirmed by multiple community sources; Reuters RSS death confirmed; Drizzle onConflictDoNothing behaviour verified from official docs

**Research date:** 2026-03-02
**Valid until:** 2026-04-01 (Guardian API free tier limits and NewsData.io free tier could change; RSS feed URLs are stable)
