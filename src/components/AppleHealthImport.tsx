'use client'

// Apple Health importer.
//
// NOTE on file formats: Apple Health exports a .zip containing export.xml.
// The browser's DecompressionStream API only supports gzip/deflate/deflate-raw,
// not the ZIP container format (which requires a central directory reader).
// Rather than bundle jszip (explicitly disallowed), we accept .xml only and
// instruct the user to extract the zip first. The tradeoff: one extra step
// for the user, but zero new dependencies and no memory-hungry zip parse in
// the browser.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export interface ImportSummary {
  metrics: number
  logs: number
  habitsCreated: number
}

interface AppleHealthImportProps {
  open: boolean
  onClose: () => void
  onImported?: (summary: ImportSummary) => void
}

type MetricType =
  | 'steps'
  | 'workout'
  | 'sleep'
  | 'mindfulness'
  | 'active_energy'

interface ParsedMetric {
  metric_type: MetricType
  value: number
  unit?: string
  started_at: string
  ended_at?: string
  metadata?: Record<string, unknown>
}

interface TypeSummary {
  type: MetricType
  label: string
  count: number
  firstDate?: string
  lastDate?: string
  totalValue: number
  unit: string
  // last 7 days (descending from today) aggregated values for sparkline
  sparkline: number[]
}

type Step = 'upload' | 'parsing' | 'preview' | 'uploading' | 'done'

const LABELS: Record<MetricType, string> = {
  steps: 'Steps',
  workout: 'Workouts',
  sleep: 'Sleep',
  mindfulness: 'Mindfulness',
  active_energy: 'Active Energy',
}

const UNITS: Record<MetricType, string> = {
  steps: 'steps',
  workout: 'minutes',
  sleep: 'hours',
  mindfulness: 'minutes',
  active_energy: 'kcal',
}

// Apple Health record types we care about
const STEP_TYPE = 'HKQuantityTypeIdentifierStepCount'
const SLEEP_TYPE = 'HKCategoryTypeIdentifierSleepAnalysis'
const MINDFUL_TYPE = 'HKCategoryTypeIdentifierMindfulSession'
const ENERGY_TYPE = 'HKQuantityTypeIdentifierActiveEnergyBurned'

// ---- XML parsing helpers ----

function attr(tag: string, name: string): string | undefined {
  // Extract attribute value from a <Record ... /> tag string.
  const re = new RegExp(`${name}="([^"]*)"`)
  const m = tag.match(re)
  return m ? m[1] : undefined
}

function dayKey(iso: string): string {
  // YYYY-MM-DD in UTC — fine for aggregation bucketing.
  return iso.slice(0, 10)
}

function toISO(d: string | undefined): string | undefined {
  if (!d) return undefined
  // Apple dates look like "2023-05-01 07:15:23 -0700". Convert to ISO.
  const normalized = d.replace(' ', 'T').replace(/ ([+-]\d{4})$/, '$1')
  const parsed = new Date(normalized)
  if (isNaN(parsed.getTime())) return undefined
  return parsed.toISOString()
}

function minutesBetween(startISO: string, endISO: string): number {
  const s = new Date(startISO).getTime()
  const e = new Date(endISO).getTime()
  return Math.max(0, (e - s) / 60000)
}

// Aggregators accumulate by day (or per-event for workouts)
interface Aggregators {
  stepsByDay: Map<string, number>
  sleepByDay: Map<string, number> // minutes
  mindfulByDay: Map<string, number> // minutes
  energyByDay: Map<string, number> // kcal
  workouts: ParsedMetric[]
  recordCount: number
}

function newAggregators(): Aggregators {
  return {
    stepsByDay: new Map(),
    sleepByDay: new Map(),
    mindfulByDay: new Map(),
    energyByDay: new Map(),
    workouts: [],
    recordCount: 0,
  }
}

function handleRecordTag(tag: string, agg: Aggregators): void {
  const type = attr(tag, 'type')
  if (!type) return
  const startStr = attr(tag, 'startDate')
  const endStr = attr(tag, 'endDate')
  const valueStr = attr(tag, 'value')
  const start = toISO(startStr)
  if (!start) return

  if (type === STEP_TYPE) {
    const n = Number(valueStr)
    if (!isFinite(n)) return
    const k = dayKey(start)
    agg.stepsByDay.set(k, (agg.stepsByDay.get(k) ?? 0) + n)
  } else if (type === SLEEP_TYPE) {
    const end = toISO(endStr)
    if (!end) return
    // value like HKCategoryValueSleepAnalysisAsleep* / InBed — count all as sleep
    const mins = minutesBetween(start, end)
    const k = dayKey(start)
    agg.sleepByDay.set(k, (agg.sleepByDay.get(k) ?? 0) + mins)
  } else if (type === MINDFUL_TYPE) {
    const end = toISO(endStr)
    if (!end) return
    const mins = minutesBetween(start, end)
    const k = dayKey(start)
    agg.mindfulByDay.set(k, (agg.mindfulByDay.get(k) ?? 0) + mins)
  } else if (type === ENERGY_TYPE) {
    const n = Number(valueStr)
    if (!isFinite(n)) return
    const k = dayKey(start)
    agg.energyByDay.set(k, (agg.energyByDay.get(k) ?? 0) + n)
  }
}

function handleWorkoutTag(tag: string, agg: Aggregators): void {
  const activityType = attr(tag, 'workoutActivityType')
  const duration = Number(attr(tag, 'duration'))
  const durationUnit = attr(tag, 'durationUnit')
  const energyBurned = Number(attr(tag, 'totalEnergyBurned'))
  const start = toISO(attr(tag, 'startDate'))
  const end = toISO(attr(tag, 'endDate'))
  if (!start) return
  const minutes =
    durationUnit === 'min'
      ? duration
      : durationUnit === 'hr'
        ? duration * 60
        : durationUnit === 'sec'
          ? duration / 60
          : isFinite(duration)
            ? duration
            : 0
  agg.workouts.push({
    metric_type: 'workout',
    value: isFinite(minutes) ? Math.round(minutes) : 0,
    unit: 'minutes',
    started_at: start,
    ended_at: end,
    metadata: {
      activityType,
      energyBurned: isFinite(energyBurned) ? energyBurned : undefined,
    },
  })
}

// Stream-parse the XML file without loading the whole thing into memory
// at once. We read chunks and split on tag boundaries for <Record ... />
// and <Workout ... />. Apple Health records are self-closing single tags
// so we can match on the tag-close ">".
async function streamParse(
  file: File,
  onProgress: (bytesRead: number, recordCount: number) => void
): Promise<Aggregators> {
  const agg = newAggregators()
  const stream = file.stream()
  const reader = stream.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let bytesRead = 0

  // We scan buffer for <Record ... /> and <Workout ... > ... </Workout>
  // but Apple Health uses self-closing <Record/> heavily; workouts can have
  // nested children, so for simplicity we capture the *opening* Workout tag
  // (which has all the attrs we need: duration, type, start, end).
  //
  // Algorithm: repeatedly find the next "<Record " or "<Workout " and the
  // matching ">". Consume up to and including ">". Keep the tail as buffer.

  const PROGRESS_EVERY = 5000 // emit progress every N records

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    bytesRead += value.byteLength
    buffer += decoder.decode(value, { stream: true })

    let keepSearching = true
    while (keepSearching) {
      const recordIdx = buffer.indexOf('<Record ')
      const workoutIdx = buffer.indexOf('<Workout ')
      let nextIdx = -1
      let isWorkout = false
      if (recordIdx === -1 && workoutIdx === -1) {
        keepSearching = false
        break
      } else if (recordIdx === -1) {
        nextIdx = workoutIdx
        isWorkout = true
      } else if (workoutIdx === -1) {
        nextIdx = recordIdx
      } else if (recordIdx < workoutIdx) {
        nextIdx = recordIdx
      } else {
        nextIdx = workoutIdx
        isWorkout = true
      }

      const closeIdx = buffer.indexOf('>', nextIdx)
      if (closeIdx === -1) {
        // Tag is incomplete; wait for more data
        keepSearching = false
        break
      }
      const tag = buffer.slice(nextIdx, closeIdx + 1)
      if (isWorkout) {
        handleWorkoutTag(tag, agg)
      } else {
        handleRecordTag(tag, agg)
      }
      agg.recordCount += 1
      if (agg.recordCount % PROGRESS_EVERY === 0) {
        onProgress(bytesRead, agg.recordCount)
        // Yield back to the event loop so UI can paint
        await new Promise((r) => setTimeout(r, 0))
      }
      buffer = buffer.slice(closeIdx + 1)
    }

    // Prevent runaway buffer (shouldn't happen but be defensive)
    if (buffer.length > 5_000_000) {
      buffer = buffer.slice(buffer.length - 100_000)
    }
  }

  onProgress(bytesRead, agg.recordCount)
  return agg
}

// Turn aggregators into ParsedMetric[] and build summaries
function flatten(agg: Aggregators): {
  metrics: ParsedMetric[]
  summaries: TypeSummary[]
} {
  const metrics: ParsedMetric[] = []

  const pushDaily = (
    map: Map<string, number>,
    type: MetricType,
    unit: string,
    transform: (n: number) => number = (n) => n
  ) => {
    for (const [day, raw] of map) {
      const value = transform(raw)
      metrics.push({
        metric_type: type,
        value,
        unit,
        started_at: new Date(`${day}T00:00:00Z`).toISOString(),
      })
    }
  }

  pushDaily(agg.stepsByDay, 'steps', 'count')
  pushDaily(agg.sleepByDay, 'sleep', 'hours', (m) =>
    Number((m / 60).toFixed(2))
  )
  pushDaily(agg.mindfulByDay, 'mindfulness', 'minutes', (m) =>
    Math.round(m)
  )
  pushDaily(agg.energyByDay, 'active_energy', 'kcal', (k) =>
    Math.round(k)
  )
  for (const w of agg.workouts) metrics.push(w)

  // Build summaries
  const summaries: TypeSummary[] = []
  const grouped = new Map<MetricType, ParsedMetric[]>()
  for (const m of metrics) {
    const arr = grouped.get(m.metric_type) ?? []
    arr.push(m)
    grouped.set(m.metric_type, arr)
  }

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const sevenDays: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000)
    sevenDays.push(d.toISOString().slice(0, 10))
  }

  for (const type of [
    'steps',
    'workout',
    'sleep',
    'mindfulness',
    'active_energy',
  ] as MetricType[]) {
    const rows = grouped.get(type) ?? []
    if (rows.length === 0) continue
    rows.sort((a, b) => a.started_at.localeCompare(b.started_at))
    const byDay = new Map<string, number>()
    let total = 0
    for (const r of rows) {
      total += r.value
      const d = r.started_at.slice(0, 10)
      byDay.set(d, (byDay.get(d) ?? 0) + r.value)
    }
    const sparkline = sevenDays.map((d) => byDay.get(d) ?? 0)
    summaries.push({
      type,
      label: LABELS[type],
      count: rows.length,
      firstDate: rows[0]?.started_at.slice(0, 10),
      lastDate: rows[rows.length - 1]?.started_at.slice(0, 10),
      totalValue: total,
      unit: UNITS[type],
      sparkline,
    })
  }

  return { metrics, summaries }
}

// ---- Component ----

export default function AppleHealthImport({
  open,
  onClose,
  onImported,
}: AppleHealthImportProps) {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [parseProgress, setParseProgress] = useState({
    bytes: 0,
    records: 0,
  })
  const [parsedMetrics, setParsedMetrics] = useState<ParsedMetric[]>([])
  const [summaries, setSummaries] = useState<TypeSummary[]>([])
  const [selected, setSelected] = useState<Set<MetricType>>(new Set())
  const [createHabits, setCreateHabits] = useState<Set<MetricType>>(new Set())
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 })
  const [result, setResult] = useState<ImportSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const dropRef = useRef<HTMLLabelElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Reduce motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  // Reset state when modal opens
  useEffect(() => {
    if (!open) return
    setStep('upload')
    setFile(null)
    setParseProgress({ bytes: 0, records: 0 })
    setParsedMetrics([])
    setSummaries([])
    setSelected(new Set())
    setCreateHabits(new Set())
    setUploadProgress({ done: 0, total: 0 })
    setResult(null)
    setError(null)
  }, [open])

  // Escape key closes
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 'parsing' && step !== 'uploading') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, step])

  const startParse = useCallback(async (f: File) => {
    setFile(f)
    setStep('parsing')
    setError(null)
    try {
      const agg = await streamParse(f, (bytes, records) => {
        setParseProgress({ bytes, records })
      })
      const { metrics, summaries } = flatten(agg)
      if (metrics.length === 0) {
        setError(
          'No recognized health records found. Make sure you uploaded the export.xml file from Apple Health.'
        )
        setStep('upload')
        return
      }
      setParsedMetrics(metrics)
      setSummaries(summaries)
      setSelected(new Set(summaries.map((s) => s.type)))
      setStep('preview')
    } catch (e) {
      console.error(e)
      setError('Could not parse the file. Is it a valid Apple Health export.xml?')
      setStep('upload')
    }
  }, [])

  const onFileChosen = (f: File | null) => {
    if (!f) return
    const name = f.name.toLowerCase()
    if (!name.endsWith('.xml')) {
      setError(
        'Please upload export.xml. If you have the zip, unzip it first and select the export.xml inside.'
      )
      return
    }
    startParse(f)
  }

  const toggleSelected = (t: MetricType) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
  }

  const toggleCreateHabit = (t: MetricType) => {
    setCreateHabits((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
  }

  const startUpload = useCallback(async () => {
    setStep('uploading')
    setError(null)
    const selectedTypes = Array.from(selected)
    const toUpload = parsedMetrics.filter((m) => selected.has(m.metric_type))
    const BATCH_SIZE = 500
    const totalBatches = Math.max(1, Math.ceil(toUpload.length / BATCH_SIZE))
    const anyCreateHabits = createHabits.size > 0
    let totals: ImportSummary = { metrics: 0, logs: 0, habitsCreated: 0 }

    setUploadProgress({ done: 0, total: totalBatches })

    try {
      for (let i = 0; i < totalBatches; i++) {
        const batch = toUpload.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
        // Only pass createHabits=true on the first batch (idempotent server-side anyway).
        const res = await fetch('/api/health/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            createHabits: i === 0 && anyCreateHabits,
            selectedTypes: Array.from(createHabits).length
              ? Array.from(createHabits)
              : selectedTypes,
            metrics: batch,
          }),
        })
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(j.error ?? `Upload failed (${res.status})`)
        }
        const j = (await res.json()) as {
          inserted: ImportSummary
        }
        totals = {
          metrics: totals.metrics + j.inserted.metrics,
          logs: totals.logs + j.inserted.logs,
          habitsCreated: totals.habitsCreated + j.inserted.habitsCreated,
        }
        setUploadProgress({ done: i + 1, total: totalBatches })
      }
      setResult(totals)
      setStep('done')
      onImported?.(totals)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
      setStep('preview')
    }
  }, [parsedMetrics, selected, createHabits, onImported])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Import Apple Health data"
      className="ah-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && step !== 'parsing' && step !== 'uploading') {
          onClose()
        }
      }}
    >
      <div className="ah-card">
        <header className="ah-header">
          <div>
            <p className="ah-eyebrow">Apple Health</p>
            <h2 className="ah-title">
              {step === 'upload' && 'Bring your history along'}
              {step === 'parsing' && 'Reading your history'}
              {step === 'preview' && 'Choose what to import'}
              {step === 'uploading' && 'Saving to your library'}
              {step === 'done' && 'All set'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={step === 'parsing' || step === 'uploading'}
            aria-label="Close"
            className="ah-close"
          >
            ×
          </button>
        </header>

        <div className="ah-body">
          {step === 'upload' && (
            <div className="ah-upload">
              <p className="ah-muted">
                Open the Health app, tap your profile picture, then &quot;Export All
                Health Data.&quot; Save the zip, unzip it, and upload the{' '}
                <code className="ah-code">export.xml</code> inside.
              </p>
              <label
                ref={dropRef}
                className={`ah-drop ${isDragging ? 'is-drag' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragging(false)
                  const f = e.dataTransfer.files?.[0] ?? null
                  onFileChosen(f)
                }}
              >
                <input
                  type="file"
                  accept=".xml,text/xml,application/xml"
                  onChange={(e) => onFileChosen(e.target.files?.[0] ?? null)}
                  className="ah-file"
                />
                <span className="ah-drop-title">Drop export.xml here</span>
                <span className="ah-drop-sub">or click to browse</span>
                {file && (
                  <span className="ah-drop-file">
                    {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                )}
              </label>
              {error && <p className="ah-error">{error}</p>}
              <button type="button" onClick={onClose} className="ah-link">
                Skip for now
              </button>
            </div>
          )}

          {step === 'parsing' && (
            <div className="ah-parsing">
              <div className="ah-spinner" aria-hidden="true" />
              <p className="ah-counter">
                Parsed {parseProgress.records.toLocaleString()} records
              </p>
              <p className="ah-muted">
                {(parseProgress.bytes / 1024 / 1024).toFixed(1)} MB read
              </p>
            </div>
          )}

          {step === 'preview' && (
            <div className="ah-preview">
              {summaries.length === 0 && (
                <p className="ah-muted">Nothing to import.</p>
              )}
              <ul className="ah-list">
                {summaries.map((s) => (
                  <li key={s.type} className="ah-row">
                    <label className="ah-check">
                      <input
                        type="checkbox"
                        checked={selected.has(s.type)}
                        onChange={() => toggleSelected(s.type)}
                      />
                      <span>
                        <span className="ah-row-label">{s.label}</span>
                        <span className="ah-row-meta">
                          {s.count.toLocaleString()} entries · {s.firstDate} to{' '}
                          {s.lastDate}
                        </span>
                      </span>
                    </label>
                    <Sparkline values={s.sparkline} />
                    <label className="ah-habit-toggle">
                      <input
                        type="checkbox"
                        checked={createHabits.has(s.type)}
                        onChange={() => toggleCreateHabit(s.type)}
                        disabled={!selected.has(s.type)}
                      />
                      <span>Create habit</span>
                    </label>
                  </li>
                ))}
              </ul>
              {error && <p className="ah-error">{error}</p>}
              <div className="ah-actions">
                <button
                  type="button"
                  onClick={onClose}
                  className="ah-btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={startUpload}
                  disabled={selected.size === 0}
                  className="ah-btn-primary"
                >
                  Import {selected.size || ''}
                </button>
              </div>
            </div>
          )}

          {step === 'uploading' && (
            <div className="ah-uploading">
              <div className="ah-bar">
                <div
                  className="ah-bar-fill"
                  style={{
                    width: `${
                      uploadProgress.total
                        ? (uploadProgress.done / uploadProgress.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <p className="ah-muted">
                Batch {uploadProgress.done} of {uploadProgress.total}
              </p>
            </div>
          )}

          {step === 'done' && result && (
            <div className="ah-done">
              <p className="ah-done-msg">
                Imported {result.logs.toLocaleString()} habit entries from{' '}
                {result.metrics.toLocaleString()} health records
                {result.habitsCreated > 0
                  ? `, and created ${result.habitsCreated} new habit${result.habitsCreated === 1 ? '' : 's'}`
                  : ''}
                .
              </p>
              <div className="ah-actions">
                <button
                  type="button"
                  onClick={onClose}
                  className="ah-btn-primary"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .ah-overlay {
          position: fixed;
          inset: 0;
          z-index: 60;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          background: color-mix(in srgb, var(--bg) 70%, transparent);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          animation: ${prefersReducedMotion ? 'none' : 'ah-fade 160ms ease-out'};
        }
        .ah-card {
          width: 100%;
          max-width: 640px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-card);
          box-shadow: var(--shadow-card);
          color: var(--text);
          display: flex;
          flex-direction: column;
          max-height: 90vh;
          overflow: hidden;
          animation: ${prefersReducedMotion ? 'none' : 'ah-rise 220ms ease-out'};
        }
        .ah-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          padding: 1.25rem 1.5rem 1rem;
          border-bottom: 1px solid var(--border);
        }
        .ah-eyebrow {
          font-family: var(--font-body);
          font-size: 0.7rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--text-subtle);
          margin: 0 0 0.35rem 0;
        }
        .ah-title {
          font-family: var(--font-heading);
          font-style: italic;
          font-weight: 500;
          font-size: 1.55rem;
          line-height: 1.15;
          margin: 0;
          color: var(--text);
        }
        .ah-close {
          appearance: none;
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-muted);
          width: 2rem;
          height: 2rem;
          border-radius: 999px;
          cursor: pointer;
          font-size: 1.1rem;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .ah-close:hover {
          color: var(--text);
          border-color: var(--text-muted);
        }
        .ah-close:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .ah-body {
          padding: 1.25rem 1.5rem 1.5rem;
          overflow-y: auto;
          font-family: var(--font-body);
        }
        .ah-muted {
          color: var(--text-muted);
          font-size: 0.92rem;
          line-height: 1.5;
          margin: 0 0 1rem 0;
        }
        .ah-code {
          background: var(--surface-2);
          border: 1px solid var(--border);
          padding: 0.05rem 0.35rem;
          border-radius: 4px;
          font-size: 0.85em;
        }
        .ah-drop {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.3rem;
          padding: 2.25rem 1rem;
          border: 1px dashed var(--border);
          border-radius: var(--radius-card);
          background: var(--surface-2);
          cursor: pointer;
          text-align: center;
          transition: border-color 160ms ease, background 160ms ease;
        }
        .ah-drop:hover,
        .ah-drop.is-drag {
          border-color: var(--accent);
          background: color-mix(in srgb, var(--accent) 6%, var(--surface-2));
        }
        .ah-file {
          position: absolute;
          inset: 0;
          opacity: 0;
          cursor: pointer;
        }
        .ah-drop-title {
          font-family: var(--font-heading);
          font-style: italic;
          font-size: 1.1rem;
          color: var(--text);
        }
        .ah-drop-sub {
          color: var(--text-subtle);
          font-size: 0.85rem;
        }
        .ah-drop-file {
          margin-top: 0.5rem;
          color: var(--text-muted);
          font-size: 0.85rem;
        }
        .ah-link {
          appearance: none;
          background: transparent;
          border: 0;
          padding: 0;
          margin-top: 1rem;
          color: var(--text-subtle);
          text-decoration: underline;
          cursor: pointer;
          font-size: 0.85rem;
          font-family: var(--font-body);
        }
        .ah-link:hover {
          color: var(--text-muted);
        }
        .ah-error {
          margin-top: 0.75rem;
          color: var(--danger);
          font-size: 0.88rem;
        }
        .ah-parsing {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem 0;
          gap: 0.5rem;
        }
        .ah-spinner {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid var(--border);
          border-top-color: var(--accent);
          animation: ${prefersReducedMotion ? 'none' : 'ah-spin 900ms linear infinite'};
          margin-bottom: 0.5rem;
        }
        .ah-counter {
          font-family: var(--font-heading);
          font-style: italic;
          font-size: 1.1rem;
          margin: 0;
        }
        .ah-list {
          list-style: none;
          margin: 0 0 1rem 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .ah-row {
          display: grid;
          grid-template-columns: 1fr auto auto;
          align-items: center;
          gap: 1rem;
          padding: 0.85rem 1rem;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--radius-card);
        }
        .ah-check {
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          cursor: pointer;
        }
        .ah-check input[type='checkbox'],
        .ah-habit-toggle input[type='checkbox'] {
          accent-color: var(--accent);
          margin-top: 0.2rem;
        }
        .ah-row-label {
          display: block;
          font-weight: 500;
          color: var(--text);
        }
        .ah-row-meta {
          display: block;
          font-size: 0.78rem;
          color: var(--text-subtle);
          margin-top: 0.1rem;
        }
        .ah-habit-toggle {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.8rem;
          color: var(--text-muted);
          cursor: pointer;
        }
        .ah-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
          margin-top: 0.5rem;
        }
        .ah-btn-ghost,
        .ah-btn-primary {
          appearance: none;
          font-family: var(--font-body);
          font-size: 0.9rem;
          padding: 0.6rem 1.1rem;
          border-radius: var(--radius-pill);
          cursor: pointer;
          border: 1px solid var(--border);
          transition: transform 120ms ease, background 160ms ease;
        }
        .ah-btn-ghost {
          background: transparent;
          color: var(--text-muted);
        }
        .ah-btn-ghost:hover {
          color: var(--text);
          border-color: var(--text-muted);
        }
        .ah-btn-primary {
          background: var(--accent);
          color: var(--accent-ink);
          border-color: var(--accent);
        }
        .ah-btn-primary:hover:not(:disabled) {
          transform: ${prefersReducedMotion ? 'none' : 'translateY(-1px)'};
        }
        .ah-btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .ah-bar {
          width: 100%;
          height: 6px;
          background: var(--surface-2);
          border-radius: 999px;
          overflow: hidden;
          border: 1px solid var(--border);
        }
        .ah-bar-fill {
          height: 100%;
          background: var(--accent);
          transition: width 220ms ease;
        }
        .ah-uploading {
          padding: 1rem 0;
        }
        .ah-done {
          padding: 0.5rem 0;
        }
        .ah-done-msg {
          font-family: var(--font-heading);
          font-style: italic;
          font-size: 1.15rem;
          color: var(--text);
          line-height: 1.4;
          margin: 0 0 1.25rem 0;
        }

        @keyframes ah-spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes ah-fade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes ah-rise {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 640px) {
          .ah-overlay {
            align-items: flex-end;
            padding: 0;
          }
          .ah-card {
            max-width: 100%;
            max-height: 90vh;
            border-radius: var(--radius-card) var(--radius-card) 0 0;
          }
          .ah-row {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ah-spinner {
            animation: none;
          }
          .ah-bar-fill {
            transition: none;
          }
        }
      `}</style>
    </div>
  )
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values)
  const w = 84
  const h = 24
  const bw = w / values.length
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      {values.map((v, i) => {
        const bh = Math.max(1, (v / max) * (h - 2))
        return (
          <rect
            key={i}
            x={i * bw + 1}
            y={h - bh}
            width={bw - 2}
            height={bh}
            rx={1}
            fill="var(--accent)"
            opacity={v === 0 ? 0.25 : 1}
          />
        )
      })}
    </svg>
  )
}
