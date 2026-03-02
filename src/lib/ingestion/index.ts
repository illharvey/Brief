import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { userTopics } from '@/lib/db/schema'
import type { IngestionResult, RawArticle } from './types'
import { insertArticles } from './persist'
import { BBC_RSS_FEEDS, fetchRssSource } from './sources/rss'
import { findSubredditsForTopic, fetchRedditRss, fetchRedditHot } from './sources/reddit'
import { fetchGuardianApi } from './sources/guardian'
import { fetchNewsdataApi } from './sources/newsdata'

/**
 * Ingest articles for a single user across all source types.
 *
 * Pipeline:
 * 1. Load user's topics from the database
 * 2. For EACH topic:
 *    a. Fetch BBC RSS curated feeds (broad baseline — same feeds for all topics)
 *    b. Fetch Reddit subreddits matching the topic, then RSS + hot posts
 *    c. Fetch Guardian API keyword search for the topic
 *    d. Fetch NewsData.io keyword search for the topic
 * 3. Batch-insert all collected articles with per-user deduplication
 * 4. Return { fetched, inserted, skipped, errors }
 *
 * Per-source isolation: each source is wrapped in try/catch. A failing source
 * records an error and the pipeline continues. No automatic retries — Phase 5
 * handles retry at the scheduler level.
 *
 * Called by: Phase 5 cron scheduler (by function import)
 * Dev trigger: POST /api/dev/ingest
 */
export async function ingestForUser(userId: string): Promise<IngestionResult> {
  const result: IngestionResult = { fetched: 0, inserted: 0, skipped: 0, errors: [] }

  function recordError(source: string, err: unknown) {
    result.errors.push({
      source,
      message: err instanceof Error ? err.message : String(err),
      timestamp: new Date().toISOString(),
    })
  }

  // 1. Load user topics
  const topics = await db
    .select()
    .from(userTopics)
    .where(eq(userTopics.userId, userId))

  const allArticles: RawArticle[] = []

  // 2. Fan out per topic
  for (const { topic } of topics) {

    // 2a. BBC RSS curated feeds — broad baseline
    // (same feeds for all topics — per-user dedup prevents duplicate inserts)
    for (const feed of BBC_RSS_FEEDS) {
      try {
        const items = await fetchRssSource(feed.url, feed.sourceName)
        allArticles.push(...items)
        result.fetched += items.length
      } catch (err) {
        recordError(feed.sourceName, err)
      }
    }

    // 2b. Reddit — find relevant subreddits, then fetch RSS + hot posts
    // findSubredditsForTopic returns [] silently on failure — not an error
    const subreddits = await findSubredditsForTopic(topic)
    for (const subreddit of subreddits) {
      try {
        const rssItems = await fetchRedditRss(subreddit)
        allArticles.push(...rssItems)
        result.fetched += rssItems.length
      } catch (err) {
        recordError(`reddit-rss:r/${subreddit}`, err)
      }

      try {
        const hotItems = await fetchRedditHot(subreddit)
        allArticles.push(...hotItems)
        result.fetched += hotItems.length
      } catch (err) {
        recordError(`reddit-hot:r/${subreddit}`, err)
      }
    }

    // 2c. Guardian API keyword search
    try {
      const guardianItems = await fetchGuardianApi(topic)
      allArticles.push(...guardianItems)
      result.fetched += guardianItems.length
    } catch (err) {
      recordError('guardian-api', err)
    }

    // 2d. NewsData.io keyword search
    try {
      const newsdataItems = await fetchNewsdataApi(topic)
      allArticles.push(...newsdataItems)
      result.fetched += newsdataItems.length
    } catch (err) {
      recordError('newsdata-api', err)
    }
  }

  // 3. Persist with per-user deduplication
  const { inserted, skipped } = await insertArticles(allArticles, userId)
  result.inserted = inserted
  result.skipped = skipped

  return result
}
