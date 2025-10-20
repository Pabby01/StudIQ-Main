import { Database } from './database.types'

// Type aliases for better readability
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert']
export type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update']

export type UserStats = Database['public']['Tables']['user_stats']['Row']
export type UserStatsInsert = Database['public']['Tables']['user_stats']['Insert']
export type UserStatsUpdate = Database['public']['Tables']['user_stats']['Update']

export type ChatSession = Database['public']['Tables']['ai_chat_sessions']['Row']
export type ChatSessionInsert = Database['public']['Tables']['ai_chat_sessions']['Insert']

export type ChatMessage = Database['public']['Tables']['ai_chat_messages']['Row']
export type ChatMessageInsert = Database['public']['Tables']['ai_chat_messages']['Insert']

export type CampusProduct = Database['public']['Tables']['campus_store_products']['Row']
export type MarketplaceListing = Database['public']['Tables']['marketplace_listings']['Row']
export type MarketplaceListingInsert = Database['public']['Tables']['marketplace_listings']['Insert']

export type Transaction = Database['public']['Tables']['transactions']['Row']
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert']

export type UserPreferences = Database['public']['Tables']['user_preferences']['Row']
export type UserPreferencesInsert = Database['public']['Tables']['user_preferences']['Insert']
export type UserPreferencesUpdate = Database['public']['Tables']['user_preferences']['Update']