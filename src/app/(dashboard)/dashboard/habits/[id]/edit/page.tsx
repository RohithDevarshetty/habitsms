'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { HABIT_TEMPLATES } from '@/types/habits'
import { ArrowLeft } from 'lucide-react'

interface Habit {
  id: string
  name: string
  description: string | null
  reminder_time: string
  reminder_enabled: boolean
  response_type: string
  response_unit: string | null
  template_type: string | null
}

export default function EditHabitPage() {
  const [habit, setHabit] = useState<Habit | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  useEffect(() => {
    loadHabit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadHabit() {
    const { data } = await supabase
      .from('habits')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!data) { router.push('/dashboard'); return }
    setHabit(data)
    setLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!habit) return
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    )
  }

  if (!habit) return null

  const template = HABIT_TEMPLATES.find(t => t.template_type === habit.template_type)
  const icon = template?.icon || '⭐'

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-5 sm:px-8 lg:px-16 py-4 bg-black/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => router.push(`/dashboard/habits/${params.id}`)}
            className="flex items-center gap-2 liquid-glass rounded-full px-4 py-2 text-sm font-body text-white/70 hover:text-white transition"
          >
            <ArrowLeft size={14} /> Back
          </button>
        </div>
      </nav>

      <main className="pt-24 pb-16 px-5 sm:px-8 lg:px-16 max-w-2xl mx-auto">
        {/* Form card */}
        <div className="liquid-glass rounded-2xl p-6 sm:p-8 blur-in">
          <div className="flex items-center gap-4 mb-8">
            <div className="liquid-glass-strong rounded-full w-14 h-14 flex items-center justify-center text-3xl shrink-0">
              {icon}
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading italic text-white">Edit Habit</h1>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-body text-white/60 mb-2">
                Habit Name <span className="text-white/30">*</span>
              </label>
              <input
                type="text"
                value={habit.name}
                onChange={(e) => setHabit({ ...habit, name: e.target.value })}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-body placeholder:text-white/30 focus:outline-none focus:border-white/30 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-body text-white/60 mb-2">Description</label>
              <textarea
                value={habit.description || ''}
                onChange={(e) => setHabit({ ...habit, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-body font-light placeholder:text-white/30 focus:outline-none focus:border-white/30 transition resize-none"
                placeholder="Optional description…"
              />
            </div>

            <div>
              <label className="block text-sm font-body text-white/60 mb-2">
                Reminder Time <span className="text-white/30">*</span>
              </label>
              <input
                type="time"
                value={habit.reminder_time}
                onChange={(e) => setHabit({ ...habit, reminder_time: e.target.value })}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-body focus:outline-none focus:border-white/30 transition [color-scheme:dark]"
              />
              <p className="text-white/30 font-body font-light text-xs mt-2">
                You&apos;ll receive an SMS reminder at this time every day
              </p>
            </div>

            {/* Immutable info */}
            <div className="liquid-glass rounded-xl p-4">
              <h3 className="font-body font-medium text-white/60 text-sm mb-2">Habit Type</h3>
              <p className="text-white/40 font-body font-light text-sm">
                Response: <span className="text-white/60">{habit.response_type}</span>
                {habit.response_unit && (
                  <span className="ml-3">Unit: <span className="text-white/60">{habit.response_unit}</span></span>
                )}
              </p>
              <p className="text-white/25 font-body font-light text-xs mt-1">
                Response type and unit cannot be changed after creation
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push(`/dashboard/habits/${params.id}`)}
                className="flex-1 liquid-glass rounded-full py-3 text-sm font-body font-medium text-white/70 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-white text-black rounded-full py-3 text-sm font-body font-semibold hover:bg-white/90 transition disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
