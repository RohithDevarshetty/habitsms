import { NextRequest, NextResponse } from 'next/server'
import { resetMissedStreaks } from '@/lib/habits/streaks'

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('CRON_SECRET not configured')
    return false
  }

  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('[Streak Calculation] Starting daily streak reset check')

    await resetMissedStreaks()

    console.log('[Streak Calculation] Completed successfully')

    return NextResponse.json({
      success: true,
      message: 'Streak calculations completed',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Streak Calculation] Fatal error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to calculate streaks',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
