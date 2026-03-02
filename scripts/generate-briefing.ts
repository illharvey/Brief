// scripts/generate-briefing.ts
// Manual pipeline test. Usage: npx tsx scripts/generate-briefing.ts <userId>
// Requires ANTHROPIC_API_KEY, DATABASE_URL, UPSTASH_REDIS_REST_URL,
// UPSTASH_REDIS_REST_TOKEN in environment (reads from .env.local via tsx).

import 'dotenv/config'
import { generateBriefingForUser } from '../src/lib/summarisation'

const userId = process.argv[2]
if (!userId) {
  console.error('Usage: npx tsx scripts/generate-briefing.ts <userId>')
  process.exit(1)
}

console.log(`Generating briefing for user: ${userId}`)

generateBriefingForUser(userId)
  .then(result => {
    console.log(`\n=== BRIEFING GENERATED ===`)
    console.log(`ID: ${result.briefingId}`)
    console.log(`Topics: ${result.topicCount}`)
    console.log(`Items: ${result.itemCount}`)
    console.log(`Partial failure: ${result.partialFailure}`)
    if (result.failedTopics.length > 0) {
      console.log(`Failed topics: ${result.failedTopics.join(', ')}`)
    }
    console.log(`\n${result.content}`)
    process.exit(0)
  })
  .catch(err => {
    console.error('Briefing generation failed:', err)
    process.exit(1)
  })
