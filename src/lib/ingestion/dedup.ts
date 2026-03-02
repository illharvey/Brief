import { createHash } from 'node:crypto'

/**
 * Compute SHA-256 of "title::url" as a secondary dedup key.
 * Catches articles republished under different URLs with identical title.
 */
export function contentHash(title: string, url: string): string {
  return createHash('sha256')
    .update(`${title.toLowerCase().trim()}::${url.trim()}`)
    .digest('hex')
}

/**
 * Normalise a URL before storing as the primary dedup key.
 * Strips UTM tracking params and URL fragments so the same article
 * fetched from different referrers maps to the same URL.
 */
export function normaliseUrl(url: string): string {
  try {
    const u = new URL(url)
    u.hash = ''
    u.searchParams.delete('utm_source')
    u.searchParams.delete('utm_medium')
    u.searchParams.delete('utm_campaign')
    u.searchParams.delete('utm_term')
    u.searchParams.delete('utm_content')
    return u.toString()
  } catch {
    return url.trim()
  }
}
