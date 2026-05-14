'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Copy, Check, Download } from 'lucide-react'

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

interface Profile {
  phone_number: string
  timezone: string
  subscription_tier: string
  subscription_status: string
  referral_code: string | null
  buddy_phone: string | null
  buddy_name: string | null
  buddy_consent_status: 'pending' | 'accepted' | 'declined' | null
}

interface PaymentRecord {
  paymentId: string
  totalAmount: number
  currency: string
  createdAt: string
  invoiceId: string | null
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [timezone, setTimezone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [buddyPhone, setBuddyPhone] = useState('')
  const [buddyName, setBuddyName] = useState('')
  const [buddyBusy, setBuddyBusy] = useState(false)
  const [buddyError, setBuddyError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await supabase
      .from('profiles')
      .select('phone_number, timezone, subscription_tier, subscription_status, referral_code, buddy_phone, buddy_name, buddy_consent_status')
      .eq('id', user.id)
      .single()

    if (data) {
      setProfile(data)
      setTimezone(data.timezone || 'UTC')
    }
    setLoading(false)

    const res = await fetch('/api/billing/history')
    if (res.ok) {
      const json = await res.json()
      setPayments(json.payments || [])
    }
  }

  async function handleSaveTimezone() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('profiles').update({ timezone }).eq('id', user.id)
    setProfile(prev => prev ? { ...prev, timezone } : null)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  async function downloadInvoice(paymentId: string) {
    setDownloadingId(paymentId)
    try {
      const res = await fetch(`/api/billing/invoice/${paymentId}`)
      if (!res.ok) throw new Error('Failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${paymentId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Could not download invoice. Please try again.')
    } finally {
      setDownloadingId(null)
    }
  }

  async function handleSaveBuddy() {
    setBuddyError(null)
    if (!buddyPhone.trim()) {
      setBuddyError('Enter a phone number')
      return
    }
    setBuddyBusy(true)
    try {
      const res = await fetch('/api/buddy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: buddyPhone.trim(), name: buddyName.trim() }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setBuddyError(json.error || 'Failed to save buddy')
        return
      }
      setBuddyPhone('')
      setBuddyName('')
      await loadProfile()
    } finally {
      setBuddyBusy(false)
    }
  }

  async function handleRemoveBuddy() {
    if (!confirm('Remove your accountability buddy? They will be notified.')) return
    setBuddyBusy(true)
    try {
      await fetch('/api/buddy', { method: 'DELETE' })
      await loadProfile()
    } finally {
      setBuddyBusy(false)
    }
  }

  function copyReferralCode() {
    if (!profile?.referral_code) return
    const referralUrl = `${window.location.origin}/signup?ref=${profile.referral_code}`
    navigator.clipboard.writeText(referralUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    )
  }

  const tierLabel = profile?.subscription_tier
    ? profile.subscription_tier.charAt(0).toUpperCase() + profile.subscription_tier.slice(1)
    : 'Free'

  const isActive = profile?.subscription_status === 'active'

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
        <span className="font-heading italic text-lg">Settings</span>
      </nav>

      <main className="relative z-10 max-w-lg mx-auto px-5 py-10 space-y-5">

        {/* Account */}
        <div className="liquid-glass rounded-2xl p-6">
          <h2 className="font-heading italic text-lg text-white mb-4">Account</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-sm font-body text-white/50">Phone</span>
              <span className="text-sm font-body text-white">{profile?.phone_number || '—'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-sm font-body text-white/50">Plan</span>
              <span className={`text-sm font-body font-medium ${isActive ? 'text-green-400' : 'text-white/60'}`}>
                {tierLabel} {isActive ? '(Active)' : '(Inactive)'}
              </span>
            </div>
            {!isActive && (
              <button
                onClick={() => router.push('/upgrade')}
                className="w-full mt-2 bg-white text-black rounded-full py-2.5 text-sm font-body font-semibold hover:bg-white/90 transition"
              >
                Upgrade Plan
              </button>
            )}
          </div>
        </div>

        {/* Billing History */}
        {payments.length > 0 && (
          <div className="liquid-glass rounded-2xl p-6">
            <h2 className="font-heading italic text-lg text-white mb-4">Billing History</h2>
            <div className="space-y-2">
              {payments.map((p) => {
                const amount = p.totalAmount != null
                  ? (p.totalAmount / 100).toFixed(2)
                  : null
                const date = new Date(p.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                return (
                  <div key={p.paymentId} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div>
                      <p className="text-sm font-body text-white">{date}</p>
                      {amount && (
                        <p className="text-xs font-body text-white/40">{p.currency?.toUpperCase()} {amount}</p>
                      )}
                    </div>
                    <button
                      onClick={() => downloadInvoice(p.paymentId)}
                      disabled={downloadingId === p.paymentId}
                      className="flex items-center gap-1.5 liquid-glass-strong rounded-full px-3 py-1.5 text-xs font-body text-white/70 hover:text-white transition disabled:opacity-50"
                    >
                      <Download size={12} />
                      {downloadingId === p.paymentId ? 'Downloading…' : 'Invoice'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Timezone */}
        <div className="liquid-glass rounded-2xl p-6">
          <h2 className="font-heading italic text-lg text-white mb-4">Reminder Timezone</h2>
          <p className="text-sm font-body text-white/40 mb-4">
            All SMS reminders are sent in your local time. Changing this will affect upcoming reminders.
          </p>
          <select
            value={timezone}
            onChange={e => setTimezone(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-body focus:outline-none focus:border-white/30 transition [color-scheme:dark] mb-4"
          >
            {!TIMEZONES.find(t => t.value === timezone) && (
              <option value={timezone}>{timezone} (current)</option>
            )}
            {TIMEZONES.map(tz => (
              <option key={tz.value} value={tz.value}>{tz.label} — {tz.value}</option>
            ))}
          </select>
          <button
            onClick={handleSaveTimezone}
            disabled={saving || timezone === profile?.timezone}
            className="w-full bg-white text-black rounded-full py-2.5 text-sm font-body font-semibold hover:bg-white/90 transition disabled:opacity-50"
          >
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Timezone'}
          </button>
        </div>

        {/* Accountability Buddy */}
        <div className="liquid-glass rounded-2xl p-6">
          <h2 className="font-heading italic text-lg text-white mb-2">Accountability Buddy</h2>
          <p className="text-sm font-body text-white/40 mb-4">
            Pick one person who gets a text when you break a streak. Max 1 nudge per week. They must opt in by replying YES.
          </p>

          {profile?.buddy_phone ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-sm font-body text-white/50">Buddy</span>
                <span className="text-sm font-body text-white">
                  {profile.buddy_name || profile.buddy_phone}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-sm font-body text-white/50">Phone</span>
                <span className="text-sm font-body text-white/70">{profile.buddy_phone}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-sm font-body text-white/50">Status</span>
                <span
                  className={`text-sm font-body font-medium ${
                    profile.buddy_consent_status === 'accepted'
                      ? 'text-green-400'
                      : profile.buddy_consent_status === 'declined'
                      ? 'text-red-400'
                      : 'text-yellow-400'
                  }`}
                >
                  {profile.buddy_consent_status === 'accepted'
                    ? 'Opted in'
                    : profile.buddy_consent_status === 'declined'
                    ? 'Declined'
                    : 'Awaiting reply'}
                </span>
              </div>
              <button
                onClick={handleRemoveBuddy}
                disabled={buddyBusy}
                className="w-full liquid-glass rounded-full py-2.5 text-sm font-body text-red-400 hover:text-red-300 transition disabled:opacity-50"
              >
                {buddyBusy ? 'Removing…' : 'Remove buddy'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="tel"
                placeholder="+15551234567"
                value={buddyPhone}
                onChange={e => setBuddyPhone(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-body placeholder:text-white/30 focus:outline-none focus:border-white/30 transition"
              />
              <input
                type="text"
                placeholder="Their name (optional)"
                value={buddyName}
                onChange={e => setBuddyName(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-body placeholder:text-white/30 focus:outline-none focus:border-white/30 transition"
              />
              {buddyError && (
                <p className="text-xs font-body text-red-400">{buddyError}</p>
              )}
              <button
                onClick={handleSaveBuddy}
                disabled={buddyBusy}
                className="w-full bg-white text-black rounded-full py-2.5 text-sm font-body font-semibold hover:bg-white/90 transition disabled:opacity-50"
              >
                {buddyBusy ? 'Sending invite…' : 'Send invite SMS'}
              </button>
              <p className="text-xs font-body text-white/30">
                We will text them once to ask for consent. Only proceeds if they reply YES.
              </p>
            </div>
          )}
        </div>

        {/* Referral */}
        {profile?.referral_code && (
          <div className="liquid-glass rounded-2xl p-6">
            <h2 className="font-heading italic text-lg text-white mb-2">Refer a Friend</h2>
            <p className="text-sm font-body text-white/40 mb-4">
              Share your link — both you and your friend get 1 free month when they subscribe.
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white/60 font-body text-sm truncate">
                {typeof window !== 'undefined' ? `${window.location.origin}/signup?ref=${profile.referral_code}` : `habitsms.com/signup?ref=${profile.referral_code}`}
              </div>
              <button
                onClick={copyReferralCode}
                className="liquid-glass-strong rounded-xl p-3 text-white hover:scale-105 transition"
              >
                {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              </button>
            </div>
            <p className="text-xs font-body text-white/30 mt-3">
              Or text INVITE from your phone to get this link via SMS.
            </p>
          </div>
        )}

        {/* SMS Commands reference */}
        <div className="liquid-glass rounded-2xl p-6">
          <h2 className="font-heading italic text-lg text-white mb-4">SMS Commands</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Y / Yes', 'Mark habit done'],
              ['N / No', 'Skip for today'],
              ['SNOOZE', 'Remind in 1 hour'],
              ['STATS', 'View streaks & stats'],
              ['PAUSE', 'Stop all reminders'],
              ['RESUME', 'Re-enable reminders'],
              ['GRACE', 'Restore broken streak'],
              ['UPGRADE', 'View plan options'],
              ['HELP', 'Full command list'],
            ].map(([cmd, desc]) => (
              <div key={cmd} className="flex flex-col gap-0.5">
                <span className="text-xs font-body font-medium text-white/80">{cmd}</span>
                <span className="text-xs font-body text-white/35">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full liquid-glass rounded-full py-3 text-sm font-body text-red-400 hover:text-red-300 transition"
        >
          Sign Out
        </button>

      </main>
    </div>
  )
}
