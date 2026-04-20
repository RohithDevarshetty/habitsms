'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { format } from 'date-fns'
import { ArrowLeft } from 'lucide-react'

interface HabitLog {
  id: string
  completed: boolean
  response_value: string | null
  source: string
  logged_at: string
}

interface Habit {
  id: string
  name: string
  description?: string | null
  reminder_time: string
  reminder_enabled: boolean
  streak_count: number
  longest_streak: number
  response_type: string
  response_unit: string | null
  template_type: string | null
}

const HABIT_ICONS: Record<string, string> = {
  workout: '💪',
  meditate: '🧘',
  water: '💧',
  read: '📚',
  sleep: '😴',
}

function getIcon(type: string | null) {
  return HABIT_ICONS[type || ''] || '⭐'
}

export default function HabitDetailPage() {
  const [habit, setHabit] = useState<Habit | null>(null)
  const [logs, setLogs] = useState<HabitLog[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  useEffect(() => {
    loadHabit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadHabit() {
    const { data: habitData } = await supabase
      .from('habits')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!habitData) { router.push('/dashboard'); return }
    setHabit(habitData)

    const { data: logsData } = await supabase
      .from('habit_logs')
      .select('*')
      .eq('habit_id', params.id)
      .order('logged_at', { ascending: false })
      .limit(30)

    setLogs(logsData || [])
    setLoading(false)
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this habit?')) return
    const { error } = await supabase
      .from('habits')
      .update({ is_active: false })
      .eq('id', params.id)

    if (error) alert('Failed to delete habit')
    else router.push('/dashboard')
  }

  async function toggleReminder() {
    const { error } = await supabase
      .from('habits')
      .update({ reminder_enabled: !habit!.reminder_enabled })
      .eq('id', params.id)

    if (!error) setHabit({ ...habit!, reminder_enabled: !habit!.reminder_enabled })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    )
  }

  if (!habit) return null

  const totalCompleted = logs.filter(l => l.completed).length

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-5 sm:px-8 lg:px-16 py-4 bg-black/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 liquid-glass rounded-full px-4 py-2 text-sm font-body text-white/70 hover:text-white transition"
          >
            <ArrowLeft size={14} /> Dashboard
          </button>
          <button
            onClick={() => router.push(`/dashboard/habits/${habit.id}/edit`)}
            className="liquid-glass-strong rounded-full px-4 py-2 text-sm font-body font-medium text-white hover:scale-105 transition"
          >
            Edit
          </button>
        </div>
      </nav>

      <main className="pt-24 pb-16 px-5 sm:px-8 lg:px-16 max-w-4xl mx-auto">
        {/* Habit header */}
        <div className="liquid-glass rounded-2xl p-6 sm:p-8 mb-5 blur-in">
          <div className="flex items-start gap-4 mb-6">
            <div className="liquid-glass-strong rounded-full w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center text-3xl shrink-0">
              {getIcon(habit.template_type)}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading italic text-white leading-tight">{habit.name}</h1>
              {habit.description && (
                <p className="text-white/50 font-body font-light text-sm mt-1">{habit.description}</p>
              )}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Current Streak', value: habit.streak_count, unit: 'days', color: 'text-blue-400', accent: 'rgba(96,165,250,0.12)' },
              { label: 'Longest Streak', value: habit.longest_streak, unit: 'days', color: 'text-purple-400', accent: 'rgba(167,139,250,0.12)' },
              { label: 'Total Completed', value: totalCompleted, unit: '', color: 'text-green-400', accent: 'rgba(74,222,128,0.12)' },
            ].map(({ label, value, unit, color, accent }) => (
              <div
                key={label}
                className="liquid-glass rounded-xl p-3 sm:p-4 text-center relative overflow-hidden"
              >
                <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ background: `radial-gradient(80px 80px at 50% 0%, ${accent}, transparent)` }} />
                <div className={`text-2xl sm:text-3xl font-heading italic leading-none ${color}`}>{value}</div>
                {unit && <div className="text-white/30 font-body text-xs mt-0.5">{unit}</div>}
                <div className="text-white/50 font-body font-light text-xs mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={toggleReminder}
              className={`flex-1 liquid-glass rounded-full py-3 text-sm font-body font-medium transition hover:scale-[1.02] ${
                habit.reminder_enabled ? 'text-yellow-400' : 'text-green-400'
              }`}
            >
              {habit.reminder_enabled ? '⏸ Pause Reminders' : '▶ Resume Reminders'}
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 liquid-glass rounded-full py-3 text-sm font-body font-medium text-red-400 transition hover:scale-[1.02]"
            >
              🗑 Delete Habit
            </button>
          </div>
        </div>

        {/* Activity log */}
        <div className="liquid-glass rounded-2xl p-6 blur-in-up">
          <h2 className="text-xl font-heading italic text-white mb-5">Recent Activity</h2>
          {logs.length === 0 ? (
            <div className="text-center py-10 text-white/40 font-body font-light text-sm">
              No activity yet. Start logging your habit!
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 sm:p-4 rounded-xl hover:bg-white/5 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="liquid-glass rounded-full w-9 h-9 flex items-center justify-center text-base shrink-0">
                      {log.completed ? '✅' : '❌'}
                    </div>
                    <div>
                      <div className="font-body font-medium text-white text-sm flex items-center gap-2 flex-wrap">
                        {log.completed ? 'Completed' : 'Skipped'}
                        {log.response_value && log.response_value !== 'Y' && log.response_value !== 'N' && (
                          <span className="liquid-glass rounded-full px-2 py-0.5 text-xs text-blue-400">
                            {log.response_value} {habit.response_unit}
                          </span>
                        )}
                      </div>
                      <div className="text-white/40 font-body font-light text-xs mt-0.5">
                        {format(new Date(log.logged_at), 'MMM d, yyyy · h:mm a')}
                      </div>
                    </div>
                  </div>
                  <span className="liquid-glass rounded-full px-2.5 py-0.5 text-[10px] font-body uppercase text-white/40 shrink-0">
                    {log.source}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
