/**
 * Shared handlers for inbound SMS / WhatsApp commands.
 *
 * Both the Twilio and Meta webhooks parse an inbound message into a
 * `ParsedSMSResponse` and then dispatch here. Keeping the logic in one place
 * means a command behaves identically regardless of which channel it arrived
 * on — the only per-channel difference is the `channel` argument, which routes
 * the reply back over the same channel.
 */
import { sendSMS, SMS_TEMPLATES } from './service'
import { validateNumericResponse } from './parser'
import type { ParsedSMSResponse } from './parser'
import type { MessageChannel } from '@/lib/twilio/client'
import { createServiceClient } from '@/lib/supabase/server'
import { calculateAndUpdateStreak } from '@/lib/habits/streaks'
import { findOldestPendingHabit } from './pending-queue'
import { createCheckoutSession } from '@/lib/payments/dodo'
import { subMinutes } from 'date-fns'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://habitsms.com'

/** Route a parsed inbound command to its handler, replying over `channel`. */
export async function handleInboundCommand(
  parsed: ParsedSMSResponse,
  userId: string,
  phoneNumber: string,
  channel: MessageChannel
): Promise<void> {
  switch (parsed.type) {
    case 'help':
      await sendSMS({ to: phoneNumber, message: SMS_TEMPLATES.HELP(), userId, channel })
      break
    case 'stats':
      await handleStatsRequest(userId, phoneNumber, channel)
      break
    case 'resume':
      await handleResumeRequest(userId, phoneNumber, channel)
      break
    case 'pause':
      await handlePauseRequest(userId, phoneNumber, channel)
      break
    case 'snooze':
      await handleSnoozeRequest(userId, phoneNumber, channel)
      break
    case 'grace':
      await handleGraceRequest(userId, phoneNumber, channel)
      break
    case 'invite':
      await handleInviteRequest(userId, phoneNumber, channel)
      break
    case 'upgrade':
      await sendSMS({ to: phoneNumber, message: SMS_TEMPLATES.UPGRADE(), userId, channel })
      break
    case 'plan_select':
      await handlePlanSelect(userId, phoneNumber, parsed.planTier!, channel)
      break
    case 'channel':
      await handleChannelSwitch(userId, phoneNumber, parsed.channelPref!, channel)
      break
    case 'completed':
    case 'skipped':
    case 'number':
      await handleHabitResponse(userId, phoneNumber, parsed, channel)
      break
    case 'unknown':
      await sendSMS({ to: phoneNumber, message: SMS_TEMPLATES.HELP(), userId, channel })
      break
  }
}

async function handleHabitResponse(
  userId: string,
  phoneNumber: string,
  parsed: ParsedSMSResponse,
  channel: MessageChannel
) {
  const supabase = createServiceClient()
  const habit = await findOldestPendingHabit(userId)

  if (!habit) {
    await sendSMS({
      to: phoneNumber,
      message: 'No pending habits found for today. Check the dashboard to manage your habits.',
      userId,
      channel,
    })
    return
  }

  // For number habits: accept Y/yes as "completed" without a specific value.
  // Only reject if it's truly unknown (not a number, not Y/N).
  if (
    habit.response_type === 'number' &&
    parsed.type !== 'number' &&
    parsed.type !== 'skipped' &&
    parsed.type !== 'completed'
  ) {
    await sendSMS({
      to: phoneNumber,
      message: `How many ${habit.response_unit || 'units'} of ${habit.name}? Reply with a number, Y to mark done, or N to skip.`,
      userId,
      habitId: habit.id,
      channel,
    })
    return
  }

  if (parsed.type === 'number' && parsed.value !== undefined) {
    const validation = validateNumericResponse(parsed.value, habit.response_unit || '')
    if (!validation.valid) {
      await sendSMS({
        to: phoneNumber,
        message: validation.error || 'Invalid value',
        userId,
        habitId: habit.id,
        channel,
      })
      return
    }
  }

  const completed = parsed.type === 'completed' || parsed.type === 'number'
  const responseValue =
    parsed.type === 'number' ? parsed.value?.toString() : parsed.type === 'completed' ? 'Y' : 'N'

  await supabase.from('habit_logs').insert({
    habit_id: habit.id,
    user_id: userId,
    completed,
    response_value: responseValue,
    source: channel,
    ...(parsed.note ? { notes: parsed.note } : {}),
  })

  const streak = await calculateAndUpdateStreak(habit.id)

  if (completed) {
    let message = SMS_TEMPLATES.CONFIRMATION(habit.name, streak)
    if (streak === 7) message = SMS_TEMPLATES.MILESTONE_7(habit.name)
    else if (streak === 30) message = SMS_TEMPLATES.MILESTONE_30(habit.name)
    else if (streak === 100) message = SMS_TEMPLATES.MILESTONE_100(habit.name)
    await sendSMS({ to: phoneNumber, message, userId, habitId: habit.id, channel })
  } else {
    await sendSMS({
      to: phoneNumber,
      message: `Got it! ${habit.name} marked as skipped for today.`,
      userId,
      habitId: habit.id,
      channel,
    })
  }
}

async function handleStatsRequest(userId: string, phoneNumber: string, channel: MessageChannel) {
  const supabase = createServiceClient()
  const { data: habits } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (!habits || habits.length === 0) {
    await sendSMS({
      to: phoneNumber,
      message: 'No active habits yet. Create your first habit to get started!',
      userId,
      channel,
    })
    return
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recentLogs } = await supabase
    .from('habit_logs')
    .select('habit_id, completed')
    .eq('user_id', userId)
    .gte('logged_at', thirtyDaysAgo)

  const logsByHabit: Record<string, { total: number; completed: number }> = {}
  for (const log of recentLogs || []) {
    if (!logsByHabit[log.habit_id]) logsByHabit[log.habit_id] = { total: 0, completed: 0 }
    logsByHabit[log.habit_id].total++
    if (log.completed) logsByHabit[log.habit_id].completed++
  }

  let stats = 'Your Stats (30d):\n\n'
  habits.forEach((habit) => {
    const logs = logsByHabit[habit.id]
    const pct = logs && logs.total > 0 ? Math.round((logs.completed / logs.total) * 100) : 0
    stats += `${habit.name}: ${habit.streak_count}d streak | Best: ${habit.longest_streak}d | ${pct}% done\n\n`
  })

  await sendSMS({ to: phoneNumber, message: stats.trim(), userId, channel })
}

async function handlePauseRequest(userId: string, phoneNumber: string, channel: MessageChannel) {
  const supabase = createServiceClient()
  await supabase.from('habits').update({ reminder_enabled: false }).eq('user_id', userId)
  await sendSMS({
    to: phoneNumber,
    message: 'Reminders paused. Text RESUME when you want them back.',
    userId,
    channel,
  })
}

async function handleResumeRequest(userId: string, phoneNumber: string, channel: MessageChannel) {
  const supabase = createServiceClient()
  await supabase.from('habits').update({ reminder_enabled: true }).eq('user_id', userId)
  await sendSMS({ to: phoneNumber, message: SMS_TEMPLATES.RESUME(), userId, channel })
}

async function handleInviteRequest(userId: string, phoneNumber: string, channel: MessageChannel) {
  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('referral_code')
    .eq('id', userId)
    .single()

  const code = profile?.referral_code
  if (!code) {
    await sendSMS({
      to: phoneNumber,
      message: 'Visit habitsms.com/settings to find your referral link.',
      userId,
      channel,
    })
    return
  }

  await sendSMS({
    to: phoneNumber,
    message: `Share this link and both of you get 1 free month when they subscribe: ${APP_URL}/signup?ref=${code}`,
    userId,
    channel,
  })
}

async function handleGraceRequest(userId: string, phoneNumber: string, channel: MessageChannel) {
  const supabase = createServiceClient()

  // Check if user has used their grace day this month
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { data: profile } = await supabase
    .from('profiles')
    .select('last_grace_day_used')
    .eq('id', userId)
    .single()

  const lastGrace = profile?.last_grace_day_used
  const usedThisMonth = lastGrace && new Date(lastGrace) >= new Date(monthStart)

  if (usedThisMonth) {
    await sendSMS({
      to: phoneNumber,
      message: 'You already used your grace day this month. Keep going — every day counts!',
      userId,
      channel,
    })
    return
  }

  // Restore streaks broken yesterday
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const { data: habits } = await supabase
    .from('habits')
    .select('id, name, streak_count')
    .eq('user_id', userId)
    .eq('is_active', true)

  let restored = 0
  for (const habit of habits || []) {
    const { data: yesterdayLog } = await supabase
      .from('habit_logs')
      .select('id')
      .eq('habit_id', habit.id)
      .gte('logged_at', `${yesterdayStr}T00:00:00`)
      .lte('logged_at', `${yesterdayStr}T23:59:59`)
      .limit(1)

    // If they didn't log yesterday and the streak reset to 0, restore it
    if ((!yesterdayLog || yesterdayLog.length === 0) && habit.streak_count === 0) {
      await supabase.from('habit_logs').insert({
        habit_id: habit.id,
        user_id: userId,
        completed: true,
        response_value: 'GRACE',
        source: channel,
        logged_at: `${yesterdayStr}T12:00:00Z`,
      })
      await supabase.from('habits').update({ streak_count: 1 }).eq('id', habit.id)
      restored++
    }
  }

  if (restored === 0) {
    await sendSMS({
      to: phoneNumber,
      message: 'No broken streaks to restore right now. Keep going!',
      userId,
      channel,
    })
    return
  }

  await supabase.from('profiles').update({ last_grace_day_used: now.toISOString() }).eq('id', userId)

  await sendSMS({
    to: phoneNumber,
    message: `Grace day applied! ${restored} streak${restored > 1 ? 's' : ''} restored. 1 grace day used this month. Keep the momentum!`,
    userId,
    channel,
  })
}

async function handleSnoozeRequest(userId: string, phoneNumber: string, channel: MessageChannel) {
  const supabase = createServiceClient()
  const habit = await findOldestPendingHabit(userId)

  if (!habit) {
    await sendSMS({
      to: phoneNumber,
      message: 'No pending habits to snooze right now.',
      userId,
      channel,
    })
    return
  }

  // Check if already snoozed for this habit to avoid stacking reminders
  const { data: existingSnooze } = await supabase
    .from('scheduled_tasks')
    .select('id')
    .eq('user_id', userId)
    .eq('habit_id', habit.id)
    .eq('task_type', 'send_reminder')
    .eq('status', 'pending')
    .limit(1)

  if (!existingSnooze || existingSnooze.length === 0) {
    await supabase.from('scheduled_tasks').insert({
      task_type: 'send_reminder',
      user_id: userId,
      habit_id: habit.id,
      scheduled_for: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      status: 'pending',
    })
  }

  await sendSMS({ to: phoneNumber, message: SMS_TEMPLATES.SNOOZE_CONFIRMED(habit.name), userId, channel })
}

async function handleChannelSwitch(
  userId: string,
  phoneNumber: string,
  pref: 'sms' | 'whatsapp',
  channel: MessageChannel
) {
  const supabase = createServiceClient()
  await supabase.from('profiles').update({ preferred_channel: pref }).eq('id', userId)
  const dest = pref === 'whatsapp' ? 'WhatsApp' : 'SMS'
  const back = pref === 'whatsapp' ? 'SMS' : 'WHATSAPP'
  await sendSMS({
    to: phoneNumber,
    message: `Done! You will now get HabitSMS reminders on ${dest}. Reply ${back} to switch back.`,
    userId,
    channel,
  })
}

async function handlePlanSelect(
  userId: string,
  phoneNumber: string,
  tier: 'starter' | 'pro',
  channel: MessageChannel
) {
  const supabase = createServiceClient()

  // Only generate checkout if the user recently asked for upgrade options (within 30 min)
  const cutoff = subMinutes(new Date(), 30).toISOString()
  const { data: recentUpgrade } = await supabase
    .from('sms_messages')
    .select('id')
    .eq('user_id', userId)
    .eq('direction', 'outbound')
    .ilike('message_body', '%Reply STARTER or PRO%')
    .gte('created_at', cutoff)
    .limit(1)

  if (!recentUpgrade || recentUpgrade.length === 0) {
    // Not in an upgrade flow — treat as unknown
    await sendSMS({ to: phoneNumber, message: SMS_TEMPLATES.HELP(), userId, channel })
    return
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.admin.getUserById(userId)

    const session = await createCheckoutSession({
      userId,
      email: user?.email || '',
      tier,
      successUrl: `${APP_URL}/dashboard?payment=success`,
      cancelUrl: `${APP_URL}/upgrade`,
    })

    await sendSMS({
      to: phoneNumber,
      message: SMS_TEMPLATES.PLAN_CHECKOUT(tier, session.checkout_url ?? `${APP_URL}/upgrade`),
      userId,
      channel,
    })
  } catch (error) {
    console.error('[Plan select] Checkout error:', error)
    await sendSMS({
      to: phoneNumber,
      message: `Something went wrong generating your checkout link. Try again or visit ${APP_URL}/upgrade`,
      userId,
      channel,
    })
  }
}
