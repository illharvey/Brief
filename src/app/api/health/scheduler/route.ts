import { db } from '@/lib/db/client'
import { deliveries } from '@/lib/db/schema'
import { desc } from 'drizzle-orm'

export async function GET() {
  try {
    const latest = await db.query.deliveries.findFirst({
      orderBy: [desc(deliveries.createdAt)],
      columns: { createdAt: true, status: true },
    })

    return Response.json({
      ok: true,
      lastRun: latest?.createdAt ?? null,
      lastStatus: latest?.status ?? null,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ ok: false, error: message, timestamp: new Date().toISOString() }, { status: 500 })
  }
}
