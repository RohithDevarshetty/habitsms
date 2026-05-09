import { createServiceClient } from '@/lib/supabase/server'
import { startOfDay } from 'date-fns'

export async function findOldestPendingHabit(userId: string) {
  const supabase = createServiceClient()
  const todayStart = startOfDay(new Date()).toISOString()

  // Get all outbound reminders sent today (oldest first) that have a habit attached
  const { data: sentReminders } = await supabase
    .from('sms_messages')
    .select('habit_id, created_at')
    .eq('user_id', userId)
    .eq('direction', 'outbound')
    .not('habit_id', 'is', null)
    .gte('created_at', todayStart)
    .order('created_at', { ascending: true })

  if (!sentReminders || sentReminders.length === 0) return null

  // Habits already logged today are considered answered
  const { data: todayLogs } = await supabase
    .from('habit_logs')
    .select('habit_id')
    .eq('user_id', userId)
    .gte('logged_at', todayStart)

  const answeredIds = new Set(todayLogs?.map((l) => l.habit_id) ?? [])

  // Pick the oldest reminder whose habit hasn't been answered yet
  const pending = sentReminders.find((r) => r.habit_id && !answeredIds.has(r.habit_id))
  if (!pending) return null

  const { data: habit } = await supabase
    .from('habits')
    .select('*')
    .eq('id', pending.habit_id)
    .eq('is_active', true)
    .single()

  return habit ?? null
}
