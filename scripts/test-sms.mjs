#!/usr/bin/env node
/**
 * HabitSMS local test script
 *
 * Usage:
 *   node scripts/test-sms.mjs                          # list your habits
 *   node scripts/test-sms.mjs send <habit-id>          # send reminder SMS to your phone
 *   node scripts/test-sms.mjs reply <text>             # simulate inbound SMS reply
 *   node scripts/test-sms.mjs cron                     # trigger the send-reminders cron
 *
 * Prerequisites:
 *   - npm run dev running in another terminal
 *   - Real Twilio credentials in .env.local (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)
 *   - SKIP_WEBHOOK_AUTH=true in .env.local
 *   - Your phone number added as a verified caller in Twilio console
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

// Load .env.local
const envPath = join(root, '.env.local')
const envLines = readFileSync(envPath, 'utf8').split('\n')
for (const line of envLines) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const [key, ...rest] = trimmed.split('=')
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
}

const BASE_URL = 'http://localhost:3000'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const CRON_SECRET = process.env.CRON_SECRET

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

async function supabase(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...options.headers,
    },
    ...options,
  })
  const text = await res.text()
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) } }
  catch { return { ok: res.ok, status: res.status, data: text } }
}

async function listHabits() {
  const profiles = await supabase('/profiles?select=id,phone_number,timezone&limit=10')
  if (!profiles.ok || !profiles.data.length) {
    console.log('No profiles found. Create an account first at http://localhost:3000')
    return
  }

  console.log('\n=== Profiles ===')
  for (const p of profiles.data) {
    console.log(`  ${p.phone_number}  (${p.id})  tz: ${p.timezone}`)
  }

  const habits = await supabase('/habits?select=id,name,response_type,reminder_time,is_active,streak_count&is_active=eq.true&order=created_at')
  if (!habits.ok || !habits.data.length) {
    console.log('\nNo active habits. Create one at http://localhost:3000/dashboard')
    return
  }

  console.log('\n=== Active Habits ===')
  for (const h of habits.data) {
    console.log(`  ${h.id}  "${h.name}"  type=${h.response_type}  time=${h.reminder_time}  streak=${h.streak_count}`)
  }

  console.log('\nTo send a reminder:')
  console.log(`  node scripts/test-sms.mjs send ${habits.data[0].id}`)
  console.log('\nTo simulate a reply (after sending):')
  console.log('  node scripts/test-sms.mjs reply Y')
  console.log('  node scripts/test-sms.mjs reply N')
  console.log('  node scripts/test-sms.mjs reply SNOOZE')
  console.log('  node scripts/test-sms.mjs reply STATS')
}

async function sendReminder(habitId) {
  if (!habitId) { console.error('Usage: node scripts/test-sms.mjs send <habit-id>'); process.exit(1) }

  const habitRes = await supabase(`/habits?id=eq.${habitId}&select=*,profiles(phone_number)&limit=1`)
  if (!habitRes.ok || !habitRes.data.length) {
    console.error('Habit not found:', habitId)
    process.exit(1)
  }
  const habit = habitRes.data[0]
  const phone = Array.isArray(habit.profiles) ? habit.profiles[0]?.phone_number : habit.profiles?.phone_number

  if (!phone) { console.error('No phone number on profile'); process.exit(1) }

  console.log(`\nSending reminder for "${habit.name}" to ${phone}...`)

  // Hit the cron endpoint for this specific habit's user by triggering send-reminders
  // (easier: call Twilio directly via the cron endpoint)
  const res = await fetch(`${BASE_URL}/api/cron/send-reminders`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  })
  const body = await res.json()

  if (body.sent > 0) {
    console.log(`✅ Sent ${body.sent} reminder(s)`)
    console.log(`   Check your phone: ${phone}`)
  } else if (body.errors > 0) {
    console.log(`❌ ${body.errors} error(s) — check Next.js terminal for details`)
  } else {
    console.log(`ℹ️  No reminders sent (habit reminder_time may not match current time)`)
    console.log(`   Habit reminder_time: ${habit.reminder_time}`)
    console.log(`   To force-send, temporarily update the reminder_time in Supabase dashboard to now +1min`)
    console.log('\nOr simulate inbound directly (skips the outbound step):')
    console.log('  node scripts/test-sms.mjs reply Y')
  }
}

async function simulateReply(text) {
  if (!text) { console.error('Usage: node scripts/test-sms.mjs reply <text>'); process.exit(1) }

  // Get the first profile's phone number
  const profiles = await supabase('/profiles?select=id,phone_number&limit=1')
  if (!profiles.ok || !profiles.data.length) {
    console.error('No profiles found')
    process.exit(1)
  }
  const phone = profiles.data[0].phone_number

  console.log(`\nSimulating inbound SMS from ${phone}: "${text}"`)

  const params = new URLSearchParams({
    From: phone,
    Body: text,
    MessageSid: `TEST_${Date.now()}`,
    AccountSid: process.env.TWILIO_ACCOUNT_SID || 'TEST_SID',
    To: process.env.TWILIO_PHONE_NUMBER || '+10000000000',
  })

  const res = await fetch(`${BASE_URL}/api/webhooks/twilio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  const body = await res.text()
  if (res.ok) {
    console.log(`✅ Webhook handled (${res.status})`)
    // Show latest habit log
    const logs = await supabase('/habit_logs?select=habit_id,completed,response_value,source&order=created_at.desc&limit=1')
    if (logs.ok && logs.data.length) {
      const log = logs.data[0]
      console.log(`\nLatest habit log:`)
      console.log(`  completed=${log.completed}  value="${log.response_value}"  source=${log.source}`)
    }
  } else {
    console.error(`❌ Webhook returned ${res.status}: ${body}`)
    console.error('\nMake sure:')
    console.error('  1. npm run dev is running')
    console.error('  2. SKIP_WEBHOOK_AUTH=true is in .env.local')
  }
}

async function triggerCron() {
  console.log('\nTriggering send-reminders cron...')
  const res = await fetch(`${BASE_URL}/api/cron/send-reminders`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  })
  const body = await res.json()
  console.log(`Status: ${res.status}`)
  console.log(JSON.stringify(body, null, 2))
}

const [,, command, arg] = process.argv

switch (command) {
  case 'send':    await sendReminder(arg); break
  case 'reply':   await simulateReply(arg); break
  case 'cron':    await triggerCron(); break
  default:        await listHabits(); break
}
