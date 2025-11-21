'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { HABIT_TEMPLATES } from '@/types/habits'

export default function EditHabitPage() {
  const [habit, setHabit] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  useEffect(() => {
    loadHabit()
  }, [])

  async function loadHabit() {
    const { data } = await supabase
      .from('habits')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!data) {
      router.push('/dashboard')
      return
    }

    setHabit(data)
    setLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase
      .from('habits')
      .update({
        name: habit.name,
        description: habit.description,
        reminder_time: habit.reminder_time,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    if (error) {
      alert('Failed to save changes')
      setSaving(false)
    } else {
      router.push(`/dashboard/habits/${params.id}`)
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
    const template = HABIT_TEMPLATES.find(t => t.template_type === type)
    return template?.icon || '⭐'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <button
            onClick={() => router.push(`/dashboard/habits/${params.id}`)}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            ← Back
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl p-8 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <span className="text-6xl">{getIcon(habit.template_type)}</span>
              <h1 className="text-3xl font-bold text-gray-900">Edit Habit</h1>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Habit Name *
                </label>
                <input
                  type="text"
                  value={habit.name}
                  onChange={(e) => setHabit({ ...habit, name: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={habit.description || ''}
                  onChange={(e) => setHabit({ ...habit, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Optional description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reminder Time *
                </label>
                <input
                  type="time"
                  value={habit.reminder_time}
                  onChange={(e) => setHabit({ ...habit, reminder_time: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">
                  You'll receive an SMS reminder at this time every day
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Habit Type</h3>
                <p className="text-sm text-gray-600">
                  <strong>Response Type:</strong> {habit.response_type}
                  {habit.response_unit && (
                    <span className="ml-2">
                      (Unit: {habit.response_unit})
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Note: Response type and unit cannot be changed after creation
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => router.push(`/dashboard/habits/${params.id}`)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
