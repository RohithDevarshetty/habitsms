# HabitSMS - Build Habits with 98% Success Rate

A habit tracking SaaS that leverages SMS for high-engagement notifications. Get text message reminders that actually work - no app needed after setup.

## 🎯 Product Vision

Unlike traditional habit apps with 78% abandonment rate after 3 days, HabitSMS achieves 98% open rate by using SMS instead of push notifications.

**Core Insight**: People pay $500/month for coaches who just text reminders. We automate this at $7-12/month.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account (https://supabase.com)
- Twilio account (https://twilio.com) for SMS
- Stripe account (https://stripe.com) for payments

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/RohithDevarshetty/habitsms.git
   cd habitsms
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```

4. **Set up Supabase database**
   - Create a new project at https://supabase.com
   - Run migrations from `supabase/migrations/` in the SQL editor
   - Get your API keys from Settings > API

5. **Run development server**
   ```bash
   npm run dev
   ```

6. **Open http://localhost:3000**

## 📁 Project Structure

```
habitsms/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth routes (login, signup)
│   │   ├── (dashboard)/       # Protected dashboard routes
│   │   ├── api/               # API routes
│   │   │   ├── webhooks/      # Twilio, Stripe webhooks
│   │   │   ├── cron/          # Cron job endpoints
│   │   │   └── sms/           # SMS handling logic
│   │   ├── layout.tsx
│   │   ├── page.tsx           # Landing page
│   │   └── globals.css
│   │
│   ├── components/            # React components
│   │   ├── ui/               # UI components
│   │   ├── dashboard/        # Dashboard components
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
│   ├── functions/             # Edge functions
│   └── seed.sql              # Seed data
│
├── public/                    # Static assets
├── tests/                     # Tests
├── scripts/                   # Utility scripts
├── .env.example              # Environment variables template
├── .env.local                # Local environment (gitignored)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── README.md                 # This file
├── CLAUDE.md                 # AI assistant guide
└── LICENSE
```

## 🛠️ Technology Stack

- **Frontend & Backend**: Next.js 14 (App Router) on Vercel
- **Database**: Supabase (PostgreSQL with RLS)
- **Authentication**: Supabase Auth (OTP, Email, Google OAuth)
- **SMS**: Twilio (primary), MSG91 (India cost optimization)
- **Payments**: Stripe (international), Razorpay (India)
- **Scheduling**: Supabase pg_cron + Vercel Cron
- **Email**: Resend (3000/month free)
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## 📋 Development Progress

### 🎉 MVP COMPLETE - 23/23 tasks (100%) 🚀

**Day 1: Foundation (8 tasks)**
- [x] Initialize Next.js 14 project with TypeScript and Tailwind CSS
- [x] Create project structure (src/app, src/components, src/lib, etc.)
- [x] Set up environment variables (.env.example, .env.local)
- [x] Install core dependencies (Supabase, Twilio, Stripe, date-fns)
- [x] Create Supabase database schema migrations
- [x] Set up Supabase client and authentication helpers
- [x] Write comprehensive README.md with setup instructions
- [x] Create landing page with value proposition

**Day 2: Core Features (9 tasks)**
- [x] Implement authentication flow (OTP, Email, Google OAuth)
- [x] Build habit templates system (5 default templates)
- [x] Build 3-step onboarding flow
- [x] Implement Twilio SMS integration service
- [x] Create inbound SMS webhook handler
- [x] Build SMS response parsing logic (Y/N, numbers)
- [x] Implement streak calculation logic
- [x] Create dashboard with habits list and streaks display
- [x] Implement streak celebration SMS (7, 30, 100 days)
- [x] Add vacation mode (pause habits) feature

**Day 3: Launch Prep (6 tasks)**
- [x] Create habit CRUD UI (view, edit, delete, activity log)
- [x] Set up cron jobs for daily reminders (Vercel Cron)
- [x] Create weekly summary SMS feature
- [x] Implement timezone handling utilities
- [x] Integrate Stripe payment system (checkout & webhooks)
- [x] Add Privacy Policy and Terms of Service pages

### 🚀 **READY FOR LAUNCH!**

## 🔑 Environment Variables

Required environment variables (see `.env.example`):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
TWILIO_WEBHOOK_SECRET=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_STARTER_PRICE_ID=
STRIPE_PRO_PRICE_ID=
STRIPE_TEAM_PRICE_ID=

# Application
NEXT_PUBLIC_APP_URL=
NODE_ENV=
CRON_SECRET=
```

## 📊 Database Schema

### Core Tables

- **profiles** - User accounts and subscription info
- **habits** - User habits with streak tracking
- **habit_logs** - Daily habit completion logs
- **sms_messages** - SMS message history and cost tracking
- **subscription_events** - Payment and subscription events
- **teams** - Team accounts (for Team plan)
- **scheduled_tasks** - Task queue for cron jobs

See `supabase/migrations/001_initial_schema.sql` for complete schema.

## 💰 Pricing Tiers

1. **Starter - $7/month**
   - 3 active habits
   - Daily SMS reminders
   - Streak tracking
   - Basic web dashboard

2. **Pro - $12/month** ⭐ (Primary conversion target)
   - Unlimited habits
   - Weekly summaries
   - Priority support

3. **Team - $39/month**
   - Everything in Pro
   - 5 family members/team members
   - Shared dashboard

**Launch Special**: First 100 users get $4.99/month lifetime (Pro features)

## 📱 SMS Flow

### Example SMS Templates

**Reminder:**
```
Did you meditate today? Reply with:
Y - Yes, I did it!
N - Not today
SKIP - Pause for today
```

**Confirmation:**
```
🔥 Great job! Meditation logged!
Current streak: 7 days
Keep it up! 💪
```

**Milestone:**
```
🎉 AMAZING! You've completed "Meditation" for 30 days straight!
You're on fire! 🔥
```

## 🚀 Deployment

### Vercel (Frontend)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to `main`

### Supabase (Database)

1. Create project at https://supabase.com
2. Run migrations in SQL editor
3. Enable Row Level Security (RLS)
4. Configure authentication providers

## 📚 Documentation

- **CLAUDE.md** - Comprehensive AI assistant guide with:
  - Complete tech stack details
  - Database schema with SQL
  - SMS templates and flows
  - Security best practices
  - Launch strategy and metrics

## 🧪 Testing

```bash
# Run type checking
npm run type-check

# Run linter
npm run lint

# Build for production
npm run build
```

## 🤝 Contributing

This is a commercial SaaS product. For AI assistants working on this codebase:

1. Read `CLAUDE.md` for detailed guidelines
2. Follow the established code patterns
3. Update todos in this README as you complete tasks
4. Test SMS flows thoroughly (costs money!)
5. Consider timezone handling in all time-related code
6. Optimize SMS sends (every message costs money)

## 📈 Success Metrics (First 30 Days)

**Realistic Goals:**
- 200 signups
- 100 activated users (50% activation)
- 20 paid subscribers (10% conversion)
- $150-200 MRR
- 60% D7 retention

## 🔒 Security

- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Webhook signature verification (Twilio, Stripe)
- ✅ Rate limiting on public endpoints
- ✅ Phone number validation
- ✅ Environment variables for all secrets
- ✅ HTTPS only in production

## 📝 License

MIT License - see LICENSE file for details

## 🙋 Support

- Issues: https://github.com/RohithDevarshetty/habitsms/issues
- Documentation: See CLAUDE.md for detailed technical docs

---

**Built with ❤️ by Rohith**

*Ship fast, iterate faster.*
