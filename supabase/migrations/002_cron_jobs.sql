-- Enable pg_cron extension (requires Supabase Pro or enable via dashboard)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Note: pg_cron setup requires Supabase Pro plan
-- For free tier, use Vercel Cron or external cron service

-- These are example cron job configurations
-- To enable, run these after enabling pg_cron extension:

/*
-- Send daily habit reminders (check every minute)
SELECT cron.schedule(
  'send-habit-reminders',
  '* * * * *', -- Every minute
  $$
  SELECT net.http_post(
    url := current_setting('app.app_url') || '/api/cron/send-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.cron_secret'),
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- Calculate streaks daily at midnight UTC
SELECT cron.schedule(
  'calculate-daily-streaks',
  '0 0 * * *', -- Midnight UTC
  $$
  SELECT net.http_post(
    url := current_setting('app.app_url') || '/api/cron/calculate-streaks',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.cron_secret'),
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- Send weekly summaries (Sunday 8 PM UTC)
SELECT cron.schedule(
  'send-weekly-summaries',
  '0 20 * * 0', -- Every Sunday at 8 PM UTC
  $$
  SELECT net.http_post(
    url := current_setting('app.app_url') || '/api/cron/weekly-summary',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.cron_secret'),
      'Content-Type', 'application/json'
    )
  );
  $$
);
*/

-- Alternative: Create a scheduled_tasks table for manual processing
CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type TEXT NOT NULL, -- 'send_reminder', 'calculate_streak', 'weekly_summary'
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scheduled_tasks_status ON scheduled_tasks(status, scheduled_for);
CREATE INDEX idx_scheduled_tasks_user ON scheduled_tasks(user_id, scheduled_for);

-- Enable RLS
ALTER TABLE scheduled_tasks ENABLE ROW LEVEL SECURITY;

-- Only allow service role to manage scheduled tasks
CREATE POLICY "Service role can manage scheduled tasks" ON scheduled_tasks
  FOR ALL USING (auth.role() = 'service_role');
