'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { format } from 'date-fns'

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
  reminder_time: string
  reminder_enabled: boolean
  streak_count: number
  longest_streak: number
  response_type: string
  response_unit: string | null
  template_type: string | null
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

    if (!habitData) {
      router.push('/dashboard')
      return
    }

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

    if (error) {
      alert('Failed to delete habit')
    } else {
      router.push('/dashboard')
    }
  }

  async function toggleReminder() {
    const { error } = await supabase
      .from('habits')
      .update({ reminder_enabled: !habit.reminder_enabled })
      .eq('id', params.id)

    if (!error) {
      setHabit({ ...habit, reminder_enabled: !habit.reminder_enabled })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const getIcon = (type: string | null) => {
    const icons: Record<string, string> = {
      workout: '💪',
      meditate: '🧘',
      water: '💧',
      read: '📚',
      sleep: '😴',
    }
    return icons[type || ''] || '⭐'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Habit Header */}
          <div className="bg-white rounded-xl p-8 shadow-sm mb-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <span className="text-6xl">{getIcon(habit.template_type)}</span>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{habit.name}</h1>
                  {habit.description && (
                    <p className="text-gray-600 mt-1">{habit.description}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => router.push(`/dashboard/habits/${habit.id}/edit`)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Edit
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">{habit.streak_count}</div>
                <div className="text-sm text-gray-600">Current Streak</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">{habit.longest_streak}</div>
                <div className="text-sm text-gray-600">Longest Streak</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">{logs.filter(l => l.completed).length}</div>
                <div className="text-sm text-gray-600">Total Completed</div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={toggleReminder}
                className={`flex-1 py-3 rounded-lg font-medium transition ${
                  habit.reminder_enabled
                    ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                }`}
              >
                {habit.reminder_enabled ? '⏸ Pause Reminders' : '▶ Resume Reminders'}
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-50 text-red-600 py-3 rounded-lg font-medium hover:bg-red-100 transition"
              >
                🗑 Delete Habit
              </button>
            </div>
          </div>

          {/* Activity Log */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
            {logs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No activity yet. Start logging your habit!
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {log.completed ? '✅' : '❌'}
                      </span>
                      <div>
                        <div className="font-medium text-gray-900">
                          {log.completed ? 'Completed' : 'Skipped'}
                          {log.response_value && log.response_value !== 'Y' && log.response_value !== 'N' && (
                            <span className="ml-2 text-blue-600">({log.response_value} {habit.response_unit})</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {format(new Date(log.logged_at), 'MMM d, yyyy h:mm a')}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 uppercase bg-gray-200 px-2 py-1 rounded">
                      {log.source}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
