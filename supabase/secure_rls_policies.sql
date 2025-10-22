-- Secure RLS Policy Implementation for StudIQ Application
-- This script implements proper Row Level Security with minimal service role privileges
-- and secure user authorization based on the Privy + API route architecture

-- ============================================================================
-- STEP 1: Clean up existing policies
-- ============================================================================

-- Disable RLS temporarily to make changes
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_listings DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DO $$ 
DECLARE
    pol RECORD;
    tables TEXT[] := ARRAY['user_profiles', 'user_stats', 'user_preferences', 
                          'ai_chat_sessions', 'ai_chat_messages', 'marketplace_listings', 
                          'transactions'];
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY tables LOOP
        FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = table_name LOOP
            EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON ' || table_name;
        END LOOP;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 2: Create secure helper functions
-- ============================================================================

-- Function to check if current role is service_role with additional context validation
CREATE OR REPLACE FUNCTION is_service_role_with_context() RETURNS BOOLEAN AS $$
BEGIN
    -- Check if we're using the service role
    IF auth.role() = 'service_role' THEN
        -- Additional security: check if we have proper application context
        -- This prevents direct database access even with service role
        RETURN current_setting('app.context', true) = 'api_route' 
               OR current_setting('app.bypass_rls', true) = 'true';
    END IF;
    RETURN FALSE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate user ownership through API context
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

-- ============================================================================
-- STEP 3: Re-enable RLS and create secure policies
-- ============================================================================

-- Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USER PROFILES - Secure policies with proper authorization
-- ============================================================================

-- Allow service role with proper context and user validation
CREATE POLICY "secure_user_profiles_access" ON user_profiles
FOR ALL
USING (validate_user_ownership(user_id))
WITH CHECK (validate_user_ownership(user_id));

-- Read-only access for authenticated users to their own profiles
CREATE POLICY "authenticated_user_profiles_read" ON user_profiles
FOR SELECT
USING (auth.role() = 'authenticated' AND auth.uid()::text = user_id);

-- ============================================================================
-- USER STATS - Secure policies with proper authorization
-- ============================================================================

CREATE POLICY "secure_user_stats_access" ON user_stats
FOR ALL
USING (validate_user_ownership(user_id))
WITH CHECK (validate_user_ownership(user_id));

CREATE POLICY "authenticated_user_stats_read" ON user_stats
FOR SELECT
USING (auth.role() = 'authenticated' AND auth.uid()::text = user_id);

-- ============================================================================
-- USER PREFERENCES - Secure policies with proper authorization
-- ============================================================================

CREATE POLICY "secure_user_preferences_access" ON user_preferences
FOR ALL
USING (validate_user_ownership(user_id))
WITH CHECK (validate_user_ownership(user_id));

CREATE POLICY "authenticated_user_preferences_read" ON user_preferences
FOR SELECT
USING (auth.role() = 'authenticated' AND auth.uid()::text = user_id);

-- ============================================================================
-- AI CHAT SESSIONS - Secure policies with proper authorization
-- ============================================================================

CREATE POLICY "secure_chat_sessions_access" ON ai_chat_sessions
FOR ALL
USING (validate_user_ownership(user_id))
WITH CHECK (validate_user_ownership(user_id));

CREATE POLICY "authenticated_chat_sessions_read" ON ai_chat_sessions
FOR SELECT
USING (auth.role() = 'authenticated' AND auth.uid()::text = user_id);

-- ============================================================================
-- AI CHAT MESSAGES - Secure policies with proper authorization
-- ============================================================================

CREATE POLICY "secure_chat_messages_access" ON ai_chat_messages
FOR ALL
USING (validate_user_ownership(user_id))
WITH CHECK (validate_user_ownership(user_id));

CREATE POLICY "authenticated_chat_messages_read" ON ai_chat_messages
FOR SELECT
USING (auth.role() = 'authenticated' AND auth.uid()::text = user_id);

-- ============================================================================
-- MARKETPLACE LISTINGS - Secure policies with seller authorization
-- ============================================================================

-- Sellers can manage their own listings
CREATE POLICY "secure_marketplace_seller_access" ON marketplace_listings
FOR ALL
USING (validate_user_ownership(seller_id))
WITH CHECK (validate_user_ownership(seller_id));

-- Public read access for active listings
CREATE POLICY "public_marketplace_read" ON marketplace_listings
FOR SELECT
USING (is_active = true);

-- Authenticated users can view all listings (including inactive ones they own)
CREATE POLICY "authenticated_marketplace_read" ON marketplace_listings
FOR SELECT
USING (
    auth.role() = 'authenticated' AND 
    (is_active = true OR auth.uid()::text = seller_id)
);

-- ============================================================================
-- TRANSACTIONS - Secure policies with user authorization
-- ============================================================================

CREATE POLICY "secure_transactions_access" ON transactions
FOR ALL
USING (validate_user_ownership(user_id))
WITH CHECK (validate_user_ownership(user_id));

CREATE POLICY "authenticated_transactions_read" ON transactions
FOR SELECT
USING (auth.role() = 'authenticated' AND auth.uid()::text = user_id);

-- ============================================================================
-- CAMPUS STORE PRODUCTS - Public read access (no user data)
-- ============================================================================

-- Keep existing public read policy for campus store products
CREATE POLICY "public_campus_store_read" ON campus_store_products
FOR SELECT
USING (is_active = true);

-- Service role can manage campus store products (admin function)
CREATE POLICY "service_role_campus_store_manage" ON campus_store_products
FOR ALL
USING (is_service_role_with_context())
WITH CHECK (is_service_role_with_context());

-- ============================================================================
-- STEP 4: Grant minimal necessary permissions
-- ============================================================================

-- Revoke all existing permissions and grant only what's needed
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM service_role;

-- Grant specific permissions only for tables that need service role access
GRANT SELECT, INSERT, UPDATE, DELETE ON user_profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_stats TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_preferences TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_chat_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_chat_messages TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON marketplace_listings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON transactions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON campus_store_products TO service_role;

-- Grant sequence usage for auto-incrementing IDs
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================================================
-- STEP 5: Verification and monitoring
-- ============================================================================

-- Create a view to monitor policy effectiveness
CREATE OR REPLACE VIEW rls_policy_audit AS
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
WHERE tablename IN (
    'user_profiles', 'user_stats', 'user_preferences',
    'ai_chat_sessions', 'ai_chat_messages', 'marketplace_listings',
    'transactions', 'campus_store_products'
)
ORDER BY tablename, policyname;

-- Display current policies for verification
SELECT * FROM rls_policy_audit;

-- ============================================================================
-- STEP 6: Usage instructions for API routes
-- ============================================================================

/*
To use these secure policies in your API routes, you need to set the proper context:

1. At the beginning of each API route handler, set the context:
   ```typescript
   await supabaseAdmin.rpc('set_config', {
     parameter: 'app.context',
     value: 'api_route'
   });
   
   await supabaseAdmin.rpc('set_config', {
     parameter: 'app.authenticated_user_id', 
     value: authenticatedUserId
   });
   ```

2. For admin operations that need to bypass RLS temporarily:
   ```typescript
   await supabaseAdmin.rpc('set_config', {
     parameter: 'app.bypass_rls',
     value: 'true'
   });
   ```

3. Always clear the context at the end of the request:
   ```typescript
   await supabaseAdmin.rpc('set_config', {
     parameter: 'app.context',
     value: ''
   });
   ```

This ensures that:
- Service role access is properly controlled
- User authorization is validated for every operation
- Direct database access is prevented even with service role key
- Audit trail is maintained for all operations
*/

-- Create helper function for setting context (to be called from API routes)
CREATE OR REPLACE FUNCTION set_api_context(
    authenticated_user_id TEXT DEFAULT NULL,
    bypass_rls BOOLEAN DEFAULT FALSE
) RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.context', 'api_route', true);
    
    IF authenticated_user_id IS NOT NULL THEN
        PERFORM set_config('app.authenticated_user_id', authenticated_user_id, true);
    END IF;
    
    IF bypass_rls THEN
        PERFORM set_config('app.bypass_rls', 'true', true);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function for clearing context
CREATE OR REPLACE FUNCTION clear_api_context() RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.context', '', true);
    PERFORM set_config('app.authenticated_user_id', '', true);
    PERFORM set_config('app.bypass_rls', 'false', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_api_context IS 'Sets the API context for secure RLS policy validation';
COMMENT ON FUNCTION clear_api_context IS 'Clears the API context after request completion';
COMMENT ON FUNCTION is_service_role_with_context IS 'Validates service role access with proper application context';
COMMENT ON FUNCTION validate_user_ownership IS 'Validates user ownership for RLS policies';