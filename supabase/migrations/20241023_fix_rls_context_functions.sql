-- Migration: Fix RLS Context Functions
-- Description: Creates the necessary database functions for secure RLS context management
-- Created: 2025-10-23

-- Drop existing functions if they exist
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

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION set_api_context(TEXT, TEXT, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION clear_api_context() TO service_role;
GRANT EXECUTE ON FUNCTION is_service_role_with_context() TO PUBLIC;
GRANT EXECUTE ON FUNCTION validate_user_ownership(TEXT) TO PUBLIC;

-- Add comment documentation
COMMENT ON FUNCTION set_api_context(TEXT, TEXT, BOOLEAN) IS 'Sets the API context for secure RLS operations';
COMMENT ON FUNCTION clear_api_context() IS 'Clears the API context after secure operations';
COMMENT ON FUNCTION is_service_role_with_context() IS 'Validates if service role has proper context';
COMMENT ON FUNCTION validate_user_ownership(TEXT) IS 'Validates user ownership for RLS policies';