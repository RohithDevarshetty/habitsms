-- Buddy accountability: one consenting accountability partner per user
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS buddy_phone TEXT,
  ADD COLUMN IF NOT EXISTS buddy_name TEXT,
  ADD COLUMN IF NOT EXISTS buddy_consent_status TEXT, -- NULL, 'pending', 'accepted', 'declined'
  ADD COLUMN IF NOT EXISTS buddy_consent_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS buddy_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS buddy_last_nudged_at TIMESTAMPTZ;

-- Webhook handlers need to match inbound senders to a buddy slot quickly
CREATE INDEX IF NOT EXISTS idx_profiles_buddy_phone
  ON profiles(buddy_phone)
  WHERE buddy_phone IS NOT NULL;
