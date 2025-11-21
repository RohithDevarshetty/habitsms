import { twilioClient, TWILIO_PHONE_NUMBER } from './client'
import { createServiceClient } from '@/lib/supabase/server'
import { parsePhoneNumber } from 'libphonenumber-js'

interface SendSMSParams {
  to: string
  message: string
  userId: string
  habitId?: string
}

interface SMSResult {
  success: boolean
  messageId?: string
  error?: string
}

// SMS cost in cents (approximate)
const SMS_COSTS = {
  IN: 32, // ₹0.32 = ~$0.004 = 0.4 cents (storing as 32 for precision)
  US: 0.75, // $0.0075 = 0.75 cents
  DEFAULT: 0.75,
}

function getSMSCost(phoneNumber: string): number {
  try {
    const parsed = parsePhoneNumber(phoneNumber)
    const country = parsed?.country
    if (country === 'IN') return SMS_COSTS.IN
    if (country === 'US') return SMS_COSTS.US
    return SMS_COSTS.DEFAULT
  } catch {
    return SMS_COSTS.DEFAULT
  }
}

export async function sendSMS({
  to,
  message,
  userId,
  habitId,
}: SendSMSParams): Promise<SMSResult> {
  try {
    // Validate phone number
    const parsed = parsePhoneNumber(to)
    if (!parsed || !parsed.isValid()) {
      return { success: false, error: 'Invalid phone number' }
    }

    const formattedPhone = parsed.format('E.164')

    // Send SMS via Twilio
    const twilioMessage = await twilioClient.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: formattedPhone,
    })

    // Calculate cost
    const costCents = getSMSCost(formattedPhone)

    // Log SMS to database
    const supabase = createServiceClient()
    await supabase.from('sms_messages').insert({
      user_id: userId,
      habit_id: habitId || null,
      phone_number: formattedPhone,
      message_body: message,
      direction: 'outbound',
      status: twilioMessage.status,
      provider: 'twilio',
      provider_message_id: twilioMessage.sid,
      cost_cents: costCents,
    })

    return {
      success: true,
      messageId: twilioMessage.sid,
    }
  } catch (error: any) {
    console.error('SMS send error:', error)
    return {
      success: false,
      error: error.message || 'Failed to send SMS',
    }
  }
}

// SMS Templates
export const SMS_TEMPLATES = {
  REMINDER_BOOLEAN: (habitName: string) => `Did you ${habitName} today? Reply with:
Y - Yes, I did it!
N - Not today
SKIP - Pause for today
STATS - View your streak`,

  REMINDER_NUMBER: (habitName: string, unit: string) => `How many ${unit} of ${habitName} today?
Reply with a number (e.g., "8" for 8 ${unit})
Reply SKIP to pause`,

  CONFIRMATION: (habitName: string, streak: number) => `🔥 Great job! ${habitName} logged!
Current streak: ${streak} days
Keep it up! 💪`,

  MILESTONE_7: (habitName: string) => `🎉 Awesome! You've completed "${habitName}" for 7 days straight!
You're building a solid habit! 🔥`,

  MILESTONE_30: (habitName: string) => `🌟 AMAZING! 30-day streak for "${habitName}"!
You're unstoppable! Keep crushing it! 💪`,

  MILESTONE_100: (habitName: string) => `🏆 LEGENDARY! 100-day streak for "${habitName}"!
You're in the top 1%! Incredible dedication! 🎯`,

  WEEKLY_SUMMARY: (completedCount: number, longestStreak: number) => `📊 Your Week in Review:
✅ ${completedCount} habits completed
🔥 Longest streak: ${longestStreak} days
💪 Keep crushing it!

Reply STATS for details`,

  WELCOME: (firstName: string, firstReminderTime: string) => `Welcome to HabitSMS, ${firstName}! 🎉
Your first reminder will arrive at ${firstReminderTime}.
Reply HELP anytime for commands.
Let's build great habits together!`,

  HELP: () => `HabitSMS Commands:
Y or YES - Mark habit as done
N or NO - Mark as skipped
NUMBER - Log quantity
STATS - View your streaks
PAUSE - Pause reminders
HELP - Show this message`,

  STREAK_BROKEN: (habitName: string, previousStreak: number) => `Your ${habitName} streak of ${previousStreak} days was broken. Don't worry! Start fresh today. Reply Y when done! 💪`,
}
