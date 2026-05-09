import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendSMS, SMS_TEMPLATES } from '@/lib/sms/service'
import { subDays } from 'date-fns'

const NUDGE_COOLDOWN_DAYS = 7

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
    const sevenDaysAgo = subDays(now, 7).toISOString()
    const cooldownCutoff = subDays(now, NUDGE_COOLDOWN_DAYS).toISOString()

    // Free users who exist (subscription_tier = 'free' or no subscription)
    const { data: freeProfiles, error } = await supabase
      .from('profiles')
      .select('id, phone_number')
      .in('subscription_tier', ['free'])
      .eq('subscription_status', 'inactive')

    if (error) throw error
    if (!freeProfiles || freeProfiles.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'No free users found' })
    }

    let sent = 0
    let skipped = 0

    for (const profile of freeProfiles) {
      // Check they've logged at least once in the last 7 days (engaged)
      const { data: recentLogs } = await supabase
        .from('habit_logs')
        .select('id')
        .eq('user_id', profile.id)
        .gte('logged_at', sevenDaysAgo)
        .limit(1)

      if (!recentLogs || recentLogs.length === 0) {
        skipped++
        continue
      }

      // Check they haven't been nudged in the last 7 days
      const { data: recentNudge } = await supabase
        .from('sms_messages')
        .select('id')
        .eq('user_id', profile.id)
        .eq('direction', 'outbound')
        .ilike('message_body', '%/upgrade%')
        .gte('created_at', cooldownCutoff)
        .limit(1)

      if (recentNudge && recentNudge.length > 0) {
        skipped++
        continue
      }

      const result = await sendSMS({
        to: profile.phone_number,
        message: SMS_TEMPLATES.UPGRADE(),
        userId: profile.id,
      })

      if (result.success) {
        sent++
      }
    }

    console.log(`[Nudge] Sent ${sent} upgrade nudges, skipped ${skipped}`)

    return NextResponse.json({
      success: true,
      sent,
      skipped,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error('[Nudge] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send nudges' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
