-- Fix RLS policies for ai_chat_sessions to work with Privy authentication
-- This migration replaces auth.uid() based policies with validate_user_ownership() function

-- Drop existing policies that use auth.uid()
DROP POLICY IF EXISTS "Users can view their own chat sessions" ON ai_chat_sessions;
DROP POLICY IF EXISTS "Users can create their own chat sessions" ON ai_chat_sessions;
DROP POLICY IF EXISTS "Users can update their own chat sessions" ON ai_chat_sessions;
DROP POLICY IF EXISTS "Users can delete their own chat sessions" ON ai_chat_sessions;

-- Drop existing policies that use auth.uid() for ai_chat_messages
DROP POLICY IF EXISTS "Users can view their own chat messages" ON ai_chat_messages;
DROP POLICY IF EXISTS "Users can create their own chat messages" ON ai_chat_messages;

-- Create new RLS policies for ai_chat_sessions using validate_user_ownership
CREATE POLICY "Users can view their own chat sessions" ON ai_chat_sessions 
FOR SELECT 
USING (
    validate_user_ownership(user_id) 
    OR is_service_role_with_context()
);

CREATE POLICY "Users can create their own chat sessions" ON ai_chat_sessions 
FOR INSERT 
WITH CHECK (
    validate_user_ownership(user_id) 
    OR is_service_role_with_context()
);

CREATE POLICY "Users can update their own chat sessions" ON ai_chat_sessions 
FOR UPDATE 
USING (
    validate_user_ownership(user_id) 
    OR is_service_role_with_context()
);

CREATE POLICY "Users can delete their own chat sessions" ON ai_chat_sessions 
FOR DELETE 
USING (
    validate_user_ownership(user_id) 
    OR is_service_role_with_context()
);

-- Create new RLS policies for ai_chat_messages using validate_user_ownership
CREATE POLICY "Users can view their own chat messages" ON ai_chat_messages 
FOR SELECT 
USING (
    validate_user_ownership(user_id) 
    OR is_service_role_with_context()
);

CREATE POLICY "Users can create their own chat messages" ON ai_chat_messages 
FOR INSERT 
WITH CHECK (
    validate_user_ownership(user_id) 
    OR is_service_role_with_context()
);

-- Also fix user_stats policies to use validate_user_ownership
DROP POLICY IF EXISTS "Users can view their own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can update their own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can insert their own stats" ON user_stats;

CREATE POLICY "Users can view their own stats" ON user_stats 
FOR SELECT 
USING (
    validate_user_ownership(user_id) 
    OR is_service_role_with_context()
);

CREATE POLICY "Users can update their own stats" ON user_stats 
FOR UPDATE 
USING (
    validate_user_ownership(user_id) 
    OR is_service_role_with_context()
);

CREATE POLICY "Users can insert their own stats" ON user_stats 
FOR INSERT 
WITH CHECK (
    validate_user_ownership(user_id) 
    OR is_service_role_with_context()
);

-- Fix user_profiles policies to use validate_user_ownership
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;

CREATE POLICY "Users can view their own profile" ON user_profiles 
FOR SELECT 
USING (
    validate_user_ownership(user_id) 
    OR is_service_role_with_context()
);

CREATE POLICY "Users can update their own profile" ON user_profiles 
FOR UPDATE 
USING (
    validate_user_ownership(user_id) 
    OR is_service_role_with_context()
);

CREATE POLICY "Users can insert their own profile" ON user_profiles 
FOR INSERT 
WITH CHECK (
    validate_user_ownership(user_id) 
    OR is_service_role_with_context()
);

-- Fix user_preferences policies to use validate_user_ownership
DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON user_preferences;

CREATE POLICY "Users can view their own preferences" ON user_preferences 
FOR SELECT 
USING (
    validate_user_ownership(user_id) 
    OR is_service_role_with_context()
);

CREATE POLICY "Users can update their own preferences" ON user_preferences 
FOR UPDATE 
USING (
    validate_user_ownership(user_id) 
    OR is_service_role_with_context()
);

CREATE POLICY "Users can insert their own preferences" ON user_preferences 
FOR INSERT 
WITH CHECK (
    validate_user_ownership(user_id) 
    OR is_service_role_with_context()
);