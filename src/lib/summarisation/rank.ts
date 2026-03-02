// src/lib/summarisation/rank.ts
// Article ranking for briefing inclusion.
// Ranking signal: cross-topic relevance (hit count) first, recency tiebreaker.
// Cap: top 5 articles per topic section.

import type { ArticleRow } from './types'

export function rankArticles(
  articlesByTopic: Map<string, ArticleRow[]>,
  topN = 5
): Map<string, ArticleRow[]> {
  // Count how many topics each article appears in (cross-topic relevance signal)
  const hitCount = new Map<string, number>()
  for (const articles of articlesByTopic.values()) {
    for (const a of articles) {
      hitCount.set(a.id, (hitCount.get(a.id) ?? 0) + 1)
    }
  }

  const result = new Map<string, ArticleRow[]>()
  for (const [topic, articles] of articlesByTopic) {
    // De-duplicate by article id within each topic's candidate list
    const seen = new Set<string>()
    const unique = articles.filter(a => !seen.has(a.id) && seen.add(a.id))

    // Sort: cross-topic score DESC, publishedAt DESC (nulls last)
    unique.sort((a, b) => {
      const scoreDiff = (hitCount.get(b.id) ?? 1) - (hitCount.get(a.id) ?? 1)
      if (scoreDiff !== 0) return scoreDiff
      return (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0)
    })

    result.set(topic, unique.slice(0, topN))
  }
  return result
}
