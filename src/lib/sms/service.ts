import { twilioClient, TWILIO_PHONE_NUMBER, TWILIO_WHATSAPP_NUMBER, formatTochannel, MessageChannel } from '@/lib/twilio/client'
import { createServiceClient } from '@/lib/supabase/server'
import { parsePhoneNumber } from 'libphonenumber-js'
import { sendMSG91SMS, isIndianNumber, MSG91_COST_CENTS, getMSG91Config } from '@/lib/msg91/sms'
import { sendWhatsAppMessage, getMetaConfig, META_WHATSAPP_COST_PAISE } from '@/lib/meta/whatsapp'

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
    const normalizedTo = to.startsWith('+') ? to : `+${to}`
    const parsed = parsePhoneNumber(normalizedTo)
    if (!parsed || !parsed.isValid()) {
      return { success: false, error: 'Invalid phone number' }
    }

    const formattedPhone = parsed.format('E.164')
    let activeProvider = selectProvider(formattedPhone)
    
    let messageId: string | null = null
    let status = 'sent'
    
    // For WhatsApp: use Meta Cloud API if configured, otherwise fall back to Twilio
    if (channel === 'whatsapp') {
      const metaConfig = getMetaConfig()

      if (metaConfig) {
        const result = await sendWhatsAppMessage(formattedPhone, message)
        if (result.success) {
          await logSMS(userId, formattedPhone, message, habitId, 'outbound', 'sent', 'meta', result.messageId ?? null, META_WHATSAPP_COST_PAISE)
          return { success: true, messageId: result.messageId }
        }
        if (result.windowClosed) {
          // 24hr session expired — log but don't fall back (template needed, not a plain text retry)
          console.warn(`[Meta] 24hr window expired for ${formattedPhone}`)
          await logSMS(userId, formattedPhone, message, habitId, 'outbound', 'window_closed', 'meta', null, 0)
          return { success: false, error: '24hr session window expired' }
        }
        // Other Meta error — fall through to Twilio WhatsApp
        console.warn('[Meta] WhatsApp send failed, falling back to Twilio:', result.error)
      }

      const twilioMessage = await twilioClient.messages.create({
        body: message,
        from: formatTochannel(TWILIO_WHATSAPP_NUMBER, channel),
        to: formatTochannel(formattedPhone, channel),
      })
      messageId = twilioMessage.sid
      status = twilioMessage.status
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

// SMS Templates — text must match DLT-approved templates exactly (see docs/dlt-templates.md)
export const SMS_TEMPLATES = {
  REMINDER_BOOLEAN: (habitName: string) =>
    `Did you ${habitName} today? Reply Y-Yes, N-No, SNOOZE-1hr, STATS-Streak`,

  REMINDER_NUMBER: (unit: string, habitName: string) =>
    `How many ${unit} of ${habitName} today? Reply with a number or N to skip.`,

  CONFIRMATION: (habitName: string, streak: number) =>
    `Great job! ${habitName} logged! Current streak: ${streak} days. Keep it up!`,

  MILESTONE: (streak: number, habitName: string) =>
    `Amazing! ${streak}-day streak for ${habitName}! You are unstoppable. Keep it up!`,

  // Keep specific aliases for the milestone values used in webhook handlers
  MILESTONE_7: (habitName: string) =>
    `Amazing! 7-day streak for ${habitName}! You are unstoppable. Keep it up!`,

  MILESTONE_30: (habitName: string) =>
    `Amazing! 30-day streak for ${habitName}! You are unstoppable. Keep it up!`,

  MILESTONE_100: (habitName: string) =>
    `Amazing! 100-day streak for ${habitName}! You are unstoppable. Keep it up!`,

  WEEKLY_SUMMARY: (completedCount: number, longestStreak: number) =>
    `Your week: ${completedCount} habits completed. Best streak: ${longestStreak} days. Keep crushing it! Reply STATS.`,

  WELCOME: (firstName: string, firstReminderTime: string) =>
    `Welcome to HabitSMS ${firstName}! First reminder at ${firstReminderTime}. Reply HELP for commands. Lets build habits!`,

  HELP: () =>
    `HabitSMS: Y-Done, N-Skip, SNOOZE-1hr, STATS-Stats, PAUSE-Pause, RESUME-Resume, GRACE-Restore streak, INVITE-Refer friend, UPGRADE-Plans, HELP-This list`,

  STREAK_BROKEN: (habitName: string, previousStreak: number) =>
    `Your ${habitName} streak of ${previousStreak} days was broken. Don't worry! Start fresh today. Reply Y when done!`,

  UPGRADE: (starterPrice = '7', proPrice = '12') =>
    `Which plan? STARTER Rs.${starterPrice}/mo-3 habits, PRO Rs.${proPrice}/mo-unlimited habits+summaries. Reply STARTER or PRO.`,

  UPGRADE_LIMIT: (habitCount: number, appUrl: string) =>
    `You have reached the ${habitCount}-habit limit. Upgrade to Pro for unlimited habits: ${appUrl}/upgrade`,

  PLAN_CHECKOUT: (tier: string, url: string) =>
    `Your HabitSMS ${tier.charAt(0).toUpperCase() + tier.slice(1)} plan checkout link: ${url} Link expires in 24 hours.`,

  PAYMENT_CONFIRMED: (tier: string) =>
    `Payment confirmed! You are now on HabitSMS ${tier.charAt(0).toUpperCase() + tier.slice(1)} plan. All features unlocked. Reply HELP anytime.`,

  PAYMENT_FAILED: (appUrl: string) =>
    `Your HabitSMS payment failed. Update your payment method to keep reminders active: ${appUrl}/billing`,

  RESUME: () =>
    `Reminders are back on! Your habits are waiting. Reply Y when you complete one.`,

  SNOOZE_CONFIRMED: (habitName: string) =>
    `Got it! Reminding you about ${habitName} in 1 hour.`,

  BUDDY_OPT_IN: (userName: string) =>
    `${userName} added you as their HabitSMS accountability buddy. We will text you only when they break a habit streak (max 1x/week). Reply YES to accept, STOP to decline.`,

  BUDDY_OPT_IN_CONFIRMED: (userName: string) =>
    `You are now ${userName}'s accountability buddy. You will get a short nudge if they break a streak. Reply STOP anytime to opt out.`,

  BUDDY_OPT_OUT_CONFIRMED: () =>
    `You will no longer receive HabitSMS buddy nudges. Take care!`,

  BUDDY_NUDGE: (userName: string, habitName: string) =>
    `${userName} just broke their ${habitName} streak on HabitSMS. A quick nudge from you might help them restart. Reply STOP to opt out.`,

  BUDDY_USER_NOTIFIED_ACCEPTED: (buddyName: string) =>
    `${buddyName} accepted your accountability invite. They will be notified if you break a streak.`,

  BUDDY_USER_NOTIFIED_DECLINED: (buddyName: string) =>
    `${buddyName} declined the accountability invite. You can pick a different buddy in Settings.`,
}