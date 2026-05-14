import { createServiceClient } from '@/lib/supabase/server'
import { sendSMS, SMS_TEMPLATES } from '@/lib/sms/service'
import { parsePhoneNumber } from 'libphonenumber-js'
import { subDays } from 'date-fns'

interface SetBuddyResult {
  ok: boolean
  error?: string
}

async function getUserFirstName(userId: string, fallback = 'A friend'): Promise<string> {
  const supabase = createServiceClient()
  try {
    const { data } = await supabase.auth.admin.getUserById(userId)
    const fullName = (data?.user?.user_metadata as { full_name?: string } | null)?.full_name
    if (fullName) return fullName.split(' ')[0]
    const email = data?.user?.email
    if (email) return email.split('@')[0]
  } catch {
    // fall through
  }
  return fallback
}

export async function setBuddy(
  userId: string,
  buddyPhone: string,
  buddyName: string
): Promise<SetBuddyResult> {
  const normalized = buddyPhone.startsWith('+') ? buddyPhone : `+${buddyPhone}`
  let e164: string
  try {
    const parsed = parsePhoneNumber(normalized)
    if (!parsed || !parsed.isValid()) return { ok: false, error: 'Invalid phone number' }
    e164 = parsed.format('E.164')
  } catch {
    return { ok: false, error: 'Invalid phone number' }
  }

  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('phone_number, buddy_phone, buddy_consent_status')
    .eq('id', userId)
    .single()

  if (profile?.phone_number === e164) {
    return { ok: false, error: 'You cannot be your own buddy' }
  }

  // If replacing an already-accepted buddy, tell the old one they were removed
  const previousBuddy = profile?.buddy_phone
  const previousAccepted = profile?.buddy_consent_status === 'accepted'
  if (previousBuddy && previousBuddy !== e164 && previousAccepted) {
    await sendSMS({
      to: previousBuddy,
      message: SMS_TEMPLATES.BUDDY_OPT_OUT_CONFIRMED(),
      userId,
    })
  }

  await supabase
    .from('profiles')
    .update({
      buddy_phone: e164,
      buddy_name: buddyName.trim() || null,
      buddy_consent_status: 'pending',
      buddy_consent_requested_at: new Date().toISOString(),
      buddy_consent_at: null,
      buddy_last_nudged_at: null,
    })
    .eq('id', userId)

  const userName = await getUserFirstName(userId)
  await sendSMS({
    to: e164,
    message: SMS_TEMPLATES.BUDDY_OPT_IN(userName),
    userId,
  })

  return { ok: true }
}

export async function removeBuddy(userId: string): Promise<void> {
  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('buddy_phone, buddy_consent_status')
    .eq('id', userId)
    .single()

  if (profile?.buddy_phone && profile.buddy_consent_status === 'accepted') {
    await sendSMS({
      to: profile.buddy_phone,
      message: SMS_TEMPLATES.BUDDY_OPT_OUT_CONFIRMED(),
      userId,
    })
  }

  await supabase
    .from('profiles')
    .update({
      buddy_phone: null,
      buddy_name: null,
      buddy_consent_status: null,
      buddy_consent_requested_at: null,
      buddy_consent_at: null,
      buddy_last_nudged_at: null,
    })
    .eq('id', userId)
}

export async function maybeNudgeBuddy(userId: string, habitName: string): Promise<boolean> {
  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('buddy_phone, buddy_consent_status, buddy_last_nudged_at')
    .eq('id', userId)
    .single()

  if (!profile?.buddy_phone || profile.buddy_consent_status !== 'accepted') return false

  if (profile.buddy_last_nudged_at) {
    const lastNudge = new Date(profile.buddy_last_nudged_at)
    if (lastNudge > subDays(new Date(), 7)) return false
  }

  const userName = await getUserFirstName(userId, 'Your buddy')
  const result = await sendSMS({
    to: profile.buddy_phone,
    message: SMS_TEMPLATES.BUDDY_NUDGE(userName, habitName),
    userId,
  })

  if (!result.success) return false

  await supabase
    .from('profiles')
    .update({ buddy_last_nudged_at: new Date().toISOString() })
    .eq('id', userId)

  return true
}

const BUDDY_YES = /^(y|yes|yeah|yep|yup|ok|okay|sure|accept|agree)\b/i
const BUDDY_STOP = /^(stop|no|nope|nah|opt[\s-]?out|unsubscribe|cancel|decline)\b/i

export async function handleBuddyInbound(
  buddyPhone: string,
  messageBody: string
): Promise<boolean> {
  const text = messageBody.trim()
  const isYes = BUDDY_YES.test(text)
  const isStop = BUDDY_STOP.test(text)
  if (!isYes && !isStop) return false

  const supabase = createServiceClient()

  // 1. Pending opt-in takes priority — buddy is responding to the invite
  const { data: pending } = await supabase
    .from('profiles')
    .select('id, buddy_name, phone_number')
    .eq('buddy_phone', buddyPhone)
    .eq('buddy_consent_status', 'pending')
    .limit(1)
    .maybeSingle()

  if (pending) {
    if (isYes) {
      await supabase
        .from('profiles')
        .update({
          buddy_consent_status: 'accepted',
          buddy_consent_at: new Date().toISOString(),
        })
        .eq('id', pending.id)

      const userName = await getUserFirstName(pending.id, 'Your friend')
      await sendSMS({
        to: buddyPhone,
        message: SMS_TEMPLATES.BUDDY_OPT_IN_CONFIRMED(userName),
        userId: pending.id,
      })
      if (pending.phone_number) {
        await sendSMS({
          to: pending.phone_number,
          message: SMS_TEMPLATES.BUDDY_USER_NOTIFIED_ACCEPTED(pending.buddy_name || 'Your buddy'),
          userId: pending.id,
        })
      }
    } else {
      await supabase
        .from('profiles')
        .update({
          buddy_phone: null,
          buddy_name: null,
          buddy_consent_status: 'declined',
          buddy_consent_at: new Date().toISOString(),
        })
        .eq('id', pending.id)

      await sendSMS({
        to: buddyPhone,
        message: SMS_TEMPLATES.BUDDY_OPT_OUT_CONFIRMED(),
        userId: pending.id,
      })
      if (pending.phone_number) {
        await sendSMS({
          to: pending.phone_number,
          message: SMS_TEMPLATES.BUDDY_USER_NOTIFIED_DECLINED(pending.buddy_name || 'Your buddy'),
          userId: pending.id,
        })
      }
    }
    return true
  }

  // 2. STOP from an already-accepted buddy
  if (isStop) {
    const { data: accepted } = await supabase
      .from('profiles')
      .select('id, phone_number, buddy_name')
      .eq('buddy_phone', buddyPhone)
      .eq('buddy_consent_status', 'accepted')
      .limit(1)
      .maybeSingle()

    if (accepted) {
      await supabase
        .from('profiles')
        .update({
          buddy_phone: null,
          buddy_name: null,
          buddy_consent_status: 'declined',
          buddy_consent_at: new Date().toISOString(),
        })
        .eq('id', accepted.id)

      await sendSMS({
        to: buddyPhone,
        message: SMS_TEMPLATES.BUDDY_OPT_OUT_CONFIRMED(),
        userId: accepted.id,
      })
      if (accepted.phone_number) {
        await sendSMS({
          to: accepted.phone_number,
          message: SMS_TEMPLATES.BUDDY_USER_NOTIFIED_DECLINED(accepted.buddy_name || 'Your buddy'),
          userId: accepted.id,
        })
      }
      return true
    }
  }

  return false
}
