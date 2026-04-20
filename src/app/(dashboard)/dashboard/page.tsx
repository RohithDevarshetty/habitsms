'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowUpRight, Plus } from 'lucide-react'

interface Habit {
  id: string
  name: string
  description: string | null
  template_type: string | null
  response_type: string
  response_unit: string | null
  reminder_time: string
  reminder_enabled: boolean
  is_active: boolean
  streak_count: number
  longest_streak: number
  created_at: string
}

const HABIT_ICONS: Record<string, string> = {
  workout: '💪',
  meditate: '🧘',
  water: '💧',
  read: '📚',
  sleep: '😴',
  custom: '⭐',
}

function getIcon(templateType: string | null) {
  return HABIT_ICONS[templateType || 'custom'] || '⭐'
}

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

export default function DashboardPage() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
    loadHabits()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) router.push('/login')
  }

  async function loadHabits() {
    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (!error) setHabits(data || [])
    setLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const totalStreaks = habits.reduce((sum, h) => sum + h.streak_count, 0)
  const longestStreak = Math.max(...habits.map(h => h.longest_streak), 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          <p className="text-white/50 font-body text-sm">Loading your habits…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-5 sm:px-8 lg:px-16 py-4 bg-black/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full liquid-glass-strong flex items-center justify-center shrink-0">
              <div
                className="w-4 h-4 rounded-full"
                style={{ background: 'radial-gradient(circle at 30% 30%, #fff, #cfd8ea 60%, #7a8cb8)' }}
              />
            </div>
            <span className="font-heading italic text-xl tracking-tight">HabitSMS</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard/habits/new')}
              className="hidden sm:flex items-center gap-1.5 liquid-glass rounded-full px-4 py-2 text-sm font-body font-medium text-white/80 hover:text-white transition"
            >
              <Plus size={14} /> Add Habit
            </button>
            <button
              onClick={handleSignOut}
              className="liquid-glass rounded-full px-4 py-2 text-sm font-body font-medium text-white/60 hover:text-white transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-16 px-5 sm:px-8 lg:px-16 max-w-7xl mx-auto">
        {/* Page heading */}
        <div className="mb-8 blur-in">
          <p className="text-white/40 font-body text-sm mb-1">Good morning</p>
          <h1 className="text-3xl sm:text-4xl font-heading italic text-white">Your Dashboard</h1>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Active Habits', value: habits.length, suffix: '', accent: 'rgba(96,165,250,0.15)' },
            { label: 'Total Streak Days', value: totalStreaks, suffix: ' days', accent: 'rgba(167,139,250,0.15)' },
            { label: 'Longest Streak', value: longestStreak, suffix: ' days', accent: 'rgba(250,204,21,0.12)' },
          ].map(({ label, value, suffix, accent }, i) => (
            <div
              key={label}
              className="liquid-glass rounded-2xl p-6 blur-in-up relative overflow-hidden"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: `radial-gradient(120px 120px at 80% 20%, ${accent}, transparent)` }} />
              <div className="text-white/50 font-body font-light text-sm mb-3">{label}</div>
              <div className="text-4xl md:text-5xl font-heading italic text-white leading-none">
                {value}<span className="text-2xl text-white/50">{suffix}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Habits header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-heading italic text-white">Your Habits</h2>
          <button
            onClick={() => router.push('/dashboard/habits/new')}
            className="flex items-center gap-1.5 liquid-glass-strong rounded-full px-4 py-2 text-sm font-body font-medium text-white hover:scale-105 transition"
          >
            <Plus size={14} /> Add Habit
          </button>
        </div>

        {/* Empty state */}
        {habits.length === 0 ? (
          <div className="liquid-glass rounded-2xl p-12 text-center blur-in-up">
            <div className="text-5xl mb-4">🎯</div>
            <h3 className="text-xl font-heading italic text-white mb-2">No habits yet</h3>
            <p className="text-white/50 font-body font-light text-sm mb-7">Create your first habit to start tracking!</p>
            <button
              onClick={() => router.push('/dashboard/habits/new')}
              className="liquid-glass-strong rounded-full px-6 py-3 text-sm font-body font-medium text-white flex items-center gap-1.5 mx-auto"
            >
              Create First Habit <ArrowUpRight size={14} />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {habits.map((habit, i) => {
              const streakPct = habit.longest_streak > 0
                ? Math.round((habit.streak_count / habit.longest_streak) * 100)
                : 0
              return (
                <div
                  key={habit.id}
                  className="liquid-glass rounded-2xl p-6 cursor-pointer hover:scale-[1.01] transition-transform blur-in-up"
                  style={{ animationDelay: `${i * 0.06}s` }}
                  onClick={() => router.push(`/dashboard/habits/${habit.id}`)}
                >
                  {/* Top: icon + name */}
                  <div className="flex items-start gap-3 mb-5">
                    <div className="liquid-glass-strong rounded-full w-11 h-11 flex items-center justify-center text-xl shrink-0">
                      {getIcon(habit.template_type)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-heading italic text-lg text-white leading-tight truncate">{habit.name}</h3>
                      {habit.description && (
                        <p className="text-white/40 font-body font-light text-xs mt-0.5 truncate">{habit.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Streak */}
                  <div className="mb-4">
                    <div className="flex items-end justify-between mb-2">
                      <span className="text-white/50 font-body font-light text-xs">Current streak</span>
                      <span className="text-white/40 font-body text-xs">Best: {habit.longest_streak}d</span>
                    </div>
                    <div className="flex items-baseline gap-1.5 mb-2">
                      <span className="text-3xl font-heading italic text-white leading-none">🔥 {habit.streak_count}</span>
                      <span className="text-white/50 font-body text-sm">days</span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-white/40 transition-all"
                        style={{ width: `${streakPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Reminder chip */}
                  <div className="flex items-center gap-2 mb-5">
                    <span className="liquid-glass rounded-full px-2.5 py-1 text-xs font-body text-white/60">
                      🕐 {formatTime(habit.reminder_time)}
                    </span>
                    {!habit.reminder_enabled && (
                      <span className="liquid-glass rounded-full px-2.5 py-1 text-xs font-body text-yellow-400/70">
                        Paused
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-white/10">
                    <button
                      onClick={(e) => { e.stopPropagation(); /* TODO: quick log */ }}
                      className="flex-1 liquid-glass-strong rounded-full py-2 text-sm font-body font-medium text-white hover:scale-105 transition"
                    >
                      Log Now
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/habits/${habit.id}/edit`) }}
                      className="flex-1 liquid-glass rounded-full py-2 text-sm font-body font-medium text-white/70 hover:text-white transition"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* SMS Help */}
        <div className="mt-10 liquid-glass rounded-2xl p-6 blur-in-up">
          <h3 className="font-heading italic text-lg text-white mb-4">📱 How to use HabitSMS</h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              ['Y or YES', 'Mark a habit as done'],
              ['N or NO', 'Skip a day'],
              ['Number', 'Log a quantity (e.g. "8" for 8 glasses)'],
              ['STATS', 'View all your streaks'],
              ['PAUSE', 'Activate vacation mode'],
              ['HELP', 'See all commands'],
            ].map(([cmd, desc]) => (
              <li key={cmd} className="flex items-center gap-2 text-sm font-body">
                <span className="liquid-glass rounded-full px-2.5 py-0.5 text-white font-medium text-xs shrink-0">{cmd}</span>
                <span className="text-white/50 font-light">{desc}</span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  )
}
