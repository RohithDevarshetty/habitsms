-- Dedicated table for raw health metrics imported from sources like Apple Health.
-- Kept separate from habit_logs so imports are idempotent and re-runnable,
-- and so we retain the raw values for future analytics.

CREATE TABLE IF NOT EXISTS health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'apple_health', -- 'apple_health', 'manual'
  metric_type TEXT NOT NULL, -- 'steps', 'workout', 'sleep', 'mindfulness', 'active_energy', 'heart_rate_avg'
  value NUMERIC NOT NULL,
  unit TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, metric_type, started_at, source)
);

CREATE INDEX IF NOT EXISTS idx_health_metrics_user_type_time
  ON health_metrics(user_id, metric_type, started_at DESC);

ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own health metrics" ON health_metrics;
CREATE POLICY "Users view own health metrics" ON health_metrics
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own health metrics" ON health_metrics;
CREATE POLICY "Users insert own health metrics" ON health_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own health metrics" ON health_metrics;
CREATE POLICY "Users delete own health metrics" ON health_metrics
  FOR DELETE USING (auth.uid() = user_id);

-- Helpful partial unique index on habit_logs so we can dedupe imports per habit+timestamp+source.
-- Using a DO block so we can guard against re-runs without pg_has_role errors.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'uniq_habit_logs_habit_source_time'
  ) THEN
    CREATE UNIQUE INDEX uniq_habit_logs_habit_source_time
      ON habit_logs(habit_id, source, logged_at);
  END IF;
END $$;
