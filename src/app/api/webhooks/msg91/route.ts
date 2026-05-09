import { NextRequest, NextResponse } from 'next/server'
import { sendSMS, SMS_TEMPLATES } from '@/lib/sms/service'
import { parseSMSResponse, validateNumericResponse } from '@/lib/sms/parser'
import type { ParsedSMSResponse } from '@/lib/sms/parser'
import { createServiceClient } from '@/lib/supabase/server'
import { calculateAndUpdateStreak } from '@/lib/habits/streaks'
import { findOldestPendingHabit } from '@/lib/sms/pending-queue'
import { createCheckoutSession } from '@/lib/payments/dodo'
import { subMinutes } from 'date-fns'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://habitsms.com'

function verifyMsg91Webhook(request: NextRequest): boolean {
  const secret = request.nextUrl.searchParams.get('secret')
  return secret === process.env.MSG91_WEBHOOK_SECRET
}

export async function POST(request: NextRequest) {
  try {
    if (!verifyMsg91Webhook(request)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    const body = await request.json()
    const rawSender: string = body.sender ?? ''
    const messageBody: string = body.message ?? ''

    if (!rawSender || !messageBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const from = rawSender.startsWith('+') ? rawSender : `+${rawSender}`
    const supabase = createServiceClient()

    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('*').eq('phone_number', from).single()

    if (profileError || !profile) {
      await supabase.from('sms_messages').insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        phone_number: from,
        message_body: messageBody,
        direction: 'inbound',
        status: 'received',
        provider: 'msg91',
      })
      return NextResponse.json({ message: 'User not found' }, { status: 200 })
    }

    await supabase.from('sms_messages').insert({
      user_id: profile.id,
      phone_number: from,
      message_body: messageBody,
      direction: 'inbound',
      status: 'received',
      provider: 'msg91',
    })

    const parsed = parseSMSResponse(messageBody)

    switch (parsed.type) {
      case 'help':
        await sendSMS({ to: from, message: SMS_TEMPLATES.HELP(), userId: profile.id })
        break

      case 'stats':
        await handleStatsRequest(profile.id, from)
        break

      case 'resume':
        await handleResumeRequest(profile.id, from)
        break

      case 'snooze':
        await handleSnoozeRequest(profile.id, from)
        break

      case 'upgrade':
        await sendSMS({ to: from, message: SMS_TEMPLATES.UPGRADE(), userId: profile.id })
        break

      case 'plan_select':
        await handlePlanSelect(profile.id, from, parsed.planTier!)
        break

      case 'completed':
      case 'skipped':
      case 'number':
        await handleHabitResponse(profile.id, from, parsed)
        break

      case 'unknown':
        await sendSMS({ to: from, message: SMS_TEMPLATES.HELP(), userId: profile.id })
        break
    }

    return NextResponse.json({ message: 'Success' }, { status: 200 })
  } catch (error) {
    console.error('MSG91 webhook error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleHabitResponse(
  userId: string,
  phoneNumber: string,
  parsed: ParsedSMSResponse
) {
  const supabase = createServiceClient()
  const habit = await findOldestPendingHabit(userId)

  if (!habit) {
    await sendSMS({ to: phoneNumber, message: 'No pending habits found for today. Check the dashboard to manage your habits.', userId })
    return
  }

  if (habit.response_type === 'number' && parsed.type !== 'number' && parsed.type !== 'skipped' && parsed.type !== 'completed') {
    await sendSMS({ to: phoneNumber, message: `How many ${habit.response_unit || 'units'} of ${habit.name}? Reply with a number, Y to mark done, or N to skip.`, userId, habitId: habit.id })
    return
  }

  if (parsed.type === 'number' && parsed.value !== undefined) {
    const validation = validateNumericResponse(parsed.value, habit.response_unit || '')
    if (!validation.valid) {
      await sendSMS({ to: phoneNumber, message: validation.error || 'Invalid value', userId, habitId: habit.id })
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
    source: 'sms',
    ...(parsed.note ? { notes: parsed.note } : {}),
  })

  const streak = await calculateAndUpdateStreak(habit.id)

  if (completed) {
    let message = SMS_TEMPLATES.CONFIRMATION(habit.name, streak)
    if (streak === 7) message = SMS_TEMPLATES.MILESTONE_7(habit.name)
    else if (streak === 30) message = SMS_TEMPLATES.MILESTONE_30(habit.name)
    else if (streak === 100) message = SMS_TEMPLATES.MILESTONE_100(habit.name)
    await sendSMS({ to: phoneNumber, message, userId, habitId: habit.id })
  } else {
    await sendSMS({ to: phoneNumber, message: `Got it! ${habit.name} marked as skipped for today.`, userId, habitId: habit.id })
  }
}

async function handleStatsRequest(userId: string, phoneNumber: string) {
  const supabase = createServiceClient()
  const { data: habits } = await supabase.from('habits').select('*').eq('user_id', userId).eq('is_active', true)

  if (!habits || habits.length === 0) {
    await sendSMS({ to: phoneNumber, message: 'No active habits yet. Create your first habit to get started!', userId })
    return
  }

  let stats = '📊 Your Habit Stats:\n\n'
  habits.forEach((habit) => {
    stats += `${habit.name}:\n🔥 Current: ${habit.streak_count} days\n⭐ Best: ${habit.longest_streak} days\n\n`
  })

  await sendSMS({ to: phoneNumber, message: stats.trim(), userId })
}

async function handleResumeRequest(userId: string, phoneNumber: string) {
  const supabase = createServiceClient()
  await supabase.from('habits').update({ reminder_enabled: true }).eq('user_id', userId)
  await sendSMS({ to: phoneNumber, message: SMS_TEMPLATES.RESUME(), userId })
}

async function handleSnoozeRequest(userId: string, phoneNumber: string) {
  const supabase = createServiceClient()
  const habit = await findOldestPendingHabit(userId)

  if (!habit) {
    await sendSMS({ to: phoneNumber, message: 'No pending habits to snooze right now.', userId })
    return
  }

  const { data: existingSnooze } = await supabase
    .from('scheduled_tasks')
    .select('id')
    .eq('user_id', userId)
    .eq('habit_id', habit.id)
    .eq('task_type', 'send_reminder')
    .eq('status', 'pending')
    .limit(1)

  if (!existingSnooze || existingSnooze.length === 0) {
    const sendAt = new Date(Date.now() + 60 * 60 * 1000)
    await supabase.from('scheduled_tasks').insert({
      task_type: 'send_reminder',
      user_id: userId,
      habit_id: habit.id,
      scheduled_for: sendAt.toISOString(),
      status: 'pending',
    })
  }

  await sendSMS({ to: phoneNumber, message: SMS_TEMPLATES.SNOOZE_CONFIRMED(habit.name), userId })
}

async function handlePlanSelect(userId: string, phoneNumber: string, tier: 'starter' | 'pro') {
  const supabase = createServiceClient()

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
    await sendSMS({ to: phoneNumber, message: SMS_TEMPLATES.HELP(), userId })
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

    await sendSMS({ to: phoneNumber, message: SMS_TEMPLATES.PLAN_CHECKOUT(tier, session.checkout_url ?? `${APP_URL}/upgrade`), userId })
  } catch (error) {
    console.error('[Plan select] Checkout error:', error)
    await sendSMS({ to: phoneNumber, message: `Something went wrong. Try again or visit ${APP_URL}/upgrade`, userId })
  }
}
