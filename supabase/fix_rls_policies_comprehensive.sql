-- Comprehensive RLS Policy Fix for StudIQ Application
-- This script completely resets and fixes RLS policies for service role authentication
-- Run this in your Supabase dashboard SQL editor

-- First, disable RLS temporarily to ensure we can make changes
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies on user_profiles
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles' LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON user_profiles';
    END LOOP;
    
    -- Drop all policies on user_stats
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'user_stats' LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON user_stats';
    END LOOP;
    
    -- Drop all policies on user_preferences
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'user_preferences' LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON user_preferences';
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Create new service role policies that allow full access
-- These policies use auth.role() = 'service_role' which should work with your setup

-- User Profiles: Service role can do everything
CREATE POLICY "service_role_full_access_user_profiles" ON user_profiles
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- User Stats: Service role can do everything
CREATE POLICY "service_role_full_access_user_stats" ON user_stats
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- User Preferences: Service role can do everything
CREATE POLICY "service_role_full_access_user_preferences" ON user_preferences
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Alternative approach: Create policies that check for service role context
-- These are backup policies in case the above don't work

-- User Profiles: Allow operations when using service role key
CREATE POLICY "service_role_context_user_profiles" ON user_profiles
FOR ALL
USING (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    OR auth.role() = 'service_role'
    OR current_setting('role') = 'service_role'
);

-- User Stats: Allow operations when using service role key
CREATE POLICY "service_role_context_user_stats" ON user_stats
FOR ALL
USING (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    OR auth.role() = 'service_role'
    OR current_setting('role') = 'service_role'
);

-- User Preferences: Allow operations when using service role key
CREATE POLICY "service_role_context_user_preferences" ON user_preferences
FOR ALL
USING (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    OR auth.role() = 'service_role'
    OR current_setting('role') = 'service_role'
);

-- Grant explicit permissions to service_role
GRANT ALL ON user_profiles TO service_role;
GRANT ALL ON user_stats TO service_role;
GRANT ALL ON user_preferences TO service_role;

-- Grant usage on sequences (for auto-incrementing IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Verify the setup
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('user_profiles', 'user_stats', 'user_preferences')
ORDER BY tablename, policyname;

-- Check table permissions
SELECT 
    table_name,
    grantee,
    privilege_type
FROM information_schema.table_privileges 
WHERE table_name IN ('user_profiles', 'user_stats', 'user_preferences')
AND grantee = 'service_role';