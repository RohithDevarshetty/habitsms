'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { HABIT_TEMPLATES } from '@/types/habits'

const RESPONSE_UNITS = ['glasses', 'pages', 'minutes', 'hours', 'reps', 'km', 'miles', 'sessions']

export default function NewHabitPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'template' | 'custom'>('template')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [responseType, setResponseType] = useState<'boolean' | 'number'>('boolean')
  const [responseUnit, setResponseUnit] = useState('')
  const [reminderTime, setReminderTime] = useState('07:00')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  function applyTemplate(tpl: typeof HABIT_TEMPLATES[0]) {
    if (tpl.template_type === 'custom') { setMode('custom'); return }
    setSelectedTemplate(tpl.template_type)
    setName(tpl.name)
    setResponseType(tpl.response_type as 'boolean' | 'number')
    setResponseUnit(tpl.response_unit || '')
    setReminderTime(tpl.default_reminder_time)
    setMode('custom')
  }

  async function handleCreate() {
    if (!name.trim()) { setError('Habit name is required'); return }
    setSaving(true)
    setError('')

    const res = await fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        response_type: responseType,
        response_unit: responseType === 'number' ? responseUnit : null,
        reminder_time: reminderTime,
        template_type: selectedTemplate || 'custom',
      }),
    })

    const json = await res.json()

    if (!res.ok) {
      if (json.code === 'UPGRADE_REQUIRED') {
        setError('Upgrade to a paid plan to create habits.')
      } else if (json.code === 'LIMIT_REACHED') {
        setError(`You've reached your ${json.limit}-habit limit. Upgrade to Pro for unlimited habits.`)
      } else {
        setError(json.error || 'Failed to create habit')
      }
      setSaving(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(700px 500px at 20% 20%, rgba(60,90,180,0.15), transparent 60%),
            linear-gradient(180deg, #050a18 0%, #000 100%)
          `,
        }}
      />

      <nav className="relative z-10 px-5 sm:px-8 py-5 flex items-center justify-between border-b border-white/5">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 liquid-glass rounded-full px-4 py-2 text-sm font-body text-white/70 hover:text-white transition"
        >
          <ArrowLeft size={14} /> Dashboard
        </button>
        <span className="font-heading italic text-lg">New Habit</span>
      </nav>

      <main className="relative z-10 max-w-lg mx-auto px-5 py-10">

        {mode === 'template' && (
          <div className="blur-in">
            <p className="text-white/40 font-body text-sm mb-5">Start from a template or create your own.</p>
            <div className="space-y-3">
              {HABIT_TEMPLATES.map(tpl => (
                <button
                  key={tpl.template_type}
                  onClick={() => applyTemplate(tpl)}
                  className="w-full liquid-glass rounded-2xl p-4 flex items-center gap-4 text-left hover:bg-white/5 transition"
                >
                  <div className="liquid-glass-strong rounded-full w-12 h-12 flex items-center justify-center text-2xl shrink-0">
                    {tpl.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body font-medium text-white text-sm">{tpl.name}</p>
                    <p className="font-body font-light text-white/50 text-xs mt-0.5">{tpl.description}</p>
                  </div>
                  <ArrowUpRight size={16} className="text-white/30 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'custom' && (
          <div className="blur-in space-y-5">
            <div className="liquid-glass rounded-2xl p-6 space-y-5">
              <div>
                <label className="block text-sm font-body text-white/60 mb-2">Habit name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g., Morning run"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-body placeholder:text-white/25 focus:outline-none focus:border-white/30 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-body text-white/60 mb-2">Response type</label>
                <div className="flex gap-2">
                  {(['boolean', 'number'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setResponseType(t)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-body transition ${
                        responseType === t ? 'bg-white text-black' : 'liquid-glass text-white/60'
                      }`}
                    >
                      {t === 'boolean' ? 'Yes / No' : 'Number'}
                    </button>
                  ))}
                </div>
              </div>

              {responseType === 'number' && (
                <div>
                  <label className="block text-sm font-body text-white/60 mb-2">Unit</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {RESPONSE_UNITS.map(u => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setResponseUnit(u)}
                        className={`px-3 py-1.5 rounded-full text-xs font-body transition ${
                          responseUnit === u ? 'bg-white text-black' : 'liquid-glass text-white/60'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={responseUnit}
                    onChange={e => setResponseUnit(e.target.value)}
                    placeholder="Or type a custom unit"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-body placeholder:text-white/25 focus:outline-none focus:border-white/30 transition"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-body text-white/60 mb-2">Daily reminder time</label>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={e => setReminderTime(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-body focus:outline-none focus:border-white/30 transition [color-scheme:dark]"
                />
              </div>

              {error && (
                <div className="liquid-glass rounded-xl px-4 py-3 text-red-400 font-body text-sm">
                  {error}
                  {(error.includes('Upgrade') || error.includes('limit')) && (
                    <button
                      onClick={() => router.push('/upgrade')}
                      className="block mt-2 text-white underline text-xs"
                    >
                      View upgrade options →
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setMode('template')}
                className="flex-1 liquid-glass rounded-full py-3 text-sm font-body text-white/60 hover:text-white transition"
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !name.trim()}
                className="flex-1 bg-white text-black rounded-full py-3 text-sm font-body font-semibold flex items-center justify-center gap-1.5 hover:bg-white/90 transition disabled:opacity-50"
              >
                {saving ? 'Creating…' : <><span>Create Habit</span><ArrowUpRight size={14} /></>}
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
