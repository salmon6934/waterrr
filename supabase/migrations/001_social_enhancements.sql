-- ============================================================
-- Social Enhancements Migration
-- Creates: close_friends, device_tokens, nudges, close_friend_notifications
-- Enables RLS with appropriate policies on all tables
-- ============================================================

-- 1. close_friends table
-- Tracks which friends a user has designated as "close friends"
CREATE TABLE IF NOT EXISTS close_friends (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, friend_id)
);

-- 2. device_tokens table
-- Stores FCM device tokens for push notification delivery
CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);

-- 3. nudges table
-- Records nudge notifications sent between users
CREATE TABLE IF NOT EXISTS nudges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nudges_sender_receiver ON nudges(sender_id, receiver_id, sent_at DESC);

-- 4. close_friend_notifications table
-- Tracks sent close friend intake notifications for rate limiting (60-min window)
CREATE TABLE IF NOT EXISTS close_friend_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logger_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cf_notifications_pair ON close_friend_notifications(logger_id, recipient_id, sent_at DESC);

-- ============================================================
-- Row Level Security
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE close_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE nudges ENABLE ROW LEVEL SECURITY;
ALTER TABLE close_friend_notifications ENABLE ROW LEVEL SECURITY;

-- close_friends policies
CREATE POLICY "Users can view their own close friends"
  ON close_friends FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own close friends"
  ON close_friends FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own close friends"
  ON close_friends FOR DELETE
  USING (auth.uid() = user_id);

-- device_tokens policies
CREATE POLICY "Users can view their own device tokens"
  ON device_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own device tokens"
  ON device_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own device tokens"
  ON device_tokens FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own device tokens"
  ON device_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- nudges policies
-- SELECT: users can read nudges they sent or received
CREATE POLICY "Users can view nudges they sent or received"
  ON nudges FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- INSERT: only via service role (Edge Functions)
-- No INSERT policy for authenticated users; Edge Functions use service_role key which bypasses RLS

-- close_friend_notifications policies
-- SELECT: recipients can view their own notifications
CREATE POLICY "Recipients can view their close friend notifications"
  ON close_friend_notifications FOR SELECT
  USING (auth.uid() = recipient_id);

-- INSERT: only via service role (Edge Functions)
-- No INSERT policy for authenticated users; Edge Functions use service_role key which bypasses RLS
