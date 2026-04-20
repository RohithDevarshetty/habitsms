import { twilioClient, TWILIO_PHONE_NUMBER, TWILIO_WHATSAPP_NUMBER, formatTochannel, MessageChannel } from '@/lib/twilio/client'
import { createServiceClient } from '@/lib/supabase/server'
import { parsePhoneNumber } from 'libphonenumber-js'
import { sendMSG91SMS, isIndianNumber, MSG91_COST_CENTS, getMSG91Config } from '@/lib/msg91/sms'

interface SendSMSParams {
  to: string
  message: string
  userId: string
  habitId?: string
  channel?: MessageChannel
}

interface SMSResult {
  success: boolean
  messageId?: string
  error?: string
}

// SMS cost in cents
const SMS_COSTS = {
  TWILIO_IN: 32, // ₹0.32 = ~$0.004 = 0.4 cents
  TWILIO_US: 0.75, // $0.0075 = 0.75 cents
  MSG91_IN: MSG91_COST_CENTS, // ₹0.14 = ~$0.0017 = 0.17 cents
  DEFAULT: 0.75,
}

function getSMSCost(phoneNumber: string, activeProvider: 'twilio' | 'msg91'): number {
  try {
    const parsed = parsePhoneNumber(phoneNumber)
    const country = parsed?.country
    
    if (country === 'IN') {
      return activeProvider === 'msg91' ? SMS_COSTS.MSG91_IN : SMS_COSTS.TWILIO_IN
    }
    return activeProvider === 'twilio' ? SMS_COSTS.TWILIO_US : SMS_COSTS.DEFAULT
  } catch {
    return SMS_COSTS.DEFAULT
  }
}

function selectProvider(phoneNumber: string): 'msg91' | 'twilio' {
  const msg91Config = getMSG91Config()
  
  // Use MSG91 for Indian numbers if configured
  if (msg91Config && isIndianNumber(phoneNumber)) {
    return 'msg91'
  }
  
  // Fall back to Twilio for all others
  return 'twilio'
}

async function logSMS(
  userId: string,
  phoneNumber: string,
  message: string,
  habitId: string | undefined,
  direction: 'outbound' | 'inbound',
  status: string,
  activeProvider: string,
  activeProviderMessageId: string | null,
  costCents: number
) {
  try {
    const supabase = createServiceClient()
    await supabase.from('sms_messages').insert({
      user_id: userId,
      habit_id: habitId || null,
      phone_number: phoneNumber,
      message_body: message,
      direction,
      status,
      activeProvider,
      activeProvider_message_id: activeProviderMessageId,
      cost_cents: costCents,
    })
  } catch (error) {
    console.error('Failed to log SMS:', error)
  }
}

export async function sendSMS({
  to,
  message,
  userId,
  habitId,
  channel = 'sms',
}: SendSMSParams): Promise<SMSResult> {
  try {
    const parsed = parsePhoneNumber(to)
    if (!parsed || !parsed.isValid()) {
      return { success: false, error: 'Invalid phone number' }
    }

    const formattedPhone = parsed.format('E.164')
    let activeProvider = selectProvider(formattedPhone)
    
    let messageId: string | null = null
    let status = 'sent'
    
    // For WhatsApp, always use Twilio
    if (channel === 'whatsapp') {
      const fromNumber = TWILIO_WHATSAPP_NUMBER
      const twilioMessage = await twilioClient.messages.create({
        body: message,
        from: formatTochannel(fromNumber, channel),
        to: formatTochannel(formattedPhone, channel),
      })
      messageId = twilioMessage.sid
      status = twilioMessage.status
      
      // Log the SMS
      await logSMS(userId, formattedPhone, message, habitId, 'outbound', status, 'twilio', messageId, SMS_COSTS.TWILIO_US)
      
      return { success: true, messageId }
    }
    
    // For SMS, use activeProvider based on country
    if (activeProvider === 'msg91') {
      const result = await sendMSG91SMS(formattedPhone, message)
      if (!result.success) {
        // Fall back to Twilio if MSG91 fails
        console.warn('MSG91 failed, falling back to Twilio:', result.error)
        activeProvider = 'twilio'
      } else {
        messageId = result.id
        status = 'delivered'
        
        // Log the SMS
        await logSMS(userId, formattedPhone, message, habitId, 'outbound', status, 'msg91', messageId, SMS_COSTS.MSG91_IN)
        
        return { success: true, messageId }
      }
    }
    
    // Fall back to Twilio
    const fromNumber = TWILIO_PHONE_NUMBER
    const twilioMessage = await twilioClient.messages.create({
      body: message,
      from: fromNumber,
      to: formattedPhone,
    })
    messageId = twilioMessage.sid
    status = twilioMessage.status
    
    const costCents = getSMSCost(formattedPhone, 'twilio')
    
    // Log the SMS
    await logSMS(userId, formattedPhone, message, habitId, 'outbound', status, 'twilio', messageId, costCents)
    
    return {
      success: true,
      messageId: twilioMessage.sid,
    }
  } catch (error) {
    console.error('SMS send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send SMS',
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

  CONFIRMATION: (habitName: string, streak: number) => `Great job! ${habitName} logged!
Current streak: ${streak} days
Keep it up!`,

  MILESTONE_7: (habitName: string) => `Awesome! You've completed "${habitName}" for 7 days straight!
You're building a solid habit!`,

  MILESTONE_30: (habitName: string) => `AMAZING! 30-day streak for "${habitName}"!
You're unstoppable! Keep crushing it!`,

  MILESTONE_100: (habitName: string) => `LEGENDARY! 100-day streak for "${habitName}"!
You're in the top 1%! Incredible dedication!`,

  WEEKLY_SUMMARY: (completedCount: number, longestStreak: number) => `Your Week in Review:
${completedCount} habits completed
Longest streak: ${longestStreak} days
Keep crushing it!

Reply STATS for details`,

  WELCOME: (firstName: string, firstReminderTime: string) => `Welcome to HabitSMS, ${firstName}!
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

  STREAK_BROKEN: (habitName: string, previousStreak: number) => `Your ${habitName} streak of ${previousStreak} days was broken. Don't worry! Start fresh today. Reply Y when done!`,
}