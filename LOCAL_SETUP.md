# HabitSMS - Local Development Setup

Complete guide to set up and run HabitSMS on your local machine.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** - [Download here](https://git-scm.com/)
- **A code editor** - VS Code recommended

Check your versions:
```bash
node --version  # Should be v18+
npm --version   # Should be 9+
git --version
```

---

## 🚀 Quick Start (5 minutes)

### 1. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/RohithDevarshetty/habitsms.git

# Navigate into the project directory
cd habitsms
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages from `package.json`:
- Next.js 14
- Supabase client libraries
- Twilio SDK
- Stripe SDK
- Date utilities and more

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Copy the example file
cp .env.example .env.local

# Or create manually
touch .env.local
```

Add the following to `.env.local`:

```bash
# Supabase (Get from https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Twilio (Get from https://console.twilio.com)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WEBHOOK_SECRET=any_random_string

# Stripe (Get from https://dashboard.stripe.com/test/apikeys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_TEAM_PRICE_ID=price_...

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Cron Job Secret (for securing cron endpoints)
CRON_SECRET=your_random_secret_string_here
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You should see the HabitSMS landing page!

---

## 🗄️ Database Setup (Supabase)

### Option A: Use Supabase Cloud (Recommended for Development)

1. **Create a Supabase account** at [supabase.com](https://supabase.com)

2. **Create a new project**
   - Go to your dashboard
   - Click "New Project"
   - Choose a name (e.g., "habitsms-dev")
   - Set a strong database password
   - Select a region close to you
   - Wait 2-3 minutes for setup

3. **Get your API credentials**
   - Go to Project Settings → API
   - Copy `Project URL` → Use as `NEXT_PUBLIC_SUPABASE_URL`
   - Copy `anon public` key → Use as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy `service_role` key → Use as `SUPABASE_SERVICE_ROLE_KEY`

4. **Run database migrations**
   - Go to SQL Editor in Supabase dashboard
   - Copy contents of `supabase/migrations/001_initial_schema.sql`
   - Paste and click "Run"
   - Repeat for `supabase/migrations/002_cron_jobs.sql`

5. **Enable authentication providers**
   - Go to Authentication → Providers
   - Enable **Email** (OTP-based)
   - Enable **Phone** (SMS-based) - requires Twilio
   - Enable **Google** (optional, requires OAuth credentials)

### Option B: Use Supabase CLI (Advanced)

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

---

## 📱 SMS Setup (Twilio)

### Get Twilio Credentials

1. **Create a Twilio account** at [twilio.com](https://www.twilio.com/try-twilio)
   - Sign up for free trial ($15 credit)
   - Verify your email and phone number

2. **Get your Account SID and Auth Token**
   - Go to [Console Dashboard](https://console.twilio.com/)
   - Copy `Account SID` and `Auth Token`
   - Add to `.env.local`

3. **Buy a phone number** (or use trial number)
   - Go to Phone Numbers → Manage → Buy a number
   - Select a number with SMS capabilities
   - For trial: Can only send to verified numbers
   - Copy the phone number (format: +1234567890)
   - Add as `TWILIO_PHONE_NUMBER` in `.env.local`

4. **Test SMS locally** (optional)
   ```bash
   # Create a test script
   node scripts/test-sms.js
   ```

**Note**: For local development, SMS webhooks won't work directly. Use [ngrok](#using-ngrok-for-webhooks) for testing.

---

## 💳 Payment Setup (Stripe)

### Get Stripe Test Keys

1. **Create a Stripe account** at [stripe.com](https://dashboard.stripe.com/register)

2. **Get API keys**
   - Toggle to "Test mode" (top right)
   - Go to Developers → API keys
   - Copy `Publishable key` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Copy `Secret key` → `STRIPE_SECRET_KEY`

3. **Create products and prices**

   ```bash
   # Go to Products → Add Product

   Product 1: Starter
   - Price: $7/month
   - Recurring: Monthly
   - Copy the Price ID (starts with price_...)

   Product 2: Pro
   - Price: $12/month
   - Recurring: Monthly
   - Copy the Price ID

   Product 3: Team
   - Price: $39/month
   - Recurring: Monthly
   - Copy the Price ID
   ```

4. **Add Price IDs to `.env.local`**

5. **Test with Stripe test cards**
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Use any future expiry date and any CVC

---

## 🔧 Running the Application

### Development Mode

```bash
# Start development server with hot reload
npm run dev

# Runs on http://localhost:3000
```

### Type Checking

```bash
# Check TypeScript types
npm run type-check
```

### Linting

```bash
# Run ESLint
npm run lint

# Auto-fix linting issues
npm run lint -- --fix
```

### Production Build (Local Test)

```bash
# Build for production
npm run build

# Start production server
npm start

# Runs on http://localhost:3000
```

---

## 🌐 Using ngrok for Webhooks

To test webhooks (Twilio SMS, Stripe payments) locally, you need to expose your local server to the internet.

### 1. Install ngrok

```bash
# macOS
brew install ngrok

# Windows/Linux - Download from https://ngrok.com/download
```

### 2. Start ngrok

```bash
# In a new terminal window
ngrok http 3000
```

You'll see output like:
```
Forwarding: https://abc123.ngrok.io -> http://localhost:3000
```

### 3. Configure Webhooks

**Twilio SMS Webhook:**
1. Go to Twilio Console → Phone Numbers → Active Numbers
2. Click your phone number
3. Under "Messaging", set:
   - Webhook: `https://abc123.ngrok.io/api/webhooks/twilio`
   - HTTP Method: `POST`

**Stripe Webhook:**
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://abc123.ngrok.io/api/webhooks/stripe`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copy the webhook signing secret → `STRIPE_WEBHOOK_SECRET`

### 4. Update Environment Variables

```bash
# Add to .env.local
NEXT_PUBLIC_APP_URL=https://abc123.ngrok.io
```

**Important**: ngrok URLs change every time you restart. Update webhooks when URL changes.

---

## 🧪 Testing the Application

### 1. Test Authentication

```bash
# Visit http://localhost:3000/login

# Test Email OTP:
1. Enter your email
2. Check email for code
3. Enter code

# Test Phone OTP (if Twilio configured):
1. Enter phone number
2. Check SMS for code
3. Enter code

# Test Google OAuth (if configured):
1. Click "Continue with Google"
2. Authorize
```

### 2. Test Onboarding

```bash
# After login, you'll be redirected to /onboarding

Step 1: Enter phone number and timezone
Step 2: Select habits (e.g., Workout, Meditation)
Step 3: Set reminder times
```

### 3. Test Dashboard

```bash
# Visit http://localhost:3000/dashboard

- View habits list
- Check streaks
- Click habit for details
- Edit habit
- Delete habit
```

### 4. Test SMS Flow (with ngrok)

```bash
# 1. Create a habit with reminder in 1 minute
# 2. Wait for SMS reminder
# 3. Reply "Y" or "N"
# 4. Check dashboard for updated streak
```

### 5. Test Payments (Stripe Test Mode)

```bash
# Visit http://localhost:3000/dashboard

1. Click "Upgrade" button
2. Select a plan (Starter, Pro, or Team)
3. Use test card: 4242 4242 4242 4242
4. Expiry: Any future date
5. CVC: Any 3 digits
6. Complete checkout
7. Verify subscription in dashboard
```

---

## 📁 Project Structure

```
habitsms/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth routes (login, verify)
│   │   ├── (dashboard)/       # Protected dashboard routes
│   │   ├── api/               # API routes
│   │   │   ├── webhooks/      # Twilio, Stripe webhooks
│   │   │   ├── cron/          # Cron job endpoints
│   │   │   └── sms/           # SMS handling
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Landing page
│   │
│   ├── components/            # React components (future use)
│   │
│   ├── lib/                   # Core libraries
│   │   ├── supabase/         # Supabase clients
│   │   ├── twilio/           # SMS service
│   │   ├── payments/         # Stripe integration
│   │   ├── habits/           # Habit logic (streaks)
│   │   ├── sms/              # SMS parser
│   │   └── utils/            # Utilities (timezone)
│   │
│   └── types/                 # TypeScript types
│       ├── database.ts       # Supabase types
│       └── habits.ts         # Habit types
│
├── supabase/
│   └── migrations/            # SQL migrations
│
├── public/                    # Static assets
│
├── .env.local                 # Environment variables (create this)
├── .env.example              # Example env file
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
├── tailwind.config.ts        # Tailwind CSS config
├── next.config.js            # Next.js config
├── vercel.json               # Vercel deployment config
├── CLAUDE.md                 # AI assistant guide
├── LOCAL_SETUP.md            # This file
├── LAUNCH_CHECKLIST.md       # Production deployment guide
└── README.md                 # Project overview
```

---

## 🐛 Common Issues & Solutions

### Issue: "Module not found" errors

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: TypeScript errors in editor

**Solution:**
```bash
# Restart TypeScript server in VS Code
Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"

# Or run type check
npm run type-check
```

### Issue: Supabase connection fails

**Solution:**
1. Check `.env.local` has correct credentials
2. Verify Supabase project is active (not paused)
3. Check network/firewall isn't blocking supabase.co
4. Try using `NEXT_PUBLIC_SUPABASE_URL` format exactly

### Issue: SMS not sending

**Solution:**
1. Check Twilio credentials are correct
2. Verify phone number format: `+1234567890` (with country code)
3. For trial accounts: Recipient must be verified in Twilio console
4. Check Twilio balance/credits
5. Look at Twilio console logs for errors

### Issue: Stripe webhook not working

**Solution:**
1. Verify ngrok is running and URL is correct
2. Check `STRIPE_WEBHOOK_SECRET` in `.env.local`
3. Look at Stripe Dashboard → Webhooks → Recent deliveries for errors
4. Restart ngrok if URL changed
5. Use Stripe CLI for local testing:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

### Issue: Build fails with Google Fonts error

**Solution:**
This is expected if you don't have internet access. The app will work in dev mode and will build successfully in production with internet access.

### Issue: Hot reload not working

**Solution:**
```bash
# Restart dev server
npm run dev

# Or clear Next.js cache
rm -rf .next
npm run dev
```

---

## 🔐 Security Notes for Local Development

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Use test/sandbox credentials** for Twilio, Stripe
3. **Don't use production database** for local development
4. **Rotate secrets** if accidentally exposed
5. **Keep dependencies updated**: `npm audit fix`

---

## 📚 Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm start                # Start production server
npm run lint             # Run ESLint
npm run type-check       # Check TypeScript

# Database
supabase db reset        # Reset local database
supabase db push         # Push migrations
supabase db pull         # Pull remote schema

# Testing
curl http://localhost:3000/api/health  # Health check

# Cleanup
rm -rf .next             # Clear Next.js cache
rm -rf node_modules      # Remove dependencies
npm install              # Reinstall
```

---

## 🎓 Next Steps

1. **Complete local setup** following this guide
2. **Test all features** (auth, habits, SMS, payments)
3. **Read CLAUDE.md** for development guidelines
4. **Review code structure** in `src/` directory
5. **When ready for production**, see `LAUNCH_CHECKLIST.md`

---

## 🆘 Getting Help

**Issues with setup?**
1. Check this guide's troubleshooting section
2. Review error messages carefully
3. Check browser console (F12) for errors
4. Check terminal output for errors
5. Create an issue on GitHub with:
   - Error message
   - Steps to reproduce
   - Environment (OS, Node version)

**Documentation:**
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Twilio SMS Docs](https://www.twilio.com/docs/sms)
- [Stripe Docs](https://stripe.com/docs)

---

## ✅ Setup Checklist

Use this checklist to verify your setup:

- [ ] Node.js v18+ installed
- [ ] Repository cloned
- [ ] Dependencies installed (`npm install`)
- [ ] `.env.local` created with all variables
- [ ] Supabase project created
- [ ] Database migrations run
- [ ] Supabase auth providers enabled
- [ ] Twilio account created
- [ ] Twilio credentials added to `.env.local`
- [ ] Phone number acquired (trial or paid)
- [ ] Stripe account created (test mode)
- [ ] Stripe products/prices created
- [ ] Stripe credentials added to `.env.local`
- [ ] Dev server runs without errors (`npm run dev`)
- [ ] Landing page loads at localhost:3000
- [ ] Can sign up/login
- [ ] Can complete onboarding
- [ ] Dashboard loads
- [ ] Can create habits

**Optional (for full testing):**
- [ ] ngrok installed and running
- [ ] Twilio webhook configured with ngrok URL
- [ ] Stripe webhook configured with ngrok URL
- [ ] SMS reminders working
- [ ] Payments working

---

**Ready to develop!** 🚀

Start coding, test features, and see `CLAUDE.md` for development guidelines.
