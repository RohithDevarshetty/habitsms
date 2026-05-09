import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendSMS } from '@/lib/sms/service'
import { format, startOfDay } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()
    const now = new Date()

    // Get all active users with their profiles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, phone_number, timezone')
      .not('phone_number', 'is', null)
      .neq('phone_number', '')

    if (error) throw error
    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    let sent = 0
    let skipped = 0

    for (const profile of profiles) {
      const tz = profile.timezone || 'UTC'
      const userNow = toZonedTime(now, tz)
      const userHour = userNow.getHours()

      // Only send between 8 PM and 9 PM local time (window = 1 hour to avoid duplicates)
      if (userHour !== 20) {
        skipped++
        continue
      }

      const todayStart = startOfDay(userNow)
      const todayStartUTC = new Date(todayStart.getTime() - todayStart.getTimezoneOffset() * 60000).toISOString()
      const todayStr = format(userNow, 'yyyy-MM-dd')

      // Check already sent recap today to avoid duplicates
      const { data: alreadySent } = await supabase
        .from('sms_messages')
        .select('id')
        .eq('user_id', profile.id)
        .eq('direction', 'outbound')
        .ilike('message_body', '%end of day%')
        .gte('created_at', `${todayStr}T00:00:00`)
        .limit(1)

      if (alreadySent && alreadySent.length > 0) {
        skipped++
        continue
      }

      // Get active habits
      const { data: habits } = await supabase
        .from('habits')
        .select('id, name, streak_count, response_type, response_unit')
        .eq('user_id', profile.id)
        .eq('is_active', true)
        .eq('reminder_enabled', true)

      if (!habits || habits.length === 0) {
        skipped++
        continue
      }

      // Get today's logs
      const { data: todayLogs } = await supabase
        .from('habit_logs')
        .select('habit_id, completed, response_value')
        .eq('user_id', profile.id)
        .gte('logged_at', todayStartUTC)

      const logMap: Record<string, { completed: boolean; value: string | null }> = {}
      for (const log of todayLogs || []) {
        logMap[log.habit_id] = { completed: log.completed, value: log.response_value }
      }

      // Get 30-day completion % per habit
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const { data: recentLogs } = await supabase
        .from('habit_logs')
        .select('habit_id, completed')
        .eq('user_id', profile.id)
        .gte('logged_at', thirtyDaysAgo)

      const consistencyMap: Record<string, number> = {}
      const countMap: Record<string, { total: number; done: number }> = {}
      for (const log of recentLogs || []) {
        if (!countMap[log.habit_id]) countMap[log.habit_id] = { total: 0, done: 0 }
        countMap[log.habit_id].total++
        if (log.completed) countMap[log.habit_id].done++
      }
      for (const [id, counts] of Object.entries(countMap)) {
        consistencyMap[id] = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0
      }

      // Build recap message
      const lines: string[] = ['End of day recap:']
      let anyLogged = false

      for (const habit of habits) {
        const log = logMap[habit.id]
        const pct = consistencyMap[habit.id] ?? 0
        const streak = habit.streak_count

        if (log?.completed) {
          anyLogged = true
          const valueStr = log.value && log.value !== 'Y' && log.value !== 'GRACE'
            ? ` (${log.value}${habit.response_unit ? ' ' + habit.response_unit : ''})`
            : ''
          lines.push(`${habit.name} logged${valueStr} ✓ 🔥 Streak: ${streak} days 📊 ${pct}% consistency`)
        } else {
          lines.push(`${habit.name} ✗ not logged today`)
        }
      }

      if (!anyLogged) {
        lines.push('')
        lines.push('No habits logged today. Reply Y to log your first one!')
      } else {
        lines.push('')
        lines.push('Keep the streak going!')
      }

      const message = lines.join('\n')
      const result = await sendSMS({
        to: profile.phone_number,
        message,
        userId: profile.id,
      })

      if (result.success) sent++
      else skipped++
    }

    console.log(`[Daily recap] Sent ${sent}, skipped ${skipped}`)
    return NextResponse.json({ success: true, sent, skipped, timestamp: now.toISOString() })
  } catch (error) {
    console.error('[Daily recap] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send daily recaps' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
