// src/lib/summarisation/types.ts
// Type contracts for the Phase 4 summarisation pipeline.
// generateBriefingForUser() returns BriefingResult.

import type { InferSelectModel } from 'drizzle-orm'
import type { articles } from '@/lib/db/schema'

/** DB row shape for the articles table (including Phase 4 body/description columns) */
export type ArticleRow = InferSelectModel<typeof articles>

/** One summarised article bullet — stored as a briefingItems row */
export interface BriefingItem {
  articleId: string
  topic: string
  summary: string         // markdown bullet text(s), e.g. "- Apple announces chip\n- ..."
  sourceSnapshot: string  // article text sent to LLM (for grounding audit)
  fromCache: boolean
  sourceName: string
  sourceUrl: string | null
  articleUrl: string
}

/** A single summarised article — summary text + grounding metadata */
export interface SummarisedArticle {
  articleId: string
  summary: string
  sourceSnapshot: string
  fromCache: boolean
}

/** Result returned by generateBriefingForUser() */
export interface BriefingResult {
  briefingId: string
  userId: string
  content: string         // assembled markdown briefing
  items: BriefingItem[]
  topicCount: number
  itemCount: number
  partialFailure: boolean
  failedTopics: string[]
}
