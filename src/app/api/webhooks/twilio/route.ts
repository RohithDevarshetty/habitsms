import { NextRequest, NextResponse } from 'next/server'
import { verifyTwilioWebhook } from '@/lib/twilio/client'
import { sendSMS, SMS_TEMPLATES } from '@/lib/sms/service'
import { parseSMSResponse, validateNumericResponse } from '@/lib/sms/parser'
import type { ParsedSMSResponse } from '@/lib/sms/parser'
import { createServiceClient } from '@/lib/supabase/server'
import { calculateAndUpdateStreak } from '@/lib/habits/streaks'
import { findOldestPendingHabit } from '@/lib/sms/pending-queue'
import { createCheckoutSession } from '@/lib/payments/dodo'
import { isInboundRateLimited } from '@/lib/utils/rate-limit'
import { subMinutes } from 'date-fns'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://habitsms.com'
const MAX_MESSAGE_LENGTH = 500

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const body: Record<string, string> = {}
    formData.forEach((value, key) => { body[key] = value.toString() })

    const isDevMode = process.env.NODE_ENV === 'development' && process.env.SKIP_WEBHOOK_AUTH === 'true'
    if (!isDevMode) {
      const signature = request.headers.get('x-twilio-signature') || ''
      if (!verifyTwilioWebhook(signature, request.url, body)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
      }
    }

    const fromRaw = body.From as string
    const messageBody = (body.Body as string)?.substring(0, MAX_MESSAGE_LENGTH)
    const messageSid = body.MessageSid as string

    const isWhatsApp = fromRaw.startsWith('whatsapp:')
    const rawFrom = fromRaw.replace('whatsapp:', '').trim()
    const from = rawFrom.startsWith('+') ? rawFrom : `+${rawFrom}`
    const channel = isWhatsApp ? 'whatsapp' : 'sms'

    if (!from || !messageBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (await isInboundRateLimited(from)) {
      console.warn(`[Twilio webhook] Rate limit hit for ${from}`)
      return NextResponse.json({ message: 'Too many requests' }, { status: 429 })
    }

    const supabase = createServiceClient()

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone_number', from)
      .single()

    if (profileError || !profile) {
      await supabase.from('sms_messages').insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        phone_number: from,
        message_body: messageBody,
        direction: 'inbound',
        status: 'received',
        provider: 'twilio',
        provider_message_id: messageSid,
      })
      return NextResponse.json({ message: 'User not found' }, { status: 200 })
    }

    await supabase.from('sms_messages').insert({
      user_id: profile.id,
      phone_number: from,
      message_body: messageBody,
      direction: 'inbound',
      status: 'received',
      provider: 'twilio',
      provider_message_id: messageSid,
    })

    const parsed = parseSMSResponse(messageBody)

    switch (parsed.type) {
      case 'help':
        await sendSMS({ to: from, message: SMS_TEMPLATES.HELP(), userId: profile.id, channel })
        break

      case 'stats':
        await handleStatsRequest(profile.id, from, channel)
        break

      case 'resume':
        await handleResumeRequest(profile.id, from, channel)
        break

      case 'pause':
        await handlePauseRequest(profile.id, from, channel)
        break

      case 'snooze':
        await handleSnoozeRequest(profile.id, from, channel)
        break

      case 'grace':
        await handleGraceRequest(profile.id, from, channel)
        break

      case 'invite':
        await handleInviteRequest(profile.id, from, channel)
        break

      case 'upgrade':
        await sendSMS({ to: from, message: SMS_TEMPLATES.UPGRADE(), userId: profile.id, channel })
        break

      case 'plan_select':
        await handlePlanSelect(profile.id, from, parsed.planTier!, channel)
        break

      case 'completed':
      case 'skipped':
      case 'number':
        await handleHabitResponse(profile.id, from, parsed, channel)
        break

      case 'unknown':
        await sendSMS({ to: from, message: SMS_TEMPLATES.HELP(), userId: profile.id, channel })
        break
    }

    return NextResponse.json({ message: 'Success' }, { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleHabitResponse(
  userId: string,
  phoneNumber: string,
  parsed: ParsedSMSResponse,
  channel: 'sms' | 'whatsapp' = 'sms'
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

  // For number habits: accept Y/yes as "completed" without a specific value
  // Only reject if it's truly unknown (not a number, not Y/N)
  if (habit.response_type === 'number' && parsed.type !== 'number' && parsed.type !== 'skipped' && parsed.type !== 'completed') {
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

async function handleStatsRequest(userId: string, phoneNumber: string, channel: 'sms' | 'whatsapp' = 'sms') {
  const supabase = createServiceClient()
  const { data: habits } = await supabase
    .from('habits').select('*').eq('user_id', userId).eq('is_active', true)

  if (!habits || habits.length === 0) {
    await sendSMS({ to: phoneNumber, message: 'No active habits yet. Create your first habit to get started!', userId, channel })
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

async function handlePauseRequest(userId: string, phoneNumber: string, channel: 'sms' | 'whatsapp' = 'sms') {
  const supabase = createServiceClient()
  await supabase.from('habits').update({ reminder_enabled: false }).eq('user_id', userId)
  await sendSMS({
    to: phoneNumber,
    message: 'Reminders paused. Text RESUME when you want them back.',
    userId,
    channel,
  })
}

async function handleResumeRequest(userId: string, phoneNumber: string, channel: 'sms' | 'whatsapp' = 'sms') {
  const supabase = createServiceClient()
  await supabase.from('habits').update({ reminder_enabled: true }).eq('user_id', userId)
  await sendSMS({ to: phoneNumber, message: SMS_TEMPLATES.RESUME(), userId, channel })
}

async function handleInviteRequest(userId: string, phoneNumber: string, channel: 'sms' | 'whatsapp' = 'sms') {
  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('referral_code')
    .eq('id', userId)
    .single()

  const code = profile?.referral_code
  if (!code) {
    await sendSMS({ to: phoneNumber, message: 'Visit habitsms.com/settings to find your referral link.', userId, channel })
    return
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://habitsms.com'
  await sendSMS({
    to: phoneNumber,
    message: `Share this link and both of you get 1 free month when they subscribe: ${appUrl}/signup?ref=${code}`,
    userId,
    channel,
  })
}

async function handleGraceRequest(userId: string, phoneNumber: string, channel: 'sms' | 'whatsapp' = 'sms') {
  const supabase = createServiceClient()

  // Check if user has used grace day this month
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

  // Restore streaks broken yesterday by incrementing streak_count back
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
    // Only restore if they had a streak before (streak was reset to 0 or 1)
    const { data: yesterdayLog } = await supabase
      .from('habit_logs')
      .select('id')
      .eq('habit_id', habit.id)
      .gte('logged_at', `${yesterdayStr}T00:00:00`)
      .lte('logged_at', `${yesterdayStr}T23:59:59`)
      .limit(1)

    // If they didn't log yesterday and streak is 0, restore it
    if (!yesterdayLog || yesterdayLog.length === 0) {
      if (habit.streak_count === 0) {
        // Insert a grace log for yesterday
        await supabase.from('habit_logs').insert({
          habit_id: habit.id,
          user_id: userId,
          completed: true,
          response_value: 'GRACE',
          source: 'sms',
          logged_at: `${yesterdayStr}T12:00:00Z`,
        })
        await supabase.from('habits').update({ streak_count: 1 }).eq('id', habit.id)
        restored++
      }
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

  // Mark grace day used
  await supabase
    .from('profiles')
    .update({ last_grace_day_used: now.toISOString() })
    .eq('id', userId)

  await sendSMS({
    to: phoneNumber,
    message: `Grace day applied! ${restored} streak${restored > 1 ? 's' : ''} restored. 1 grace day used this month. Keep the momentum!`,
    userId,
    channel,
  })
}

async function handleSnoozeRequest(userId: string, phoneNumber: string, channel: 'sms' | 'whatsapp' = 'sms') {
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

  // Check if already snoozed for this habit today to avoid stacking
  const { data: existingSnooze } = await supabase
    .from('scheduled_tasks')
    .select('id')
    .eq('user_id', userId)
    .eq('habit_id', habit.id)
    .eq('task_type', 'send_reminder')
    .eq('status', 'pending')
    .limit(1)

  if (!existingSnooze || existingSnooze.length === 0) {
    const sendAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
    await supabase.from('scheduled_tasks').insert({
      task_type: 'send_reminder',
      user_id: userId,
      habit_id: habit.id,
      scheduled_for: sendAt.toISOString(),
      status: 'pending',
    })
  }

  await sendSMS({ to: phoneNumber, message: SMS_TEMPLATES.SNOOZE_CONFIRMED(habit.name), userId, channel })
}

async function handlePlanSelect(
  userId: string,
  phoneNumber: string,
  tier: 'starter' | 'pro',
  channel: 'sms' | 'whatsapp' = 'sms'
) {
  const supabase = createServiceClient()

  // Only generate checkout if user recently asked for upgrade options (within 30 min)
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
    const { data: { user } } = await supabase.auth.admin.getUserById(userId)
    const email = user?.email || ''

    const session = await createCheckoutSession({
      userId,
      email,
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
