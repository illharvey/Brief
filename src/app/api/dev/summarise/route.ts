// src/app/api/dev/summarise/route.ts
// Dev-only endpoint to trigger the summarisation pipeline for a given user.
// Returns 403 in production. Not intended for Phase 5 (Phase 5 calls the function directly).

import { NextRequest, NextResponse } from 'next/server'
import { generateBriefingForUser } from '@/lib/summarisation'

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const { userId } = await req.json()
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const result = await generateBriefingForUser(userId)

    return NextResponse.json({
      briefingId: result.briefingId,
      topicCount: result.topicCount,
      itemCount: result.itemCount,
      partialFailure: result.partialFailure,
      failedTopics: result.failedTopics,
      content: result.content,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
