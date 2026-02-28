import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// Sliding window: 5 attempts per 30 seconds per identifier
// Identifier will be "login:{email}" or "login:{ip}" in the action
export const loginRatelimit = new Ratelimit({
  redis: Redis.fromEnv(), // reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
  limiter: Ratelimit.slidingWindow(5, "30 s"),
  analytics: false, // disable analytics writes to keep free tier headroom
  prefix: "brief:ratelimit", // namespace to avoid collisions
})
