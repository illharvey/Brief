import Parser from 'rss-parser'
import type { RawArticle } from '../types'

// Single shared parser instance — timeout at 10s to fail fast on slow feeds.
// Per-source isolation: errors thrown here are caught by the orchestrator.
const parser = new Parser({ timeout: 10_000 })

/**
 * BBC curated RSS feeds — broad topic coverage as guaranteed baseline sources.
 * Reuters RSS feeds are dead since June 2020 — do not add reuters.com URLs.
 * Guardian content is fetched via the Guardian API in Plan 03 (keyword search).
 */
export const BBC_RSS_FEEDS = [
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', sourceName: 'BBC News - World' },
  { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', sourceName: 'BBC News - Technology' },
  { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', sourceName: 'BBC News - Business' },
  { url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', sourceName: 'BBC News - Science' },
  { url: 'https://feeds.bbci.co.uk/news/health/rss.xml', sourceName: 'BBC News - Health' },
] as const

/**
 * Fetch and parse a single RSS/Atom feed URL.
 * Returns only items that have a link (articles without links are skipped).
 * Throws on network or parse error — orchestrator wraps in try/catch.
 */
export async function fetchRssSource(url: string, sourceName: string): Promise<RawArticle[]> {
  const feed = await parser.parseURL(url)
  return feed.items
    .filter((item) => Boolean(item.link))
    .map((item) => ({
      url: item.link!,
      title: item.title?.trim() || 'Untitled',
      sourceName,
      sourceUrl: feed.link ?? url,
      publishedAt: item.pubDate ? new Date(item.pubDate) : null,
    }))
}
