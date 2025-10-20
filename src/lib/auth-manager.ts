'use client'

import { User as PrivyUser } from '@privy-io/react-auth'
import { UserProfileManager, UserStatsManager, UserPreferencesManager } from './database-utils'
import { Database } from './database.types'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']
type UserStats = Database['public']['Tables']['user_stats']['Row']
type UserPreferences = Database['public']['Tables']['user_preferences']['Row']

export interface AuthUser {
  id: string
  walletAddress: string
  email?: string
  phone?: string
  displayName: string
  avatar?: string
  isNewUser: boolean
  profile?: UserProfile
  stats?: UserStats
  preferences?: UserPreferences
}

export class AuthManager {
  /**
   * Sync Privy user with Supabase database
   * Creates or updates user profile, stats, and preferences
   */
  static async syncUserWithDatabase(
    privyUser: PrivyUser, 
    walletAddress: string
  ): Promise<AuthUser> {
    try {
      // Check if user profile exists
      let profile = await UserProfileManager.getProfile(walletAddress)
      let isNewUser = false

      if (!profile) {
        // Create new user profile
        isNewUser = true
        const displayName = this.generateDisplayName(privyUser, walletAddress)
        
        profile = await UserProfileManager.createProfile({
          user_id: walletAddress,
          display_name: displayName,
          email: privyUser.email?.address || null,
          phone: privyUser.phone?.number || null,
          wallet_address: walletAddress,
          avatar_url: this.generateAvatar(displayName)
        })

        // Create default user stats
        await UserStatsManager.createStats({
          user_id: walletAddress,
          total_points: 0,
          level: 1,
          completed_lessons: 0
        })

        // Create default preferences
        await UserPreferencesManager.createPreferences({
          user_id: walletAddress,
          theme: 'light',
          notifications_enabled: true,
          language: 'en'
        })
      } else {
        // Update existing profile with latest Privy data
        await UserProfileManager.updateProfile(walletAddress, {
          email: privyUser.email?.address || profile.email,
          phone: privyUser.phone?.number || profile.phone
        })
      }

      // Get user stats and preferences
      const [stats, preferences] = await Promise.all([
        UserStatsManager.getStats(walletAddress),
        UserPreferencesManager.getPreferences(walletAddress)
      ])

      return {
        id: walletAddress,
        walletAddress,
        email: privyUser.email?.address,
        phone: privyUser.phone?.number,
        displayName: profile.display_name,
        avatar: profile.avatar_url || undefined,
        isNewUser,
        profile,
        stats: stats || undefined,
        preferences: preferences || undefined
      }
    } catch (error) {
      console.error('Error syncing user with database:', error)
      throw new Error('Failed to sync user data')
    }
  }

  /**
   * Handle user login - sync with database and return user data
   */
  static async handleUserLogin(
    privyUser: PrivyUser,
    walletAddress: string
  ): Promise<AuthUser> {
    try {
      const authUser = await this.syncUserWithDatabase(privyUser, walletAddress)
      
      // Note: last_login_at field doesn't exist in user_profiles table
      // Login tracking can be implemented through user_stats.last_activity if needed

      // Log authentication event
      console.log(`User authenticated: ${walletAddress}`, {
        isNewUser: authUser.isNewUser,
        authMethod: this.getAuthMethod(privyUser)
      })

      return authUser
    } catch (error) {
      console.error('Error handling user login:', error)
      throw error
    }
  }

  /**
   * Handle user logout - cleanup and logging
   */
  static async handleUserLogout(walletAddress: string): Promise<void> {
    try {
      // Note: last_logout_at field doesn't exist in user_profiles table
      // Logout tracking can be implemented through user_stats.last_activity if needed
      
      console.log(`User logged out: ${walletAddress}`)
    } catch (error) {
      console.error('Error handling user logout:', error)
      // Don't throw error for logout cleanup failures
    }
  }

  /**
   * Update user profile data
   */
  static async updateUserProfile(
    walletAddress: string,
    updates: {
      displayName?: string
      email?: string
      phone?: string
      avatar?: string
    }
  ): Promise<UserProfile> {
    try {
      const updatedProfile = await UserProfileManager.updateProfile(walletAddress, {
        display_name: updates.displayName,
        email: updates.email || null,
        phone: updates.phone || null,
        avatar_url: updates.avatar || null
      })

      if (!updatedProfile) {
        throw new Error('Failed to update user profile')
      }

      return updatedProfile
    } catch (error) {
      console.error('Error updating user profile:', error)
      throw error
    }
  }

  /**
   * Update user preferences
   */
  static async updateUserPreferences(
    walletAddress: string,
    preferences: {
      theme?: 'light' | 'dark'
      notifications?: boolean
      language?: string
    }
  ): Promise<UserPreferences> {
    try {
      const updatedPrefs = await UserPreferencesManager.updatePreferences(walletAddress, {
        theme: preferences.theme,
        notifications_enabled: preferences.notifications,
        language: preferences.language
      })

      if (!updatedPrefs) {
        throw new Error('Failed to update user preferences')
      }

      return updatedPrefs
    } catch (error) {
      console.error('Error updating user preferences:', error)
      throw error
    }
  }

  /**
   * Delete user account and all associated data
   */
  static async deleteUserAccount(walletAddress: string): Promise<void> {
    try {
      // Delete user profile (cascades to stats and preferences)
      await UserProfileManager.deleteProfile(walletAddress)
      
      console.log(`User account deleted: ${walletAddress}`)
    } catch (error) {
      console.error('Error deleting user account:', error)
      throw error
    }
  }

  /**
   * Get user authentication method from Privy user object
   */
  private static getAuthMethod(privyUser: PrivyUser): string {
    if (privyUser.wallet) return 'wallet'
    if (privyUser.email) return 'email'
    if (privyUser.phone) return 'phone'
    if (privyUser.google) return 'google'
    if (privyUser.apple) return 'apple'
    return 'unknown'
  }

  /**
   * Generate display name from Privy user data
   */
  private static generateDisplayName(privyUser: PrivyUser, walletAddress: string): string {
    // Try to use email username
    if (privyUser.email?.address) {
      const emailUsername = privyUser.email.address.split('@')[0]
      return this.formatDisplayName(emailUsername)
    }

    // Try to use phone number (last 4 digits)
    if (privyUser.phone?.number) {
      const phoneDigits = privyUser.phone.number.replace(/\D/g, '').slice(-4)
      return `User${phoneDigits}`
    }

    // Fallback to wallet address
    return `User${walletAddress.slice(-4)}`
  }

  /**
   * Format display name to be user-friendly
   */
  private static formatDisplayName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 20)
      .replace(/^\w/, (c) => c.toUpperCase())
  }

  /**
   * Generate avatar initials from display name
   */
  private static generateAvatar(displayName: string): string {
    return displayName
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  /**
   * Validate user session and refresh data if needed
   */
  static async validateUserSession(walletAddress: string): Promise<AuthUser | null> {
    try {
      const [profile, stats, preferences] = await Promise.all([
        UserProfileManager.getProfile(walletAddress),
        UserStatsManager.getStats(walletAddress),
        UserPreferencesManager.getPreferences(walletAddress)
      ])

      if (!profile) {
        return null
      }

      return {
        id: walletAddress,
        walletAddress,
        email: profile.email || undefined,
        phone: profile.phone || undefined,
        displayName: profile.display_name,
        avatar: profile.avatar_url || undefined,
        isNewUser: false,
        profile,
        stats: stats || undefined,
        preferences: preferences || undefined
      }
    } catch (error) {
      console.error('Error validating user session:', error)
      return null
    }
  }
}

/**
 * Hook for managing authentication state with Supabase integration
 */
export function useAuthManager() {
  return {
    syncUser: AuthManager.syncUserWithDatabase,
    handleLogin: AuthManager.handleUserLogin,
    handleLogout: AuthManager.handleUserLogout,
    updateProfile: AuthManager.updateUserProfile,
    updatePreferences: AuthManager.updateUserPreferences,
    deleteAccount: AuthManager.deleteUserAccount,
    validateSession: AuthManager.validateUserSession
  }
}