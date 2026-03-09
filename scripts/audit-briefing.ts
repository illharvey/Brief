// scripts/audit-briefing.ts
// Admin script: generates a Markdown audit document for a specific briefing.
// Shows each AI claim alongside its sourceSnapshot and article URL.
// Only includes items where fromCache = false (real LLM calls, not cache hits).
//
// Usage: npx tsx scripts/audit-briefing.ts <briefingId>
// Requires DATABASE_URL in environment (reads from .env.local via tsx).
// Output can be piped to a file: npx tsx scripts/audit-briefing.ts <id> > audit.md

import 'dotenv/config'
import { eq, asc } from 'drizzle-orm'
import { db } from '../src/lib/db/client'
import { briefingItems, articles } from '../src/lib/db/schema'

const MAX_SNAPSHOT_LENGTH = 500

async function main() {
  const briefingId = process.argv[2]
  if (!briefingId) {
    console.error('Usage: npx tsx scripts/audit-briefing.ts <briefingId>')
    process.exit(1)
  }

  const rows = await db
    .select({
      id: briefingItems.id,
      topic: briefingItems.topic,
      summary: briefingItems.summary,
      sourceSnapshot: briefingItems.sourceSnapshot,
      fromCache: briefingItems.fromCache,
      articleUrl: articles.url,
    })
    .from(briefingItems)
    .leftJoin(articles, eq(briefingItems.articleId, articles.id))
    .where(eq(briefingItems.briefingId, briefingId))
    .orderBy(asc(briefingItems.topic))

  // Filter to only non-cache items
  const auditRows = rows.filter(r => r.fromCache === false)

  if (auditRows.length === 0) {
    console.log(
      `No non-cached items found for briefing ${briefingId}. ` +
      `All items may be cache hits — clear Redis cache and re-run generate-briefing.ts to get fresh sourceSnapshots.`
    )
    return
  }

  // Group by topic
  const byTopic = new Map<string, typeof auditRows>()
  for (const row of auditRows) {
    const topic = row.topic
    if (!byTopic.has(topic)) {
      byTopic.set(topic, [])
    }
    byTopic.get(topic)!.push(row)
  }

  // Print Markdown document
  const timestamp = new Date().toISOString()
  const lines: string[] = []

  lines.push(`# AI Audit: Briefing ${briefingId}`)
  lines.push(`Generated: ${timestamp}`)
  lines.push(`Non-cached items: ${auditRows.length}`)
  lines.push('')
  lines.push('---')
  lines.push('')

  for (const [topic, items] of byTopic) {
    lines.push(`## Topic: ${topic}`)
    lines.push('')

    items.forEach((item, index) => {
      const itemNumber = index + 1
      const snapshot = item.sourceSnapshot ?? ''
      const truncatedSnapshot =
        snapshot.length > MAX_SNAPSHOT_LENGTH
          ? snapshot.slice(0, MAX_SNAPSHOT_LENGTH) + '... [truncated]'
          : snapshot
      const articleUrl = item.articleUrl ?? '(URL not available)'

      lines.push(`### Item ${itemNumber}`)
      lines.push(`**AI summary:** ${item.summary}`)
      lines.push('')
      lines.push('**Source snapshot:**')
      lines.push(`> ${truncatedSnapshot}`)
      lines.push('')
      lines.push(`**Article URL:** ${articleUrl}`)
      lines.push('')
      lines.push('**Verdict:** [ ] PASS  [ ] FAIL  [ ] UNVERIFIABLE')
      lines.push('')
      lines.push('---')
      lines.push('')
    })
  }

  lines.push(`<!-- ${auditRows.length} items to audit -->`)

  console.log(lines.join('\n'))
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
