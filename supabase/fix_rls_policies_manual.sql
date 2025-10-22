-- Manual RLS Policy Fix for StudIQ Application
-- Run this script in your Supabase dashboard SQL editor
-- This fixes the authentication issues with user profile creation

-- First, drop all existing problematic policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;

DROP POLICY IF EXISTS "Users can view their own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can update their own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can insert their own stats" ON user_stats;

DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON user_preferences;

-- Create new policies that work with service role authentication
-- These allow the service role (used by your app) to perform all operations

-- User Profiles: Allow service role full access
CREATE POLICY "Service role can manage user profiles" ON user_profiles FOR ALL 
USING (auth.role() = 'service_role');

-- User Stats: Allow service role full access  
CREATE POLICY "Service role can manage user stats" ON user_stats FOR ALL 
USING (auth.role() = 'service_role');

-- User Preferences: Allow service role full access
CREATE POLICY "Service role can manage user preferences" ON user_preferences FOR ALL 
USING (auth.role() = 'service_role');

-- Optional: Add read-only access for authenticated users (if needed)
-- Uncomment these if you want authenticated users to be able to read data directly
-- CREATE POLICY "Authenticated users can view profiles" ON user_profiles FOR SELECT 
-- USING (auth.role() = 'authenticated');

-- CREATE POLICY "Authenticated users can view stats" ON user_stats FOR SELECT 
-- USING (auth.role() = 'authenticated');

-- CREATE POLICY "Authenticated users can view preferences" ON user_preferences FOR SELECT 
-- USING (auth.role() = 'authenticated');

-- Verify the policies were created correctly
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('user_profiles', 'user_stats', 'user_preferences')
ORDER BY tablename, policyname;