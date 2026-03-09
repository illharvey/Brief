// Usage: npx tsx scripts/enrich-articles.ts <userId>
import 'dotenv/config'
import { enrichForUser } from '../src/lib/ingestion/enrich'

const userId = process.argv[2]
if (!userId) {
  console.error('Usage: npx tsx scripts/enrich-articles.ts <userId>')
  process.exit(1)
}

enrichForUser(userId).then(r => {
  console.log(r)
  process.exit(0)
})
