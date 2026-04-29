import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// Accepted health metric types
const METRIC_TYPES = [
  'steps',
  'workout',
  'sleep',
  'mindfulness',
  'active_energy',
] as const

type MetricType = (typeof METRIC_TYPES)[number]

const metricSchema = z.object({
  metric_type: z.string().min(1),
  value: z.number().finite(),
  unit: z.string().optional(),
  started_at: z.string().min(1),
  ended_at: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

const bodySchema = z.object({
  createHabits: z.boolean(),
  selectedTypes: z.array(z.enum(METRIC_TYPES)),
  metrics: z.array(metricSchema).max(1000),
})

// Mapping metric_type -> default habit template
const HABIT_DEFAULTS: Record<
  MetricType,
  {
    name: string
    template_type: string
    response_type: string
    response_unit: string
    reminder_time: string
  }
> = {
  steps: {
    name: 'Daily Steps',
    template_type: 'workout',
    response_type: 'number',
    response_unit: 'steps',
    reminder_time: '07:00:00',
  },
  workout: {
    name: 'Daily Workout',
    template_type: 'workout',
    response_type: 'number',
    response_unit: 'minutes',
    reminder_time: '07:00:00',
  },
  sleep: {
    name: 'Sleep Tracking',
    template_type: 'sleep',
    response_type: 'number',
    response_unit: 'hours',
    reminder_time: '22:00:00',
  },
  mindfulness: {
    name: 'Meditation',
    template_type: 'meditate',
    response_type: 'number',
    response_unit: 'minutes',
    reminder_time: '06:30:00',
  },
  active_energy: {
    name: 'Active Calories',
    template_type: 'custom',
    response_type: 'number',
    response_unit: 'kcal',
    reminder_time: '07:00:00',
  },
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }
    const { createHabits, selectedTypes, metrics } = parsed.data

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const selectedSet = new Set<MetricType>(selectedTypes)

    // Filter incoming metrics to selected types only
    const incoming = metrics.filter((m) =>
      selectedSet.has(m.metric_type as MetricType)
    )

    // 1) Upsert into health_metrics (idempotent via unique constraint)
    let insertedMetrics = 0
    if (incoming.length > 0) {
      // We cast to any because health_metrics is declared in a migration not yet
      // reflected in the generated Database types. This is server-side only
      // and constrained by the zod schema above.
      const rows = incoming.map((m) => ({
        user_id: user.id,
        source: 'apple_health',
        metric_type: m.metric_type,
        value: m.value,
        unit: m.unit ?? null,
        started_at: m.started_at,
        ended_at: m.ended_at ?? null,
        metadata: m.metadata ?? {},
      }))

      const { error, count } = await (supabase as unknown as {
        from: (t: string) => {
          upsert: (
            rows: unknown,
            opts: { onConflict: string; ignoreDuplicates: boolean; count: 'exact' }
          ) => Promise<{ error: unknown; count: number | null }>
        }
      })
        .from('health_metrics')
        .upsert(rows, {
          onConflict: 'user_id,metric_type,started_at,source',
          ignoreDuplicates: true,
          count: 'exact',
        })

      if (error) {
        console.error('[Health Import] metrics upsert failed', error)
        return NextResponse.json(
          { error: 'Failed to store health metrics' },
          { status: 500 }
        )
      }
      insertedMetrics = count ?? rows.length
    }

    // 2) Load existing active habits for this user, keyed by template_type
    const { data: existingHabits, error: habitsErr } = await supabase
      .from('habits')
      .select('id, template_type, response_unit, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (habitsErr) {
      console.error('[Health Import] habits fetch failed', habitsErr)
      return NextResponse.json(
        { error: 'Failed to read habits' },
        { status: 500 }
      )
    }

    // Build map from metric_type -> habit_id. We match using template_type and
    // response_unit so we don't cross-map e.g. steps onto a user's "minutes"
    // workout habit.
    const habitForType = new Map<MetricType, string>()
    for (const t of METRIC_TYPES) {
      const def = HABIT_DEFAULTS[t]
      const match = existingHabits?.find(
        (h) =>
          h.template_type === def.template_type &&
          (h.response_unit === def.response_unit || h.response_unit === null)
      )
      if (match) habitForType.set(t, match.id)
    }

    // 3) Optionally create habits for selected types that have no match yet
    let habitsCreated = 0
    if (createHabits) {
      for (const t of selectedTypes) {
        if (habitForType.has(t)) continue
        const def = HABIT_DEFAULTS[t]
        const { data: inserted, error: insertErr } = await supabase
          .from('habits')
          .insert({
            user_id: user.id,
            template_type: def.template_type,
            name: def.name,
            response_type: def.response_type,
            response_unit: def.response_unit,
            reminder_time: def.reminder_time,
            reminder_enabled: true,
            is_active: true,
          })
          .select('id')
          .single()

        if (insertErr || !inserted) {
          console.error('[Health Import] habit create failed', insertErr)
          continue
        }
        habitForType.set(t, inserted.id)
        habitsCreated += 1
      }
    }

    // 4) For each metric that maps to a habit, insert a habit_log row.
    //    We dedupe by fetching existing logged_at timestamps for this
    //    (habit, source) and filtering the new rows locally. A unique index
    //    (habit_id, source, logged_at) — added in the migration — makes this
    //    safe even under races.
    let insertedLogs = 0
    const logsByHabit = new Map<
      string,
      Array<{
        habit_id: string
        user_id: string
        completed: boolean
        response_value: string
        source: string
        logged_at: string
      }>
    >()

    for (const m of incoming) {
      const habitId = habitForType.get(m.metric_type as MetricType)
      if (!habitId) continue
      const row = {
        habit_id: habitId,
        user_id: user.id,
        completed: true,
        response_value: String(m.value),
        source: 'apple_health',
        logged_at: m.started_at,
      }
      const arr = logsByHabit.get(habitId) ?? []
      arr.push(row)
      logsByHabit.set(habitId, arr)
    }

    for (const [habitId, rows] of logsByHabit) {
      const timestamps = rows.map((r) => r.logged_at)
      const { data: existing } = await supabase
        .from('habit_logs')
        .select('logged_at')
        .eq('habit_id', habitId)
        .eq('source', 'apple_health')
        .in('logged_at', timestamps)

      const seen = new Set(
        (existing ?? []).map((e: { logged_at: string }) => e.logged_at)
      )
      const toInsert = rows.filter((r) => !seen.has(r.logged_at))
      if (toInsert.length === 0) continue

      const { error: logsErr, count } = await supabase
        .from('habit_logs')
        .insert(toInsert, { count: 'exact' })

      if (logsErr) {
        console.error('[Health Import] habit_logs insert failed', logsErr)
        continue
      }
      insertedLogs += count ?? toInsert.length
    }

    return NextResponse.json({
      inserted: {
        metrics: insertedMetrics,
        logs: insertedLogs,
        habitsCreated,
      },
    })
  } catch (error) {
    console.error('[Health Import] Error:', error)
    return NextResponse.json(
      { error: 'Import failed' },
      { status: 500 }
    )
  }
}
