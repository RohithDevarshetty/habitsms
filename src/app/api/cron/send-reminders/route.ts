import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendSMS, SMS_TEMPLATES } from '@/lib/sms/service'
import { WHATSAPP_TEMPLATES } from '@/lib/meta/templates'
import type { MessageChannel } from '@/lib/twilio/client'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

// Build the reminder body + matching WhatsApp template for a habit.
// The template is only attached for WhatsApp, where proactive sends land
// outside the 24-hour window and must use a pre-approved template.
function buildReminder(
  habit: { name: string; response_type: string; response_unit: string | null },
  channel: MessageChannel
) {
  const isBoolean = habit.response_type === 'boolean'
  const unit = habit.response_unit || 'units'
  const message = isBoolean
    ? SMS_TEMPLATES.REMINDER_BOOLEAN(habit.name)
    : SMS_TEMPLATES.REMINDER_NUMBER(unit, habit.name)
  const template =
    channel === 'whatsapp'
      ? isBoolean
        ? WHATSAPP_TEMPLATES.reminderBoolean(habit.name)
        : WHATSAPP_TEMPLATES.reminderNumber(unit, habit.name)
      : undefined
  return { message, template }
}

// Verify cron secret to prevent unauthorized access
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
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()
    const now = new Date()
    const currentHour = format(now, 'HH')
    const currentMinute = format(now, 'mm')
    const currentTime = `${currentHour}:${currentMinute}`

    console.log(`[Cron] Checking reminders for ${currentTime}`)

    // Get all active habits with reminders enabled
    const { data: habits, error } = await supabase
      .from('habits')
      .select(`
        id,
        name,
        user_id,
        reminder_time,
        response_type,
        response_unit,
        profiles!inner(phone_number, timezone, preferred_channel)
      `)
      .eq('is_active', true)
      .eq('reminder_enabled', true)

    if (error) throw error

    let sentCount = 0
    let errorCount = 0

    // Process each habit
    for (const habit of habits || []) {
      try {
        const profile = Array.isArray(habit.profiles) ? habit.profiles[0] : habit.profiles

        if (!profile) continue

        // Convert current UTC time to user's timezone
        const userTime = toZonedTime(now, profile.timezone)
        const userCurrentTime = format(userTime, 'HH:mm')

        // reminder_time is stored as HH:MM:SS by PostgreSQL — compare only HH:MM
        const habitTime = (habit.reminder_time as string).substring(0, 5)
        if (userCurrentTime === habitTime) {
          // Check if reminder was already sent today
          const today = format(userTime, 'yyyy-MM-dd')
          const { data: todayReminder } = await supabase
            .from('sms_messages')
            .select('id')
            .eq('user_id', habit.user_id)
            .eq('habit_id', habit.id)
            .eq('direction', 'outbound')
            .gte('created_at', `${today}T00:00:00`)
            .lte('created_at', `${today}T23:59:59`)
            .limit(1)

          if (todayReminder && todayReminder.length > 0) {
            console.log(`[Cron] Already sent reminder for habit ${habit.id} today`)
            continue
          }

          // Send reminder on the user's preferred channel
          const channel: MessageChannel =
            profile.preferred_channel === 'whatsapp' ? 'whatsapp' : 'sms'
          const { message, template } = buildReminder(habit, channel)

          const result = await sendSMS({
            to: profile.phone_number,
            message,
            userId: habit.user_id,
            habitId: habit.id,
            channel,
            template,
          })

          if (result.success) {
            sentCount++
            console.log(`[Cron] Sent reminder for habit ${habit.id} to ${profile.phone_number}`)
          } else {
            errorCount++
            console.error(`[Cron] Failed to send reminder for habit ${habit.id}:`, result.error)
          }
        }
      } catch (habitError) {
        errorCount++
        console.error(`[Cron] Error processing habit ${habit.id}:`, habitError)
      }
    }

    // Process snoozed reminders from scheduled_tasks
    const { data: snoozedTasks } = await supabase
      .from('scheduled_tasks')
      .select(`
        id,
        user_id,
        habit_id,
        habits!inner(name, response_type, response_unit, profiles!inner(phone_number, timezone, preferred_channel))
      `)
      .eq('task_type', 'send_reminder')
      .eq('status', 'pending')
      .lte('scheduled_for', now.toISOString())

    for (const task of snoozedTasks || []) {
      try {
        const habit = task.habits as unknown as {
          name: string
          response_type: string
          response_unit: string
          profiles: { phone_number: string; timezone: string; preferred_channel: string }
        }
        const profile = Array.isArray(habit.profiles) ? habit.profiles[0] : habit.profiles

        if (!profile) continue

        const channel: MessageChannel =
          profile.preferred_channel === 'whatsapp' ? 'whatsapp' : 'sms'
        const { message, template } = buildReminder(habit, channel)

        const result = await sendSMS({
          to: profile.phone_number,
          message,
          userId: task.user_id,
          habitId: task.habit_id,
          channel,
          template,
        })

        await supabase
          .from('scheduled_tasks')
          .update({ status: result.success ? 'completed' : 'failed' })
          .eq('id', task.id)

        if (result.success) sentCount++
        else errorCount++
      } catch (taskError) {
        errorCount++
        await supabase.from('scheduled_tasks').update({ status: 'failed' }).eq('id', task.id)
        console.error(`[Cron] Error processing snoozed task ${task.id}:`, taskError)
      }
    }

    console.log(`[Cron] Sent ${sentCount} reminders, ${errorCount} errors`)

    return NextResponse.json({
      success: true,
      sent: sentCount,
      errors: errorCount,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error('[Cron] Fatal error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to send reminders',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// Allow POST as well for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}
