import { NextRequest, NextResponse } from 'next/server'
import { verifyTwilioWebhook } from '@/lib/twilio/client'
import { sendSMS, SMS_TEMPLATES } from '@/lib/twilio/sms'
import { parseSMSResponse, validateNumericResponse } from '@/lib/sms/parser'
import { createServiceClient } from '@/lib/supabase/server'
import { calculateAndUpdateStreak } from '@/lib/habits/streaks'

export async function POST(request: NextRequest) {
  try {
    // Get request body
    const formData = await request.formData()
    const body: Record<string, string> = {}
    formData.forEach((value, key) => {
      body[key] = value.toString()
    })

    // Verify Twilio signature
    const signature = request.headers.get('x-twilio-signature') || ''
    const url = request.url

    if (!verifyTwilioWebhook(signature, url, body)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    const from = body.From as string
    const messageBody = body.Body as string
    const messageSid = body.MessageSid as string

    if (!from || !messageBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Find user by phone number
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone_number', from)
      .single()

    if (profileError || !profile) {
      // Log unknown sender
      await supabase.from('sms_messages').insert({
        user_id: '00000000-0000-0000-0000-000000000000', // System ID
        phone_number: from,
        message_body: messageBody,
        direction: 'inbound',
        status: 'received',
        provider: 'twilio',
        provider_message_id: messageSid,
      })

      return NextResponse.json({ message: 'User not found' }, { status: 200 })
    }

    // Log inbound message
    await supabase.from('sms_messages').insert({
      user_id: profile.id,
      phone_number: from,
      message_body: messageBody,
      direction: 'inbound',
      status: 'received',
      provider: 'twilio',
      provider_message_id: messageSid,
    })

    // Parse SMS response
    const parsed = parseSMSResponse(messageBody)

    // Handle different response types
    switch (parsed.type) {
      case 'help':
        await sendSMS({
          to: from,
          message: SMS_TEMPLATES.HELP(),
          userId: profile.id,
        })
        break

      case 'stats':
        await handleStatsRequest(profile.id, from)
        break

      case 'pause':
        await handlePauseRequest(profile.id, from)
        break

      case 'completed':
      case 'skipped':
      case 'number':
        await handleHabitResponse(profile.id, from, parsed)
        break

      case 'unknown':
        await sendSMS({
          to: from,
          message: SMS_TEMPLATES.HELP(),
          userId: profile.id,
        })
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
  parsed: ReturnType<typeof parseSMSResponse>
) {
  const supabase = createServiceClient()

  // Get user's active habits (most recently reminded)
  const { data: habits } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)

  if (!habits || habits.length === 0) {
    await sendSMS({
      to: phoneNumber,
      message: 'No active habits found. Please create a habit first.',
      userId,
    })
    return
  }

  const habit = habits[0]

  // Validate response type matches habit
  if (
    habit.response_type === 'number' &&
    parsed.type !== 'number' &&
    parsed.type !== 'skipped'
  ) {
    await sendSMS({
      to: phoneNumber,
      message: `Please reply with a number for ${habit.name}, or N to skip.`,
      userId,
      habitId: habit.id,
    })
    return
  }

  // Validate numeric value if applicable
  if (parsed.type === 'number' && parsed.value !== undefined) {
    const validation = validateNumericResponse(parsed.value, habit.response_unit || '')
    if (!validation.valid) {
      await sendSMS({
        to: phoneNumber,
        message: validation.error || 'Invalid value',
        userId,
        habitId: habit.id,
      })
      return
    }
  }

  // Log habit completion
  const completed = parsed.type === 'completed' || parsed.type === 'number'
  const responseValue =
    parsed.type === 'number' ? parsed.value?.toString() : parsed.type === 'completed' ? 'Y' : 'N'

  await supabase.from('habit_logs').insert({
    habit_id: habit.id,
    user_id: userId,
    completed,
    response_value: responseValue,
    source: 'sms',
  })

  // Update streak
  const streak = await calculateAndUpdateStreak(habit.id)

  // Send confirmation
  if (completed) {
    let message = SMS_TEMPLATES.CONFIRMATION(habit.name, streak)

    // Check for milestones
    if (streak === 7) {
      message = SMS_TEMPLATES.MILESTONE_7(habit.name)
    } else if (streak === 30) {
      message = SMS_TEMPLATES.MILESTONE_30(habit.name)
    } else if (streak === 100) {
      message = SMS_TEMPLATES.MILESTONE_100(habit.name)
    }

    await sendSMS({
      to: phoneNumber,
      message,
      userId,
      habitId: habit.id,
    })
  } else {
    await sendSMS({
      to: phoneNumber,
      message: `Got it! ${habit.name} marked as skipped for today.`,
      userId,
      habitId: habit.id,
    })
  }
}

async function handleStatsRequest(userId: string, phoneNumber: string) {
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
    })
    return
  }

  let stats = '📊 Your Habit Stats:\n\n'
  habits.forEach((habit) => {
    stats += `${habit.name}:\n🔥 Current: ${habit.streak_count} days\n⭐ Best: ${habit.longest_streak} days\n\n`
  })

  await sendSMS({
    to: phoneNumber,
    message: stats.trim(),
    userId,
  })
}

async function handlePauseRequest(userId: string, phoneNumber: string) {
  const supabase = createServiceClient()

  // Disable all reminders
  await supabase
    .from('habits')
    .update({ reminder_enabled: false })
    .eq('user_id', userId)

  await sendSMS({
    to: phoneNumber,
    message: '✈️ Vacation mode activated! All reminders paused. Reply RESUME to turn them back on.',
    userId,
  })
}
