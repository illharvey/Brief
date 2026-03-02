import { NextRequest, NextResponse } from 'next/server'
import { ingestForUser } from '@/lib/ingestion'

/**
 * POST /api/dev/ingest
 *
 * Dev-only manual trigger for the content ingestion pipeline.
 * Returns the IngestionResult JSON so you can inspect fetched/inserted/skipped/errors.
 *
 * Usage:
 *   curl -X POST http://localhost:3000/api/dev/ingest \
 *     -H "Content-Type: application/json" \
 *     -d '{"userId": "<your-user-id>"}'
 *
 * Phase 5 will call ingestForUser() directly from the cron scheduler.
 * This route is intentionally disabled in production.
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Dev route not available in production' },
      { status: 403 }
    )
  }

  let body: { userId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { userId } = body
  if (!userId || typeof userId !== 'string') {
    return NextResponse.json(
      { error: 'userId is required (string)' },
      { status: 400 }
    )
  }

  const result = await ingestForUser(userId)
  return NextResponse.json(result)
}
