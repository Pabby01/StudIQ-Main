-- ============================================================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ============================================================================
-- This script adds strategic database indexes to improve query performance
-- based on identified query patterns in the application codebase.
--
-- IMPORTANT: Run this script during low-traffic periods as index creation
-- can temporarily impact database performance.
-- ============================================================================

-- ============================================================================
-- STEP 1: Critical Performance Indexes
-- ============================================================================

-- 1. User Profiles - wallet_address lookup optimization
-- This is critical for authentication and user lookup operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_wallet_address 
ON user_profiles(wallet_address) 
WHERE wallet_address IS NOT NULL;

-- 2. User Profiles - email lookup optimization (for login/registration)
-- Improve existing email index with partial index for non-null values
DROP INDEX IF EXISTS idx_user_profiles_email;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_email_optimized 
ON user_profiles(email) 
WHERE email IS NOT NULL;

-- ============================================================================
-- STEP 2: Time-based Query Optimization
-- ============================================================================

-- 3. AI Chat Sessions - user_id with updated_at for recent sessions
-- Optimizes: ORDER BY updated_at DESC queries for user's recent chat sessions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_chat_sessions_user_updated 
ON ai_chat_sessions(user_id, updated_at DESC);

-- 4. AI Chat Messages - session_id with created_at for message ordering
-- Optimizes: ORDER BY created_at ASC/DESC queries for chat message history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_chat_messages_session_created 
ON ai_chat_messages(session_id, created_at ASC);

-- 5. AI Chat Messages - user_id with created_at for user's message history
-- Optimizes: User's complete message history across all sessions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_chat_messages_user_created 
ON ai_chat_messages(user_id, created_at DESC);

-- ============================================================================
-- STEP 3: Marketplace and Transaction Optimization
-- ============================================================================

-- 6. Marketplace Listings - active listings with created_at for recent listings
-- Optimizes: Public marketplace browsing with time-based sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketplace_listings_active_created 
ON marketplace_listings(is_active, created_at DESC) 
WHERE is_active = true;

-- 7. Marketplace Listings - seller with status for seller dashboard
-- Optimizes: Seller's listing management queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketplace_listings_seller_status 
ON marketplace_listings(seller_id, is_active, is_sold);

-- 8. Transactions - user_id with created_at for transaction history
-- Optimizes: User transaction history with time-based ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_user_created 
ON transactions(user_id, created_at DESC);

-- 9. Transactions - status with created_at for admin monitoring
-- Optimizes: Transaction status monitoring and reporting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_status_created 
ON transactions(status, created_at DESC);

-- ============================================================================
-- STEP 4: Campus Store Optimization
-- ============================================================================

-- 10. Campus Store Products - active products with category and university
-- Optimizes: Product browsing by category and university
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campus_store_active_category_uni 
ON campus_store_products(is_active, category, university) 
WHERE is_active = true;

-- 11. Campus Store Products - stock quantity for inventory management
-- Optimizes: Low stock alerts and inventory queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campus_store_stock_active 
ON campus_store_products(stock_quantity, is_active) 
WHERE is_active = true AND stock_quantity >= 0;

-- ============================================================================
-- STEP 5: User Stats and Preferences Optimization
-- ============================================================================

-- 12. User Stats - level and points for leaderboards
-- Optimizes: Leaderboard queries and user ranking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_stats_level_points 
ON user_stats(level DESC, total_points DESC);

-- 13. User Stats - last_activity for active user tracking
-- Optimizes: Active user analytics and engagement tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_stats_last_activity 
ON user_stats(last_activity DESC) 
WHERE last_activity IS NOT NULL;

-- ============================================================================
-- STEP 6: Composite Indexes for Complex Queries
-- ============================================================================

-- 14. User Profiles - comprehensive lookup index
-- Optimizes: Multi-field user searches and authentication
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_comprehensive 
ON user_profiles(user_id, wallet_address, email) 
WHERE wallet_address IS NOT NULL OR email IS NOT NULL;

-- 15. AI Chat Sessions - user activity index
-- Optimizes: User's chat session activity and analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_chat_sessions_user_activity 
ON ai_chat_sessions(user_id, created_at DESC, updated_at DESC);

-- ============================================================================
-- STEP 7: Cleanup Old Indexes (if needed)
-- ============================================================================

-- Remove redundant indexes that are covered by new composite indexes
-- Note: Only drop if you're certain they're not used elsewhere

-- Example: If idx_user_profiles_user_id is covered by idx_user_profiles_comprehensive
-- DROP INDEX IF EXISTS idx_user_profiles_user_id;

-- ============================================================================
-- STEP 8: Index Statistics and Monitoring
-- ============================================================================

-- Create a view to monitor index usage and effectiveness
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan,
    CASE 
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 100 THEN 'LOW_USAGE'
        WHEN idx_scan < 1000 THEN 'MODERATE_USAGE'
        ELSE 'HIGH_USAGE'
    END as usage_category
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Create a view to monitor index sizes
CREATE OR REPLACE VIEW index_size_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    pg_relation_size(indexrelid) as index_size_bytes
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================================================
-- STEP 9: Performance Verification Queries
-- ============================================================================

-- Test query performance for critical operations
-- Run these EXPLAIN ANALYZE queries to verify index effectiveness:

/*
-- 1. Test wallet address lookup
EXPLAIN ANALYZE 
SELECT * FROM user_profiles WHERE wallet_address = 'test_wallet_address';

-- 2. Test recent chat sessions
EXPLAIN ANALYZE 
SELECT * FROM ai_chat_sessions 
WHERE user_id = 'test_user_id' 
ORDER BY updated_at DESC 
LIMIT 10;

-- 3. Test chat message history
EXPLAIN ANALYZE 
SELECT * FROM ai_chat_messages 
WHERE session_id = 'test_session_id' 
ORDER BY created_at ASC;

-- 4. Test active marketplace listings
EXPLAIN ANALYZE 
SELECT * FROM marketplace_listings 
WHERE is_active = true 
ORDER BY created_at DESC 
LIMIT 20;

-- 5. Test user transaction history
EXPLAIN ANALYZE 
SELECT * FROM transactions 
WHERE user_id = 'test_user_id' 
ORDER BY created_at DESC 
LIMIT 50;
*/

-- ============================================================================
-- STEP 10: Maintenance Recommendations
-- ============================================================================

-- Set up automatic statistics collection for better query planning
ALTER TABLE user_profiles SET (autovacuum_analyze_scale_factor = 0.02);
ALTER TABLE ai_chat_sessions SET (autovacuum_analyze_scale_factor = 0.02);
ALTER TABLE ai_chat_messages SET (autovacuum_analyze_scale_factor = 0.02);
ALTER TABLE marketplace_listings SET (autovacuum_analyze_scale_factor = 0.02);
ALTER TABLE transactions SET (autovacuum_analyze_scale_factor = 0.02);

-- Update table statistics immediately
ANALYZE user_profiles;
ANALYZE ai_chat_sessions;
ANALYZE ai_chat_messages;
ANALYZE marketplace_listings;
ANALYZE transactions;
ANALYZE user_stats;
ANALYZE user_preferences;
ANALYZE campus_store_products;

-- ============================================================================
-- COMPLETION SUMMARY
-- ============================================================================

-- Display summary of created indexes
SELECT 
    'Performance optimization completed!' as status,
    COUNT(*) as total_indexes_created
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
AND indexname NOT LIKE 'idx_user_profiles_user_id'  -- Exclude original basic indexes
AND indexname NOT LIKE 'idx_user_profiles_email'    -- Exclude original basic indexes
AND indexname NOT LIKE 'idx_user_stats_user_id'     -- Exclude original basic indexes
AND indexname NOT LIKE 'idx_ai_chat_sessions_user_id' -- Exclude original basic indexes
AND indexname NOT LIKE 'idx_ai_chat_messages_session_id' -- Exclude original basic indexes
AND indexname NOT LIKE 'idx_ai_chat_messages_user_id'; -- Exclude original basic indexes

-- Show index usage monitoring views
SELECT 'Use these views to monitor index performance:' as monitoring_info;
SELECT 'SELECT * FROM index_usage_stats;' as usage_query;
SELECT 'SELECT * FROM index_size_stats;' as size_query;

-- Performance optimization complete!
-- Monitor index usage regularly and adjust as needed based on query patterns.