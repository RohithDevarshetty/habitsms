# CLAUDE.md - AI Assistant Guide for HabitSMS

**Last Updated**: 2025-11-21
**Repository**: RohithDevarshetty/habitsms
**License**: MIT
**Current Status**: MVP Development Phase
**Target Launch**: 5-7 days from start

---

## 🎯 Product Vision

**HabitSMS** is a habit tracking SaaS that leverages SMS for high-engagement notifications and interactions. Unlike traditional habit apps with 78% abandonment rate after 3 days, HabitSMS achieves 98% open rate by using SMS instead of push notifications.

### The Core Insight
- Push notifications: 60% of users disable them
- SMS: 98% open rate within 3 minutes
- People pay $500/month for coaches who just text reminders
- Our advantage: Automated SMS accountability at $7-12/month

### Target Audience
1. **Gym Bros** - Never miss workout ($9/month easy sell)
2. **Meditation Practitioners** - Daily practice tracking ($12/month)
3. **Writers** - Daily writing habit accountability ($15/month)
4. **Dieters** - Meal/water tracking ($9/month)
5. **Students** - Study reminders ($7/month)
6. **Entrepreneurs** - Morning routines ($19/month)

---

## 🏗️ Technology Stack (FINAL)

### Frontend & Backend
- **Next.js 14** (App Router) on Vercel (free tier)
  - TypeScript required
  - Tailwind CSS for styling
  - Server Actions for mutations
  - API Routes for webhooks

### Database, Auth & Storage
- **Supabase** (500MB free tier)
  - PostgreSQL database
  - Row Level Security (RLS) enabled
  - Auth: OTP, Email, Google OAuth
  - Real-time subscriptions for dashboard
  - Storage for user assets (if needed)

### SMS & Messaging
- **Primary: Twilio**
  - India: ₹0.32/SMS ($0.004)
  - US: $0.0075/SMS
  - Programmable SMS API
  - Webhook for inbound SMS

- **Alternative: MSG91** (India only)
  - ₹0.14/SMS ($0.0017)
  - 50% cheaper for Indian market
  - Use for Indian numbers to reduce costs

- **WhatsApp: Twilio WhatsApp Business**
  - ₹0.42/conversation (India)
  - Future feature (post-MVP)

### Payments
- **Razorpay** - India market
  - 2% transaction fee
  - UPI, Cards, Wallets, Net Banking
  - Webhook for subscription events

- **Stripe** - International market
  - 2.9% + 30¢ transaction fee
  - Credit cards, Apple Pay, Google Pay
  - Webhook for subscription events

### Scheduling
- **Primary: Supabase pg_cron** (free)
  - Native PostgreSQL cron jobs
  - Runs inside database
  - No external dependencies

- **Alternative: Vercel Cron** (free)
  - Backup for reliability
  - Cron jobs as API routes

### Email
- **Resend** (3000 emails/month free)
  - Transactional emails
  - Welcome emails, receipts, summaries
  - React Email for templates

---

## 📁 Project Structure

```
habitsms/
├── .github/
│   └── workflows/              # CI/CD (Vercel auto-deploy)
│
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth routes (login, signup)
│   │   ├── (dashboard)/       # Protected dashboard routes
│   │   ├── api/               # API routes
│   │   │   ├── webhooks/      # Twilio, Stripe, Razorpay webhooks
│   │   │   ├── cron/          # Cron job endpoints
│   │   │   └── sms/           # SMS handling logic
│   │   ├── layout.tsx
│   │   └── page.tsx           # Landing page
│   │
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── dashboard/        # Dashboard-specific components
│   │   ├── landing/          # Landing page components
│   │   └── habits/           # Habit-related components
│   │
│   ├── lib/                   # Utility libraries
│   │   ├── supabase/         # Supabase client & helpers
│   │   ├── twilio/           # Twilio SMS service
│   │   ├── msg91/            # MSG91 service (India)
│   │   ├── payments/         # Stripe & Razorpay
│   │   ├── scheduling/       # Cron job logic
│   │   ├── email/            # Resend email service
│   │   └── utils/            # Helper functions
│   │
│   ├── types/                 # TypeScript types
│   │   ├── database.ts       # Supabase generated types
│   │   ├── api.ts            # API types
│   │   └── habits.ts         # Habit-specific types
│   │
│   └── middleware.ts          # Next.js middleware (auth)
│
├── supabase/
│   ├── migrations/            # Database migrations
│   ├── functions/             # Edge functions (if needed)
│   └── seed.sql              # Seed data (habit templates)
│
├── public/                    # Static assets
│   ├── images/
│   └── favicon.ico
│
├── tests/                     # Tests (add as project grows)
│   ├── unit/
│   └── integration/
│
├── scripts/                   # Utility scripts
│   ├── generate-types.ts     # Supabase type generation
│   └── test-sms.ts           # SMS testing script
│
├── .env.example
├── .env.local                 # Local environment (gitignored)
├── .gitignore
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── README.md                  # User-facing docs
├── CLAUDE.md                  # This file
└── LICENSE
```

---

## 🔐 Environment Variables

Create `.env.local` (NEVER commit this file):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...  # Server-side only

# Twilio (Primary SMS Provider)
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WEBHOOK_SECRET=xxxxx

# MSG91 (Alternative for India - Optional)
MSG91_AUTH_KEY=xxxxx
MSG91_SENDER_ID=HABSMS

# Stripe (International Payments)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_STARTER_PRICE_ID=price_xxxxx
STRIPE_PRO_PRICE_ID=price_xxxxx
STRIPE_TEAM_PRICE_ID=price_xxxxx

# Razorpay (India Payments)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxx

# Resend (Email)
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@habitsms.com

# Application
NEXT_PUBLIC_APP_URL=https://habitsms.com
NODE_ENV=development|production

# Cron Job Secret (verify cron requests)
CRON_SECRET=random_secure_string_here
```

---

## 📊 Database Schema (Supabase)

### Core Tables

#### `profiles`
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT UNIQUE NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  subscription_tier TEXT DEFAULT 'free', -- 'free', 'starter', 'pro', 'team'
  subscription_status TEXT DEFAULT 'inactive', -- 'active', 'inactive', 'cancelled', 'past_due'
  stripe_customer_id TEXT,
  razorpay_customer_id TEXT,
  team_id UUID REFERENCES teams(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
```

#### `habits`
```sql
CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_type TEXT, -- 'workout', 'meditate', 'water', 'read', 'sleep', 'custom'
  name TEXT NOT NULL,
  description TEXT,
  response_type TEXT NOT NULL, -- 'boolean', 'number', 'text'
  response_unit TEXT, -- 'glasses', 'pages', 'minutes', 'hours', 'reps'
  reminder_time TIME NOT NULL, -- Time of day to send reminder
  reminder_enabled BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  streak_count INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_habits_user_id ON habits(user_id);
CREATE INDEX idx_habits_active ON habits(user_id, is_active);

-- RLS Policies
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own habits" ON habits FOR ALL USING (auth.uid() = user_id);
```

#### `habit_logs`
```sql
CREATE TABLE habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT true,
  response_value TEXT, -- Stores Y/N or numeric value
  source TEXT DEFAULT 'sms', -- 'sms', 'web', 'api'
  notes TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_habit_logs_habit_id ON habit_logs(habit_id, logged_at DESC);
CREATE INDEX idx_habit_logs_user_id ON habit_logs(user_id, logged_at DESC);

-- RLS Policies
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own logs" ON habit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own logs" ON habit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
```

#### `sms_messages`
```sql
CREATE TABLE sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES habits(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  message_body TEXT NOT NULL,
  direction TEXT NOT NULL, -- 'outbound', 'inbound'
  status TEXT, -- 'queued', 'sent', 'delivered', 'failed'
  provider TEXT DEFAULT 'twilio', -- 'twilio', 'msg91'
  provider_message_id TEXT,
  cost_cents INTEGER, -- Track SMS costs
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sms_user_id ON sms_messages(user_id, created_at DESC);
CREATE INDEX idx_sms_provider_id ON sms_messages(provider_message_id);
```

#### `subscription_events`
```sql
CREATE TABLE subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'created', 'updated', 'cancelled', 'payment_failed'
  provider TEXT NOT NULL, -- 'stripe', 'razorpay'
  provider_event_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscription_events_user_id ON subscription_events(user_id, created_at DESC);
```

#### `teams` (for Team plan)
```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  max_members INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_teams_owner_id ON teams(owner_id);
```

### Habit Templates (Seed Data)

```sql
-- Insert default habit templates
INSERT INTO public.habit_templates (name, template_type, response_type, response_unit, default_reminder_time, description) VALUES
  ('Daily Workout', 'workout', 'number', 'minutes', '07:00:00', 'Track your daily exercise'),
  ('Meditation', 'meditate', 'number', 'minutes', '06:30:00', 'Track your meditation practice'),
  ('Water Intake', 'water', 'number', 'glasses', '09:00:00', 'Stay hydrated throughout the day'),
  ('Reading', 'read', 'number', 'pages', '21:00:00', 'Build a daily reading habit'),
  ('Sleep Tracking', 'sleep', 'number', 'hours', '22:00:00', 'Track your sleep duration');
```

---

## 🎯 MVP Features (5-Day Build)

### Day 1-2: Core Infrastructure
- [ ] Next.js project setup with TypeScript
- [ ] Supabase project creation & schema
- [ ] Auth flow (OTP, Email, Google OAuth)
- [ ] Basic landing page
- [ ] Environment variables setup

### Day 3-4: Core Features
- [ ] Habit templates (5 templates)
- [ ] Habit creation flow
- [ ] Twilio SMS integration
- [ ] Inbound SMS webhook handler
- [ ] Response parsing (Y/N, numbers)
- [ ] Streak calculation logic
- [ ] Dashboard with habit list & streaks

### Day 4-5: Polish & Launch Prep
- [ ] Streak celebration SMS
- [ ] Weekly summary SMS (Sunday night)
- [ ] Vacation mode (pause habits)
- [ ] Timezone handling (user-specific)
- [ ] Stripe integration (Pro plan only for MVP)
- [ ] Onboarding flow (3 steps)
- [ ] Landing page polish

### Post-MVP (Week 2+)
- [ ] MSG91 integration (India cost optimization)
- [ ] Razorpay integration
- [ ] Team plans
- [ ] WhatsApp support
- [ ] Habit sharing
- [ ] Analytics dashboard

---

## 📱 SMS Flow & Templates

### Core SMS Interaction Pattern

**1. Reminder SMS (Outbound)**
```
Did you {habit_name} today? Reply with:
Y - Yes, I did it!
N - Not today
SKIP - Pause for today
STATS - View your streak
```

**2. Number-Based Habit (Outbound)**
```
How many {unit} of {habit_name} today?
Reply with a number (e.g., "8" for 8 glasses of water)
Reply SKIP to pause
```

**3. Confirmation SMS (Outbound)**
```
🔥 Great job! {habit_name} logged!
Current streak: {streak} days
Keep it up! 💪
```

**4. Streak Celebration (Outbound)**
```
🎉 AMAZING! You've completed "{habit_name}" for {streak} days straight!
You're on fire! 🔥
```

**5. Weekly Summary (Sunday 8 PM)**
```
📊 Your Week in Review:
✅ {completed_count} habits completed
🔥 Longest streak: {longest_streak} days
💪 Keep crushing it!

Reply STATS for details
```

### Inbound SMS Parsing Logic

```typescript
// Response patterns to handle
const patterns = {
  affirmative: /^(y|yes|yeah|yep|done|completed|✓|1)$/i,
  negative: /^(n|no|nope|nah|skip|miss|0)$/i,
  number: /^\d+$/,
  stats: /^(stats|status|streak|progress)$/i,
  pause: /^(pause|vacation|stop)$/i,
  help: /^(help|\?)$/i,
}
```

---

## 💰 Pricing & Subscription Tiers

### Tier 1: Starter - $7/month
- 3 active habits
- Daily SMS reminders
- Streak tracking
- Basic web dashboard
- **Target**: Price-sensitive users, students
- **Positioning**: "Less than a coffee"

### Tier 2: Pro - $12/month ⭐ (Primary conversion target)
- Unlimited habits
- Smart timing AI (future)
- Weekly summaries
- Accountability partner feature (future)
- Priority support
- **Target**: Serious habit builders
- **Positioning**: "Netflix price for life transformation"

### Tier 3: Team - $39/month
- Everything in Pro
- 5 family members/team members
- Group challenges (future)
- Shared dashboard
- Team analytics
- **Target**: Families, workout groups, accountability partners
- **Positioning**: "Cheaper than family gym membership"

### Launch Special
- First 100 users: $4.99/month lifetime (Pro features)
- Creates urgency + early testimonials
- Implement with Stripe coupon codes

---

## 🎨 User Flow

### Onboarding (3 Steps)

**Step 1: Sign Up**
- Phone number (OTP) or Email or Google OAuth
- Timezone selection (auto-detect, allow override)

**Step 2: Choose Habits**
- Show 5 templates with icons
- "Or create custom habit" button
- Select 1-3 habits to start

**Step 3: Set Reminder Times**
- For each selected habit, choose time
- Show suggested times based on habit type
- Confirm phone number for SMS

**Welcome SMS** (immediately after onboarding)
```
Welcome to HabitSMS! 🎉
Your first reminder will arrive at {time}.
Reply HELP anytime for commands.
Let's build great habits together!
```

### Daily Habit Loop

```
Morning (User's timezone):
1. Cron job runs at scheduled time
2. Check active habits for user
3. Send SMS reminder
4. Wait for response

When User Replies:
1. Parse response (Y/N/Number)
2. Log habit completion
3. Update streak
4. Send confirmation SMS
5. If milestone (7, 30, 100 days), send celebration

Evening (8 PM):
1. If no response by 8 PM, send gentle nudge (optional)
2. Mark day as incomplete if no response by midnight
```

---

## 🔧 Key Implementation Details

### Timezone Handling

**Critical**: All SMS must be sent in user's local timezone

```typescript
// Store times in user's timezone in database
// Convert to UTC for cron jobs
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz'

function scheduleReminder(habit: Habit, userTimezone: string) {
  const localTime = habit.reminder_time // "07:00:00"
  const today = new Date()
  const localDateTime = new Date(`${today.toISOString().split('T')[0]}T${localTime}`)
  const utcDateTime = zonedTimeToUtc(localDateTime, userTimezone)

  // Schedule SMS for utcDateTime
}
```

### Streak Calculation

```typescript
function calculateStreak(habitId: string): number {
  // Get all logs for habit, ordered by date DESC
  // Start from most recent
  // Count consecutive days with completed=true
  // Reset streak if gap > 1 day
  // Update habit.streak_count and habit.longest_streak
}

// Run this function:
// 1. When user logs habit completion
// 2. Daily at midnight (mark missed days, reset streaks)
```

### SMS Cost Tracking

```typescript
// Track every SMS sent
const SMS_COSTS = {
  twilio: {
    IN: 0.32, // Indian Rupees
    US: 0.0075, // USD (convert to cents)
  },
  msg91: {
    IN: 0.14, // Indian Rupees
  }
}

// Log in sms_messages table
// Generate monthly cost reports per user
// Alert when user exceeds threshold (prevent abuse)
```

### Rate Limiting

**Critical**: Prevent SMS spam and abuse

```typescript
// Rate limits per user
const RATE_LIMITS = {
  sms_per_day: 50, // Max 50 SMS per user per day
  habits_per_user: {
    free: 0,
    starter: 3,
    pro: 50,
    team: 50,
  },
  responses_per_hour: 20, // Prevent spam replies
}

// Implement using Upstash Redis or Supabase
```

### Cron Jobs (Supabase pg_cron)

```sql
-- Send daily reminders
SELECT cron.schedule(
  'send-habit-reminders',
  '* * * * *', -- Every minute (check for pending reminders)
  $$
  SELECT net.http_post(
    url := 'https://habitsms.com/api/cron/send-reminders',
    headers := '{"Authorization": "Bearer ' || current_setting('app.cron_secret') || '"}'::jsonb
  );
  $$
);

-- Calculate streaks daily at midnight UTC
SELECT cron.schedule(
  'calculate-daily-streaks',
  '0 0 * * *', -- Midnight UTC
  $$
  SELECT net.http_post(
    url := 'https://habitsms.com/api/cron/calculate-streaks',
    headers := '{"Authorization": "Bearer ' || current_setting('app.cron_secret') || '"}'::jsonb
  );
  $$
);

-- Send weekly summaries (Sunday 8 PM UTC, adjust per user timezone)
SELECT cron.schedule(
  'send-weekly-summaries',
  '0 20 * * 0', -- Every Sunday at 8 PM UTC
  $$
  SELECT net.http_post(
    url := 'https://habitsms.com/api/cron/weekly-summary',
    headers := '{"Authorization": "Bearer ' || current_setting('app.cron_secret') || '"}'::jsonb
  );
  $$
);
```

---

## 🚀 Deployment & CI/CD

### Vercel Deployment (Automatic)

1. Connect GitHub repo to Vercel
2. Set environment variables in Vercel dashboard
3. Auto-deploy on push to `main` branch
4. Preview deployments for PRs

### Supabase Setup

1. Create project at https://supabase.com
2. Run migrations from `supabase/migrations/`
3. Set up RLS policies
4. Configure auth providers
5. Set up pg_cron jobs

### Domain & SSL

1. Purchase domain (Namecheap, Cloudflare)
2. Add to Vercel (automatic SSL)
3. Configure DNS records
4. Update environment variables with production domain

### Post-Deployment Checklist

- [ ] All environment variables set
- [ ] Database migrations run
- [ ] RLS policies enabled
- [ ] Twilio webhook configured (point to production domain)
- [ ] Stripe webhook configured
- [ ] Razorpay webhook configured
- [ ] Cron jobs scheduled
- [ ] Test SMS sending/receiving
- [ ] Test payment flow
- [ ] Google Analytics / Posthog tracking
- [ ] Error monitoring (Sentry)

---

## 📈 Metrics to Track

### Product Metrics

1. **Activation Rate**: % of signups who set up first habit
2. **D1/D7/D30 Retention**: Users active after 1, 7, 30 days
3. **Habit Completion Rate**: % of reminders that get responses
4. **Streak Length Distribution**: How long do users maintain streaks?
5. **SMS Response Time**: How fast do users reply to reminders?

### Business Metrics

1. **MRR** (Monthly Recurring Revenue)
2. **Churn Rate**: % of users who cancel subscription
3. **LTV** (Lifetime Value): Average revenue per user
4. **CAC** (Customer Acquisition Cost): Cost to acquire one paid user
5. **LTV:CAC Ratio**: Should be > 3:1
6. **SMS Cost per User**: Monitor to maintain profitability

### Technical Metrics

1. **SMS Delivery Rate**: % of SMS successfully delivered
2. **API Response Time**: p50, p95, p99
3. **Error Rate**: % of requests that error
4. **Cron Job Success Rate**: % of scheduled jobs that complete

---

## 🧪 Testing Strategy

### Unit Tests (Add gradually)

```typescript
// Test streak calculation
describe('calculateStreak', () => {
  it('should calculate consecutive days correctly', () => {
    // Test cases
  })

  it('should reset streak on missed day', () => {
    // Test cases
  })
})

// Test SMS response parsing
describe('parseSmsResponse', () => {
  it('should recognize affirmative responses', () => {
    expect(parseResponse('Y')).toBe('completed')
    expect(parseResponse('yes')).toBe('completed')
  })
})
```

### Integration Tests (Critical paths)

1. **Auth flow**: Sign up → Verify → Onboard
2. **Habit creation**: Create → Schedule → Receive SMS
3. **SMS interaction**: Receive → Reply → Log → Confirm
4. **Payment flow**: Subscribe → Pay → Activate

### Manual Testing Checklist (Before launch)

- [ ] Sign up with phone (OTP)
- [ ] Sign up with email
- [ ] Sign up with Google
- [ ] Create habit from template
- [ ] Create custom habit
- [ ] Receive SMS reminder (test in 1 minute, not actual time)
- [ ] Reply Y/N to SMS
- [ ] Reply with number to SMS
- [ ] View dashboard (habits, streaks, logs)
- [ ] Subscribe to Starter plan
- [ ] Subscribe to Pro plan
- [ ] Cancel subscription
- [ ] Reactivate subscription
- [ ] Change reminder time
- [ ] Pause habit (vacation mode)
- [ ] Resume habit
- [ ] Delete habit

---

## 🛡️ Security Considerations

### Webhook Verification

**Critical**: Always verify webhook signatures

```typescript
// Twilio webhook verification
import twilio from 'twilio'

export function verifyTwilioWebhook(req: Request): boolean {
  const signature = req.headers.get('x-twilio-signature')
  const url = req.url
  const params = Object.fromEntries(req.body)

  return twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    signature,
    url,
    params
  )
}

// Stripe webhook verification
import Stripe from 'stripe'

export async function verifyStripeWebhook(req: Request): Stripe.Event {
  const signature = req.headers.get('stripe-signature')!
  const payload = await req.text()

  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  )
}
```

### Rate Limiting (Prevent abuse)

```typescript
// Use Upstash Redis or Vercel KV
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
  analytics: true,
})

// Apply to public endpoints
const { success } = await ratelimit.limit(userId)
if (!success) throw new Error('Rate limit exceeded')
```

### Phone Number Validation

```typescript
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js'

export function validatePhoneNumber(phone: string): string | null {
  try {
    if (!isValidPhoneNumber(phone)) return null
    const parsed = parsePhoneNumber(phone)
    return parsed.format('E.164') // +1234567890
  } catch {
    return null
  }
}
```

### Data Privacy

1. **GDPR Compliance**: Allow users to export/delete data
2. **Phone Number Hashing**: Hash phone numbers in logs
3. **PII Handling**: Don't log full phone numbers in external services
4. **Data Retention**: Delete inactive users after 1 year

---

## 🐛 Common Issues & Solutions

### Issue: SMS not delivered in India

**Solution**: Use MSG91 for Indian numbers (₹0.14 vs ₹0.32)

```typescript
function selectSmsProvider(phoneNumber: string): 'twilio' | 'msg91' {
  const parsed = parsePhoneNumber(phoneNumber)
  if (parsed.country === 'IN') return 'msg91'
  return 'twilio'
}
```

### Issue: Timezone confusion

**Solution**: Always store user timezone, convert all times

```typescript
// NEVER store times without timezone context
// ALWAYS convert to UTC for storage
// ALWAYS convert to user timezone for display
```

### Issue: Streak calculation broken after missed day

**Solution**: Run streak recalculation as background job

```typescript
// Defensive programming: recalculate streak on every view
// Cache result for 1 hour
// Background job runs daily to fix discrepancies
```

### Issue: Users replying with unexpected formats

**Solution**: Fuzzy matching + help message

```typescript
function parseResponse(text: string): ParsedResponse {
  text = text.toLowerCase().trim()

  // Try all patterns
  if (patterns.affirmative.test(text)) return { type: 'completed' }
  if (patterns.negative.test(text)) return { type: 'skipped' }
  if (patterns.number.test(text)) return { type: 'number', value: parseInt(text) }

  // Unknown format: send help message
  return { type: 'help' }
}

// Help message SMS
const HELP_MESSAGE = `
I didn't understand that. Reply with:
Y - Completed
N - Not today
Or a number for tracking
`
```

---

## 🎓 AI Assistant Guidelines

### When Building Features

1. **Check existing patterns first**
   - Look at how other API routes are structured
   - Follow established naming conventions
   - Use existing utility functions

2. **Think about edge cases**
   - What if user has no active habits?
   - What if SMS fails to send?
   - What if webhook is called twice (idempotency)?

3. **Consider costs**
   - Every SMS costs money (₹0.14 - ₹0.42)
   - Avoid unnecessary SMS sends
   - Batch notifications when possible

4. **Timezone awareness**
   - ALWAYS handle timezones correctly
   - Test with users in different timezones
   - Use date-fns-tz for conversions

5. **Mobile-first thinking**
   - Dashboard should work on phones
   - SMS messages should be < 160 chars when possible
   - Fast page loads (Vercel Edge caching)

### Before Committing

- [ ] TypeScript: No `any` types, all types defined
- [ ] Security: Webhooks verified, no exposed secrets
- [ ] Error handling: Try-catch for all async operations
- [ ] Logging: Structured logs with context
- [ ] Testing: Critical paths tested
- [ ] Performance: Database queries optimized (indexes)
- [ ] Mobile: Responsive design tested
- [ ] Costs: SMS sends optimized

### Code Quality Standards

```typescript
// ✅ GOOD: Type-safe, error handling, logging
export async function sendHabitReminder(habitId: string): Promise<void> {
  try {
    const habit = await supabase
      .from('habits')
      .select('*, profiles(*)')
      .eq('id', habitId)
      .single()

    if (!habit) {
      logger.warn({ habitId }, 'Habit not found')
      return
    }

    const message = buildReminderMessage(habit)
    await smsService.send(habit.profiles.phone_number, message)

    logger.info({ habitId, userId: habit.user_id }, 'Reminder sent')
  } catch (error) {
    logger.error({ habitId, error }, 'Failed to send reminder')
    throw error
  }
}

// ❌ BAD: No types, no error handling, no logging
async function send(id) {
  const habit = await db.query('SELECT * FROM habits WHERE id = ?', [id])
  await twilio.messages.create({ to: habit.phone, body: 'Reminder!' })
}
```

---

## 📚 Key Resources

### Documentation
- [Next.js App Router](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Twilio SMS API](https://www.twilio.com/docs/sms)
- [Stripe Subscriptions](https://stripe.com/docs/billing)
- [Razorpay Docs](https://razorpay.com/docs/)

### Libraries to Use
- `@supabase/supabase-js` - Supabase client
- `twilio` - Twilio SDK
- `stripe` - Stripe SDK
- `date-fns` + `date-fns-tz` - Date/timezone handling
- `libphonenumber-js` - Phone number validation
- `zod` - Schema validation
- `resend` - Email sending

### Design Resources
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)

---

## 🚢 Launch Checklist

### Pre-Launch (Week 1)

- [ ] MVP features complete
- [ ] Landing page live
- [ ] Payment integration tested
- [ ] SMS sending/receiving tested
- [ ] 10 beta users onboarded
- [ ] Feedback collected & bugs fixed

### Launch Day

- [ ] ProductHunt post scheduled (Tuesday 12:01 AM PST)
- [ ] Reddit posts ready (r/getdisciplined, r/productivity)
- [ ] Twitter launch thread prepared
- [ ] Email list notified (launch special pricing)
- [ ] Analytics tracking confirmed
- [ ] Error monitoring active

### Post-Launch (Week 2)

- [ ] Monitor error rates & fix critical bugs
- [ ] Respond to user feedback
- [ ] Iterate on onboarding (improve activation rate)
- [ ] Start content marketing (blog posts, SEO)
- [ ] Begin paid acquisition experiments

---

## 📊 Success Metrics (First 30 Days)

**Optimistic Goals:**
- 500 signups
- 250 activated users (set up first habit)
- 50 paid subscribers ($7-12/month)
- $400-600 MRR
- 80% D7 retention
- <1% SMS failure rate

**Realistic Goals:**
- 200 signups
- 100 activated users
- 20 paid subscribers
- $150-200 MRR
- 60% D7 retention

**Pivot Triggers:**
- <5% signup→activation rate (onboarding too complex)
- <20% D7 retention (product not sticky)
- <2% conversion to paid (pricing too high or value unclear)

---

## 🔄 Changelog

### 2025-11-21 - Tech Stack & Product Spec Defined
- Finalized technology stack (Next.js, Supabase, Twilio)
- Defined MVP features and 5-day build plan
- Established pricing tiers ($7/$12/$39)
- Created database schema
- Documented SMS flows and templates
- Set up project structure
- Defined metrics and success criteria

---

**Note to AI Assistants**: This is a real SaaS product with revenue goals. Every decision should consider:
1. **User experience**: Simple, fast, reliable
2. **Cost efficiency**: Optimize SMS usage
3. **Speed to market**: Launch in 5-7 days
4. **Scalability**: Built to handle 1000+ users from day 1

When in doubt, prioritize speed and simplicity over perfection. Ship fast, iterate faster.
