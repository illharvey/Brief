// Shared types for the content ingestion pipeline (Phase 3)
// All source adapters return RawArticle[]; the orchestrator accumulates them
// and calls insertArticles(). ingestForUser() returns IngestionResult.

export interface RawArticle {
  url: string
  title: string
  sourceName: string
  sourceUrl?: string | null
  publishedAt?: Date | null
  description?: string | null
}

export interface SourceError {
  source: string
  message: string
  timestamp: string // ISO 8601
}

export interface IngestionResult {
  fetched: number
  inserted: number
  skipped: number
  errors: SourceError[]
}

export interface EnrichmentResult {
  attempted: number
  enriched: number
  failed: number
  errors: Array<{ url: string; message: string }>
}
