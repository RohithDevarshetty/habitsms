'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowUpRight, Plus, Download, Flame } from 'lucide-react'
import { formatInTimeZone } from 'date-fns-tz'
import { subDays } from 'date-fns'
import ThemeToggle from '@/components/ThemeToggle'
import AppleHealthImport from '@/components/AppleHealthImport'

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

interface HabitLog {
  id: string
  habit_id: string
  logged_at: string
  completed: boolean
}

interface SmsMessage {
  id: string
  message_body: string
  direction: string
  created_at: string
  habit_id: string | null
}

interface Profile {
  id: string
  timezone: string
}

type RangeDays = 7 | 30 | 90

const HABIT_ICONS: Record<string, string> = {
  workout: '💪',
  meditate: '🧘',
  water: '💧',
  read: '📚',
  sleep: '😴',
  custom: '✦',
}

function getIcon(templateType: string | null) {
  return HABIT_ICONS[templateType || 'custom'] || '✦'
}

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

function firstNameFromEmail(email: string | null | undefined): string {
  if (!email) return 'there'
  const raw = email.split('@')[0] || 'there'
  const cleaned = raw.replace(/[._-]+/g, ' ').trim()
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning,'
  if (hour < 18) return 'Good afternoon,'
  return 'Good evening,'
}

function rhythmWord(pct: number): string {
  if (pct >= 80) return 'rhythm'
  if (pct >= 60) return 'motion'
  if (pct >= 40) return 'progress'
  return 'focus'
}

function dayKey(date: Date, tz: string): string {
  return formatInTimeZone(date, tz, 'yyyy-MM-dd')
}

function Sparkline({ values, width = 120, height = 28 }: { values: number[]; width?: number; height?: number }) {
  if (values.length === 0) return null
  const max = Math.max(...values, 1)
  const step = width / Math.max(values.length - 1, 1)
  const points = values.map((v, i) => {
    const x = i * step
    const y = height - (v / max) * height
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const line = `M ${points.join(' L ')}`
  const area = `${line} L ${width},${height} L 0,${height} Z`
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
      <path d={area} fill="color-mix(in srgb, var(--accent) 20%, transparent)" />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function MiniBars({ values, width = 110, height = 28 }: { values: number[]; width?: number; height?: number }) {
  if (values.length === 0) return null
  const max = Math.max(...values, 1)
  const gap = 2
  const barW = (width - gap * (values.length - 1)) / values.length
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
      {values.map((v, i) => {
        const h = Math.max((v / max) * height, 2)
        const x = i * (barW + gap)
        const y = height - h
        return <rect key={i} x={x} y={y} width={barW} height={h} rx={1} fill="var(--accent)" opacity={0.35 + (v / max) * 0.65} />
      })}
    </svg>
  )
}

function SquiggleTrend({ width = 160, height = 34 }: { width?: number; height?: number }) {
  const mid = height / 2
  const d = `M 0 ${mid} Q ${width * 0.15} ${mid - 10} ${width * 0.3} ${mid} T ${width * 0.6} ${mid} T ${width * 0.9} ${mid - 6} L ${width} ${mid - 8}`
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block opacity-80">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  )
}

function Eyebrow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`eyebrow ${className}`}>{children}</div>
}

export default function DashboardPage() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<HabitLog[]>([])
  const [messages, setMessages] = useState<SmsMessage[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<RangeDays>(30)
  const [importOpen, setImportOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const loadAll = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser()
    const user = auth.user
    if (!user) {
      router.push('/login')
      return
    }
    setUserEmail(user.email ?? null)

    const since = subDays(new Date(), 90).toISOString()

    const [profileRes, habitsRes, logsRes, smsRes] = await Promise.all([
      supabase.from('profiles').select('id, timezone').eq('id', user.id).maybeSingle(),
      supabase.from('habits').select('*').eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('habit_logs').select('id, habit_id, logged_at, completed').eq('user_id', user.id).gte('logged_at', since),
      supabase.from('sms_messages').select('id, message_body, direction, created_at, habit_id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(6),
    ])

    setProfile(profileRes.data ?? { id: user.id, timezone: 'UTC' })
    setHabits((habitsRes.data as Habit[]) ?? [])
    setLogs((logsRes.data as HabitLog[]) ?? [])
    setMessages((smsRes.data as SmsMessage[]) ?? [])
    setLoading(false)
  }, [supabase, router])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const tz = profile?.timezone || 'UTC'
  const now = new Date()
  const localHour = Number(formatInTimeZone(now, tz, 'H'))
  const todayKey = dayKey(now, tz)
  const todayFormatted = formatInTimeZone(now, tz, 'EEEE, MMMM d')

  const logsByDay = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const l of logs) {
      if (!l.completed) continue
      const k = dayKey(new Date(l.logged_at), tz)
      if (!map.has(k)) map.set(k, new Set())
      map.get(k)!.add(l.habit_id)
    }
    return map
  }, [logs, tz])

  const logsByHabitDay = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const l of logs) {
      if (!l.completed) continue
      const k = `${l.habit_id}__${dayKey(new Date(l.logged_at), tz)}`
      if (!map.has(k)) map.set(k, new Set())
      map.get(k)!.add(l.id)
    }
    return map
  }, [logs, tz])

  const activeCount = habits.length

  const consistency = useMemo(() => {
    if (activeCount === 0) return { pct: 0, delta: 0 }
    const days: string[] = []
    for (let i = 0; i < range; i++) {
      days.push(dayKey(subDays(now, i), tz))
    }
    let completed = 0
    for (const d of days) {
      const set = logsByDay.get(d)
      if (set) completed += Math.min(set.size, activeCount)
    }
    const pct = Math.round((completed / (activeCount * range)) * 100)

    const prevDays: string[] = []
    for (let i = range; i < range * 2; i++) {
      prevDays.push(dayKey(subDays(now, i), tz))
    }
    let prevCompleted = 0
    for (const d of prevDays) {
      const set = logsByDay.get(d)
      if (set) prevCompleted += Math.min(set.size, activeCount)
    }
    const prevPct = Math.round((prevCompleted / (activeCount * range)) * 100)
    return { pct, delta: pct - prevPct }
  }, [activeCount, range, logsByDay, now, tz])

  const loggedTodaySet = logsByDay.get(todayKey) ?? new Set<string>()
  const loggedTodayCount = Math.min(loggedTodaySet.size, activeCount)

  const bestStreakHabit = useMemo(() => {
    let best: Habit | null = null
    for (const h of habits) {
      if (!best || h.longest_streak > best.longest_streak) best = h
    }
    return best
  }, [habits])

  const weekdayRhythm = useMemo(() => {
    const totals = [0, 0, 0, 0, 0, 0, 0]
    const counts = [0, 0, 0, 0, 0, 0, 0]
    for (let i = 0; i < 30; i++) {
      const d = subDays(now, i)
      const k = dayKey(d, tz)
      const weekday = Number(formatInTimeZone(d, tz, 'i')) - 1
      const set = logsByDay.get(k)
      const done = set ? Math.min(set.size, activeCount) : 0
      totals[weekday] += activeCount > 0 ? done / activeCount : 0
      counts[weekday] += 1
    }
    return totals.map((t, i) => (counts[i] ? (t / counts[i]) * 5 : 0))
  }, [logsByDay, activeCount, now, tz])

  const heatmap = useMemo(() => {
    const cells: { key: string; intensity: number; label: string }[] = []
    for (let i = 89; i >= 0; i--) {
      const d = subDays(now, i)
      const k = dayKey(d, tz)
      const set = logsByDay.get(k)
      const done = set ? Math.min(set.size, activeCount) : 0
      const intensity = activeCount > 0 ? done / activeCount : 0
      cells.push({ key: k, intensity, label: formatInTimeZone(d, tz, 'MMM d') })
    }
    return cells
  }, [logsByDay, activeCount, now, tz])

  const habitSparks = useMemo(() => {
    const map = new Map<string, number[]>()
    for (const h of habits) {
      const series: number[] = []
      for (let i = 13; i >= 0; i--) {
        const d = subDays(now, i)
        const k = `${h.id}__${dayKey(d, tz)}`
        series.push(logsByHabitDay.has(k) ? 1 : 0)
      }
      map.set(h.id, series)
    }
    return map
  }, [habits, logsByHabitDay, now, tz])

  async function logHabit(habit: Habit) {
    const { data: auth } = await supabase.auth.getUser()
    const user = auth.user
    if (!user) return
    const key = `${habit.id}__${todayKey}`
    if (logsByHabitDay.has(key)) return

    const { error } = await supabase.from('habit_logs').insert({
      habit_id: habit.id,
      user_id: user.id,
      completed: true,
      source: 'web',
      response_value: 'Y',
    })
    if (error) return

    setHabits((prev) =>
      prev.map((h) =>
        h.id === habit.id
          ? { ...h, streak_count: h.streak_count + 1, longest_streak: Math.max(h.longest_streak, h.streak_count + 1) }
          : h
      )
    )
    loadAll()
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  function handleExport() {
    const header = 'habit_id,habit_name,logged_at,completed\n'
    const habitName = new Map(habits.map((h) => [h.id, h.name]))
    const rows = logs
      .map((l) => `${l.habit_id},"${(habitName.get(l.habit_id) ?? '').replace(/"/g, '""')}",${l.logged_at},${l.completed}`)
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `habitsms-export-${todayKey}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--text-subtle)' }} />
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--text-subtle)', animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--text-subtle)', animationDelay: '300ms' }} />
          </div>
          <p className="font-body text-sm" style={{ color: 'var(--text-subtle)' }}>Gathering your rhythm…</p>
        </div>
      </div>
    )
  }

  const firstName = firstNameFromEmail(userEmail)
  const greeting = greetingFor(localHour)
  const variableWord = rhythmWord(consistency.pct)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <nav
        className="fixed top-0 left-0 right-0 z-50 px-5 sm:px-8 lg:px-14 py-3.5"
        style={{ background: 'color-mix(in srgb, var(--bg) 88%, transparent)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'var(--surface-inverse)' }}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: 'var(--accent)' }} />
            </div>
            <span className="font-heading italic text-lg tracking-tight">HabitSMS</span>
            <div className="hidden lg:flex items-center gap-5 ml-6 font-body text-[13px]" style={{ color: 'var(--text-muted)' }}>
              <button className="hover:text-[color:var(--text)] transition-colors" style={{ color: 'var(--text)' }}>Dashboard</button>
              <button onClick={() => router.push('/dashboard/habits/new')} className="hover:text-[color:var(--text)] transition-colors">Habits</button>
              <button className="hover:text-[color:var(--text)] transition-colors">History</button>
              <button className="hover:text-[color:var(--text)] transition-colors">Settings</button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setImportOpen(true)}
              className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-body font-medium rounded-full transition-colors"
              style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              <Download size={13} /> Import Health
            </button>
            <button
              onClick={() => router.push('/dashboard/habits/new')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-body font-medium rounded-full"
              style={{ background: 'var(--surface-inverse)', color: 'var(--text-inverse)' }}
            >
              <Plus size={13} /> New habit
            </button>
            <ThemeToggle />
            <button
              onClick={handleSignOut}
              className="h-8 w-8 rounded-full font-heading italic text-xs flex items-center justify-center"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
              aria-label="Account"
              title={userEmail ?? 'Account'}
            >
              {firstName.charAt(0)}
            </button>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="md:hidden h-8 w-8 rounded-full flex items-center justify-center"
              style={{ border: '1px solid var(--border)' }}
              aria-label="Menu"
            >
              <span className="block w-3.5 h-px" style={{ background: 'var(--text)', boxShadow: '0 4px 0 var(--text), 0 -4px 0 var(--text)' }} />
            </button>
          </div>
        </div>
        {menuOpen && (
          <div
            className="md:hidden absolute left-0 right-0 top-full mt-1 mx-5 rounded-2xl p-3 flex flex-col gap-1"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}
          >
            {[
              { label: 'Dashboard', go: () => {} },
              { label: 'Habits', go: () => router.push('/dashboard/habits/new') },
              { label: 'History', go: () => {} },
              { label: 'Settings', go: () => {} },
              { label: 'Import Health', go: () => setImportOpen(true) },
              { label: 'New habit', go: () => router.push('/dashboard/habits/new') },
              { label: 'Sign out', go: handleSignOut },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  setMenuOpen(false)
                  item.go()
                }}
                className="text-left px-3 py-2 rounded-xl font-body text-sm"
                style={{ color: 'var(--text)' }}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </nav>

      <main className="pt-20 pb-20 px-5 sm:px-8 lg:px-14 max-w-[1280px] mx-auto">
        <div className="flex items-center gap-2 mb-6 mt-2 blur-in" style={{ color: 'var(--text-subtle)' }}>
          <span className="h-px w-6" style={{ background: 'var(--border-strong)' }} />
          <Eyebrow>Dashboard</Eyebrow>
          <span className="h-1 w-1 rounded-full" style={{ background: 'var(--text-subtle)' }} />
          <span className="eyebrow" style={{ color: 'var(--text-muted)' }}>{userEmail ?? firstName}</span>
          <span className="h-1 w-1 rounded-full" style={{ background: 'var(--text-subtle)' }} />
          <span className="eyebrow">{todayFormatted}</span>
          <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
        </div>

        {habits.length === 0 ? (
          <EmptyState onNew={() => router.push('/dashboard/habits/new')} onImport={() => setImportOpen(true)} />
        ) : (
          <>
            <div className="grid grid-cols-12 gap-6 mb-10">
              <div className="col-span-12 lg:col-span-8 blur-in">
                <p className="font-body text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
                  {greeting} <span style={{ color: 'var(--text)' }}>{firstName}</span>
                </p>
                <h1 className="font-heading italic leading-[0.95] tracking-tight text-[44px] sm:text-[68px] lg:text-[84px]">
                  Your habits, in{' '}
                  <span className="relative inline-block">
                    <span>{variableWord}</span>
                    <span
                      className="absolute left-0 right-0 -bottom-0.5 h-[2px]"
                      style={{ background: 'var(--accent)' }}
                    />
                  </span>
                  .
                </h1>
              </div>
              <div className="col-span-12 lg:col-span-4 flex lg:flex-col lg:items-end gap-3 lg:justify-end flex-wrap blur-in-up">
                <div
                  className="inline-flex items-center p-1 rounded-full"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                >
                  {([7, 30, 90] as RangeDays[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      className="px-3.5 py-1.5 rounded-full font-body text-[11px] uppercase tracking-[0.14em] transition-colors"
                      style={{
                        background: range === r ? 'var(--surface-inverse)' : 'transparent',
                        color: range === r ? 'var(--text-inverse)' : 'var(--text-muted)',
                      }}
                    >
                      {r}d
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleExport}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-body text-[12px]"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                >
                  <Download size={12} /> Export CSV
                </button>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4 mb-10">
              <HeroCard pct={consistency.pct} delta={consistency.delta} range={range} />
              <StatCard
                index={1}
                eyebrow="Consistency"
                value={`${consistency.pct}%`}
                deltaLabel={`${consistency.delta >= 0 ? '+' : ''}${consistency.delta} vs last ${range}d`}
                deltaTone={consistency.delta >= 0 ? 'pos' : 'neg'}
                graphic={<MiniBars values={heatmap.slice(-Math.min(14, range)).map((c) => c.intensity)} />}
              />
              <StatCard
                index={2}
                eyebrow="Logged today"
                value={`${loggedTodayCount} / ${activeCount}`}
                deltaLabel="Reply Y to log via SMS"
                deltaTone="muted"
                graphic={
                  <div className="flex gap-1.5 mt-2">
                    {habits.slice(0, 6).map((h) => {
                      const done = logsByHabitDay.has(`${h.id}__${todayKey}`)
                      return (
                        <span
                          key={h.id}
                          className="h-1.5 flex-1 rounded-full"
                          style={{
                            background: done ? 'var(--accent)' : 'var(--border-strong)',
                            opacity: done ? 1 : 0.5,
                          }}
                        />
                      )
                    })}
                  </div>
                }
              />
              <StatCard
                index={3}
                eyebrow="Best streak"
                value={`${bestStreakHabit?.longest_streak ?? 0}`}
                valueSuffix="days"
                deltaLabel={bestStreakHabit ? `${bestStreakHabit.name} streak` : 'No habits yet'}
                deltaTone="muted"
                graphic={
                  <div className="flex items-center gap-1.5 mt-1" style={{ color: 'var(--accent)' }}>
                    <Flame size={14} />
                    <Sparkline
                      values={bestStreakHabit ? (habitSparks.get(bestStreakHabit.id) ?? []).map((v, i, arr) => arr.slice(0, i + 1).reduce((s, x) => s + x, 0)) : []}
                      width={84}
                      height={20}
                    />
                  </div>
                }
              />
            </div>

            <div className="grid grid-cols-12 gap-4 mb-10">
              <div className="col-span-12 lg:col-span-8">
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <Eyebrow>Your habits</Eyebrow>
                    <h2 className="font-heading italic text-2xl mt-1">{activeCount} active</h2>
                  </div>
                  <button
                    onClick={() => router.push('/dashboard/habits/new')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-body text-[12px]"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                  >
                    <Plus size={12} /> Add
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {habits.map((habit, i) => {
                    const series = habitSparks.get(habit.id) ?? []
                    const loggedToday = logsByHabitDay.has(`${habit.id}__${todayKey}`)
                    return (
                      <article
                        key={habit.id}
                        className="card-surface p-5 cursor-pointer transition-transform blur-in-up"
                        style={{ animationDelay: `${i * 60}ms` }}
                        onClick={() => router.push(`/dashboard/habits/${habit.id}`)}
                      >
                        <div className="flex items-start gap-3 mb-4">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                            style={{ border: '1px solid var(--border)' }}
                          >
                            {getIcon(habit.template_type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <Eyebrow>{habit.template_type ?? 'custom'}</Eyebrow>
                            <h3 className="font-heading italic text-lg leading-tight truncate mt-0.5">{habit.name}</h3>
                          </div>
                        </div>

                        <div className="flex items-baseline gap-2 mb-3">
                          <span className="font-heading italic text-3xl" style={{ color: 'var(--text)' }}>
                            {habit.streak_count}
                          </span>
                          <span className="font-body text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--text-subtle)' }}>
                            day streak
                          </span>
                        </div>

                        <div className="mb-4 -mx-0.5">
                          <div className="flex gap-[3px] h-[22px] items-end">
                            {series.map((v, idx) => (
                              <span
                                key={idx}
                                className="flex-1 rounded-[2px]"
                                style={{
                                  height: v ? '100%' : '22%',
                                  background: v ? 'var(--accent)' : 'var(--border-strong)',
                                  opacity: v ? 1 : 0.55,
                                }}
                              />
                            ))}
                          </div>
                          <div className="flex justify-between mt-1.5">
                            <span className="font-body text-[10px]" style={{ color: 'var(--text-subtle)' }}>14d ago</span>
                            <span className="font-body text-[10px]" style={{ color: 'var(--text-subtle)' }}>today</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-4">
                          <span
                            className="inline-flex items-center px-2.5 py-1 rounded-full font-body text-[11px]"
                            style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
                          >
                            {formatTime(habit.reminder_time)}
                          </span>
                          {!habit.reminder_enabled && (
                            <span
                              className="px-2.5 py-1 rounded-full font-body text-[11px]"
                              style={{ background: 'color-mix(in srgb, var(--warn) 15%, transparent)', color: 'var(--warn)' }}
                            >
                              Paused
                            </span>
                          )}
                          {loggedToday && (
                            <span
                              className="px-2.5 py-1 rounded-full font-body text-[11px]"
                              style={{ background: 'color-mix(in srgb, var(--success) 15%, transparent)', color: 'var(--success)' }}
                            >
                              Done today
                            </span>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              logHabit(habit)
                            }}
                            disabled={loggedToday}
                            className="flex-1 py-2 rounded-full font-body text-[12px] font-medium transition-opacity"
                            style={{
                              background: loggedToday ? 'var(--surface-2)' : 'var(--surface-inverse)',
                              color: loggedToday ? 'var(--text-muted)' : 'var(--text-inverse)',
                              opacity: loggedToday ? 0.7 : 1,
                            }}
                          >
                            {loggedToday ? 'Logged' : 'Log now'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/dashboard/habits/${habit.id}/edit`)
                            }}
                            className="flex-1 py-2 rounded-full font-body text-[12px] font-medium"
                            style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                          >
                            Edit
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </div>

              <aside className="col-span-12 lg:col-span-4 flex flex-col gap-4">
                <div className="card-surface p-5 blur-in-up" style={{ animationDelay: '120ms' }}>
                  <Eyebrow>Weekdays</Eyebrow>
                  <h3 className="font-heading italic text-xl mt-1 mb-1">
                    {(() => {
                      const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                      const maxIdx = weekdayRhythm.reduce((best, v, i, arr) => (v > arr[best] ? i : best), 0)
                      const minIdx = weekdayRhythm.reduce((best, v, i, arr) => (v < arr[best] ? i : best), 0)
                      if (weekdayRhythm.every((v) => v === 0)) return 'Awaiting your first logs.'
                      if (maxIdx === minIdx) return 'Steady across the week.'
                      return `${names[maxIdx]}s lead, ${names[minIdx]}s lag.`
                    })()}
                  </h3>
                  <div className="grid grid-cols-7 gap-1.5 mt-4">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, i) => {
                      const v = weekdayRhythm[i] ?? 0
                      const h = Math.max((v / 5) * 56, 4)
                      return (
                        <div key={i} className="flex flex-col items-center gap-1.5">
                          <div className="h-14 flex items-end w-full">
                            <span
                              className="w-full rounded-[3px]"
                              style={{
                                height: `${h}px`,
                                background: 'var(--accent)',
                                opacity: 0.3 + (v / 5) * 0.7,
                              }}
                            />
                          </div>
                          <span className="font-body text-[10px]" style={{ color: 'var(--text-subtle)' }}>{label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="card-surface p-5 blur-in-up" style={{ animationDelay: '180ms' }}>
                  <div className="flex items-center justify-between mb-3">
                    <Eyebrow>Recent SMS</Eyebrow>
                    <span className="font-body text-[11px]" style={{ color: 'var(--text-subtle)' }}>
                      {messages[0] ? `${Math.max(1, differenceInMinutes(now, new Date(messages[0].created_at)))} min ago` : '—'}
                    </span>
                  </div>
                  {messages.length === 0 ? (
                    <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>
                      No messages yet. Your first reminder will land soon.
                    </p>
                  ) : (
                    <ul className="flex flex-col divide-y" style={{ borderColor: 'var(--border)' }}>
                      {messages.map((m) => (
                        <li key={m.id} className="py-2.5 first:pt-0 last:pb-0" style={{ borderTop: '1px solid var(--border)' }}>
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="inline-flex shrink-0 items-center px-2 py-0.5 rounded-full font-body text-[10px] uppercase tracking-[0.14em]"
                              style={{
                                background: m.direction === 'inbound' ? 'color-mix(in srgb, var(--success) 15%, transparent)' : 'var(--surface-2)',
                                color: m.direction === 'inbound' ? 'var(--success)' : 'var(--text-muted)',
                              }}
                            >
                              {m.direction === 'inbound' ? 'In' : 'Out'}
                            </span>
                            <span className="font-body text-[11px] ml-auto" style={{ color: 'var(--text-subtle)' }}>
                              {formatInTimeZone(new Date(m.created_at), tz, 'MMM d, HH:mm')}
                            </span>
                          </div>
                          <p className="font-body text-[13px] mt-1 line-clamp-2" style={{ color: 'var(--text)' }}>
                            {m.message_body}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </aside>
            </div>

            <div className="card-surface p-6 mb-6 blur-in-up">
              <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
                <div>
                  <Eyebrow>Last 90 days</Eyebrow>
                  <h3 className="font-heading italic text-2xl mt-1">Activity</h3>
                </div>
                <div className="flex items-center gap-2 font-body text-[11px]" style={{ color: 'var(--text-subtle)' }}>
                  <span>Less</span>
                  {[0.15, 0.4, 0.65, 0.9].map((o) => (
                    <span
                      key={o}
                      className="h-3 w-3 rounded-[3px]"
                      style={{ background: 'var(--accent)', opacity: o }}
                    />
                  ))}
                  <span>More</span>
                </div>
              </div>
              <div className="grid grid-flow-col grid-rows-7 gap-[3px]" style={{ gridAutoColumns: 'minmax(0, 1fr)' }}>
                {heatmap.map((c) => (
                  <span
                    key={c.key}
                    title={`${c.label} · ${Math.round(c.intensity * 100)}%`}
                    className="aspect-square rounded-[3px]"
                    style={{
                      background: c.intensity > 0 ? 'var(--accent)' : 'var(--border-strong)',
                      opacity: c.intensity > 0 ? 0.25 + c.intensity * 0.75 : 0.4,
                    }}
                  />
                ))}
              </div>
            </div>

            <div
              className="relative overflow-hidden mb-6 grain"
              style={{
                background: 'var(--surface-inverse)',
                color: 'var(--text-inverse)',
                borderRadius: 'var(--radius-card)',
                border: '1px solid var(--border-strong)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div className="relative z-10 p-8 md:p-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div className="max-w-xl">
                  <Eyebrow>Integrations</Eyebrow>
                  <h3 className="font-heading italic text-3xl md:text-5xl leading-[0.95] mt-3">
                    Bring your Apple Health history.
                  </h3>
                  <p className="font-body text-sm mt-4 opacity-80">
                    Pull past workouts, steps, sleep, and mindfulness sessions into HabitSMS — your streaks start where your life already is.
                  </p>
                </div>
                <button
                  onClick={() => setImportOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-body text-sm font-medium shrink-0"
                  style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
                >
                  Import from Apple Health <ArrowUpRight size={14} />
                </button>
              </div>
            </div>

            <div className="card-surface p-6">
              <div className="flex items-end justify-between mb-4 flex-wrap gap-2">
                <div>
                  <Eyebrow>Text commands</Eyebrow>
                  <h3 className="font-heading italic text-xl mt-1">Reply to any reminder</h3>
                </div>
                <span className="font-body text-[12px]" style={{ color: 'var(--text-subtle)' }}>
                  SMS is the fastest way to log.
                </span>
              </div>
              <ul className="flex flex-wrap gap-2">
                {[
                  ['Y', 'Completed'],
                  ['N', 'Not today'],
                  ['<number>', 'Log a quantity'],
                  ['STATS', 'Your streaks'],
                  ['PAUSE', 'Vacation mode'],
                  ['HELP', 'Full command list'],
                ].map(([cmd, desc]) => (
                  <li
                    key={cmd}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
                    style={{ border: '1px solid var(--border)' }}
                  >
                    <span
                      className="font-body text-[11px] uppercase tracking-[0.14em] font-semibold"
                      style={{ color: 'var(--text)' }}
                    >
                      {cmd}
                    </span>
                    <span className="font-body text-[12px]" style={{ color: 'var(--text-muted)' }}>
                      {desc}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </main>

      <AppleHealthImport
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => {
          setImportOpen(false)
          loadAll()
        }}
      />
    </div>
  )
}

function HeroCard({ pct, delta, range }: { pct: number; delta: number; range: RangeDays }) {
  const deltaTone = delta >= 0 ? 'var(--success)' : 'var(--danger)'
  return (
    <div
      className="col-span-12 md:col-span-6 relative overflow-hidden grain blur-in-up"
      style={{
        background: 'var(--surface-inverse)',
        color: 'var(--text-inverse)',
        borderRadius: 'var(--radius-card)',
        border: '1px solid var(--border-strong)',
        boxShadow: 'var(--shadow-card)',
        padding: '28px',
      }}
    >
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between">
          <Eyebrow>Overall consistency</Eyebrow>
          <span className="font-body text-[11px] uppercase tracking-[0.14em] opacity-60">last {range}d</span>
        </div>
        <div className="flex items-baseline gap-2 mt-6">
          <span className="font-heading italic leading-[0.9] text-7xl md:text-8xl">{pct}</span>
          <span className="font-body text-sm opacity-70">/ 100</span>
        </div>
        <div className="mt-5 opacity-80">
          <SquiggleTrend />
        </div>
        <div className="mt-5 font-body text-sm flex items-center gap-2">
          <span style={{ color: deltaTone }}>
            {delta >= 0 ? '+' : ''}{delta}
          </span>
          <span className="opacity-70">vs previous {range} days</span>
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  index: number
  eyebrow: string
  value: string
  valueSuffix?: string
  deltaLabel: string
  deltaTone: 'pos' | 'neg' | 'muted'
  graphic: React.ReactNode
}

function StatCard({ index, eyebrow, value, valueSuffix, deltaLabel, deltaTone, graphic }: StatCardProps) {
  const toneColor = deltaTone === 'pos' ? 'var(--success)' : deltaTone === 'neg' ? 'var(--danger)' : 'var(--text-subtle)'
  return (
    <div
      className="col-span-12 sm:col-span-6 md:col-span-2 card-surface p-5 blur-in-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <InlineCol>
        <Eyebrow>{eyebrow}</Eyebrow>
        <div className="flex items-baseline gap-2 mt-3">
          <span className="font-heading italic text-4xl leading-none">{value}</span>
          {valueSuffix && (
            <span className="font-body text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--text-subtle)' }}>
              {valueSuffix}
            </span>
          )}
        </div>
        <div className="mt-4">{graphic}</div>
        <p className="font-body text-[12px] mt-3" style={{ color: toneColor }}>
          {deltaLabel}
        </p>
      </InlineCol>
    </div>
  )
}

function InlineCol({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col h-full">{children}</div>
}

function EmptyState({ onNew, onImport }: { onNew: () => void; onImport: () => void }) {
  return (
    <div
      className="relative overflow-hidden grain blur-in-up p-10 md:p-16"
      style={{
        background: 'var(--surface-inverse)',
        color: 'var(--text-inverse)',
        borderRadius: 'var(--radius-card)',
        border: '1px solid var(--border-strong)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="relative z-10 max-w-2xl">
        <Eyebrow>Start here</Eyebrow>
        <h1 className="font-heading italic text-5xl md:text-7xl leading-[0.95] mt-4">
          Plant your first habit.
        </h1>
        <p className="font-body text-base mt-5 opacity-80">
          Pick a cue, pick a time, and we&apos;ll text you every day. Reply with a single letter — that&apos;s it.
        </p>
        <div className="flex flex-wrap gap-3 mt-7">
          <button
            onClick={onNew}
            className="inline-flex items-center gap-1.5 px-5 py-3 rounded-full font-body text-sm font-medium"
            style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
          >
            <Plus size={14} /> Create habit
          </button>
          <button
            onClick={onImport}
            className="inline-flex items-center gap-1.5 px-5 py-3 rounded-full font-body text-sm font-medium"
            style={{ border: '1px solid color-mix(in srgb, var(--text-inverse) 30%, transparent)', color: 'var(--text-inverse)' }}
          >
            Import from Apple Health <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

function differenceInMinutes(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 60000)
}
