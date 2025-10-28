-- Fix RLS policies by removing flawed Privy policies and ensuring secure policies
-- This migration fixes the issue where Privy policies were allowing unauthorized access

-- Drop all the flawed Privy policies that don't properly validate user ownership
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

-- Ensure the secure policies are in place (these should already exist from secure_rls_policies.sql)
-- But we'll recreate them to be sure

-- Function to validate user ownership through API context (should already exist)
CREATE OR REPLACE FUNCTION validate_user_ownership(target_user_id TEXT) RETURNS BOOLEAN AS $$
BEGIN
    -- If service role with proper context, check the requesting user
    IF is_service_role_with_context() THEN
        -- The API route should set the authenticated user ID in the context
        RETURN current_setting('app.authenticated_user_id', true) = target_user_id;
    END IF;
    
    -- For direct authenticated access (if any), use auth.uid()
    RETURN auth.uid()::text = target_user_id;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if service role has proper context (should already exist)
CREATE OR REPLACE FUNCTION is_service_role_with_context() RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.role() = 'service_role' AND 
           current_setting('app.context', true) != '';
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- USER PROFILES - Secure policies
DROP POLICY IF EXISTS "secure_user_profiles_access" ON user_profiles;
CREATE POLICY "secure_user_profiles_access" ON user_profiles
FOR ALL
USING (validate_user_ownership(user_id))
WITH CHECK (validate_user_ownership(user_id));

-- USER STATS - Secure policies
DROP POLICY IF EXISTS "secure_user_stats_access" ON user_stats;
CREATE POLICY "secure_user_stats_access" ON user_stats
FOR ALL
USING (validate_user_ownership(user_id))
WITH CHECK (validate_user_ownership(user_id));

-- USER PREFERENCES - Secure policies
DROP POLICY IF EXISTS "secure_user_preferences_access" ON user_preferences;
CREATE POLICY "secure_user_preferences_access" ON user_preferences
FOR ALL
USING (validate_user_ownership(user_id))
WITH CHECK (validate_user_ownership(user_id));

-- AI CHAT SESSIONS - Secure policies
DROP POLICY IF EXISTS "secure_chat_sessions_access" ON ai_chat_sessions;
CREATE POLICY "secure_chat_sessions_access" ON ai_chat_sessions
FOR ALL
USING (validate_user_ownership(user_id))
WITH CHECK (validate_user_ownership(user_id));

-- AI CHAT MESSAGES - Secure policies
DROP POLICY IF EXISTS "secure_chat_messages_access" ON ai_chat_messages;
CREATE POLICY "secure_chat_messages_access" ON ai_chat_messages
FOR ALL
USING (validate_user_ownership(user_id))
WITH CHECK (validate_user_ownership(user_id));

-- MARKETPLACE LISTINGS - Secure policies
DROP POLICY IF EXISTS "secure_marketplace_seller_access" ON marketplace_listings;
CREATE POLICY "secure_marketplace_seller_access" ON marketplace_listings
FOR ALL
USING (validate_user_ownership(seller_id))
WITH CHECK (validate_user_ownership(seller_id));

-- Public read access for active marketplace listings
DROP POLICY IF EXISTS "public_marketplace_read" ON marketplace_listings;
CREATE POLICY "public_marketplace_read" ON marketplace_listings
FOR SELECT
USING (is_active = true);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION validate_user_ownership(TEXT) TO PUBLIC;
GRANT EXECUTE ON FUNCTION is_service_role_with_context() TO PUBLIC;

-- Add comments for documentation
COMMENT ON FUNCTION validate_user_ownership(TEXT) IS 'Validates user ownership for RLS policies using API context';
COMMENT ON FUNCTION is_service_role_with_context() IS 'Validates if service role has proper context set';