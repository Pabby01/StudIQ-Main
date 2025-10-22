-- ============================================================================
-- OPTIMIZED SECURITY AND PERFORMANCE SQL SOLUTION
-- ============================================================================
-- This script addresses all identified database issues including:
-- 1. SECURITY DEFINER vulnerabilities
-- 2. Inefficient queries and missing indexes
-- 3. Proper Row-Level Security implementations
-- 4. PostgreSQL compatibility and best practices
-- ============================================================================

-- ============================================================================
-- STEP 1: Fix SECURITY DEFINER Issues
-- ============================================================================

-- Replace SECURITY DEFINER functions with SECURITY INVOKER where appropriate
-- This ensures functions execute with the permissions of the calling user

-- First, drop any policies that depend on the functions we need to recreate
DROP POLICY IF EXISTS "service_role_campus_store_manage" ON campus_store_products;

-- Drop any other policies that might depend on these functions
DO $$ 
DECLARE
    pol RECORD;
    tbl TEXT;
BEGIN
    -- Drop policies that reference the functions we're about to recreate
    FOR tbl IN SELECT unnest(ARRAY['user_profiles', 'user_stats', 'user_preferences', 
                                   'ai_chat_sessions', 'ai_chat_messages', 'marketplace_listings', 
                                   'transactions', 'campus_store_products']) LOOP
        FOR pol IN SELECT policyname FROM pg_policies 
                   WHERE tablename = tbl 
                   AND (qual LIKE '%is_service_role_with_context%' 
                        OR with_check LIKE '%is_service_role_with_context%'
                        OR qual LIKE '%validate_user_ownership%'
                        OR with_check LIKE '%validate_user_ownership%') LOOP
            EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON ' || tbl;
        END LOOP;
    END LOOP;
END $$;

-- Now drop existing problematic functions
DROP FUNCTION IF EXISTS is_service_role_with_context();
DROP FUNCTION IF EXISTS validate_user_ownership(TEXT);
DROP FUNCTION IF EXISTS set_api_context(TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS clear_api_context();

-- Create secure context validation function with SECURITY INVOKER
CREATE OR REPLACE FUNCTION is_service_role_with_context() RETURNS BOOLEAN AS $$
BEGIN
    -- Check if we're using the service role with proper context
    IF auth.role() = 'service_role' THEN
        -- Validate application context to prevent direct database access
        RETURN current_setting('app.context', true) = 'api_route' 
               OR current_setting('app.bypass_rls', true) = 'true';
    END IF;
    RETURN FALSE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Create user ownership validation with SECURITY INVOKER
CREATE OR REPLACE FUNCTION validate_user_ownership(target_user_id TEXT) RETURNS BOOLEAN AS $$
BEGIN
    -- For service role with proper context, check the requesting user
    IF is_service_role_with_context() THEN
        RETURN current_setting('app.authenticated_user_id', true) = target_user_id;
    END IF;
    
    -- For direct authenticated access, use auth.uid()
    RETURN auth.uid()::text = target_user_id;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Create context management functions with restricted SECURITY DEFINER
-- These need DEFINER only for setting configuration parameters
CREATE OR REPLACE FUNCTION set_api_context(
    context_type TEXT DEFAULT 'api_route',
    authenticated_user_id TEXT DEFAULT NULL,
    bypass_rls BOOLEAN DEFAULT FALSE
) RETURNS VOID AS $$
BEGIN
    -- Only allow setting context from service role
    IF auth.role() != 'service_role' THEN
        RAISE EXCEPTION 'Access denied: Only service role can set API context';
    END IF;
    
    -- Set context with validation
    IF context_type IS NOT NULL THEN
        PERFORM set_config('app.context', context_type, true);
    END IF;
    
    IF authenticated_user_id IS NOT NULL THEN
        PERFORM set_config('app.authenticated_user_id', authenticated_user_id, true);
    END IF;
    
    IF bypass_rls THEN
        PERFORM set_config('app.bypass_rls', 'true', true);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create context clearing function with restricted SECURITY DEFINER
CREATE OR REPLACE FUNCTION clear_api_context() RETURNS VOID AS $$
BEGIN
    -- Only allow clearing context from service role
    IF auth.role() != 'service_role' THEN
        RAISE EXCEPTION 'Access denied: Only service role can clear API context';
    END IF;
    
    PERFORM set_config('app.context', '', true);
    PERFORM set_config('app.authenticated_user_id', '', true);
    PERFORM set_config('app.bypass_rls', 'false', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 2: Replace SECURITY DEFINER View with SECURITY INVOKER
-- ============================================================================

-- Drop the existing problematic view
DROP VIEW IF EXISTS rls_policy_audit;

-- Create secure policy audit view with SECURITY INVOKER
CREATE OR REPLACE VIEW rls_policy_audit 
WITH (security_invoker = true) AS
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
AND pg_has_role(current_user, 'pg_read_all_stats', 'MEMBER')  -- Restrict access
ORDER BY tablename, policyname;

-- Create a safer public view for policy monitoring
CREATE OR REPLACE VIEW public_policy_summary AS
SELECT 
    tablename,
    COUNT(*) as policy_count,
    ARRAY_AGG(DISTINCT cmd) as operations,
    bool_and(permissive = 'PERMISSIVE') as all_permissive
FROM pg_policies 
WHERE tablename IN (
    'user_profiles', 'user_stats', 'user_preferences',
    'ai_chat_sessions', 'ai_chat_messages', 'marketplace_listings',
    'transactions', 'campus_store_products'
)
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- STEP 3: Optimize Database Performance
-- ============================================================================

-- Create optimized indexes for better query performance
-- Note: For production use, run these indexes with CONCURRENTLY in separate transactions

-- Critical authentication and lookup indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_wallet_address_optimized 
ON user_profiles(wallet_address) 
WHERE wallet_address IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_email_optimized 
ON user_profiles(email) 
WHERE email IS NOT NULL;

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_updated_optimized 
ON ai_chat_sessions(user_id, updated_at DESC)
WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session_created_optimized 
ON ai_chat_messages(session_id, created_at ASC)
WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_active_category 
ON marketplace_listings(category, created_at DESC)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_transactions_user_status_created 
ON transactions(user_id, status, created_at DESC)
WHERE user_id IS NOT NULL;

-- Partial indexes for better performance on filtered queries
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_active_recent 
ON marketplace_listings(created_at DESC)
WHERE is_active = true AND NOT is_sold;

CREATE INDEX IF NOT EXISTS idx_transactions_completed 
ON transactions(user_id, created_at DESC)
WHERE status = 'completed';

-- ============================================================================
-- STEP 4: Implement Secure RLS Policies
-- ============================================================================

-- Drop any remaining policies that may have security issues
-- (Dependencies were already handled in STEP 1)
DO $$ 
DECLARE
    pol RECORD;
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY['user_profiles', 'user_stats', 'user_preferences', 
                                   'ai_chat_sessions', 'ai_chat_messages', 'marketplace_listings', 
                                   'transactions', 'campus_store_products']) LOOP
        FOR pol IN SELECT policyname FROM pg_policies 
                   WHERE tablename = tbl 
                   AND policyname NOT LIKE 'secure_%' LOOP  -- Keep our new secure policies
            EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON ' || tbl;
        END LOOP;
    END LOOP;
END $$;

-- Create secure RLS policies with proper validation

-- User Profiles - Enhanced security
CREATE POLICY "secure_user_profiles_select" ON user_profiles FOR SELECT 
USING (
    validate_user_ownership(user_id) 
    OR is_service_role_with_context()
);

CREATE POLICY "secure_user_profiles_insert" ON user_profiles FOR INSERT 
WITH CHECK (
    validate_user_ownership(user_id) 
    OR is_service_role_with_context()
);

CREATE POLICY "secure_user_profiles_update" ON user_profiles FOR UPDATE 
USING (
    validate_user_ownership(user_id) 
    OR is_service_role_with_context()
)
WITH CHECK (
    validate_user_ownership(user_id) 
    OR is_service_role_with_context()
);

-- User Stats - Enhanced security
CREATE POLICY "secure_user_stats_select" ON user_stats FOR SELECT 
USING (
    validate_user_ownership(user_id) 
    OR is_service_role_with_context()
);

CREATE POLICY "secure_user_stats_insert" ON user_stats FOR INSERT 
WITH CHECK (
    validate_user_ownership(user_id) 
    OR is_service_role_with_context()
);

CREATE POLICY "secure_user_stats_update" ON user_stats FOR UPDATE 
USING (
    validate_user_ownership(user_id) 
    OR is_service_role_with_context()
)
WITH CHECK (
    validate_user_ownership(user_id) 
    OR is_service_role_with_context()
);

-- User Preferences - Enhanced security
CREATE POLICY "secure_user_preferences_select" ON user_preferences FOR SELECT 
USING (
    validate_user_ownership(user_id) 
    OR is_service_role_with_context()
);

CREATE POLICY "secure_user_preferences_insert" ON user_preferences FOR INSERT 
WITH CHECK (
    validate_user_ownership(user_id) 
    OR is_service_role_with_context()
);

CREATE POLICY "secure_user_preferences_update" ON user_preferences FOR UPDATE 
USING (
    validate_user_ownership(user_id) 
    OR is_service_role_with_context()
)
WITH CHECK (
    validate_user_ownership(user_id) 
    OR is_service_role_with_context()
);

-- AI Chat Sessions - Enhanced security with session ownership
CREATE POLICY "secure_ai_chat_sessions_select" ON ai_chat_sessions FOR SELECT 
USING (
    validate_user_ownership(user_id) 
    OR is_service_role_with_context()
);

CREATE POLICY "secure_ai_chat_sessions_insert" ON ai_chat_sessions FOR INSERT 
WITH CHECK (
    validate_user_ownership(user_id) 
    OR is_service_role_with_context()
);

CREATE POLICY "secure_ai_chat_sessions_update" ON ai_chat_sessions FOR UPDATE 
USING (
    validate_user_ownership(user_id) 
    OR is_service_role_with_context()
);

CREATE POLICY "secure_ai_chat_sessions_delete" ON ai_chat_sessions FOR DELETE 
USING (
    validate_user_ownership(user_id) 
    OR is_service_role_with_context()
);

-- AI Chat Messages - Enhanced security
CREATE POLICY "secure_ai_chat_messages_select" ON ai_chat_messages FOR SELECT 
USING (
    validate_user_ownership(user_id) 
    OR is_service_role_with_context()
);

CREATE POLICY "secure_ai_chat_messages_insert" ON ai_chat_messages FOR INSERT 
WITH CHECK (
    validate_user_ownership(user_id) 
    OR is_service_role_with_context()
);

-- Marketplace Listings - Public read for active listings, owner control for modifications
CREATE POLICY "secure_marketplace_listings_public_select" ON marketplace_listings FOR SELECT 
USING (
    is_active = true 
    OR validate_user_ownership(seller_id) 
    OR is_service_role_with_context()
);

CREATE POLICY "secure_marketplace_listings_insert" ON marketplace_listings FOR INSERT 
WITH CHECK (
    validate_user_ownership(seller_id) 
    OR is_service_role_with_context()
);

CREATE POLICY "secure_marketplace_listings_update" ON marketplace_listings FOR UPDATE 
USING (
    validate_user_ownership(seller_id) 
    OR is_service_role_with_context()
);

CREATE POLICY "secure_marketplace_listings_delete" ON marketplace_listings FOR DELETE 
USING (
    validate_user_ownership(seller_id) 
    OR is_service_role_with_context()
);

-- Transactions - Enhanced security with audit trail
CREATE POLICY "secure_transactions_select" ON transactions FOR SELECT 
USING (
    validate_user_ownership(user_id) 
    OR is_service_role_with_context()
);

CREATE POLICY "secure_transactions_insert" ON transactions FOR INSERT 
WITH CHECK (
    validate_user_ownership(user_id) 
    OR is_service_role_with_context()
);

-- Campus Store Products - Public read access for active products, service role management
CREATE POLICY "secure_campus_store_products_select" ON campus_store_products FOR SELECT 
USING (is_active = true);

CREATE POLICY "secure_campus_store_products_manage" ON campus_store_products FOR ALL
USING (is_service_role_with_context())
WITH CHECK (is_service_role_with_context());

-- ============================================================================
-- STEP 5: Performance Monitoring and Maintenance
-- ============================================================================

-- Create optimized monitoring views with proper security
CREATE OR REPLACE VIEW index_performance_stats AS
SELECT 
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    CASE 
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 100 THEN 'LOW_USAGE'
        WHEN idx_scan < 1000 THEN 'MODERATE_USAGE'
        ELSE 'HIGH_USAGE'
    END as usage_category
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Create table statistics view
CREATE OR REPLACE VIEW table_performance_stats AS
SELECT 
    schemaname,
    relname as tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    ROUND(
        (CASE 
            WHEN (seq_scan + idx_scan) = 0 THEN 0
            ELSE (idx_scan::float / (seq_scan + idx_scan) * 100)
        END)::numeric, 2
    ) as index_usage_percentage
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY (seq_scan + idx_scan) DESC;

-- ============================================================================
-- STEP 6: Security Audit and Compliance
-- ============================================================================

-- Create security audit function
CREATE OR REPLACE FUNCTION audit_security_configuration() RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check RLS is enabled on all tables
    RETURN QUERY
    SELECT 
        'RLS_ENABLED' as check_name,
        CASE WHEN relrowsecurity THEN 'PASS' ELSE 'FAIL' END as status,
        'Table: ' || relname as details
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' 
    AND c.relkind = 'r'
    AND relname IN ('user_profiles', 'user_stats', 'user_preferences', 
                    'ai_chat_sessions', 'ai_chat_messages', 'marketplace_listings', 
                    'transactions', 'campus_store_products');
    
    -- Check for SECURITY DEFINER functions
    RETURN QUERY
    SELECT 
        'SECURITY_DEFINER_FUNCTIONS' as check_name,
        CASE WHEN prosecdef THEN 'REVIEW_REQUIRED' ELSE 'PASS' END as status,
        'Function: ' || proname as details
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND prosecdef = true;
    
    -- Check policy coverage
    RETURN QUERY
    SELECT 
        'POLICY_COVERAGE' as check_name,
        CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END as status,
        'Table: ' || tablename || ' has ' || COUNT(*) || ' policies' as details
    FROM pg_policies 
    WHERE tablename IN ('user_profiles', 'user_stats', 'user_preferences', 
                        'ai_chat_sessions', 'ai_chat_messages', 'marketplace_listings', 
                        'transactions')
    GROUP BY tablename;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- ============================================================================
-- STEP 7: Maintenance and Optimization Settings
-- ============================================================================

-- Optimize autovacuum settings for better performance
ALTER TABLE user_profiles SET (
    autovacuum_analyze_scale_factor = 0.02,
    autovacuum_vacuum_scale_factor = 0.05
);

ALTER TABLE ai_chat_sessions SET (
    autovacuum_analyze_scale_factor = 0.02,
    autovacuum_vacuum_scale_factor = 0.05
);

ALTER TABLE ai_chat_messages SET (
    autovacuum_analyze_scale_factor = 0.01,
    autovacuum_vacuum_scale_factor = 0.02
);

ALTER TABLE marketplace_listings SET (
    autovacuum_analyze_scale_factor = 0.02,
    autovacuum_vacuum_scale_factor = 0.05
);

ALTER TABLE transactions SET (
    autovacuum_analyze_scale_factor = 0.01,
    autovacuum_vacuum_scale_factor = 0.02
);

-- Update statistics for optimal query planning
ANALYZE user_profiles;
ANALYZE user_stats;
ANALYZE user_preferences;
ANALYZE ai_chat_sessions;
ANALYZE ai_chat_messages;
ANALYZE marketplace_listings;
ANALYZE transactions;
ANALYZE campus_store_products;

-- ============================================================================
-- STEP 8: Verification and Summary
-- ============================================================================

-- Display security audit results
SELECT 'SECURITY AUDIT RESULTS:' as info;
SELECT * FROM audit_security_configuration();

-- Display performance monitoring info
SELECT 'PERFORMANCE MONITORING:' as info;
SELECT 'Use these views for ongoing monitoring:' as instruction;
SELECT 'SELECT * FROM index_performance_stats;' as query_1;
SELECT 'SELECT * FROM table_performance_stats;' as query_2;
SELECT 'SELECT * FROM public_policy_summary;' as query_3;

-- Final summary
SELECT 
    'OPTIMIZATION COMPLETE' as status,
    'Security vulnerabilities fixed, performance optimized, RLS policies secured' as summary;

-- ============================================================================
-- USAGE INSTRUCTIONS
-- ============================================================================

/*
IMPLEMENTATION NOTES:

1. SECURITY IMPROVEMENTS:
   - Replaced SECURITY DEFINER with SECURITY INVOKER where appropriate
   - Added access controls to context management functions
   - Created secure policy audit views with proper permissions
   - Enhanced RLS policies with better validation

2. PERFORMANCE OPTIMIZATIONS:
   - Added composite indexes for common query patterns
   - Created partial indexes for filtered queries
   - Optimized autovacuum settings
   - Added performance monitoring views

3. POSTGRESQL COMPATIBILITY:
   - All functions use standard PostgreSQL syntax
   - Proper error handling and exception management
   - Compatible with Supabase environment

4. MAINTENANCE:
   - Run the audit function regularly: SELECT * FROM audit_security_configuration();
   - Monitor index usage: SELECT * FROM index_performance_stats;
   - Check table performance: SELECT * FROM table_performance_stats;

5. API INTEGRATION:
   - Use set_api_context() at the beginning of API routes
   - Use clear_api_context() at the end of API routes
   - Ensure proper user_id validation in application code
*/