-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT UNIQUE NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  subscription_tier TEXT DEFAULT 'free', -- 'free', 'starter', 'pro', 'team'
  subscription_status TEXT DEFAULT 'inactive', -- 'active', 'inactive', 'cancelled', 'past_due'
  stripe_customer_id TEXT,
  razorpay_customer_id TEXT,
  team_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  max_members INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for team_id in profiles
ALTER TABLE profiles ADD CONSTRAINT fk_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;

-- Habits table
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

-- Habit logs table
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

-- SMS messages table
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

-- Subscription events table
CREATE TABLE subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'created', 'updated', 'cancelled', 'payment_failed'
  provider TEXT NOT NULL, -- 'stripe', 'razorpay'
  provider_event_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_profiles_phone ON profiles(phone_number);
CREATE INDEX idx_profiles_subscription ON profiles(subscription_tier, subscription_status);
CREATE INDEX idx_teams_owner_id ON teams(owner_id);
CREATE INDEX idx_habits_user_id ON habits(user_id);
CREATE INDEX idx_habits_active ON habits(user_id, is_active);
CREATE INDEX idx_habit_logs_habit_id ON habit_logs(habit_id, logged_at DESC);
CREATE INDEX idx_habit_logs_user_id ON habit_logs(user_id, logged_at DESC);
CREATE INDEX idx_sms_user_id ON sms_messages(user_id, created_at DESC);
CREATE INDEX idx_sms_provider_id ON sms_messages(provider_message_id);
CREATE INDEX idx_subscription_events_user_id ON subscription_events(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for teams
CREATE POLICY "Team members can view their team" ON teams
  FOR SELECT USING (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.team_id = teams.id AND profiles.id = auth.uid())
  );

CREATE POLICY "Team owners can update their team" ON teams
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Team owners can delete their team" ON teams
  FOR DELETE USING (owner_id = auth.uid());

-- RLS Policies for habits
CREATE POLICY "Users can CRUD own habits" ON habits
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for habit_logs
CREATE POLICY "Users can view own logs" ON habit_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs" ON habit_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for sms_messages
CREATE POLICY "Users can view own SMS messages" ON sms_messages
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for subscription_events
CREATE POLICY "Users can view own subscription events" ON subscription_events
  FOR SELECT USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_habits_updated_at BEFORE UPDATE ON habits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
