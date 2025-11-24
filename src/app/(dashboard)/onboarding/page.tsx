'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { HABIT_TEMPLATES } from '@/types/habits'
import { User } from '@supabase/supabase-js'

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  // Step 1: User info
  const [phoneNumber, setPhoneNumber] = useState('')
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone)

  // Step 2: Habit selection
  const [selectedHabits, setSelectedHabits] = useState<string[]>([])

  // Step 3: Reminder times
  const [reminderTimes, setReminderTimes] = useState<Record<string, string>>({})

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)
    // Pre-fill phone if available
    if (user.phone) {
      setPhoneNumber(user.phone)
    }
  }

  const handleStep1Next = () => {
    if (!phoneNumber) {
      alert('Please enter your phone number')
      return
    }
    setStep(2)
  }

  const handleStep2Next = () => {
    if (selectedHabits.length === 0) {
      alert('Please select at least one habit')
      return
    }

    // Initialize reminder times with defaults
    const times: Record<string, string> = {}
    selectedHabits.forEach(templateType => {
      const template = HABIT_TEMPLATES.find(t => t.template_type === templateType)
      if (template) {
        times[templateType] = template.default_reminder_time
      }
    })
    setReminderTimes(times)
    setStep(3)
  }

  const handleComplete = async () => {
    setLoading(true)

    try {
      // Create/update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          phone_number: phoneNumber,
          timezone,
          updated_at: new Date().toISOString(),
        })

      if (profileError) throw profileError

      // Create habits
      for (const templateType of selectedHabits) {
        const template = HABIT_TEMPLATES.find(t => t.template_type === templateType)
        if (!template) continue

        const { error: habitError } = await supabase
          .from('habits')
          .insert({
            user_id: user.id,
            template_type: templateType,
            name: template.name,
            description: template.description,
            response_type: template.response_type,
            response_unit: template.response_unit,
            reminder_time: reminderTimes[templateType],
            reminder_enabled: true,
            is_active: true,
          })

        if (habitError) throw habitError
      }

      // Send welcome SMS
      await fetch('/api/sms/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })

      router.push('/dashboard')
    } catch (error) {
      console.error('Onboarding error:', error)
      alert(error instanceof Error ? error.message : 'Failed to complete onboarding')
    } finally {
      setLoading(false)
    }
  }

  const toggleHabit = (templateType: string) => {
    if (selectedHabits.includes(templateType)) {
      setSelectedHabits(selectedHabits.filter(t => t !== templateType))
    } else {
      setSelectedHabits([...selectedHabits, templateType])
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600">Step {step} of 3</span>
            <span className="text-sm font-medium text-blue-600">{Math.round((step / 3) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: User Info */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Let&apos;s get started!</h2>
            <p className="text-gray-600 mb-6">We need a few details to set up your account</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1234567890"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">We&apos;ll send habit reminders to this number</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="America/New_York">Eastern Time (US)</option>
                  <option value="America/Chicago">Central Time (US)</option>
                  <option value="America/Denver">Mountain Time (US)</option>
                  <option value="America/Los_Angeles">Pacific Time (US)</option>
                  <option value="Asia/Kolkata">India (IST)</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleStep1Next}
              className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Habit Selection */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Habits</h2>
            <p className="text-gray-600 mb-6">Select habits you want to track (you can add more later)</p>

            <div className="grid grid-cols-1 gap-3 mb-6">
              {HABIT_TEMPLATES.map((template) => (
                <button
                  key={template.template_type}
                  onClick={() => toggleHabit(template.template_type)}
                  className={`p-4 rounded-lg border-2 transition text-left ${
                    selectedHabits.includes(template.template_type)
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{template.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{template.name}</h3>
                      <p className="text-sm text-gray-600">{template.description}</p>
                    </div>
                    {selectedHabits.includes(template.template_type) && (
                      <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
              >
                Back
              </button>
              <button
                onClick={handleStep2Next}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Reminder Times */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Set Reminder Times</h2>
            <p className="text-gray-600 mb-6">When should we remind you about each habit?</p>

            <div className="space-y-4 mb-6">
              {selectedHabits.map((templateType) => {
                const template = HABIT_TEMPLATES.find(t => t.template_type === templateType)
                if (!template) return null

                return (
                  <div key={templateType} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{template.icon}</span>
                      <span className="font-semibold">{template.name}</span>
                    </div>
                    <input
                      type="time"
                      value={reminderTimes[templateType] || ''}
                      onChange={(e) => setReminderTimes({
                        ...reminderTimes,
                        [templateType]: e.target.value
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
              >
                Back
              </button>
              <button
                onClick={handleComplete}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Setting up...' : 'Complete Setup'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
