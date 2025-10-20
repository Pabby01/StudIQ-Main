/* eslint-disable @typescript-eslint/no-explicit-any */
// Note: Using 'any' types is necessary due to Supabase type generation issues
// where Insert and Update types are incorrectly inferred as 'never'

import { supabase, supabaseAdmin, handleSupabaseError } from './supabase'
import type {
  UserProfile,
  UserProfileInsert,
  UserProfileUpdate,
  UserStats,
  UserStatsInsert,
  UserStatsUpdate,
  ChatSession,
  ChatSessionInsert,
  ChatMessage,
  ChatMessageInsert,
  CampusProduct,
  MarketplaceListing,
  MarketplaceListingInsert,
  Transaction,
  TransactionInsert,
  UserPreferences,
  UserPreferencesInsert,
  UserPreferencesUpdate
} from './database-types'

// Helper function to safely cast update objects to avoid never type issues
const safeUpdate = <T>(update: T): any => {
  return {
    ...update,
    updated_at: new Date().toISOString()
  }
}

// Validation functions
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10
}

export const validateDisplayName = (name: string): boolean => {
  return name.trim().length >= 2 && name.trim().length <= 50
}

// User Profile Operations
export class UserProfileManager {
  static async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        console.error('Error fetching user profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  }

  static async createProfile(profile: UserProfileInsert): Promise<UserProfile> {
    try {
      // Validate required fields
      if (!validateDisplayName(profile.display_name)) {
        throw new Error('Display name must be between 2 and 50 characters')
      }

      if (profile.email && !validateEmail(profile.email)) {
        throw new Error('Invalid email format')
      }

      if (profile.phone && !validatePhone(profile.phone)) {
        throw new Error('Invalid phone number format')
      }

      // Use admin client to bypass RLS for user creation
      const { data, error } = await (supabaseAdmin as any)
      .from('user_profiles')
      .insert(profile)
      .select()
      .single()

      if (error) {
        handleSupabaseError(error, 'create user profile')
      }

      if (!data) {
        throw new Error('Failed to create user profile - no data returned')
      }

      // Create default user stats and preferences using admin client
      await Promise.all([
        UserStatsManager.createStats({ user_id: profile.user_id }),
        UserPreferencesManager.createPreferences({ user_id: profile.user_id })
      ])

      return data
    } catch (error) {
      console.error('Error creating user profile:', error)
      throw error
    }
  }

  static async updateProfile(userId: string, updates: UserProfileUpdate): Promise<UserProfile> {
    try {
      // Validate updates
      if (updates.display_name && !validateDisplayName(updates.display_name)) {
        throw new Error('Display name must be between 2 and 50 characters')
      }

      if (updates.email && !validateEmail(updates.email)) {
        throw new Error('Invalid email format')
      }

      if (updates.phone && !validatePhone(updates.phone)) {
        throw new Error('Invalid phone number format')
      }

      const { data, error } = await (supabase as any)
      .from('user_profiles')
      .update(safeUpdate(updates))
      .eq('user_id', userId)
      .select()
      .single()

      if (error) {
        handleSupabaseError(error, 'update user profile')
      }

      if (!data) {
        throw new Error('Failed to update user profile - no data returned')
      }

      return data
    } catch (error) {
      console.error('Error updating user profile:', error)
      throw error
    }
  }

  static async deleteProfile(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', userId)

      if (error) {
        handleSupabaseError(error, 'delete user profile')
      }
    } catch (error) {
      console.error('Error deleting user profile:', error)
      throw error
    }
  }
}

// User Stats Operations
export class UserStatsManager {
  static async getStats(userId: string): Promise<UserStats | null> {
    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        console.error('Error fetching user stats:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching user stats:', error)
      return null
    }
  }

  static async createStats(stats: UserStatsInsert): Promise<UserStats> {
    try {
      // Use admin client to bypass RLS for user stats creation
      const { data, error } = await (supabaseAdmin as any)
      .from('user_stats')
      .insert(stats)
      .select()
      .single()

      if (error) {
        handleSupabaseError(error, 'create user stats')
      }

      if (!data) {
        throw new Error('Failed to create user stats - no data returned')
      }

      return data
    } catch (error) {
      console.error('Error creating user stats:', error)
      throw error
    }
  }

  static async updateStats(userId: string, updates: UserStatsUpdate): Promise<UserStats> {
    try {
      const { data, error } = await (supabase as any)
      .from('user_stats')
      .update(safeUpdate(updates))
      .eq('user_id', userId)
      .select()
      .single()

      if (error) {
        handleSupabaseError(error, 'update user stats')
      }

      if (!data) {
        throw new Error('Failed to update user stats - no data returned')
      }

      return data
    } catch (error) {
      console.error('Error updating user stats:', error)
      throw error
    }
  }

  static async incrementPoints(userId: string, points: number): Promise<UserStats> {
    try {
      const currentStats = await this.getStats(userId)
      if (!currentStats) {
        throw new Error('User stats not found')
      }

      return await this.updateStats(userId, {
        total_points: currentStats.total_points + points,
        last_activity: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error incrementing points:', error)
      throw error
    }
  }

  static async addCashback(userId: string, amount: number): Promise<UserStats> {
    try {
      const currentStats = await this.getStats(userId)
      if (!currentStats) {
        throw new Error('User stats not found')
      }

      return await this.updateStats(userId, {
        total_cashback: Number(currentStats.total_cashback) + amount,
        last_activity: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error adding cashback:', error)
      throw error
    }
  }
}

// AI Chat Operations
export class ChatManager {
  static async createSession(session: ChatSessionInsert): Promise<ChatSession> {
    try {
      const { data, error } = await (supabase as any)
      .from('ai_chat_sessions')
      .insert(session)
      .select()
      .single()

      if (error) {
        handleSupabaseError(error, 'create chat session')
      }

      if (!data) {
        throw new Error('No data returned from creating chat session')
      }

      return data
    } catch (error) {
      console.error('Error creating chat session:', error)
      throw error
    }
  }

  static async getUserSessions(userId: string): Promise<ChatSession[]> {
    try {

      const { data, error } = await supabase
        .from('ai_chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      if (error) {
        handleSupabaseError(error, 'fetch user chat sessions')
      }

      return data || []
    } catch (error) {
      console.error('Error fetching user chat sessions:', error)
      throw error
    }
  }

  static async addMessage(message: ChatMessageInsert): Promise<ChatMessage> {
    try {

      const { data, error } = await (supabase as any)
      .from('ai_chat_messages')
      .insert(message)
      .select()
      .single()

      if (error) {
        handleSupabaseError(error, 'add chat message')
      }

      if (!data) {
        throw new Error('No data returned from adding chat message')
      }

      // Update session timestamp
      await (supabase as any)
        .from('ai_chat_sessions')
        .update(safeUpdate({}))
        .eq('id', message.session_id)

      return data
    } catch (error) {
      console.error('Error adding chat message:', error)
      throw error
    }
  }

  static async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    try {

      const { data, error } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (error) {
        handleSupabaseError(error, 'fetch session messages')
      }

      return data || []
    } catch (error) {
      console.error('Error fetching session messages:', error)
      throw error
    }
  }

  static async deleteSession(sessionId: string, userId: string): Promise<void> {
    try {

      const { error } = await supabase
        .from('ai_chat_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', userId)

      if (error) {
        handleSupabaseError(error, 'delete chat session')
      }
    } catch (error) {
      console.error('Error deleting chat session:', error)
      throw error
    }
  }
}

// Campus Store Operations
export class CampusStoreManager {
  static async getProducts(university?: string, category?: string): Promise<CampusProduct[]> {
    try {

      let query = supabase
        .from('campus_store_products')
        .select('*')
        .eq('is_active', true)

      if (university) {
        query = query.eq('university', university)
      }

      if (category) {
        query = query.eq('category', category)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        handleSupabaseError(error, 'fetch campus store products')
      }

      return data || []
    } catch (error) {
      console.error('Error fetching campus store products:', error)
      throw error
    }
  }

  static async getProduct(productId: string): Promise<CampusProduct | null> {
    try {

      const { data, error } = await supabase
        .from('campus_store_products')
        .select('*')
        .eq('id', productId)
        .eq('is_active', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        handleSupabaseError(error, 'fetch campus store product')
      }

      return data
    } catch (error) {
      console.error('Error fetching campus store product:', error)
      throw error
    }
  }

  static async searchProducts(searchTerm: string, university?: string): Promise<CampusProduct[]> {
    try {

      let query = supabase
        .from('campus_store_products')
        .select('*')
        .eq('is_active', true)
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)

      if (university) {
        query = query.eq('university', university)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        handleSupabaseError(error, 'search campus store products')
      }

      return data || []
    } catch (error) {
      console.error('Error searching campus store products:', error)
      throw error
    }
  }
}

// Marketplace Operations
export class MarketplaceManager {
  static async createListing(listing: MarketplaceListingInsert): Promise<MarketplaceListing> {
    try {

      // Validate listing data
      if (!listing.title || listing.title.trim().length < 3) {
        throw new Error('Title must be at least 3 characters long')
      }

      if (!listing.description || listing.description.trim().length < 10) {
        throw new Error('Description must be at least 10 characters long')
      }

      if (listing.price <= 0) {
        throw new Error('Price must be greater than 0')
      }

      const { data, error } = await (supabase as any)
      .from('marketplace_listings')
      .insert(listing)
      .select()
      .single()

      if (error) {
        handleSupabaseError(error, 'create marketplace listing')
      }

      if (!data) {
        throw new Error('No data returned from creating marketplace listing')
      }

      return data
    } catch (error) {
      console.error('Error creating marketplace listing:', error)
      throw error
    }
  }

  static async getListings(category?: string, location?: string): Promise<MarketplaceListing[]> {
    try {

      let query = supabase
        .from('marketplace_listings')
        .select('*')
        .eq('is_active', true)
        .eq('is_sold', false)

      if (category) {
        query = query.eq('category', category)
      }

      if (location) {
        query = query.eq('location', location)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        handleSupabaseError(error, 'fetch marketplace listings')
      }

      return data || []
    } catch (error) {
      console.error('Error fetching marketplace listings:', error)
      throw error
    }
  }

  static async getUserListings(userId: string): Promise<MarketplaceListing[]> {
    try {

      const { data, error } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('seller_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        handleSupabaseError(error, 'fetch user marketplace listings')
      }

      return data || []
    } catch (error) {
      console.error('Error fetching user marketplace listings:', error)
      throw error
    }
  }

  static async markAsSold(listingId: string, sellerId: string): Promise<MarketplaceListing> {
    try {

      const { data, error } = await (supabase as any)
      .from('marketplace_listings')
      .update(safeUpdate({ is_sold: true }))
      .eq('id', listingId)
      .eq('seller_id', sellerId)
      .select()
      .single()

      if (error) {
        handleSupabaseError(error, 'mark listing as sold')
      }

      if (!data) {
        throw new Error('No data returned from marking listing as sold')
      }

      return data
    } catch (error) {
      console.error('Error marking listing as sold:', error)
      throw error
    }
  }

  static async searchListings(searchTerm: string): Promise<MarketplaceListing[]> {
    try {

      const { data, error } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('is_active', true)
        .eq('is_sold', false)
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })

      if (error) {
        handleSupabaseError(error, 'search marketplace listings')
      }

      return data || []
    } catch (error) {
      console.error('Error searching marketplace listings:', error)
      throw error
    }
  }
}

// Transaction Operations
export class TransactionManager {
  static async createTransaction(transaction: TransactionInsert): Promise<Transaction> {
    try {

      const { data, error } = await (supabase as any)
        .from('transactions')
        .insert(transaction)
        .select()
        .single()

      if (error) {
        handleSupabaseError(error, 'create transaction')
      }

      if (!data) {
        throw new Error('No data returned from creating transaction')
      }

      return data
    } catch (error) {
      console.error('Error creating transaction:', error)
      throw error
    }
  }

  static async getUserTransactions(userId: string): Promise<Transaction[]> {
    try {

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        handleSupabaseError(error, 'fetch user transactions')
      }

      return data || []
    } catch (error) {
      console.error('Error fetching user transactions:', error)
      throw error
    }
  }

  static async updateTransactionStatus(
    transactionId: string, 
    status: 'pending' | 'completed' | 'failed' | 'cancelled'
  ): Promise<Transaction> {
    try {

      const { data, error } = await (supabase as any)
        .from('transactions')
        .update(safeUpdate({ status }))
        .eq('id', transactionId)
        .select()
        .single()

      if (error) {
        handleSupabaseError(error, 'update transaction status')
      }

      if (!data) {
        throw new Error('No data returned from updating transaction status')
      }

      return data
    } catch (error) {
      console.error('Error updating transaction status:', error)
      throw error
    }
  }
}

// User Preferences Operations
export class UserPreferencesManager {
  static async getPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        console.error('Error fetching user preferences:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching user preferences:', error)
      return null
    }
  }

  static async createPreferences(preferences: UserPreferencesInsert): Promise<UserPreferences> {
    try {
      // Use admin client to bypass RLS for user preferences creation
      const { data, error } = await (supabaseAdmin as any)
      .from('user_preferences')
      .insert(preferences)
      .select()
      .single()

      if (error) {
        throw new Error(`Failed to create preferences: ${error.message}`)
      }

      if (!data) {
        throw new Error('No data returned from preferences creation')
      }

      return data
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Failed to create user preferences')
    }
  }

  static async updatePreferences(userId: string, updates: UserPreferencesUpdate): Promise<UserPreferences> {
    try {

      const { data, error } = await (supabase as any)
      .from('user_preferences')
      .update(safeUpdate(updates))
      .eq('user_id', userId)
      .select()
      .single()

      if (error) {
        throw new Error(`Failed to update preferences: ${error.message}`)
      }

      if (!data) {
        throw new Error('No data returned from preferences update')
      }

      return data
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Failed to update user preferences')
    }
  }
}

// Utility functions
export const formatDisplayName = (name: string): string => {
  return name.trim().replace(/\s+/g, ' ')
}

export const generateAvatar = (displayName: string): string => {
  const initials = displayName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2)
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random&color=fff&size=128`
}

export const getGreeting = (): string => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}