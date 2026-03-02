# Phase 4: AI Summarisation - Research

**Researched:** 2026-03-02
**Domain:** LLM summarisation pipeline, Anthropic SDK, Upstash Redis caching, Drizzle schema extension
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Briefing structure**
- Topic headers with bullet summaries beneath each (e.g. `## Technology`, then article bullets)
- Omit topics entirely if no articles were fetched for that topic today
- Intro section ("Today in brief" overview) is at Claude's discretion — add if it improves the experience

**Summary depth & tone**
- Variable number of bullets per article based on article length — LLM judges
- Tone: neutral / journalistic (matter-of-fact, no editorialising)
- Direct quotes allowed when they add value — prompt must enforce attribution accuracy
- Input: full body text when available (Phase 3 extracts this), fall back to title + description from RSS when body extraction failed
- Input truncated to a token limit (~2,000 tokens) before sending to LLM to control cost on long articles

**Source attribution**
- Inline link at end of each bullet: `"Apple announces new chip [The Guardian]→"`
- One bullet per article — sources are not merged even if they cover the same story
- Briefings stored in the DB (required by Phase 6 dashboard)
- Source text snapshot stored alongside each summary to support grounding audits (success criterion 4)

**Article ranking and cap**
- Top 5 articles per topic section included in the briefing
- Ranking signal: cross-topic relevance first (articles tagged under multiple of the user's topics rank higher), then recency as tiebreaker
- Within the section, ordered most-recent first (top article is newest)

**Model selection**
- Model: `claude-haiku-4-5` — summarisation is a straightforward extraction task, Haiku is sufficient
- Readable from env var `SUMMARISATION_MODEL` with Haiku as default

**Summary cache**
- Global cache (shared across all users) — one cached summary per article URL
- Cache TTL: 7 days
- Cache lookup before any LLM call; on cache hit, reuse verbatim

**Cost safety and error handling**
- Every LLM call has `max_tokens` set (output cap)
- Anthropic spend cap must be active before any beta user triggers the pipeline
- On partial failure (e.g. Anthropic API timeout mid-pipeline): send the partial briefing with what completed; note in briefing that some topics couldn't be fetched

**Summarisation pipeline trigger**
- On-demand at briefing generation time (not a background pre-summarisation job)
- Exposed as a callable TypeScript function (for Phase 5 to invoke)
- Includes a manual test script (`scripts/generate-briefing.ts` or similar) for development testing with a userId

### Claude's Discretion
- Exact `max_tokens` value per call
- Whether to include a "Today in brief" intro paragraph
- DB schema for briefings and briefing items tables
- Prompt engineering for the summarisation instruction
- How to handle articles where body extraction partially failed (truncated text)

### Deferred Ideas (OUT OF SCOPE)
- Trending topics ranking — requires external signal (social/search trend data); candidate for a future phase
- Background pre-summarisation job (proactive summarisation after fetch) — raised but deferred; on-demand is the Phase 4 approach
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CONT-03 | AI (Claude Haiku) summarises and composes a personalised prose briefing from ingested articles | Anthropic SDK `@anthropic-ai/sdk` v0.78.0+ with `claude-haiku-4-5-20251001` model; Upstash Redis for global summary cache; Drizzle schema for briefings and briefing_items tables; pipeline orchestrator pattern from Phase 3 ingestion code |
</phase_requirements>

---

## Summary

Phase 4 builds a TypeScript summarisation pipeline that: (1) selects and ranks articles from the DB for a user, (2) calls the Anthropic API to generate per-article summaries with a Redis-backed global cache preventing duplicate LLM calls, (3) assembles summaries into a topic-structured markdown briefing, and (4) persists the briefing to the DB. The pipeline is exposed as a single callable async function for Phase 5 to invoke.

The project already has `@upstash/redis` installed and uses `Redis.fromEnv()` in `src/lib/rate-limit.ts`. The same pattern applies directly for cache operations. The Anthropic SDK (`@anthropic-ai/sdk`) must be added as a new dependency. The chosen model `claude-haiku-4-5` maps to the versioned API ID `claude-haiku-4-5-20251001`.

The main architectural risks are: (a) token truncation must happen before the API call to stay within cost and context limits; (b) partial failures must degrade gracefully at the topic level, not abort the entire pipeline; (c) the cache key must be stable (normalised URL is already computed in Phase 3's dedup logic, so it can be reused).

**Primary recommendation:** Install `@anthropic-ai/sdk`, use the existing `Redis.fromEnv()` pattern for cache, extend the Drizzle schema with two new tables (`briefings`, `briefingItems`), and implement the pipeline as `generateBriefingForUser(userId): Promise<BriefingResult>` modelled on Phase 3's `ingestForUser()` function.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | ^0.78.0 | Anthropic API client — messages.create(), error types, automatic retries | Official Anthropic TypeScript SDK; only SDK for the Claude API |
| `@upstash/redis` | ^1.36.3 (already installed) | Summary cache (set/get with TTL), reuse existing Redis.fromEnv() | Already in project; Upstash serverless Redis is the established pattern |
| `drizzle-orm` | ^0.45.1 (already installed) | briefings + briefingItems schema, insert/select queries | Already in project; consistent with existing schema |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tsx` (via `npx tsx`) | — | Run `scripts/generate-briefing.ts` as a dev script | Manual testing only; no production use |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@anthropic-ai/sdk` direct | Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) | AI SDK abstracts multiple providers but adds abstraction overhead; direct SDK is simpler for a single-model pipeline |
| Upstash Redis for cache | DB table as cache | Redis gives O(1) lookup + automatic TTL expiry; DB cache requires cron cleanup and adds write load to Neon |
| Redis key = normalised URL | Redis key = article UUID | URL is already normalised in Phase 3 dedup; UUID is per-user, URL is global — global cache requires URL key |

**Installation:**
```bash
npm install @anthropic-ai/sdk
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── summarisation/
│   │   ├── index.ts          # generateBriefingForUser() — main entry point
│   │   ├── types.ts          # BriefingResult, BriefingItem, SummarisedArticle
│   │   ├── rank.ts           # Article ranking: cross-topic score, recency tiebreaker
│   │   ├── cache.ts          # Redis summary cache: getSummary(), setSummary()
│   │   ├── llm.ts            # summariseArticle(): LLM call, truncation, prompt
│   │   └── assemble.ts       # assembleBriefing(): topic headers + bullets → markdown
│   └── db/
│       └── schema.ts         # + briefings + briefingItems tables (extend existing)
└── app/
    └── api/
        └── dev/
            └── summarise/
                └── route.ts  # POST /api/dev/summarise — dev trigger, userId in body
scripts/
└── generate-briefing.ts      # npx tsx scripts/generate-briefing.ts <userId>
```

### Pattern 1: Anthropic SDK — messages.create() with max_tokens

**What:** Single non-streaming call with model, system, user message, and output cap.
**When to use:** Every article summarisation call. Summarisation output is short enough that streaming adds no user-visible value.

```typescript
// Source: https://platform.claude.com/docs/en/api/client-sdks
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const message = await client.messages.create({
  model: process.env.SUMMARISATION_MODEL ?? 'claude-haiku-4-5-20251001',
  max_tokens: 256, // output cap — see Claude's Discretion section
  system: SUMMARISATION_SYSTEM_PROMPT,
  messages: [{ role: 'user', content: articleText }],
})

const summary = message.content[0].type === 'text' ? message.content[0].text : ''
```

**Model IDs (verified against official docs):**
- Alias (floating to latest snapshot): `claude-haiku-4-5`
- Versioned (pinned, recommended for production stability): `claude-haiku-4-5-20251001`
- Context window: 200,000 tokens input / 64,000 tokens max output
- Pricing: $1.00/MTok input, $5.00/MTok output
- Source: https://platform.claude.com/docs/en/about-claude/models/overview

### Pattern 2: Upstash Redis — Global Summary Cache

**What:** Cache-aside pattern. Check Redis before every LLM call. On miss, call LLM, store result with 7-day TTL. Cache key = normalised article URL.
**When to use:** Every call to `summariseArticle()`. Must be checked before constructing the API request.

```typescript
// Source: https://upstash.com/docs/redis/sdks/ts/commands/string/set
import { Redis } from '@upstash/redis'

// Reuse existing Redis.fromEnv() pattern from src/lib/rate-limit.ts
const redis = Redis.fromEnv() // reads UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN

const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60  // 7 days

function cacheKey(normalisedUrl: string): string {
  return `brief:summary:${normalisedUrl}`
}

export async function getSummary(url: string): Promise<string | null> {
  return redis.get<string>(cacheKey(url))
}

export async function setSummary(url: string, summary: string): Promise<void> {
  await redis.set(cacheKey(url), summary, { ex: CACHE_TTL_SECONDS })
}
```

**Important:** The normalised URL is already computed in Phase 3's `normaliseUrl()` function in `src/lib/ingestion/dedup.ts`. Reuse the same function for cache key derivation to ensure cache hits across pipeline runs.

### Pattern 3: Article Ranking

**What:** Score articles for inclusion, then sort. Cross-topic relevance first, recency tiebreaker. Cap at top 5 per topic.
**When to use:** After fetching today's articles from DB, before passing to LLM.

The articles table has `userId` and `publishedAt`. To compute cross-topic relevance, count how many of the user's topics each article appears under. Articles fetched from multiple topic searches appear multiple times in the raw result set — de-duplicate by article ID after counting occurrences.

```typescript
// Cross-topic relevance = count of topic queries that returned this article
// Recency tiebreaker = publishedAt DESC (nulls last)
function rankArticles(
  articlesByTopic: Map<string, ArticleRow[]>,
  topN = 5
): Map<string, ArticleRow[]> {
  // Count cross-topic hits
  const hitCount = new Map<string, number>()
  for (const articles of articlesByTopic.values()) {
    for (const a of articles) {
      hitCount.set(a.id, (hitCount.get(a.id) ?? 0) + 1)
    }
  }
  // For each topic: de-dup by id, sort by (hitCount DESC, publishedAt DESC), slice 5
  const result = new Map<string, ArticleRow[]>()
  for (const [topic, articles] of articlesByTopic) {
    const seen = new Set<string>()
    const unique = articles.filter(a => !seen.has(a.id) && seen.add(a.id))
    unique.sort((a, b) => {
      const scoreDiff = (hitCount.get(b.id) ?? 1) - (hitCount.get(a.id) ?? 1)
      if (scoreDiff !== 0) return scoreDiff
      return (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0)
    })
    result.set(topic, unique.slice(0, topN))
  }
  return result
}
```

### Pattern 4: Input Truncation (Character-Based Estimate)

**What:** Truncate article body to ~2,000 tokens before sending to the LLM. Anthropic provides a token counting API, but for a fast approximation, use character count (English text averages ~4 chars/token, so 8,000 chars ≈ 2,000 tokens).
**When to use:** In `llm.ts` before constructing the user message.

```typescript
// Rough approximation: 4 chars/token for English prose
const CHARS_PER_TOKEN = 4
const MAX_INPUT_TOKENS = 2_000
const MAX_CHARS = MAX_INPUT_TOKENS * CHARS_PER_TOKEN  // 8,000 chars

function truncateToTokenLimit(text: string): string {
  if (text.length <= MAX_CHARS) return text
  // Truncate at a word boundary
  const truncated = text.slice(0, MAX_CHARS)
  const lastSpace = truncated.lastIndexOf(' ')
  return lastSpace > 0 ? truncated.slice(0, lastSpace) + ' [truncated]' : truncated
}
```

**Note:** The Anthropic token counting API (`client.messages.countTokens()`) is free but subject to rate limits. For per-article truncation at pipeline scale, the character estimate is appropriate. Reserve the API for development validation if needed.

### Pattern 5: Drizzle Schema — briefings + briefingItems Tables

**What:** Two new tables extending the existing schema. `briefings` stores the assembled briefing per user per run. `briefingItems` stores individual article summaries with source snapshot for grounding audits.
**When to use:** Define alongside existing tables in `src/lib/db/schema.ts`. Generate migration with `npx drizzle-kit generate`.

```typescript
// Extend src/lib/db/schema.ts — at Claude's discretion for exact column set
export const briefings = pgTable('briefings', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  generatedAt: timestamp('generated_at').defaultNow(),
  content: text('content').notNull(),      // assembled markdown briefing
  topicCount: integer('topic_count'),       // how many topics were included
  itemCount: integer('item_count'),         // how many article bullets
  partialFailure: boolean('partial_failure').default(false), // true if any topic errored
})

export const briefingItems = pgTable('briefing_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  briefingId: text('briefing_id').notNull().references(() => briefings.id, { onDelete: 'cascade' }),
  articleId: text('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  topic: text('topic').notNull(),
  summary: text('summary').notNull(),       // the generated bullet text
  sourceSnapshot: text('source_snapshot').notNull(), // the article text sent to LLM (for audit)
  fromCache: boolean('from_cache').default(false),
})
```

**Phase 6 compatibility:** `briefingItems.articleId` provides the join to `articles.url` and `articles.sourceName`, which is what Phase 6 needs to display source links. The CONTEXT.md states "the briefing data model should support Phase 6 reading individual briefing items with their source URLs."

### Pattern 6: Partial Failure Handling

**What:** Per-topic try/catch. A topic that errors adds a note to the briefing; other topics proceed normally. Matches Phase 3's per-source isolation pattern.
**When to use:** In `generateBriefingForUser()` loop body.

```typescript
const topicSections: string[] = []
const errors: string[] = []

for (const topic of userTopics) {
  try {
    const section = await summariseTopic(topic, rankedArticles.get(topic) ?? [])
    topicSections.push(section)
  } catch (err) {
    errors.push(topic)
    // Topic section is omitted from briefing; noted at bottom
  }
}

if (errors.length > 0) {
  topicSections.push(
    `\n> Some topics could not be fetched: ${errors.join(', ')}. Please try again later.`
  )
}
```

### Anti-Patterns to Avoid

- **Calling the LLM with unbounded input:** Always truncate article text before the API call. A 200K-token article body would cost ~$0.20 per call. At scale that breaks the cost model.
- **Per-user cache instead of global cache:** Using userId in the Redis key wastes LLM calls. The same article should produce the same summary regardless of which user requests it.
- **Storing raw UUID as cache key:** The cache must be keyed by normalised URL so it's stable across ingestion runs. An article re-ingested gets a new DB row with a new UUID; the URL stays the same.
- **Merging articles that cover the same story:** Explicitly forbidden by the CONTEXT.md. One bullet per source, attribution is per-article.
- **Using `claude-haiku-4-5` alias in production code:** Prefer the versioned ID `claude-haiku-4-5-20251001` to prevent behaviour changes when Anthropic releases a new Haiku snapshot.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP retries + exponential backoff | Custom retry wrapper | `@anthropic-ai/sdk` built-in retry | SDK automatically retries 429 and 5xx with `retry-after` header handling |
| Cache TTL expiry | DB-based cache with cron cleaner | Upstash Redis `ex` option | Redis TTL is atomic and automatic; no cleanup job needed |
| Token estimation | tiktoken or token counting API per call | Character-count approximation (4 chars/token) | Good enough for truncation guard; no extra dependency or API call |
| LLM error type checking | `instanceof Error` checks | `@anthropic-ai/sdk` typed error classes (`APIError`, `RateLimitError`) | SDK exports typed subclasses for clean error handling |

**Key insight:** The Anthropic SDK handles all transport-level concerns (retries, timeouts, keep-alive). The application only needs to handle `APIError` for billing/quota issues and topic-level partial failures for graceful degradation.

---

## Common Pitfalls

### Pitfall 1: Stale Redis Cache After Article Correction
**What goes wrong:** If a news source corrects an article, the cached summary reflects the original (incorrect) text for up to 7 days.
**Why it happens:** Global cache is keyed by URL. The URL doesn't change on article correction.
**How to avoid:** 7 days is acceptable for a news briefing product (corrections to day-old articles are rarely material). The TTL naturally expires stale content. No action needed for Phase 4.
**Warning signs:** User reports factual errors in briefings — would surface during grounding audit (success criterion 4).

### Pitfall 2: max_tokens Too Low Truncates Bullet Mid-Sentence
**What goes wrong:** A 100-token `max_tokens` cap causes the LLM to cut off mid-bullet, producing incomplete summaries.
**Why it happens:** `max_tokens` is an output cap, not a target length. The model will truncate at that limit.
**How to avoid:** Set `max_tokens` high enough for 3-5 well-formed bullets. 256 tokens is a safe floor for a single-article summary. 512 tokens allows longer articles with more bullets without significant cost impact at Haiku pricing ($0.00256 per call at 512 output tokens).
**Warning signs:** Summaries end with `...` or incomplete sentences in testing.

### Pitfall 3: Missing ANTHROPIC_API_KEY Causes Silent Failures
**What goes wrong:** SDK throws `AuthenticationError` if `ANTHROPIC_API_KEY` is not set. In a try/catch pipeline, this records as a topic error and produces an empty briefing rather than failing visibly.
**Why it happens:** Per-topic try/catch swallows the error.
**How to avoid:** Validate `ANTHROPIC_API_KEY` presence at pipeline entry (`generateBriefingForUser`). Throw early if missing, before any topic processing begins.
**Warning signs:** All topics fail simultaneously — indicates a credential issue, not a per-topic problem.

### Pitfall 4: Article Body Not Yet in DB Schema
**What goes wrong:** Phase 3's `articles` table (as currently defined in `src/lib/db/schema.ts`) does not include a `body` column. Phase 4 planning assumes body text is available; it is not in the current schema.
**Why it happens:** Phase 3 focused on URL/title/metadata. Body extraction was described as a Phase 3 capability but the schema column was never added.
**How to avoid:** Phase 4 Wave 0 must add a `body text` column (nullable) to the `articles` table and run a migration. The summarisation pipeline falls back to `title + description` when `body` is null — this matches the CONTEXT.md decision.
**Warning signs:** If `articles.body` is queried and throws a column-not-found error at runtime.

### Pitfall 5: Redis Key Namespace Collision
**What goes wrong:** Summary cache keys collide with existing rate-limit keys if no namespace prefix is used.
**Why it happens:** Both use the same Upstash Redis instance.
**How to avoid:** Rate limiter already uses `brief:ratelimit` prefix. Use `brief:summary:` prefix for summary cache keys (distinct namespace).
**Warning signs:** Rate limiter behaviour changes unexpectedly — would indicate key collision.

### Pitfall 6: Anthropic Spend Cap Must Be Set Before Beta Users
**What goes wrong:** Without a spend cap, a misconfigured loop or high user count could run up unbounded API costs.
**Why it happens:** Anthropic's API bills per token with no default application-level cap.
**How to avoid:** Set a Workspace-level spend limit in the Anthropic Console before any beta user triggers the pipeline. This is a manual pre-flight step, not a code task. Document in the verification plan.
**Warning signs:** Success criterion 3 explicitly requires this to be confirmed.

---

## Code Examples

### Full summariseArticle() with cache check

```typescript
// src/lib/summarisation/llm.ts
import Anthropic from '@anthropic-ai/sdk'
import { getSummary, setSummary } from './cache'
import { normaliseUrl } from '@/lib/ingestion/dedup'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SUMMARISATION_SYSTEM_PROMPT = `You are a neutral news summarisation assistant. \
Summarise the article in 1–3 concise bullets. \
Use a factual, journalistic tone. No editorialising. \
If the article contains a direct quote that adds value, include it with attribution. \
Return only the bullet points, each starting with "- ". \
Do not include a headline or source attribution — that is added separately.`

const CHARS_PER_TOKEN = 4
const MAX_INPUT_CHARS = 2_000 * CHARS_PER_TOKEN  // ~2,000 tokens

export async function summariseArticle(article: {
  url: string
  title: string
  body: string | null
  description?: string | null
}): Promise<{ summary: string; fromCache: boolean; sourceSnapshot: string }> {
  const normUrl = normaliseUrl(article.url)

  // 1. Cache check
  const cached = await getSummary(normUrl)
  if (cached) {
    return { summary: cached, fromCache: true, sourceSnapshot: '' }
  }

  // 2. Build input text (body preferred, fall back to title + description)
  const rawText = article.body
    ?? [article.title, article.description].filter(Boolean).join('\n\n')
    ?? article.title

  // 3. Truncate to token budget
  const sourceSnapshot = rawText.length > MAX_INPUT_CHARS
    ? rawText.slice(0, MAX_INPUT_CHARS) + ' [truncated]'
    : rawText

  // 4. LLM call
  const response = await client.messages.create({
    model: process.env.SUMMARISATION_MODEL ?? 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    system: SUMMARISATION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Title: ${article.title}\n\n${sourceSnapshot}` }],
  })

  const summary = response.content[0].type === 'text' ? response.content[0].text.trim() : ''

  // 5. Cache the result
  await setSummary(normUrl, summary)

  return { summary, fromCache: false, sourceSnapshot }
}
```

### Anthropic SDK error handling

```typescript
// Source: https://platform.claude.com/docs/en/api/errors
import Anthropic from '@anthropic-ai/sdk'

try {
  const response = await client.messages.create({ /* ... */ })
} catch (err) {
  if (err instanceof Anthropic.APIError) {
    // err.status: 400 | 401 | 403 | 429 | 500 | 529
    // err.message: human-readable description
    // SDK already retried 429/500 per its built-in retry policy
    throw err  // re-throw to trigger topic-level partial failure
  }
  throw err
}
```

### Upstash Redis set with TTL

```typescript
// Source: https://upstash.com/docs/redis/sdks/ts/commands/string/set
await redis.set(key, value, { ex: 7 * 24 * 60 * 60 }) // 7 days in seconds
```

### Drizzle query: fetch today's articles by topic for a user

```typescript
// Fetch articles ingested in last 24 hours, joined to user topics
import { and, eq, gte, inArray } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { articles, userTopics } from '@/lib/db/schema'

const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

const topics = await db.select().from(userTopics).where(eq(userTopics.userId, userId))
const topicNames = topics.map(t => t.topic)

const recentArticles = await db
  .select()
  .from(articles)
  .where(and(
    eq(articles.userId, userId),
    gte(articles.fetchedAt, since),
  ))
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `claude-3-haiku-20240307` (Haiku 3) | `claude-haiku-4-5-20251001` (Haiku 4.5) | Oct 2025 | 200K context vs 200K; 64K max output vs 4K; much better reasoning; same price tier. Haiku 3 deprecated Apr 2026. |
| Custom retry logic | SDK built-in retries | SDK ≥ 0.10.0 | `@anthropic-ai/sdk` retries 429/5xx automatically; no custom retry code needed |
| tiktoken for token counting | Anthropic token counting API or character estimate | 2024 | For truncation guards, character estimation (4 chars/token) is sufficient and avoids WASM dependency |

**Deprecated/outdated:**
- `claude-3-haiku-20240307`: Deprecated by Anthropic, retirement April 19, 2026. Do not use for new work.
- `claude-haiku-3-5`: Claude Haiku 3.5 is listed as deprecated in the Anthropic docs. Use Haiku 4.5.

---

## Open Questions

1. **Does the `articles` table need a `body` column added in Phase 4 Wave 0?**
   - What we know: Phase 3's schema.ts (verified) has no `body` column on the `articles` table. The CONTEXT.md states "Input: full body text when available (Phase 3 extracts this)."
   - What's unclear: Whether Phase 3 article extraction added a body column to the DB (it was listed as a Phase 3 capability but not confirmed in the schema file). The `articles` table in schema.ts has: id, url, contentHash, title, sourceName, sourceUrl, publishedAt, fetchedAt, userId — no body.
   - Recommendation: Phase 4 Wave 0 plan MUST add `body text` (nullable) and `description text` (nullable) columns to the articles table via Drizzle migration. The pipeline falls back to title + description if body is null. This is not a blocker but must be the first task.

2. **What exact `max_tokens` value should be used?**
   - What we know: Haiku 4.5 max output is 64K tokens; CONTEXT.md defers exact value to Claude.
   - What's unclear: Whether 256 tokens is sufficient for 1-3 bullets per article, or whether longer articles warrant more.
   - Recommendation: Use 256 as the default. At $5/MTok output, 256 tokens = $0.00128 per call. For 50 articles per user (10 topics × 5 articles), that's ~$0.064 per briefing — well within acceptable range. Increase to 512 if testing shows truncated bullets.

3. **Article fetch window: what defines "today's" articles?**
   - What we know: Articles are ingested on-demand before briefing generation (Phase 5 triggers ingest then summarise). The DB has `fetchedAt` timestamp.
   - What's unclear: Should the pipeline query articles fetched in the last 24 hours, or all unsummarised articles, or articles with `publishedAt` matching today?
   - Recommendation: Query by `fetchedAt >= NOW() - 24h` to match the expected daily cadence. This avoids including articles from multiple days if a user's delivery is delayed.

---

## Sources

### Primary (HIGH confidence)
- https://platform.claude.com/docs/en/about-claude/models/overview — Model IDs, pricing, context windows (verified current)
- https://platform.claude.com/docs/en/api/client-sdks — SDK installation, TypeScript usage examples (verified current)
- https://platform.claude.com/docs/en/api/rate-limits — Spend limits, workspace limits, tier structure (verified current)
- https://platform.claude.com/docs/en/build-with-claude/prompt-caching — Haiku 4.5 supported for caching, min token requirements, TTL (verified current)
- https://platform.claude.com/docs/en/api/errors — Error types, SDK automatic retry behavior (verified current)
- https://upstash.com/docs/redis/sdks/ts/commands/string/set — `set` with `ex` TTL option (verified current)
- Project source: `src/lib/rate-limit.ts` — `Redis.fromEnv()` pattern confirmed in codebase
- Project source: `src/lib/db/schema.ts` — articles table confirmed, no body column
- Project source: `src/lib/ingestion/dedup.ts` — `normaliseUrl()` function confirmed available

### Secondary (MEDIUM confidence)
- https://www.anthropic.com/news/claude-haiku-4-5 — Haiku 4.5 release announcement, model ID `claude-haiku-4-5` (cross-verified with models/overview)
- npmjs.com `@anthropic-ai/sdk` — v0.78.0 latest as of research date

### Tertiary (LOW confidence)
- Character-based token estimation (4 chars/token for English): widely cited approximation, not from official Anthropic docs. Sufficient for truncation guard; validate with actual token counts in testing.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — SDK, Redis, Drizzle all verified against official sources; versions confirmed in package.json or npm
- Architecture: HIGH — Patterns derived from official SDK docs + existing codebase patterns (ingestion/rate-limit)
- Pitfalls: HIGH (article body column absence verified in source), MEDIUM (max_tokens recommendation is reasoned estimate, not official guidance)

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (stable APIs; recheck model deprecations before Phase 5)
