# HabitSMS Launch Checklist

## 📋 Pre-Launch Testing (Required)

### Authentication Flow
- [ ] Sign up with email (receive OTP)
- [ ] Sign up with phone (receive SMS OTP)
- [ ] Sign up with Google OAuth
- [ ] Verify email redirects to onboarding
- [ ] Test logout and login again

### Onboarding Flow
- [ ] Step 1: Enter phone number and select timezone
- [ ] Step 2: Select habit templates (try 1, 2, 3 habits)
- [ ] Step 3: Set reminder times for each habit
- [ ] Verify redirect to dashboard
- [ ] Check welcome SMS arrives

### Dashboard & Habits
- [ ] View habits list with streaks
- [ ] Click habit to view details
- [ ] Edit habit (name, time, reminder toggle)
- [ ] Delete habit (soft delete)
- [ ] View activity log (last 30 days)
- [ ] Create new custom habit
- [ ] Enable/disable vacation mode

### SMS Flow (IMPORTANT - Real Money!)
- [ ] Wait for reminder SMS at scheduled time
- [ ] Reply "Y" - verify confirmation SMS
- [ ] Reply "N" - verify acknowledgment SMS
- [ ] Reply "STATS" - verify stats SMS
- [ ] Reply "PAUSE" - verify vacation mode activation
- [ ] Reply "RESUME" - verify vacation mode deactivation
- [ ] Check dashboard updates after SMS response

### Streak Calculation
- [ ] Complete habit today - check streak increments
- [ ] Skip a day - verify streak resets to 0
- [ ] Complete for 7 days - verify milestone SMS
- [ ] Check longest streak updates correctly
- [ ] Verify streak resets at midnight (user timezone)

### Payments
- [ ] Click upgrade on dashboard
- [ ] Select Starter plan ($7/month)
- [ ] Complete Stripe checkout (use test card: 4242 4242 4242 4242)
- [ ] Verify redirect to dashboard with success message
- [ ] Check subscription status updates in database
- [ ] Test Pro plan ($12/month)
- [ ] Test Team plan ($39/month)
- [ ] Verify habit limits enforce correctly

### Cron Jobs (Verify on Vercel)
- [ ] Check `/api/cron/send-reminders` runs every minute
- [ ] Check `/api/cron/calculate-streaks` runs daily at midnight
- [ ] Check `/api/cron/weekly-summary` runs Sunday 8pm
- [ ] View Vercel logs to verify cron execution

### Security
- [ ] Try accessing `/api/cron/*` without CRON_SECRET - should fail
- [ ] Try viewing other user's habits - should fail (RLS)
- [ ] Send fake Twilio webhook without signature - should fail
- [ ] Send fake Stripe webhook without signature - should fail
- [ ] Try SQL injection in habit name field
- [ ] Test XSS in habit description

### Mobile Responsiveness
- [ ] Test landing page on mobile
- [ ] Test dashboard on mobile
- [ ] Test onboarding flow on mobile
- [ ] Verify SMS links work on mobile

### Edge Cases
- [ ] Create habit with special characters in name
- [ ] Set reminder time for past time (should work next day)
- [ ] Delete habit with active logs
- [ ] Change timezone after habits are created
- [ ] Create 10+ habits on free plan (should hit limit)
- [ ] Test international phone numbers (+44, +91, etc.)

## 🚀 Launch Day Checklist

### Morning of Launch
- [ ] Verify all cron jobs are enabled in Vercel
- [ ] Check Stripe webhooks are active
- [ ] Check Twilio webhooks are configured
- [ ] Set up monitoring (Vercel Analytics, Sentry, etc.)
- [ ] Prepare social media posts
- [ ] Create launch special: First 100 users get $4.99/month lifetime

### During Launch
- [ ] Monitor Vercel logs in real-time
- [ ] Watch Supabase dashboard for new signups
- [ ] Monitor Twilio SMS logs
- [ ] Check Stripe for payments
- [ ] Respond to support emails quickly
- [ ] Track key metrics:
  - Signups per hour
  - Activation rate (completed onboarding)
  - SMS delivery rate
  - Error rate
  - Conversion to paid

### End of Day 1
- [ ] Review all error logs
- [ ] Check SMS costs vs. budget
- [ ] Calculate conversion funnel:
  - Landing page visits → Signups
  - Signups → Completed onboarding
  - Activated → Added habits
  - Free → Paid conversion
- [ ] Send thank you message to first users
- [ ] Fix any critical bugs discovered

## 📊 Success Metrics (First 30 Days)

### Realistic Goals
- **200 signups** (6-7 per day)
- **100 activated users** (50% activation rate)
- **20 paid subscribers** (10% conversion)
- **$150-200 MRR** (Monthly Recurring Revenue)
- **60% D7 retention** (users still active after 7 days)

### Key Metrics to Track Daily
- Daily Active Users (DAU)
- SMS sent vs. SMS responded
- Streak completion rate
- Churn rate
- Customer Acquisition Cost (CAC)
- Lifetime Value (LTV)

## 🐛 Common Issues & Solutions

### SMS Not Sending
1. Check Twilio balance
2. Verify phone number format (E.164)
3. Check Twilio logs for errors
4. Verify cron job is running

### Webhooks Failing
1. Check webhook signature verification
2. Verify endpoint URLs are correct
3. Check Vercel logs for errors
4. Test with webhook testing tools

### Streaks Not Calculating
1. Check timezone settings
2. Verify `calculate-streaks` cron runs daily
3. Check for gaps in habit_logs
4. Review streak calculation logic

### Payment Issues
1. Verify Stripe Price IDs match environment
2. Check webhook events are being received
3. Verify user has stripe_customer_id
4. Check subscription_status field

## 🔐 Security Reminders

- [ ] Never commit `.env.local` or `.env.production`
- [ ] Rotate all secrets if accidentally exposed
- [ ] Enable Vercel password protection for staging
- [ ] Set up Supabase database backups (daily)
- [ ] Configure rate limiting on public endpoints
- [ ] Enable 2FA on all service accounts (Vercel, Supabase, Twilio, Stripe)
- [ ] Review Supabase RLS policies
- [ ] Monitor for unusual SMS activity (abuse)

## 📞 Support Setup

### Email Templates
Create canned responses for:
- Welcome email
- How to change phone number
- How to pause habits (vacation mode)
- How to cancel subscription
- SMS not received troubleshooting
- Billing questions

### Support Channels
- Email: support@habitsms.com
- Consider: Crisp chat widget, Discord community, or Twitter DMs

## 🎉 Post-Launch (Week 1)

- [ ] Send weekly summary email to all users
- [ ] Request feedback from first 10 users
- [ ] Post launch retrospective
- [ ] Analyze most used habit templates
- [ ] Identify feature requests
- [ ] Optimize SMS costs (India users → MSG91)
- [ ] A/B test pricing page
- [ ] Create content: "How I built HabitSMS in 5 days"

---

**Remember**: Start small, monitor closely, iterate quickly. The first users are gold - treat them well!
