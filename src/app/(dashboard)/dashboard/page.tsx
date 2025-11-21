'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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
    if (!user) {
      router.push('/login')
      return
    }
  }

  async function loadHabits() {
    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading habits:', error)
    } else {
      setHabits(data || [])
    }
    setLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const getHabitIcon = (templateType: string | null) => {
    const icons: Record<string, string> = {
      workout: '💪',
      meditate: '🧘',
      water: '💧',
      read: '📚',
      sleep: '😴',
      custom: '⭐',
    }
    return icons[templateType || 'custom'] || '⭐'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your habits...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">HabitSMS</h1>
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-gray-600 text-sm mb-1">Active Habits</div>
            <div className="text-3xl font-bold text-gray-900">{habits.length}</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-gray-600 text-sm mb-1">Total Streaks</div>
            <div className="text-3xl font-bold text-blue-600">
              {habits.reduce((sum, h) => sum + h.streak_count, 0)}
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-gray-600 text-sm mb-1">Longest Streak</div>
            <div className="text-3xl font-bold text-purple-600">
              {Math.max(...habits.map(h => h.longest_streak), 0)} days
            </div>
          </div>
        </div>

        {/* Habits List */}
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Your Habits</h2>
          <button
            onClick={() => router.push('/dashboard/habits/new')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            + Add Habit
          </button>
        </div>

        {habits.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No habits yet</h3>
            <p className="text-gray-600 mb-6">Create your first habit to start tracking!</p>
            <button
              onClick={() => router.push('/dashboard/habits/new')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Create First Habit
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {habits.map((habit) => (
              <div
                key={habit.id}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition cursor-pointer"
                onClick={() => router.push(`/dashboard/habits/${habit.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{getHabitIcon(habit.template_type)}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{habit.name}</h3>
                      {habit.description && (
                        <p className="text-sm text-gray-600">{habit.description}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Current Streak</span>
                    <span className="text-lg font-bold text-blue-600">
                      🔥 {habit.streak_count} days
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Best Streak</span>
                    <span className="text-sm font-semibold text-gray-900">
                      ⭐ {habit.longest_streak} days
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Reminder</span>
                    <span className="text-sm text-gray-900">
                      🕐 {habit.reminder_time}
                      {!habit.reminder_enabled && (
                        <span className="ml-2 text-red-600">(Paused)</span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        // TODO: Quick log habit
                      }}
                      className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition"
                    >
                      Log Now
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/dashboard/habits/${habit.id}/edit`)
                      }}
                      className="flex-1 bg-gray-50 text-gray-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-2">📱 How to use HabitSMS</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• Reply <strong>Y</strong> or <strong>YES</strong> to mark a habit as done</li>
            <li>• Reply <strong>N</strong> or <strong>NO</strong> to skip a day</li>
            <li>• Reply with a <strong>number</strong> for quantity-based habits</li>
            <li>• Reply <strong>STATS</strong> to view all your streaks</li>
            <li>• Reply <strong>PAUSE</strong> to activate vacation mode</li>
            <li>• Reply <strong>HELP</strong> to see all commands</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
