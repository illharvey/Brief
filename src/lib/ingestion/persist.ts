import { db } from '@/lib/db/client'
import { articles } from '@/lib/db/schema'
import type { RawArticle } from './types'
import { contentHash, normaliseUrl } from './dedup'

/**
 * Batch-insert articles for a user. Uses onConflictDoNothing on (url, userId)
 * so re-running ingestion for the same user never inserts duplicates.
 *
 * Returns { inserted, skipped } where inserted + skipped === articles.length.
 * IMPORTANT: .returning() only returns rows actually inserted, not skipped rows.
 * skipped = total - inserted.length.
 */
export async function insertArticles(
  rawArticles: RawArticle[],
  userId: string
): Promise<{ inserted: number; skipped: number }> {
  if (rawArticles.length === 0) return { inserted: 0, skipped: 0 }

  const rows = rawArticles.map((a) => ({
    url: normaliseUrl(a.url),
    contentHash: contentHash(a.title, a.url),
    title: a.title,
    sourceName: a.sourceName,
    sourceUrl: a.sourceUrl ?? null,
    publishedAt: a.publishedAt ?? null,
    userId,
  }))

  const inserted = await db
    .insert(articles)
    .values(rows)
    .onConflictDoNothing({ target: [articles.url, articles.userId] })
    .returning({ id: articles.id })

  return {
    inserted: inserted.length,
    skipped: rows.length - inserted.length,
  }
}
