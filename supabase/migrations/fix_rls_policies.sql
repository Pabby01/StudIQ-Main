-- Fix RLS policies for Privy authentication with service role
-- This migration updates the RLS policies to work with the current architecture
-- where users are authenticated via Privy and user operations are performed via service role

-- Drop existing policies that rely on auth.uid()
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;

DROP POLICY IF EXISTS "Users can view their own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can update their own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can insert their own stats" ON user_stats;

DROP POLICY IF EXISTS "Users can view their own chat sessions" ON ai_chat_sessions;
DROP POLICY IF EXISTS "Users can create their own chat sessions" ON ai_chat_sessions;
DROP POLICY IF EXISTS "Users can update their own chat sessions" ON ai_chat_sessions;
DROP POLICY IF EXISTS "Users can delete their own chat sessions" ON ai_chat_sessions;

DROP POLICY IF EXISTS "Users can view their own chat messages" ON ai_chat_messages;
DROP POLICY IF EXISTS "Users can create their own chat messages" ON ai_chat_messages;

DROP POLICY IF EXISTS "Users can view their own marketplace listings" ON marketplace_listings;
DROP POLICY IF EXISTS "Users can create their own marketplace listings" ON marketplace_listings;
DROP POLICY IF EXISTS "Users can update their own marketplace listings" ON marketplace_listings;
DROP POLICY IF EXISTS "Users can delete their own marketplace listings" ON marketplace_listings;

DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can create their own transactions" ON transactions;

DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON user_preferences;

-- Create new policies that work with service role authentication
-- These policies allow the service role to perform all operations
-- while still maintaining security for direct database access

-- User Profiles: Allow service role full access, restrict direct access
CREATE POLICY "Service role can manage user profiles" ON user_profiles FOR ALL 
USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view profiles" ON user_profiles FOR SELECT 
USING (auth.role() = 'authenticated');

-- User Stats: Allow service role full access
CREATE POLICY "Service role can manage user stats" ON user_stats FOR ALL 
USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view stats" ON user_stats FOR SELECT 
USING (auth.role() = 'authenticated');

-- AI Chat Sessions: Allow service role full access
CREATE POLICY "Service role can manage chat sessions" ON ai_chat_sessions FOR ALL 
USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view chat sessions" ON ai_chat_sessions FOR SELECT 
USING (auth.role() = 'authenticated');

-- AI Chat Messages: Allow service role full access
CREATE POLICY "Service role can manage chat messages" ON ai_chat_messages FOR ALL 
USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view chat messages" ON ai_chat_messages FOR SELECT 
USING (auth.role() = 'authenticated');

-- Marketplace Listings: Allow service role full access, public read for active listings
CREATE POLICY "Service role can manage marketplace listings" ON marketplace_listings FOR ALL 
USING (auth.role() = 'service_role');

CREATE POLICY "Public can view active marketplace listings" ON marketplace_listings FOR SELECT 
USING (is_active = true);

-- Transactions: Allow service role full access
CREATE POLICY "Service role can manage transactions" ON transactions FOR ALL 
USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view transactions" ON transactions FOR SELECT 
USING (auth.role() = 'authenticated');

-- User Preferences: Allow service role full access
CREATE POLICY "Service role can manage user preferences" ON user_preferences FOR ALL 
USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view preferences" ON user_preferences FOR SELECT 
USING (auth.role() = 'authenticated');

-- Campus store products remain publicly readable (no change needed)
-- The existing policy "Campus store products are publicly readable" should remain