'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowUpRight, ChevronDown } from 'lucide-react'

const COUNTRIES = [
  { code: 'IN', dial: '+91', flag: '🇮🇳', name: 'India' },
  { code: 'US', dial: '+1', flag: '🇺🇸', name: 'United States' },
  { code: 'GB', dial: '+44', flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'AE', dial: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: 'SG', dial: '+65', flag: '🇸🇬', name: 'Singapore' },
  { code: 'AU', dial: '+61', flag: '🇦🇺', name: 'Australia' },
  { code: 'CA', dial: '+1', flag: '🇨🇦', name: 'Canada' },
  { code: 'DE', dial: '+49', flag: '🇩🇪', name: 'Germany' },
]

export default function LoginPage() {
  const [country, setCountry] = useState(COUNTRIES[0])
  const [number, setNumber] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const fullPhone = `${country.dial}${number.replace(/\D/g, '')}`

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
        options: { channel: 'sms' },
      })
      if (error) throw error
      router.push(`/verify?phone=${encodeURIComponent(fullPhone)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
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
        <a href="/" className="text-white/50 font-body text-sm hover:text-white transition">
          ← Back to home
        </a>
      </nav>

      <div className="relative z-10 flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8 blur-in">
            <h1 className="text-3xl sm:text-4xl font-heading italic text-white mb-2">
              Welcome back.
            </h1>
            <p className="text-white/50 font-body font-light text-sm">
              Enter your phone number to receive a one-time code.
            </p>
          </div>

          <div className="liquid-glass rounded-2xl p-6 sm:p-8 blur-in-up">
            <form onSubmit={handlePhoneLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-body text-white/60 mb-2">
                  Phone number
                </label>
                <div className="flex gap-2">
                  {/* Country picker */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="h-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-body flex items-center gap-1.5 hover:border-white/20 transition whitespace-nowrap"
                    >
                      <span>{country.flag}</span>
                      <span className="text-sm">{country.dial}</span>
                      <ChevronDown size={12} className="text-white/40" />
                    </button>
                    {showDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-52 bg-[#0a0f1e] border border-white/10 rounded-xl overflow-hidden z-50 shadow-xl">
                        {COUNTRIES.map((c) => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => { setCountry(c); setShowDropdown(false) }}
                            className="w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-white/5 transition text-left"
                          >
                            <span className="text-base">{c.flag}</span>
                            <span className="text-sm text-white/80 font-body">{c.name}</span>
                            <span className="text-xs text-white/40 font-body ml-auto">{c.dial}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Number input */}
                  <input
                    id="phone"
                    type="tel"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    onInput={(e) => setNumber((e.target as HTMLInputElement).value)}
                    placeholder="98765 43210"
                    required
                    autoComplete="tel-national"
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-body placeholder:text-white/25 focus:outline-none focus:border-white/30 transition text-base"
                  />
                </div>
                <p className="text-white/25 font-body font-light text-xs mt-2">
                  {fullPhone.length > 3 ? `Will send to ${fullPhone}` : 'Select country and enter number'}
                </p>
              </div>

              {error && (
                <div className="liquid-glass rounded-xl px-4 py-3 text-red-400 font-body text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || number.replace(/\D/g, '').length < 7}
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
