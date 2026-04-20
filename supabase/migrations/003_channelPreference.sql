-- Add channel preference to profiles (sms or whatsapp)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_channel TEXT DEFAULT 'sms';

-- Add index for querying by channel
CREATE INDEX IF NOT EXISTS idx_profiles_channel ON profiles(preferred_channel);