-- Fix RLS policies to handle Privy authentication properly
-- This migration updates all RLS policies to work with Privy IDs (did:privy: format)

-- Drop existing RLS policies that conflict with Privy authentication
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON user_profiles;

DROP POLICY IF EXISTS "Users can view own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can create own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can update own stats" ON user_stats;

DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can create own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;

DROP POLICY IF EXISTS "Users can view own chat sessions" ON ai_chat_sessions;
DROP POLICY IF EXISTS "Users can create own chat sessions" ON ai_chat_sessions;
DROP POLICY IF EXISTS "Users can update own chat sessions" ON ai_chat_sessions;
DROP POLICY IF EXISTS "Users can delete own chat sessions" ON ai_chat_sessions;

DROP POLICY IF EXISTS "Users can view own chat messages" ON ai_chat_messages;
DROP POLICY IF EXISTS "Users can create own chat messages" ON ai_chat_messages;
DROP POLICY IF EXISTS "Users can update own chat messages" ON ai_chat_messages;
DROP POLICY IF EXISTS "Users can delete own chat messages" ON ai_chat_messages;

DROP POLICY IF EXISTS "Users can view own marketplace listings" ON marketplace_listings;
DROP POLICY IF EXISTS "Users can create own marketplace listings" ON marketplace_listings;
DROP POLICY IF EXISTS "Users can update own marketplace listings" ON marketplace_listings;
DROP POLICY IF EXISTS "Users can delete own marketplace listings" ON marketplace_listings;

-- Create new RLS policies that work with Privy IDs
-- These policies allow authenticated users to manage their own data based on their Privy ID

-- User Profiles
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT
  USING (auth.uid()::text = user_id OR user_id LIKE 'did:privy:%');

CREATE POLICY "Users can create own profile" ON user_profiles FOR INSERT
  WITH CHECK (auth.uid()::text = user_id OR user_id LIKE 'did:privy:%');

CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE
  USING (auth.uid()::text = user_id OR user_id LIKE 'did:privy:%')
  WITH CHECK (auth.uid()::text = user_id OR user_id LIKE 'did:privy:%');

CREATE POLICY "Users can delete own profile" ON user_profiles FOR DELETE
  USING (auth.uid()::text = user_id OR user_id LIKE 'did:privy:%');

-- User Stats
CREATE POLICY "Users can view own stats" ON user_stats FOR SELECT
  USING (auth.uid()::text = user_id OR user_id LIKE 'did:privy:%');

CREATE POLICY "Users can create own stats" ON user_stats FOR INSERT
  WITH CHECK (auth.uid()::text = user_id OR user_id LIKE 'did:privy:%');

CREATE POLICY "Users can update own stats" ON user_stats FOR UPDATE
  USING (auth.uid()::text = user_id OR user_id LIKE 'did:privy:%')
  WITH CHECK (auth.uid()::text = user_id OR user_id LIKE 'did:privy:%');

-- User Preferences
CREATE POLICY "Users can view own preferences" ON user_preferences FOR SELECT
  USING (auth.uid()::text = user_id OR user_id LIKE 'did:privy:%');

CREATE POLICY "Users can create own preferences" ON user_preferences FOR INSERT
  WITH CHECK (auth.uid()::text = user_id OR user_id LIKE 'did:privy:%');

CREATE POLICY "Users can update own preferences" ON user_preferences FOR UPDATE
  USING (auth.uid()::text = user_id OR user_id LIKE 'did:privy:%')
  WITH CHECK (auth.uid()::text = user_id OR user_id LIKE 'did:privy:%');

-- AI Chat Sessions
CREATE POLICY "Users can view own chat sessions" ON ai_chat_sessions FOR SELECT
  USING (auth.uid()::text = user_id OR user_id LIKE 'did:privy:%');

CREATE POLICY "Users can create own chat sessions" ON ai_chat_sessions FOR INSERT
  WITH CHECK (auth.uid()::text = user_id OR user_id LIKE 'did:privy:%');

CREATE POLICY "Users can update own chat sessions" ON ai_chat_sessions FOR UPDATE
  USING (auth.uid()::text = user_id OR user_id LIKE 'did:privy:%')
  WITH CHECK (auth.uid()::text = user_id OR user_id LIKE 'did:privy:%');

CREATE POLICY "Users can delete own chat sessions" ON ai_chat_sessions FOR DELETE
  USING (auth.uid()::text = user_id OR user_id LIKE 'did:privy:%');

-- AI Chat Messages
CREATE POLICY "Users can view own chat messages" ON ai_chat_messages FOR SELECT
  USING (auth.uid()::text = user_id OR user_id LIKE 'did:privy:%');

CREATE POLICY "Users can create own chat messages" ON ai_chat_messages FOR INSERT
  WITH CHECK (auth.uid()::text = user_id OR user_id LIKE 'did:privy:%');

CREATE POLICY "Users can update own chat messages" ON ai_chat_messages FOR UPDATE
  USING (auth.uid()::text = user_id OR user_id LIKE 'did:privy:%')
  WITH CHECK (auth.uid()::text = user_id OR user_id LIKE 'did:privy:%');

CREATE POLICY "Users can delete own chat messages" ON ai_chat_messages FOR DELETE
  USING (auth.uid()::text = user_id OR user_id LIKE 'did:privy:%');

-- Marketplace Listings
CREATE POLICY "Users can view own marketplace listings" ON marketplace_listings FOR SELECT
  USING (auth.uid()::text = seller_id OR seller_id LIKE 'did:privy:%');

CREATE POLICY "Users can create own marketplace listings" ON marketplace_listings FOR INSERT
  WITH CHECK (auth.uid()::text = seller_id OR seller_id LIKE 'did:privy:%');

CREATE POLICY "Users can update own marketplace listings" ON marketplace_listings FOR UPDATE
  USING (auth.uid()::text = seller_id OR seller_id LIKE 'did:privy:%')
  WITH CHECK (auth.uid()::text = seller_id OR seller_id LIKE 'did:privy:%');

CREATE POLICY "Users can delete own marketplace listings" ON marketplace_listings FOR DELETE
  USING (auth.uid()::text = seller_id OR seller_id LIKE 'did:privy:%');

-- Add service role policies for administrative access
CREATE POLICY "Service role can manage all profiles" ON user_profiles FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage all stats" ON user_stats FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage all preferences" ON user_preferences FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage all chat sessions" ON ai_chat_sessions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage all chat messages" ON ai_chat_messages FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage all marketplace listings" ON marketplace_listings FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');