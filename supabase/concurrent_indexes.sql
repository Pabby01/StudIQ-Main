-- ============================================================================
-- CONCURRENT INDEX CREATION SCRIPT
-- ============================================================================
-- This script creates indexes with CONCURRENTLY to avoid blocking operations
-- Run this AFTER the main optimized_security_and_performance.sql script
-- Each command should be run in a separate transaction/session
-- ============================================================================

-- IMPORTANT: Run each CREATE INDEX CONCURRENTLY command separately
-- Do NOT run this entire script at once - execute one command at a time

-- Critical authentication and lookup indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_wallet_address_concurrent 
ON user_profiles(wallet_address) 
WHERE wallet_address IS NOT NULL;

-- Wait for completion, then run the next one:
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_email_concurrent 
ON user_profiles(email) 
WHERE email IS NOT NULL;

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_chat_sessions_user_updated_concurrent 
ON ai_chat_sessions(user_id, updated_at DESC)
WHERE user_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_chat_messages_session_created_concurrent 
ON ai_chat_messages(session_id, created_at ASC)
WHERE session_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketplace_listings_active_category_concurrent 
ON marketplace_listings(category, created_at DESC)
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_user_status_created_concurrent 
ON transactions(user_id, status, created_at DESC)
WHERE user_id IS NOT NULL;

-- Partial indexes for better performance on filtered queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketplace_listings_active_recent_concurrent 
ON marketplace_listings(created_at DESC)
WHERE is_active = true AND NOT is_sold;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_completed_concurrent 
ON transactions(user_id, created_at DESC)
WHERE status = 'completed';

-- ============================================================================
-- USAGE INSTRUCTIONS
-- ============================================================================

/*
HOW TO USE THIS SCRIPT:

1. First run the main optimized_security_and_performance.sql script completely
2. Then run each CREATE INDEX CONCURRENTLY command from this file ONE AT A TIME
3. Wait for each index creation to complete before running the next one
4. Monitor progress with: SELECT * FROM pg_stat_progress_create_index;

BENEFITS OF CONCURRENT INDEX CREATION:
- Does not block reads or writes to the table
- Allows normal database operations to continue
- Takes longer but safer for production environments

AFTER COMPLETION:
- You can drop the non-concurrent indexes if desired
- Monitor index usage with the performance monitoring views
- The concurrent indexes will have slightly different names to avoid conflicts
*/