'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowUpRight } from 'lucide-react'

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: { channel: 'sms' },
      })
      if (error) throw error
      router.push(`/verify?phone=${encodeURIComponent(phone)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code')
      setLoading(false)
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
        <a href="/" className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full liquid-glass-strong flex items-center justify-center shrink-0">
            <div
              className="w-4 h-4 rounded-full"
              style={{ background: 'radial-gradient(circle at 30% 30%, #fff, #cfd8ea 60%, #7a8cb8)' }}
            />
          </div>
          <span className="font-heading italic text-xl tracking-tight">HabitSMS</span>
        </a>
        <a
          href="/"
          className="text-white/50 font-body text-sm hover:text-white transition"
        >
          ← Back to home
        </a>
      </nav>

      {/* Center card */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="text-center mb-8 blur-in">
            <h1 className="text-3xl sm:text-4xl font-heading italic text-white mb-2">
              Welcome back.
            </h1>
            <p className="text-white/50 font-body font-light text-sm">
              Enter your phone number to receive a one-time code.
            </p>
          </div>

          {/* Glass form */}
          <div className="liquid-glass rounded-2xl p-6 sm:p-8 blur-in-up">
            <form onSubmit={handlePhoneLogin} className="space-y-5">
              <div>
                <label htmlFor="phone" className="block text-sm font-body text-white/60 mb-2">
                  Phone number
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 234 567 8900"
                  required
                  autoComplete="tel"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-body placeholder:text-white/25 focus:outline-none focus:border-white/30 transition text-base"
                />
                <p className="text-white/25 font-body font-light text-xs mt-2">
                  Include country code · e.g. +91 for India, +1 for US
                </p>
              </div>

              {error && (
                <div className="liquid-glass rounded-xl px-4 py-3 text-red-400 font-body text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || phone.length < 8}
                className="w-full bg-white text-black rounded-full py-3 text-sm font-body font-semibold flex items-center justify-center gap-1.5 hover:bg-white/90 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending code…' : <><span>Send Code</span><ArrowUpRight size={14} /></>}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-white/25 font-body font-light leading-relaxed">
              By signing in you agree to our{' '}
              <a href="/terms" className="text-white/50 hover:text-white transition underline underline-offset-2">Terms</a>
              {' '}and{' '}
              <a href="/privacy" className="text-white/50 hover:text-white transition underline underline-offset-2">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
