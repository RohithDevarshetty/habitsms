import { createServiceClient } from '@/lib/supabase/server'
import { startOfDay, subDays, format } from 'date-fns'

export async function calculateAndUpdateStreak(habitId: string): Promise<number> {
  const supabase = createServiceClient()

  // Get all logs for this habit, ordered by date descending
  const { data: logs, error } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('habit_id', habitId)
    .eq('completed', true)
    .order('logged_at', { ascending: false })

  if (error || !logs) {
    console.error('Error fetching habit logs:', error)
    return 0
  }

  if (logs.length === 0) {
    await supabase.from('habits').update({ streak_count: 0 }).eq('id', habitId)
    return 0
  }

  // Calculate streak
  let streak = 0
  const currentDate = startOfDay(new Date())

  for (let i = 0; i < logs.length; i++) {
    const logDate = startOfDay(new Date(logs[i].logged_at))
    const expectedDate = subDays(currentDate, streak)

    // Check if log is from expected date
    if (format(logDate, 'yyyy-MM-dd') === format(expectedDate, 'yyyy-MM-dd')) {
      streak++
    } else {
      // Gap in streak found
      break
    }
  }

  // Get current habit data to compare with longest streak
  const { data: habit } = await supabase
    .from('habits')
    .select('longest_streak')
    .eq('id', habitId)
    .single()

  const longestStreak = Math.max(streak, habit?.longest_streak || 0)

  // Update habit with new streak
  await supabase
    .from('habits')
    .update({
      streak_count: streak,
      longest_streak: longestStreak,
      updated_at: new Date().toISOString(),
    })
    .eq('id', habitId)

  return streak
}

export async function resetMissedStreaks() {
  const supabase = createServiceClient()

  // Get all active habits
  const { data: habits } = await supabase
    .from('habits')
    .select('id, user_id, streak_count')
    .eq('is_active', true)
    .gt('streak_count', 0)

  if (!habits) return

  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')

  for (const habit of habits) {
    // Check if habit was logged yesterday
    const { data: logs } = await supabase
      .from('habit_logs')
      .select('id')
      .eq('habit_id', habit.id)
      .eq('completed', true)
      .gte('logged_at', `${yesterday}T00:00:00`)
      .lte('logged_at', `${yesterday}T23:59:59`)

    // If no log yesterday, reset streak
    if (!logs || logs.length === 0) {
      await supabase
        .from('habits')
        .update({
          streak_count: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', habit.id)
    }
  }
}

export async function getUserHabitStats(userId: string) {
  const supabase = createServiceClient()

  const { data: habits } = await supabase
    .from('habits')
    .select('id, name, streak_count, longest_streak')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (!habits) return null

  const totalActive = habits.length
  const totalCurrentStreak = habits.reduce((sum, h) => sum + h.streak_count, 0)
  const longestStreak = Math.max(...habits.map((h) => h.longest_streak), 0)

  // Get completion rate for last 7 days
  const sevenDaysAgo = subDays(new Date(), 7).toISOString()
  const { data: recentLogs } = await supabase
    .from('habit_logs')
    .select('completed')
    .eq('user_id', userId)
    .gte('logged_at', sevenDaysAgo)

  const completedLogs = recentLogs?.filter((log) => log.completed).length || 0
  const totalLogs = recentLogs?.length || 0
  const completionRate = totalLogs > 0 ? Math.round((completedLogs / totalLogs) * 100) : 0

  return {
    totalActive,
    totalCurrentStreak,
    longestStreak,
    completionRate,
    habits: habits.map((h) => ({
      id: h.id,
      name: h.name,
      currentStreak: h.streak_count,
      longestStreak: h.longest_streak,
    })),
  }
}
