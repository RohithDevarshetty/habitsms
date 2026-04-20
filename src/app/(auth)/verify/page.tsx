'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowUpRight } from 'lucide-react'

function VerifyForm() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const phone = searchParams.get('phone')
  const supabase = createClient()

  useEffect(() => {
    if (!phone) router.push('/login')
    inputRef.current?.focus()
  }, [phone, router])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: phone!,
        token: code,
        type: 'sms',
      })
      if (error) throw error
      router.push('/onboarding')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code')
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    setError('')
    setMessage('')

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phone!,
        options: { channel: 'sms' },
      })
      if (error) throw error
      setMessage('New code sent!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code')
    } finally {
      setResending(false)
    }
  }

  const maskedPhone = phone
    ? phone.slice(0, -4).replace(/\d/g, '•') + phone.slice(-4)
    : ''

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
        <a href="/login" className="text-white/50 font-body text-sm hover:text-white transition">
          ← Back
        </a>
      </nav>

      {/* Center card */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="text-center mb-8 blur-in">
            <div className="liquid-glass-strong rounded-full w-14 h-14 flex items-center justify-center text-2xl mx-auto mb-5">
              📱
            </div>
            <h1 className="text-3xl sm:text-4xl font-heading italic text-white mb-2">
              Check your phone.
            </h1>
            <p className="text-white/50 font-body font-light text-sm">
              We sent a 6-digit code to{' '}
              <span className="text-white/80 font-medium">{maskedPhone}</span>
            </p>
          </div>

          {/* Glass form */}
          <div className="liquid-glass rounded-2xl p-6 sm:p-8 blur-in-up">
            <form onSubmit={handleVerify} className="space-y-5">
              <div>
                <label htmlFor="code" className="block text-sm font-body text-white/60 mb-2">
                  Verification code
                </label>
                <input
                  ref={inputRef}
                  id="code"
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="——————"
                  required
                  maxLength={6}
                  className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white font-body placeholder:text-white/20 focus:outline-none focus:border-white/30 transition text-center text-3xl tracking-[0.5em] font-medium"
                />
              </div>

              {error && (
                <div className="liquid-glass rounded-xl px-4 py-3 text-red-400 font-body text-sm">
                  {error}
                </div>
              )}
              {message && (
                <div className="liquid-glass rounded-xl px-4 py-3 text-green-400 font-body text-sm">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full bg-white text-black rounded-full py-3 text-sm font-body font-semibold flex items-center justify-center gap-1.5 hover:bg-white/90 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying…' : <><span>Verify & Continue</span><ArrowUpRight size={14} /></>}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={handleResend}
                disabled={resending || loading}
                className="text-sm font-body text-white/40 hover:text-white/70 transition disabled:opacity-30"
              >
                {resending ? 'Sending…' : "Didn't receive it? Resend code"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="text-white">Loading...</div></div>}>
      <VerifyForm />
    </Suspense>
  )
}
