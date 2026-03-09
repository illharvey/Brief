import type { RawArticle } from '../types'

const NEWSDATA_BASE = 'https://newsdata.io/api/1/latest'

/**
 * Fetch articles from NewsData.io matching a keyword query.
 * Returns up to ~10 articles per call (free tier: 200 credits/day ≈ ~2,000 articles).
 * Production use is permitted on the free tier — unlike NewsAPI.org which prohibits it.
 *
 * Requires NEWSDATA_API_KEY env var — get a free key at newsdata.io/register.
 *
 * Throws on non-2xx response — orchestrator wraps in try/catch per source.
 */
export async function fetchNewsdataApi(query: string): Promise<RawArticle[]> {
  const url = new URL(NEWSDATA_BASE)
  url.searchParams.set('apikey', process.env.NEWSDATA_API_KEY!)
  url.searchParams.set('q', query)
  url.searchParams.set('language', 'en')

  const resp = await fetch(url.toString())
  if (!resp.ok) {
    const body = await resp.text()
    throw new Error(`NewsData API ${resp.status}: ${body}`)
  }

  const json = await resp.json()
  const results = json?.results ?? []

  return (results as any[])
    .filter((r) => Boolean(r.link))
    .map((r) => ({
      url: r.link as string,
      title: (r.title as string | null)?.trim() || 'Untitled',
      sourceName: (r.source_id as string) || 'Unknown',
      sourceUrl: (r.source_url as string | null) ?? null,
      publishedAt: r.pubDate ? new Date(r.pubDate as string) : null,
      description: (r.description as string | null)?.trim() || null,
    }))
}
