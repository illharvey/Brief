// scripts/briefing-count.ts
// Admin script: shows sent briefing counts grouped by delivery date.
// Usage: npx tsx scripts/briefing-count.ts [--days N]  (default N=7)
// Requires DATABASE_URL in environment (reads from .env.local via tsx).

import 'dotenv/config'
import { desc, eq, gte, sql } from 'drizzle-orm'
import { db } from '../src/lib/db/client'
import { deliveries } from '../src/lib/db/schema'

async function main() {
  // Parse --days argument
  const daysArgIndex = process.argv.indexOf('--days')
  let days = 7
  if (daysArgIndex !== -1 && process.argv[daysArgIndex + 1]) {
    const parsed = parseInt(process.argv[daysArgIndex + 1], 10)
    if (!isNaN(parsed) && parsed > 0) {
      days = parsed
    }
  }

  // Compute the since date as "YYYY-MM-DD" string using en-CA locale
  const sinceDate = new Date(Date.now() - days * 86400000)
  const sinceStr = sinceDate.toLocaleDateString('en-CA') // "YYYY-MM-DD"

  const rows = await db
    .select({
      deliveryDate: deliveries.deliveryDate,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(deliveries)
    .where(
      sql`${deliveries.status} = 'sent' and ${deliveries.deliveryDate} >= ${sinceStr}`
    )
    .groupBy(deliveries.deliveryDate)
    .orderBy(desc(deliveries.deliveryDate))

  if (rows.length === 0) {
    console.log(`No briefings sent in the last ${days} days.`)
    return
  }

  console.log(`Sent briefings (last ${days} days, since ${sinceStr}):\n`)
  console.log('Date'.padEnd(14) + 'Sent')
  console.log('-'.repeat(20))
  for (const row of rows) {
    console.log(`${row.deliveryDate.padEnd(14)}${row.count} sent`)
  }

  const total = rows.reduce((sum, r) => sum + r.count, 0)
  console.log('-'.repeat(20))
  console.log(`Total: ${total} briefings in last ${days} days`)
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
