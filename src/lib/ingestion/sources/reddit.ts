import Parser from 'rss-parser'
import type { RawArticle } from '../types'

// Reddit requires a descriptive User-Agent for server-side requests.
// Without this, Reddit returns 429 on the first request (not rate-limiting — User-Agent filtering).
const REDDIT_USER_AGENT = 'brief:news-ingestion:v0.1 (automated news aggregator, non-commercial)'

// Shared rss-parser instance for Reddit RSS feeds
const parser = new Parser({
  timeout: 10_000,
  headers: { 'User-Agent': REDDIT_USER_AGENT },
})

/**
 * Search Reddit for subreddits matching a topic keyword.
 * Returns up to 3 subreddit names (without r/ prefix).
 * Returns [] if no subreddits found — caller should skip Reddit for this topic without error.
 *
 * Note: response format based on community examples (LOW confidence per RESEARCH.md).
 * Wrapped in try/catch by the orchestrator; also gracefully returns [] on parse failures.
 */
export async function findSubredditsForTopic(topic: string): Promise<string[]> {
  try {
    const url = `https://www.reddit.com/subreddits/search.json?q=${encodeURIComponent(topic)}&limit=3`
    const resp = await fetch(url, {
      headers: { 'User-Agent': REDDIT_USER_AGENT },
    })
    if (!resp.ok) return []

    const json = await resp.json()
    const children = json?.data?.children ?? []
    return children
      .map((c: { data?: { display_name?: string } }) => c?.data?.display_name as string)
      .filter(Boolean)
  } catch {
    return []
  }
}

/**
 * Fetch top posts from a subreddit via Reddit's public RSS feed.
 * Returns only posts with an external link (no Reddit-hosted content).
 * Throws on network error — orchestrator wraps in try/catch.
 */
export async function fetchRedditRss(subreddit: string): Promise<RawArticle[]> {
  const url = `https://www.reddit.com/r/${subreddit}/.rss?limit=25`
  const feed = await parser.parseURL(url)

  return feed.items
    .filter((item) => {
      const link = item.link ?? ''
      // Skip self-posts: links pointing back to reddit.com
      return Boolean(link) && !link.includes('reddit.com/r/')
    })
    .map((item) => ({
      url: item.link!,
      title: item.title?.trim() || 'Untitled',
      sourceName: `Reddit r/${subreddit}`,
      sourceUrl: `https://www.reddit.com/r/${subreddit}`,
      publishedAt: item.pubDate ? new Date(item.pubDate) : null,
    }))
}

/**
 * Fetch hot posts from a subreddit via Reddit's JSON API.
 * Returns only external linked articles — self-posts are skipped.
 * Throws on network error — orchestrator wraps in try/catch.
 */
export async function fetchRedditHot(subreddit: string): Promise<RawArticle[]> {
  const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=25`
  const resp = await fetch(url, {
    headers: { 'User-Agent': REDDIT_USER_AGENT },
  })

  if (!resp.ok) throw new Error(`Reddit hot.json ${resp.status} for r/${subreddit}`)

  const json = await resp.json()
  const posts: { is_self: boolean; url: string; title: string; created_utc: number }[] = (
    json?.data?.children ?? []
  ).map((c: { data: unknown }) => c.data)

  return posts
    .filter(
      (post) =>
        post &&
        !post.is_self &&
        post.url &&
        post.url.startsWith('http') &&
        !post.url.startsWith('https://www.reddit.com')
    )
    .map((post) => ({
      url: post.url,
      title: post.title?.trim() || 'Untitled',
      sourceName: `Reddit r/${subreddit} (hot)`,
      sourceUrl: `https://www.reddit.com/r/${subreddit}`,
      publishedAt: post.created_utc ? new Date(post.created_utc * 1000) : null,
    }))
}
