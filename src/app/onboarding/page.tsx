'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { HABIT_TEMPLATES } from '@/types/habits'
import { ArrowUpRight, Check } from 'lucide-react'

const TIMEZONES = [
  { label: 'India (IST)', value: 'Asia/Kolkata' },
  { label: 'US East (EST)', value: 'America/New_York' },
  { label: 'US West (PST)', value: 'America/Los_Angeles' },
  { label: 'US Central (CST)', value: 'America/Chicago' },
  { label: 'UK (GMT)', value: 'Europe/London' },
  { label: 'Europe (CET)', value: 'Europe/Paris' },
  { label: 'UAE (GST)', value: 'Asia/Dubai' },
  { label: 'Singapore (SGT)', value: 'Asia/Singapore' },
  { label: 'Japan (JST)', value: 'Asia/Tokyo' },
  { label: 'Australia East (AEST)', value: 'Australia/Sydney' },
  { label: 'UTC', value: 'UTC' },
]

function detectTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

interface SelectedHabit {
  template_type: string
  name: string
  description: string
  response_type: string
  response_unit?: string
  icon: string
  reminder_time: string
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [timezone, setTimezone] = useState('')
  const [selected, setSelected] = useState<SelectedHabit[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login')
    })
    setTimezone(detectTimezone())
  }, [])

  function toggleTemplate(tpl: typeof HABIT_TEMPLATES[0]) {
    setSelected(prev => {
      const exists = prev.find(s => s.template_type === tpl.template_type)
      if (exists) return prev.filter(s => s.template_type !== tpl.template_type)
      if (prev.length >= 3) return prev
      return [...prev, {
        template_type: tpl.template_type,
        name: tpl.name,
        description: tpl.description,
        response_type: tpl.response_type,
        response_unit: tpl.response_unit,
        icon: tpl.icon,
        reminder_time: tpl.default_reminder_time,
      }]
    })
  }

  function updateReminderTime(template_type: string, time: string) {
    setSelected(prev => prev.map(s =>
      s.template_type === template_type ? { ...s, reminder_time: time } : s
    ))
  }

  async function handleFinish() {
    setSaving(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Upsert profile with timezone
      const { error: profileErr } = await supabase
        .from('profiles')
        .upsert({ id: user.id, phone_number: user.phone ?? '', timezone }, { onConflict: 'id' })
      if (profileErr) throw profileErr

      // Create selected habits
      if (selected.length > 0) {
        const { error: habitsErr } = await supabase.from('habits').insert(
          selected.map(s => ({
            user_id: user.id,
            template_type: s.template_type,
            name: s.name,
            description: s.description,
            response_type: s.response_type,
            response_unit: s.response_unit ?? null,
            reminder_time: s.reminder_time,
            reminder_enabled: true,
            is_active: true,
          }))
        )
        if (habitsErr) throw habitsErr
      }

      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Background */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(900px 600px at 20% 30%, rgba(60,90,180,0.2), transparent 60%),
            radial-gradient(700px 500px at 80% 70%, rgba(40,60,140,0.15), transparent 60%),
            linear-gradient(180deg, #050a18 0%, #000 100%)
          `,
        }}
      />

      {/* Navbar */}
      <nav className="relative z-10 px-5 sm:px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full liquid-glass-strong flex items-center justify-center shrink-0">
            <div
              className="w-4 h-4 rounded-full"
              style={{ background: 'radial-gradient(circle at 30% 30%, #fff, #cfd8ea 60%, #7a8cb8)' }}
            />
          </div>
          <span className="font-heading italic text-xl tracking-tight">HabitSMS</span>
        </div>
        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map(n => (
            <div
              key={n}
              className={`h-2 rounded-full transition-all duration-300 ${
                n === step ? 'w-6 bg-white' : n < step ? 'w-2 bg-white/60' : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </div>
      </nav>

      <div className="relative z-10 flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-lg">

          {/* ── Step 1: Timezone ── */}
          {step === 1 && (
            <div className="blur-in">
              <div className="text-center mb-8">
                <div className="liquid-glass-strong rounded-full w-14 h-14 flex items-center justify-center text-2xl mx-auto mb-5">
                  🌍
                </div>
                <h1 className="text-3xl sm:text-4xl font-heading italic text-white mb-2">
                  Where are you?
                </h1>
                <p className="text-white/50 font-body font-light text-sm">
                  We&apos;ll send your reminders at the right local time.
                </p>
              </div>

              <div className="liquid-glass rounded-2xl p-6 sm:p-8">
                <label className="block text-sm font-body text-white/60 mb-2">
                  Your timezone
                </label>
                <select
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-body focus:outline-none focus:border-white/30 transition [color-scheme:dark]"
                >
                  {/* Show detected timezone first if not in list */}
                  {!TIMEZONES.find(t => t.value === timezone) && (
                    <option value={timezone}>{timezone} (detected)</option>
                  )}
                  {TIMEZONES.map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label} — {tz.value}</option>
                  ))}
                </select>
                <p className="text-white/25 font-body font-light text-xs mt-2">
                  Auto-detected from your browser
                </p>

                <button
                  onClick={() => setStep(2)}
                  className="mt-6 w-full bg-white text-black rounded-full py-3 text-sm font-body font-semibold flex items-center justify-center gap-1.5 hover:bg-white/90 transition"
                >
                  <span>Continue</span><ArrowUpRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Choose Habits ── */}
          {step === 2 && (
            <div className="blur-in">
              <div className="text-center mb-8">
                <div className="liquid-glass-strong rounded-full w-14 h-14 flex items-center justify-center text-2xl mx-auto mb-5">
                  🎯
                </div>
                <h1 className="text-3xl sm:text-4xl font-heading italic text-white mb-2">
                  Pick your habits.
                </h1>
                <p className="text-white/50 font-body font-light text-sm">
                  Choose up to 3 habits to track via SMS.
                </p>
              </div>

              <div className="space-y-3">
                {HABIT_TEMPLATES.map(tpl => {
                  const isSelected = !!selected.find(s => s.template_type === tpl.template_type)
                  const atLimit = selected.length >= 3 && !isSelected
                  return (
                    <button
                      key={tpl.template_type}
                      onClick={() => toggleTemplate(tpl)}
                      disabled={atLimit}
                      className={`w-full liquid-glass rounded-2xl p-4 flex items-center gap-4 text-left transition-all duration-200
                        ${isSelected ? 'ring-1 ring-white/30 bg-white/5' : ''}
                        ${atLimit ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/5 cursor-pointer'}
                      `}
                    >
                      <div className="liquid-glass-strong rounded-full w-12 h-12 flex items-center justify-center text-2xl shrink-0">
                        {tpl.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body font-medium text-white text-sm">{tpl.name}</p>
                        <p className="font-body font-light text-white/50 text-xs mt-0.5">{tpl.description}</p>
                        <p className="font-body text-white/30 text-xs mt-0.5">
                          Default: {formatTime(tpl.default_reminder_time)} · Tracks {tpl.response_unit ?? 'completion'}
                        </p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                        isSelected ? 'bg-white border-white' : 'border-white/20'
                      }`}>
                        {isSelected && <Check size={11} className="text-black" strokeWidth={3} />}
                      </div>
                    </button>
                  )
                })}
              </div>

              {selected.length >= 3 && (
                <p className="text-center text-white/40 font-body text-xs mt-3">
                  Max 3 habits to start — you can add more later
                </p>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 liquid-glass rounded-full py-3 text-sm font-body text-white/60 hover:text-white transition"
                >
                  Back
                </button>
                <button
                  onClick={() => selected.length > 0 ? setStep(3) : handleFinish()}
                  className="flex-1 bg-white text-black rounded-full py-3 text-sm font-body font-semibold flex items-center justify-center gap-1.5 hover:bg-white/90 transition"
                >
                  {selected.length > 0
                    ? <><span>Set Reminders</span><ArrowUpRight size={14} /></>
                    : <><span>Skip for now</span><ArrowUpRight size={14} /></>
                  }
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Reminder Times ── */}
          {step === 3 && (
            <div className="blur-in">
              <div className="text-center mb-8">
                <div className="liquid-glass-strong rounded-full w-14 h-14 flex items-center justify-center text-2xl mx-auto mb-5">
                  ⏰
                </div>
                <h1 className="text-3xl sm:text-4xl font-heading italic text-white mb-2">
                  When should we text you?
                </h1>
                <p className="text-white/50 font-body font-light text-sm">
                  Set a daily reminder time for each habit.
                </p>
              </div>

              <div className="liquid-glass rounded-2xl p-6 sm:p-8 space-y-5">
                {selected.map(s => (
                  <div key={s.template_type}>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg">{s.icon}</span>
                      <label className="text-sm font-body font-medium text-white/80">{s.name}</label>
                    </div>
                    <input
                      type="time"
                      value={s.reminder_time}
                      onChange={e => updateReminderTime(s.template_type, e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-body focus:outline-none focus:border-white/30 transition [color-scheme:dark]"
                    />
                  </div>
                ))}

                {error && (
                  <div className="liquid-glass rounded-xl px-4 py-3 text-red-400 font-body text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setStep(2)}
                    className="flex-1 liquid-glass rounded-full py-3 text-sm font-body text-white/60 hover:text-white transition"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleFinish}
                    disabled={saving}
                    className="flex-1 bg-white text-black rounded-full py-3 text-sm font-body font-semibold flex items-center justify-center gap-1.5 hover:bg-white/90 transition disabled:opacity-50"
                  >
                    {saving ? 'Setting up…' : <><span>Start tracking</span><ArrowUpRight size={14} /></>}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
