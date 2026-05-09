import { createServiceClient } from '@/lib/supabase/server'

// Max inbound messages per phone number per minute
const INBOUND_LIMIT_PER_MINUTE = 10

// Max outbound messages per user per hour (prevents abuse loops)
const OUTBOUND_LIMIT_PER_HOUR = 30

// DB-backed — no Redis needed. Queries sms_messages table.
// Acceptable for MVP scale; swap for Upstash Redis at high volume.

export async function isInboundRateLimited(phoneNumber: string): Promise<boolean> {
  const supabase = createServiceClient()
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()

  const { count } = await supabase
    .from('sms_messages')
    .select('id', { count: 'exact', head: true })
    .eq('phone_number', phoneNumber)
    .eq('direction', 'inbound')
    .gte('created_at', oneMinuteAgo)

  return (count ?? 0) >= INBOUND_LIMIT_PER_MINUTE
}

export async function isOutboundRateLimited(userId: string): Promise<boolean> {
  const supabase = createServiceClient()
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { count } = await supabase
    .from('sms_messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('direction', 'outbound')
    .gte('created_at', oneHourAgo)

  return (count ?? 0) >= OUTBOUND_LIMIT_PER_HOUR
}
