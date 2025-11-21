import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendSMS, SMS_TEMPLATES } from '@/lib/twilio/sms'
import { subDays, startOfWeek, endOfWeek, format } from 'date-fns'

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
    const supabase = createServiceClient()
    const now = new Date()

    // Get the past week's date range
    const weekStart = startOfWeek(subDays(now, 7))
    const weekEnd = endOfWeek(subDays(now, 7))

    console.log(`[Weekly Summary] Processing for week ${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`)

    // Get all active users with their profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, phone_number')
      .neq('subscription_status', 'cancelled')

    if (!profiles) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    let sentCount = 0
    let errorCount = 0

    for (const profile of profiles) {
      try {
        // Get user's habits
        const { data: habits } = await supabase
          .from('habits')
          .select('id, name, streak_count')
          .eq('user_id', profile.id)
          .eq('is_active', true)

        if (!habits || habits.length === 0) continue

        // Get completed logs for the past week
        const { data: logs } = await supabase
          .from('habit_logs')
          .select('id')
          .eq('user_id', profile.id)
          .eq('completed', true)
          .gte('logged_at', weekStart.toISOString())
          .lte('logged_at', weekEnd.toISOString())

        const completedCount = logs?.length || 0
        const longestStreak = Math.max(...habits.map(h => h.streak_count), 0)

        // Only send if user had some activity
        if (completedCount > 0) {
          const message = SMS_TEMPLATES.WEEKLY_SUMMARY(completedCount, longestStreak)

          const result = await sendSMS({
            to: profile.phone_number,
            message,
            userId: profile.id,
          })

          if (result.success) {
            sentCount++
            console.log(`[Weekly Summary] Sent to user ${profile.id}`)
          } else {
            errorCount++
            console.error(`[Weekly Summary] Failed for user ${profile.id}:`, result.error)
          }
        }
      } catch (userError) {
        errorCount++
        console.error(`[Weekly Summary] Error processing user ${profile.id}:`, userError)
      }
    }

    console.log(`[Weekly Summary] Sent ${sentCount} summaries, ${errorCount} errors`)

    return NextResponse.json({
      success: true,
      sent: sentCount,
      errors: errorCount,
      timestamp: now.toISOString(),
    })
  } catch (error: any) {
    console.error('[Weekly Summary] Fatal error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to send summaries',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
