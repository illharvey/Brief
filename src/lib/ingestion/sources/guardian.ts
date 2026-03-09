import type { RawArticle } from '../types'

const GUARDIAN_BASE = 'https://content.guardianapis.com/search'

interface GuardianResult {
  webTitle: string
  webUrl: string
  sectionName: string
  webPublicationDate: string
  fields?: { trailText?: string }
}

/**
 * Fetch articles from The Guardian Content API matching a keyword query.
 * Returns up to 10 articles per topic query.
 *
 * Requires GUARDIAN_API_KEY env var — get a free key at developer.theguardian.com
 * (Open Platform access; free, 5,000 calls/day, production-permitted).
 *
 * Throws on non-2xx response — orchestrator wraps in try/catch per source.
 * Do NOT use NewsAPI.org — its free tier prohibits non-localhost use.
 */
export async function fetchGuardianApi(query: string): Promise<RawArticle[]> {
  const url = new URL(GUARDIAN_BASE)
  url.searchParams.set('q', query)
  url.searchParams.set('api-key', process.env.GUARDIAN_API_KEY!)
  url.searchParams.set('page-size', '10')
  url.searchParams.set('show-fields', 'trailText')
  url.searchParams.set('order-by', 'newest')

  const resp = await fetch(url.toString())
  if (!resp.ok) {
    const body = await resp.text()
    throw new Error(`Guardian API ${resp.status}: ${body}`)
  }

  const json = await resp.json()
  const results: GuardianResult[] = json?.response?.results ?? []

  return results.map((r) => ({
    url: r.webUrl,
    title: r.webTitle,
    sourceName: 'The Guardian',
    sourceUrl: 'https://www.theguardian.com',
    publishedAt: r.webPublicationDate ? new Date(r.webPublicationDate) : null,
    description: r.fields?.trailText?.replace(/<[^>]+>/g, '').trim() || null,
  }))
}
