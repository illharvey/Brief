# Architecture Research

**Domain:** Personalised news briefing / email newsletter system
**Researched:** 2026-02-25
**Confidence:** MEDIUM (well-established patterns from training knowledge; external verification unavailable in this session — flag for validation before implementation decisions)

## Standard Architecture

### System Overview

```
┌────────────────────────────────────────────────────────────────────┐
│                         WEB APP (Next.js)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Auth Pages  │  │  Pref Mgmt   │  │  Briefing Viewer (past)  │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬──────────────┘  │
└─────────┼────────────────┼──────────────────────┼──────────────────┘
          │                │                       │
          ▼                ▼                       ▼
┌────────────────────────────────────────────────────────────────────┐
│                        API LAYER (Next.js API Routes)              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐    │
│  │  /auth/*    │  │  /prefs/*   │  │  /briefings/*           │    │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘    │
└──────────────────────────────────────┬─────────────────────────────┘
                                       │
          ┌────────────────────────────┼─────────────────────────┐
          │                            │                         │
          ▼                            ▼                         ▼
┌──────────────────┐    ┌──────────────────────────┐  ┌─────────────────┐
│   DATABASE        │    │    JOB QUEUE / SCHEDULER  │  │  CONTENT STORE  │
│  (PostgreSQL)     │    │  (pg-boss / BullMQ)       │  │  (PostgreSQL)   │
│                   │    │                            │  │                 │
│  users            │    │  cron: daily fetch trigger │  │  articles       │
│  preferences      │    │  queue: fetch-feed jobs   │  │  summaries      │
│  delivery_times   │    │  queue: summarise jobs    │  │  briefings      │
│  briefings        │    │  queue: email-send jobs   │  │                 │
└──────────────────┘    └──────────────────────────┘  └─────────────────┘
                                       │
          ┌────────────────────────────┼──────────────────────────┐
          │                            │                          │
          ▼                            ▼                          ▼
┌──────────────────┐    ┌──────────────────────────┐  ┌─────────────────┐
│ INGESTION WORKER  │    │   AI SUMMARISATION        │  │  EMAIL DELIVERY │
│                   │    │   WORKER                  │  │  WORKER         │
│  Fetches RSS/API  │    │                            │  │                 │
│  Deduplicates     │    │  Calls Claude/GPT-4o       │  │  Resend / SES   │
│  Normalises       │    │  Composes briefing         │  │  HTML template  │
│  Stores articles  │    │  Stores result             │  │  Tracks sends   │
└──────────────────┘    └──────────────────────────┘  └─────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Web App | User-facing UI: auth, topic prefs, delivery time, past briefings | Next.js (App Router) |
| API Layer | REST endpoints for user data CRUD and briefing retrieval | Next.js API Routes |
| Database | Source of truth for users, preferences, and briefing records | PostgreSQL (Neon or Supabase) |
| Job Queue / Scheduler | Orchestrates timed pipeline execution; holds queued work items | pg-boss (Postgres-backed) or BullMQ (Redis-backed) |
| Ingestion Worker | Fetches RSS + news API, deduplicates, normalises, stores raw articles | Node.js worker process or serverless function |
| AI Summarisation Worker | Groups articles per user topic set, calls LLM, stores composed briefing | Node.js worker (long-running or serverless with generous timeout) |
| Email Delivery Worker | Renders HTML email from briefing, sends via transactional provider | Node.js worker calling Resend / AWS SES |
| Content Store | Stores fetched articles, summaries, and final briefing payloads | PostgreSQL (same DB, separate tables; or separate schema) |

## Recommended Project Structure

```
brief/
├── src/
│   ├── app/                   # Next.js App Router pages
│   │   ├── (auth)/            # Sign up / login
│   │   ├── (dashboard)/       # Preference management
│   │   └── briefings/         # Past briefing viewer
│   ├── api/                   # API route handlers (Next.js)
│   │   ├── auth/
│   │   ├── prefs/
│   │   └── briefings/
│   ├── workers/               # Background job workers
│   │   ├── ingestion.ts       # RSS + news API fetch worker
│   │   ├── summarise.ts       # AI summarisation worker
│   │   └── deliver.ts         # Email delivery worker
│   ├── jobs/                  # Job definitions and queue setup
│   │   ├── queue.ts           # Queue client initialisation
│   │   ├── schedules.ts       # Cron schedule definitions
│   │   └── handlers.ts        # Job handler registration
│   ├── services/              # Business logic (no HTTP concerns)
│   │   ├── feeds.ts           # RSS/API fetching and normalisation
│   │   ├── summarise.ts       # LLM call and prompt construction
│   │   ├── email.ts           # Email render and send
│   │   └── preferences.ts     # User preference resolution
│   ├── db/                    # Database client and schema
│   │   ├── client.ts          # Drizzle or Prisma client
│   │   └── schema.ts          # Table definitions
│   ├── lib/                   # Shared utilities
│   │   ├── rss.ts             # RSS parsing (rss-parser)
│   │   └── ai.ts              # LLM client wrapper
│   └── emails/                # React Email templates
│       └── briefing.tsx       # Briefing email component
├── scripts/
│   └── worker.ts              # Entry point for worker process
└── drizzle/                   # Migrations
```

### Structure Rationale

- **workers/ separate from app/:** Background jobs must run as a separate process (or via a job runner) outside the Next.js request lifecycle. Keeping them isolated prevents coupling.
- **services/ layer:** Business logic lives here, not in API routes or workers. Both web routes and workers import from services/, enabling code reuse and testability.
- **jobs/ separate from workers/:** Queue definitions and schedule config are distinct from the handler implementations — makes it easy to see what's scheduled without reading worker code.
- **emails/ using React Email:** Templates as React components enable type-safe, testable email rendering with preview support.

## Architectural Patterns

### Pattern 1: Pipeline with Staged Job Queue

**What:** Each pipeline stage (ingest → summarise → deliver) is a separate job type in a queue. Stage N enqueues Stage N+1 on completion, passing only IDs (not data) between stages.

**When to use:** Any multi-step async process where steps have different durations, retry requirements, or failure modes. This is the correct architecture for news briefing systems because ingestion can fail independently of summarisation.

**Trade-offs:** More moving parts than a single background script, but dramatically more resilient. At PoC scale (10-20 users), a simple Postgres-backed queue (pg-boss) is sufficient and avoids needing Redis.

**Example:**
```typescript
// jobs/handlers.ts
import { queue } from './queue';
import { fetchFeeds } from '../services/feeds';
import { runSummarisation } from '../services/summarise';
import { sendBriefing } from '../services/email';

// Stage 1: ingest feeds for a user
queue.work('ingest-feeds', async (job) => {
  const { userId } = job.data;
  const articles = await fetchFeeds(userId);
  await queue.send('summarise-user', { userId, articleIds: articles.map(a => a.id) });
});

// Stage 2: summarise articles into briefing
queue.work('summarise-user', async (job) => {
  const { userId, articleIds } = job.data;
  const briefingId = await runSummarisation(userId, articleIds);
  await queue.send('deliver-briefing', { userId, briefingId });
});

// Stage 3: deliver email
queue.work('deliver-briefing', async (job) => {
  const { userId, briefingId } = job.data;
  await sendBriefing(userId, briefingId);
});
```

### Pattern 2: Fan-out Scheduling (Cron → Per-User Jobs)

**What:** A single cron job fires at intervals (e.g., every 15 minutes). It queries for users whose delivery time falls in the next window, then enqueues one `ingest-feeds` job per user. No single large batch job.

**When to use:** When users can set their own delivery times. A single "send all emails at 8am" cron only works if delivery time is fixed for all users.

**Trade-offs:** Requires the scheduler to maintain a sense of "already dispatched this user today" to avoid double-sends. A `sent_at` column on a daily `briefing_sends` table serves this purpose.

**Example:**
```typescript
// jobs/schedules.ts
// Runs every 15 minutes, fans out per-user jobs
queue.schedule('dispatch-due-users', '*/15 * * * *', async () => {
  const dueUsers = await getDueUsers(); // users whose delivery_time is in next 15 min window
  for (const user of dueUsers) {
    await queue.send('ingest-feeds', { userId: user.id });
  }
});
```

### Pattern 3: Feed Deduplication via Content Hash

**What:** Before storing an article, compute a hash of (source URL + title). Check against the `articles` table. Skip insert if hash already exists. This is the standard approach to avoid re-summarising the same article across multiple runs.

**When to use:** Always. RSS feeds republish old articles. NewsAPI returns overlapping results. Without deduplication, AI cost grows unboundedly and briefings contain repeated content.

**Trade-offs:** Adds a lookup on every article fetch. At beta scale this is negligible. At large scale, move to a Bloom filter or Redis set for fast membership checks.

**Example:**
```typescript
// services/feeds.ts
import crypto from 'crypto';

function contentHash(url: string, title: string): string {
  return crypto.createHash('sha256').update(`${url}::${title}`).digest('hex');
}

async function storeArticle(article: RawArticle): Promise<string | null> {
  const hash = contentHash(article.url, article.title);
  const existing = await db.query.articles.findFirst({ where: eq(articles.hash, hash) });
  if (existing) return null; // already stored
  return db.insert(articles).values({ ...article, hash }).returning({ id: articles.id });
}
```

## Data Flow

### Content Ingestion Pipeline (Daily)

```
Cron fires (every 15 min)
    ↓
Query: which users have delivery_time in next window AND no briefing sent today?
    ↓
Fan-out: enqueue ingest-feeds job per user
    ↓
[WORKER: ingest-feeds]
    ↓
For each topic in user.preferences:
    → Fetch RSS feeds for topic (rss-parser)
    → Fetch NewsAPI results for topic keyword
    ↓
Deduplicate by content hash
    ↓
Store new articles → articles table
    ↓
Enqueue summarise-user job (passing userId + articleIds)

    ↓
[WORKER: summarise-user]
    ↓
Load articles from DB
    ↓
Build prompt: user topics + article headlines + body snippets
    ↓
Call LLM API (Claude / GPT-4o)
    ↓
Store composed briefing → briefings table
    ↓
Enqueue deliver-briefing job (passing userId + briefingId)

    ↓
[WORKER: deliver-briefing]
    ↓
Load briefing + user email from DB
    ↓
Render React Email template with briefing content
    ↓
Send via Resend / SES
    ↓
Record send timestamp → briefing_sends table
```

### User Preference Update Flow

```
User submits preference form (web app)
    ↓
PATCH /api/prefs → API route handler
    ↓
Validate (Zod)
    ↓
Update preferences table in DB
    ↓
Response 200 — no queue interaction needed
(Changes take effect at next scheduled delivery)
```

### Briefing Read Flow (Web App)

```
User visits /briefings or clicks email link
    ↓
GET /api/briefings/[id] → API route
    ↓
Auth check (session)
    ↓
Query briefings table (owner check)
    ↓
Return briefing JSON → render in web app
```

### Key Data Flows Summary

1. **Scheduled pipeline:** Cron → queue → ingestion worker → summarisation worker → delivery worker (all async, stage-chained)
2. **Preference writes:** Synchronous HTTP to DB, no queue involvement
3. **Briefing reads:** Synchronous HTTP to DB, briefing stored as rendered content

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-100 users (PoC) | Single Next.js app + pg-boss on one Postgres DB. Workers run as a separate `node scripts/worker.ts` process on the same server. No Redis needed. |
| 100-1k users | Same stack, but move workers to a dedicated server or container (Railway/Fly.io worker dyno). Add retries and dead letter queues. Monitor LLM API latency. |
| 1k-10k users | Consider Redis-backed BullMQ for queue (higher throughput). Add rate limiting on LLM calls (API has per-minute token limits). Cache frequently-fetched RSS feeds to avoid hitting source rate limits. |
| 10k+ users | Split ingestion, summarisation, and delivery into separate services. Introduce a dedicated feed cache (Redis). Consider topic-level article caching (many users share the same feed source per topic). |

### Scaling Priorities

1. **First bottleneck at PoC scale:** LLM API latency. Summarisation per user takes 3-15 seconds depending on article count and prompt size. At 20 users this is fine serially. At 100+ users, parallelise summarisation jobs (queue concurrency setting).
2. **Second bottleneck:** RSS feed fetching hitting source rate limits. Introduce a shared article cache keyed by (topic + date) so multiple users with the same topic share one fetch instead of N fetches.

## Anti-Patterns

### Anti-Pattern 1: Running the Pipeline Inside the HTTP Request Lifecycle

**What people do:** Trigger feed fetching + summarisation + email send from an API route or a webhook handler, waiting synchronously for the result.

**Why it's wrong:** LLM summarisation takes 5-30 seconds. RSS fetching can time out. Email providers can be slow. Next.js/Vercel serverless functions have a 10-60 second timeout. The whole thing will fail at scale, and partial failures are unrecoverable.

**Do this instead:** API routes only write to the job queue. Workers handle execution asynchronously. The queue provides retries, backoff, and durability.

### Anti-Pattern 2: One Big Cron Job That Does Everything Synchronously

**What people do:** Write a single cron script that loops over all users, fetches, summarises, and sends for each user one-by-one in a big sequential loop.

**Why it's wrong:** One user's failure blocks all subsequent users. No parallelism. No retry on partial failure. At 20 users with 10-second LLM calls, the cron takes 200 seconds to complete.

**Do this instead:** Cron only dispatches per-user jobs to the queue. Workers execute in parallel (set concurrency > 1) and retry independently on failure.

### Anti-Pattern 3: Re-fetching Feeds on Every Summarisation

**What people do:** Each user's summarisation job independently fetches all RSS feeds from scratch.

**Why it's wrong:** At 20 users, if 10 follow "Tech News" they'll each hit the same RSS URL 10 times in the same minute. Sources rate-limit aggressive crawlers. AWS NewsAPI and Guardian API have call quotas.

**Do this instead:** The ingestion stage fetches and stores articles keyed by (topic + date). The summarisation stage reads from DB. Run ingestion once per topic (or once per source URL), not once per user. A per-topic ingestion cron (firing before the user dispatch) achieves this.

### Anti-Pattern 4: Storing Full Article HTML in the Prompt

**What people do:** Dump complete article HTML into the LLM prompt for each article.

**Why it's wrong:** Article HTML is full of nav menus, ads, boilerplate, and tracking scripts. This inflates token count by 10-100x, massively increasing LLM cost and latency. Context window limits may be hit with only a handful of articles.

**Do this instead:** Extract only the article body text (using a library like `@extractus/article-extractor` or `readability`). Pass only the title + first 500-1000 chars of cleaned body. The LLM doesn't need the full article to write a summary.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| RSS feeds (BBC, Reuters, Guardian, topic-specific) | HTTP GET + rss-parser | Cache results by (feed URL + date); respect ETag/Last-Modified headers to avoid unnecessary re-fetches |
| NewsAPI | HTTP GET with API key | Free tier: 100 req/day; sufficient for PoC. Cache results. |
| Guardian API | HTTP GET with API key | Free tier available. Good for UK/politics/tech coverage. |
| Claude API / OpenAI GPT-4o | HTTP POST (streaming optional) | Use claude-3-haiku or gpt-4o-mini for cost control at PoC scale; escalate to sonnet/opus for quality if needed |
| Resend (email sending) | HTTP POST via Resend SDK | Best DX for transactional email from Node.js. Free tier: 3000 emails/month — covers beta. |
| Auth provider (Clerk or NextAuth) | Middleware + SDK | Clerk is lowest-friction for Next.js; NextAuth v5 is free but more setup |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Web App ↔ API Layer | Next.js co-located (same process); fetch() client-side | No network boundary at PoC scale |
| API Layer ↔ Queue | Direct pg-boss client call (`queue.send(...)`) | Queue lives in same Postgres DB; no separate infrastructure |
| Queue ↔ Workers | pg-boss polling (workers poll queue table) | Worker process runs separately from Next.js (`node scripts/worker.ts`) |
| Workers ↔ DB | Direct Drizzle/Prisma queries | Same connection pool as web app; watch max connection limits on free Postgres tiers |
| Workers ↔ LLM API | HTTP POST; wrap in retry logic | LLM APIs return 429/503 under load; exponential backoff required |
| Workers ↔ Email provider | HTTP POST via SDK | Resend SDK handles retries internally |

## Build Order Implications

The pipeline has hard dependencies that dictate build order:

```
1. Database schema + migrations
       ↓ (nothing else works without this)
2. Auth + user model
       ↓ (preferences require a user)
3. User preferences model (topics, delivery time)
       ↓ (ingestion needs to know what topics to fetch)
4. Feed ingestion service (RSS + news API fetch, dedup, store)
       ↓ (summarisation needs articles to exist)
5. AI summarisation service (LLM integration, briefing composition)
       ↓ (delivery needs a briefing to send)
6. Email delivery service (template, send via Resend)
       ↓ (scheduling ties the pipeline together)
7. Job queue + cron scheduler (fan-out, stage chaining)
       ↓ (web app can surface the results)
8. Web app: preference management UI
9. Web app: briefing viewer UI
```

**Recommended MVP build path:** Build steps 1-7 as a working but headless pipeline first (testable via scripts), then add the web app UI on top. This proves the core value loop (ingestion → AI → email) before investing in frontend polish.

## Sources

- Architecture pattern: Pipeline with staged job queues — well-established pattern in async processing systems (HIGH confidence; standard distributed systems pattern)
- pg-boss: Postgres-backed job queue for Node.js — https://github.com/timgit/pg-boss (MEDIUM confidence; widely used, active project as of training cutoff)
- BullMQ: Redis-backed job queue — https://docs.bullmq.io (HIGH confidence; de facto standard for Node.js queuing)
- Resend: Transactional email for Next.js — https://resend.com/docs (MEDIUM confidence; rapidly adopted since 2023, verify current pricing/limits)
- React Email: Email templating — https://react.email/docs (MEDIUM confidence; current best practice for Next.js-based email systems)
- rss-parser: RSS/Atom feed parsing — https://github.com/rbren/rss-parser (MEDIUM confidence; standard Node.js RSS library)
- Article content extraction: @extractus/article-extractor — https://github.com/extractus/article-extractor (LOW confidence; verify this remains actively maintained)
- Fan-out scheduling pattern: LOW confidence (training data only; verify with actual pg-boss cron docs before implementation)
- NewsAPI free tier limits: LOW confidence (verify current limits at https://newsapi.org/pricing as these change)
- Guardian API free tier: MEDIUM confidence (well-documented developer access at https://open-platform.theguardian.com)

---
*Architecture research for: personalised news briefing / email newsletter system (Brief)*
*Researched: 2026-02-25*
