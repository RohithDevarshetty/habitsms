import { NextRequest, NextResponse } from 'next/server'
import { getMetaConfig, verifyMetaWebhook, parseMetaWebhookBody } from '@/lib/meta/whatsapp'
import { sendSMS, SMS_TEMPLATES } from '@/lib/sms/service'
import { parseSMSResponse, validateNumericResponse } from '@/lib/sms/parser'
import { createServiceClient } from '@/lib/supabase/server'
import { calculateAndUpdateStreak } from '@/lib/habits/streaks'
import { findOldestPendingHabit } from '@/lib/sms/pending-queue'
import { createCheckoutSession } from '@/lib/payments/dodo'
import { subMinutes } from 'date-fns'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://habitsms.com'

// Meta sends a GET to verify the webhook endpoint during setup
export async function GET(request: NextRequest) {
  const config = getMetaConfig()
  if (!config) return NextResponse.json({ error: 'Meta not configured' }, { status: 500 })

  const { searchParams } = request.nextUrl
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === config.verifyToken) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

export async function POST(request: NextRequest) {
  try {
    const config = getMetaConfig()
    if (!config) return NextResponse.json({ error: 'Meta not configured' }, { status: 500 })

    const payload = await request.text()
    const signature = request.headers.get('x-hub-signature-256') || ''

    if (!verifyMetaWebhook(payload, signature, config.appSecret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    const body = JSON.parse(payload)
    const inbound = parseMetaWebhookBody(body)

    // Meta sends delivery receipts and other events — ignore non-message payloads
    if (!inbound) return NextResponse.json({ received: true })

    const { from, messageId, text } = inbound
    const supabase = createServiceClient()

    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('*').eq('phone_number', from).single()

    if (profileError || !profile) {
      await supabase.from('sms_messages').insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        phone_number: from,
        message_body: text,
        direction: 'inbound',
        status: 'received',
        provider: 'meta',
        provider_message_id: messageId,
      })
      return NextResponse.json({ received: true })
    }

    await supabase.from('sms_messages').insert({
      user_id: profile.id,
      phone_number: from,
      message_body: text,
      direction: 'inbound',
      status: 'received',
      provider: 'meta',
      provider_message_id: messageId,
    })

    const parsed = parseSMSResponse(text)

    switch (parsed.type) {
      case 'help':
        await sendSMS({ to: from, message: SMS_TEMPLATES.HELP(), userId: profile.id, channel: 'whatsapp' })
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
        await sendSMS({ to: from, message: SMS_TEMPLATES.UPGRADE(), userId: profile.id, channel: 'whatsapp' })
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
        await sendSMS({ to: from, message: SMS_TEMPLATES.HELP(), userId: profile.id, channel: 'whatsapp' })
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Meta webhook] Error:', error)
    // Always return 200 — Meta retries on non-200 which can cause loops
    return NextResponse.json({ received: true })
  }
}

async function handleHabitResponse(
  userId: string,
  phoneNumber: string,
  parsed: ReturnType<typeof parseSMSResponse>
) {
  const supabase = createServiceClient()
  const habit = await findOldestPendingHabit(userId)

  if (!habit) {
    await sendSMS({ to: phoneNumber, message: 'No pending habits found for today. Check the dashboard to manage your habits.', userId, channel: 'whatsapp' })
    return
  }

  if (habit.response_type === 'number' && parsed.type !== 'number' && parsed.type !== 'skipped') {
    await sendSMS({ to: phoneNumber, message: `Please reply with a number for ${habit.name}, or N to skip.`, userId, habitId: habit.id, channel: 'whatsapp' })
    return
  }

  if (parsed.type === 'number' && parsed.value !== undefined) {
    const validation = validateNumericResponse(parsed.value, habit.response_unit || '')
    if (!validation.valid) {
      await sendSMS({ to: phoneNumber, message: validation.error || 'Invalid value', userId, habitId: habit.id, channel: 'whatsapp' })
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
    source: 'whatsapp',
  })

  const streak = await calculateAndUpdateStreak(habit.id)

  if (completed) {
    let message = SMS_TEMPLATES.CONFIRMATION(habit.name, streak)
    if (streak === 7) message = SMS_TEMPLATES.MILESTONE_7(habit.name)
    else if (streak === 30) message = SMS_TEMPLATES.MILESTONE_30(habit.name)
    else if (streak === 100) message = SMS_TEMPLATES.MILESTONE_100(habit.name)
    await sendSMS({ to: phoneNumber, message, userId, habitId: habit.id, channel: 'whatsapp' })
  } else {
    await sendSMS({ to: phoneNumber, message: `Got it! ${habit.name} marked as skipped for today.`, userId, habitId: habit.id, channel: 'whatsapp' })
  }
}

async function handleStatsRequest(userId: string, phoneNumber: string) {
  const supabase = createServiceClient()
  const { data: habits } = await supabase.from('habits').select('*').eq('user_id', userId).eq('is_active', true)

  if (!habits || habits.length === 0) {
    await sendSMS({ to: phoneNumber, message: 'No active habits yet. Create your first habit to get started!', userId, channel: 'whatsapp' })
    return
  }

  let stats = '📊 Your Habit Stats:\n\n'
  habits.forEach((h) => {
    stats += `${h.name}:\n🔥 Current: ${h.streak_count} days\n⭐ Best: ${h.longest_streak} days\n\n`
  })

  await sendSMS({ to: phoneNumber, message: stats.trim(), userId, channel: 'whatsapp' })
}

async function handleResumeRequest(userId: string, phoneNumber: string) {
  const supabase = createServiceClient()
  await supabase.from('habits').update({ reminder_enabled: true }).eq('user_id', userId)
  await sendSMS({ to: phoneNumber, message: SMS_TEMPLATES.RESUME(), userId, channel: 'whatsapp' })
}

async function handleSnoozeRequest(userId: string, phoneNumber: string) {
  const supabase = createServiceClient()
  const habit = await findOldestPendingHabit(userId)

  if (!habit) {
    await sendSMS({ to: phoneNumber, message: 'No pending habits to snooze right now.', userId, channel: 'whatsapp' })
    return
  }

  const { data: existingSnooze } = await supabase
    .from('scheduled_tasks').select('id')
    .eq('user_id', userId).eq('habit_id', habit.id)
    .eq('task_type', 'send_reminder').eq('status', 'pending').limit(1)

  if (!existingSnooze || existingSnooze.length === 0) {
    await supabase.from('scheduled_tasks').insert({
      task_type: 'send_reminder',
      user_id: userId,
      habit_id: habit.id,
      scheduled_for: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      status: 'pending',
    })
  }

  await sendSMS({ to: phoneNumber, message: SMS_TEMPLATES.SNOOZE_CONFIRMED(habit.name), userId, channel: 'whatsapp' })
}

async function handlePlanSelect(userId: string, phoneNumber: string, tier: 'starter' | 'pro') {
  const supabase = createServiceClient()
  const cutoff = subMinutes(new Date(), 30).toISOString()

  const { data: recentUpgrade } = await supabase
    .from('sms_messages').select('id')
    .eq('user_id', userId).eq('direction', 'outbound')
    .ilike('message_body', '%Reply STARTER or PRO%')
    .gte('created_at', cutoff).limit(1)

  if (!recentUpgrade || recentUpgrade.length === 0) {
    await sendSMS({ to: phoneNumber, message: SMS_TEMPLATES.HELP(), userId, channel: 'whatsapp' })
    return
  }

  try {
    const { data: { user } } = await supabase.auth.admin.getUserById(userId)
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
      channel: 'whatsapp',
    })
  } catch (error) {
    console.error('[Meta plan select] Error:', error)
    await sendSMS({ to: phoneNumber, message: `Something went wrong. Try ${APP_URL}/upgrade`, userId, channel: 'whatsapp' })
  }
}
