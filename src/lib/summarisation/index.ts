// src/lib/summarisation/index.ts
// Main summarisation pipeline. Called by Phase 5 scheduler.
//
// Pipeline:
// 1. Validate GEMINI_API_KEY presence (early throw if missing)
// 2. Load user's topics from DB
// 3. Fetch articles ingested in last 24h for this user
// 4. Group articles by topic (topic match = article.title or description mentions topic keyword)
// 5. Rank articles per topic (rankArticles)
// 6. For each topic: summarise each article (summariseArticle — cache-aside)
// 7. Assemble markdown briefing (assembleBriefing)
// 8. Persist briefing + briefingItems to DB
// 9. Return BriefingResult

import { and, eq, gte } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { articles, briefings, briefingItems, userTopics } from '@/lib/db/schema'
import { rankArticles } from './rank'
import { summariseArticle } from './llm'
import { assembleBriefing } from './assemble'
import type { ArticleRow, BriefingItem, BriefingResult } from './types'

/**
 * Generate a personalised briefing for a user from articles ingested in the last 24 hours.
 *
 * Called by Phase 5 (cron scheduler). Also callable from dev route and test script.
 */
export async function generateBriefingForUser(userId: string): Promise<BriefingResult> {
  // 1. Early validation — throw before any DB or LLM work if key is missing
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set — cannot generate briefing')
  }

  // 2. Load user topics
  const topicRows = await db
    .select()
    .from(userTopics)
    .where(eq(userTopics.userId, userId))

  const topicNames = topicRows.map(t => t.topic)

  // 3. Fetch articles from last 24 hours for this user
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const recentArticles: ArticleRow[] = await db
    .select()
    .from(articles)
    .where(and(
      eq(articles.userId, userId),
      gte(articles.fetchedAt, since),
    ))

  // 4. Group articles by topic using case-insensitive keyword match on title + description
  //    An article can appear under multiple topics (cross-topic relevance signal for ranking)
  const articlesByTopic = new Map<string, ArticleRow[]>()
  for (const topic of topicNames) {
    const keyword = topic.toLowerCase()
    const matched = recentArticles.filter(a =>
      a.title.toLowerCase().includes(keyword) ||
      (a.description ?? '').toLowerCase().includes(keyword)
    )
    articlesByTopic.set(topic, matched)
  }

  // 5. Rank: cross-topic hit count first, recency tiebreaker, top 5 per topic
  const ranked = rankArticles(articlesByTopic)

  // 6. Summarise per topic with per-topic error isolation
  const allItems: BriefingItem[] = []
  const failedTopics: string[] = []

  for (const topic of topicNames) {
    const topicArticles = ranked.get(topic) ?? []
    if (topicArticles.length === 0) continue  // omit topic entirely if no articles

    try {
      for (const article of topicArticles) {
        const { summary, fromCache, sourceSnapshot } = await summariseArticle(article)
        if (summary) {
          allItems.push({
            articleId: article.id,
            topic,
            summary,
            sourceSnapshot,
            fromCache,
            sourceName: article.sourceName,
            sourceUrl: article.sourceUrl ?? null,
            articleUrl: article.url,
          })
        }
      }
    } catch (err) {
      console.error(`[summarisation] Topic "${topic}" failed:`, err)
      failedTopics.push(topic)
    }
  }

  // 7. Assemble markdown briefing
  const content = assembleBriefing(allItems, topicNames, failedTopics)
  const partialFailure = failedTopics.length > 0

  // 8. Persist briefing to DB
  const [briefing] = await db
    .insert(briefings)
    .values({
      userId,
      content,
      topicCount: topicNames.length - failedTopics.length,
      itemCount: allItems.length,
      partialFailure,
    })
    .returning()

  if (allItems.length > 0) {
    await db.insert(briefingItems).values(
      allItems.map(item => ({
        briefingId: briefing.id,
        articleId: item.articleId,
        topic: item.topic,
        summary: item.summary,
        sourceSnapshot: item.sourceSnapshot,
        fromCache: item.fromCache,
      }))
    )
  }

  // 9. Return result
  return {
    briefingId: briefing.id,
    userId,
    content,
    items: allItems,
    topicCount: briefing.topicCount ?? 0,
    itemCount: briefing.itemCount ?? 0,
    partialFailure,
    failedTopics,
  }
}
