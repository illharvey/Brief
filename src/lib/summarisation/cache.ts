// src/lib/summarisation/cache.ts
// Global per-article summary cache backed by Upstash Redis.
// Cache key: "brief:summary:{normalisedUrl}" — global across all users.
// TTL: 7 days. One cached summary per article URL.

import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv() // reads UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60  // 7 days

function cacheKey(normalisedUrl: string): string {
  return `brief:summary:${normalisedUrl}`
}

export async function getSummary(normalisedUrl: string): Promise<string | null> {
  return redis.get<string>(cacheKey(normalisedUrl))
}

export async function setSummary(normalisedUrl: string, summary: string): Promise<void> {
  await redis.set(cacheKey(normalisedUrl), summary, { ex: CACHE_TTL_SECONDS })
}
