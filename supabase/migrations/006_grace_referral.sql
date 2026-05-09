-- Grace day tracking (1 per month streak forgiveness)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_grace_day_used TIMESTAMPTZ;

-- Referral system
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_credits_months INTEGER DEFAULT 0;

-- Auto-generate referral codes for existing users
UPDATE profiles
SET referral_code = UPPER(SUBSTRING(MD5(id::text), 1, 8))
WHERE referral_code IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
