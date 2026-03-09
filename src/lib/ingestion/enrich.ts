// src/lib/ingestion/enrich.ts
// Article body enrichment — fetches and stores full article text for null-body articles.
// Uses Mozilla Readability to extract clean article text from HTML.

import { and, eq, gte, isNull } from 'drizzle-orm'
import { JSDOM, VirtualConsole } from 'jsdom'
import { Readability } from '@mozilla/readability'
import { db } from '@/lib/db/client'
import { articles } from '@/lib/db/schema'
import type { EnrichmentResult } from './types'

const FETCH_TIMEOUT_MS = 10_000
const CONCURRENCY = 5
const MIN_BODY_CHARS = 200
const MAX_BODY_CHARS = 50_000

export async function enrichForUser(userId: string): Promise<EnrichmentResult> {
  const result: EnrichmentResult = { attempted: 0, enriched: 0, failed: 0, errors: [] }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const rows = await db
    .select({ id: articles.id, url: articles.url })
    .from(articles)
    .where(
      and(
        eq(articles.userId, userId),
        gte(articles.publishedAt, since),
        isNull(articles.body),
      ),
    )

  result.attempted = rows.length

  // Process in batches of CONCURRENCY
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const batch = rows.slice(i, i + CONCURRENCY)
    const outcomes = await Promise.allSettled(
      batch.map(row => scrapeAndStore(row.id, row.url))
    )
    for (let j = 0; j < outcomes.length; j++) {
      const outcome = outcomes[j]
      if (outcome.status === 'fulfilled' && outcome.value) {
        result.enriched++
      } else if (outcome.status === 'fulfilled' && !outcome.value) {
        result.failed++ // paywall stub / too short
      } else if (outcome.status === 'rejected') {
        result.failed++
        result.errors.push({
          url: batch[j].url,
          message: outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason),
        })
      }
    }
  }

  console.log(
    JSON.stringify({
      event: 'enrichment_complete',
      userId,
      attempted: result.attempted,
      enriched: result.enriched,
      failed: result.failed,
      errorCount: result.errors.length,
    }),
  )

  return result
}

async function scrapeAndStore(articleId: string, url: string): Promise<boolean> {
  let html: string
  try {
    html = await fetchWithTimeout(url, FETCH_TIMEOUT_MS)
  } catch (err) {
    console.log(
      JSON.stringify({ stage: 'enrichment', articleId, url, error: err instanceof Error ? err.message : String(err) }),
    )
    throw err
  }

  const virtualConsole = new VirtualConsole()
  const dom = new JSDOM(html, { url, virtualConsole })
  const reader = new Readability(dom.window.document)
  const parsed = reader.parse()

  if (!parsed || !parsed.textContent) {
    console.log(JSON.stringify({ stage: 'enrichment', articleId, url, error: 'readability returned null' }))
    return false
  }

  const text = parsed.textContent.replace(/\s+/g, ' ').trim()

  if (text.length < MIN_BODY_CHARS) {
    console.log(JSON.stringify({ stage: 'enrichment', articleId, url, error: `body too short (${text.length} chars) — likely paywall stub` }))
    return false
  }

  await db
    .update(articles)
    .set({ body: text.slice(0, MAX_BODY_CHARS) })
    .where(eq(articles.id, articleId))

  return true
}

async function fetchWithTimeout(url: string, ms: number): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`)
    }
    return response.text()
  } finally {
    clearTimeout(timer)
  }
}
