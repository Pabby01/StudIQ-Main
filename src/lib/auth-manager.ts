'use client'

import { User as PrivyUser } from '@privy-io/react-auth'
import { ClientUserProfileManager, ClientUserStatsManager, ClientUserPreferencesManager, ClientUserBatchManager } from './client-database-utils'
import { Database } from './database.types'
import { secureLogger, secureLogUtils } from './secure-logger'

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

// In-memory lock to prevent concurrent sync operations for the same user
const syncLocks = new Map<string, Promise<AuthUser>>()

export class AuthManager {
  /**
   * Sync Privy user with Supabase database with race condition protection
   * Creates or updates user profile, stats, and preferences atomically
   */
  static async syncUserWithDatabase(
    privyUser: PrivyUser, 
    walletAddress: string
  ): Promise<AuthUser> {
    // Check if there's already a sync operation in progress for this user
    const existingSync = syncLocks.get(walletAddress)
    if (existingSync) {
      secureLogger.debug('Sync already in progress for user, waiting...', { walletAddress })
      return existingSync
    }

    // Create a new sync operation
    const syncOperation = this.performUserSync(privyUser, walletAddress)
    syncLocks.set(walletAddress, syncOperation)

    try {
      const result = await syncOperation
      return result
    } finally {
      // Always clean up the lock
      syncLocks.delete(walletAddress)
    }
  }

  /**
   * Internal method to perform the actual user sync
   */
  private static async performUserSync(
    privyUser: PrivyUser, 
    walletAddress: string
  ): Promise<AuthUser> {
    secureLogger.info('Starting user sync with database', {
      userId: privyUser.id,
      walletAddress: secureLogUtils.maskWalletAddress(walletAddress),
      authMethod: this.getAuthMethod(privyUser)
    })

    let existingUserData: { profile?: UserProfile; stats?: UserStats; preferences?: UserPreferences } = {}
    
    try {
      const batchData = await ClientUserBatchManager.getBatchUserData(walletAddress)
      existingUserData = batchData
    } catch (error) {
      secureLogger.warn('Could not check existing user data, proceeding with sync', {
        walletAddress: secureLogUtils.maskWalletAddress(walletAddress),
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    const isNewUser = !existingUserData.profile
    secureLogger.info('User status determined', {
      walletAddress: secureLogUtils.maskWalletAddress(walletAddress),
      isNewUser,
      hasProfile: !!existingUserData.profile,
      hasStats: !!existingUserData.stats,
      hasPreferences: !!existingUserData.preferences
    })

    const displayName = this.generateDisplayName(privyUser, walletAddress)
    const avatar = this.generateAvatar(displayName)

    const profileData = {
      user_id: privyUser.id,
      wallet_address: walletAddress,
      display_name: displayName,
      email: privyUser.email?.address || null,
      phone: privyUser.phone?.number || null,
      avatar_url: avatar
    }

    const statsData = {
      user_id: privyUser.id,
      total_points: existingUserData.stats?.total_points || 0,
      total_cashback: existingUserData.stats?.total_cashback || 0,
      level: existingUserData.stats?.level || 1,
      completed_lessons: existingUserData.stats?.completed_lessons || 0,
      portfolio_value: existingUserData.stats?.portfolio_value || 0,
      streak_days: existingUserData.stats?.streak_days || 0,
      last_activity: new Date().toISOString()
    }

    const preferencesData = {
      user_id: privyUser.id,
      theme: existingUserData.preferences?.theme || 'light',
      notifications_enabled: existingUserData.preferences?.notifications_enabled ?? true,
      language: existingUserData.preferences?.language || 'en'
    }

    try {
      secureLogger.info('Performing user data sync', {
        walletAddress: secureLogUtils.maskWalletAddress(walletAddress),
        isNewUser
      })

      // Direct profile upsert without batch operations
      const profile = await ClientUserProfileManager.upsertProfile(profileData)

      secureLogger.info('User profile upserted successfully', {
        walletAddress: secureLogUtils.maskWalletAddress(walletAddress),
        isNewUser
      })

      let stats: UserStats | null = null
      try {
        stats = await ClientUserStatsManager.upsertStats(statsData)
      } catch (statsError) {
        secureLogger.error('Failed to upsert user stats', {
          walletAddress: secureLogUtils.maskWalletAddress(walletAddress),
          error: statsError instanceof Error ? statsError.message : 'Unknown error'
        })
      }

      let preferences: UserPreferences | null = null
      try {
        preferences = await ClientUserPreferencesManager.upsertPreferences(preferencesData)
      } catch (preferencesError) {
        secureLogger.error('Failed to upsert user preferences', {
          walletAddress: secureLogUtils.maskWalletAddress(walletAddress),
          error: preferencesError instanceof Error ? preferencesError.message : 'Unknown error'
        })
      }

      secureLogger.info('User sync completed successfully', {
        walletAddress: secureLogUtils.maskWalletAddress(walletAddress),
        hasProfile: !!profile,
        hasStats: !!stats,
        hasPreferences: !!preferences
      })

      return {
        id: privyUser.id,
        walletAddress,
        email: privyUser.email?.address,
        phone: privyUser.phone?.number,
        displayName,
        avatar,
        isNewUser,
        profile: profile || undefined,
        stats: stats || undefined,
        preferences: preferences || undefined
      }
    } catch (error) {
      secureLogger.error('User sync failed', {
        walletAddress: secureLogUtils.maskWalletAddress(walletAddress),
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
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
      
      // Log authentication event (without sensitive data)
      secureLogger.info('User authenticated successfully', {
        timestamp: new Date().toISOString(),
        isNewUser: authUser.isNewUser,
        authMethod: this.getAuthMethod(privyUser),
        hasProfile: !!authUser.profile,
        hasStats: !!authUser.stats,
        hasPreferences: !!authUser.preferences
      })

      return authUser
    } catch (error) {
      secureLogger.error('Error handling user login', {
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Handle user logout - cleanup and logging
   */
  static async handleUserLogout(walletAddress: string): Promise<void> {
    try {
      // Clean up any pending sync operations
      syncLocks.delete(walletAddress)
      
      secureLogger.info('User logged out successfully', {
         timestamp: new Date().toISOString()
       })
    } catch (error) {
      secureLogger.error('Error handling user logout', {
         timestamp: new Date().toISOString(),
         error: error instanceof Error ? error.message : 'Unknown error'
       })
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
      const updatedProfile = await ClientUserProfileManager.updateProfile(walletAddress, {
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
      secureLogger.error('Error updating user profile', {
         timestamp: new Date().toISOString(),
         error: error instanceof Error ? error.message : 'Unknown error'
       })
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
      const updatedPrefs = await ClientUserPreferencesManager.upsertPreferences({
        user_id: walletAddress,
        theme: preferences.theme,
        notifications_enabled: preferences.notifications,
        language: preferences.language
      })

      if (!updatedPrefs) {
        throw new Error('Failed to update user preferences')
      }

      return updatedPrefs
    } catch (error) {
      secureLogger.error('Error updating user preferences', {
         timestamp: new Date().toISOString(),
         error: error instanceof Error ? error.message : 'Unknown error'
       })
      throw error
    }
  }

  /**
   * Delete user account and all associated data
   */
  static async deleteUserAccount(walletAddress: string): Promise<void> {
    try {
      // Clean up any pending sync operations
      syncLocks.delete(walletAddress)
      
      // Delete user profile (cascades to stats and preferences)
      await ClientUserProfileManager.deleteProfile(walletAddress)
      
      secureLogger.info('User account deleted successfully', {
         timestamp: new Date().toISOString()
       })
    } catch (error) {
      secureLogger.error('Error deleting user account', {
         timestamp: new Date().toISOString(),
         error: error instanceof Error ? error.message : 'Unknown error'
       })
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
   * Optimized to reduce N+1 query pattern
   */
  static async validateUserSession(walletAddress: string): Promise<AuthUser | null> {
    try {
      // Try to get all user data in parallel to reduce latency
      const [profile, stats, preferences] = await Promise.allSettled([
        ClientUserProfileManager.getProfile(walletAddress),
        ClientUserStatsManager.getStats(walletAddress),
        ClientUserPreferencesManager.getPreferences(walletAddress)
      ])

      // Profile is required for a valid session
      if (profile.status !== 'fulfilled' || !profile.value) {
        return null
      }

      return {
        id: walletAddress,
        walletAddress,
        email: profile.value.email || undefined,
        phone: profile.value.phone || undefined,
        displayName: profile.value.display_name,
        avatar: profile.value.avatar_url || undefined,
        isNewUser: false,
        profile: profile.value,
        stats: stats.status === 'fulfilled' ? stats.value || undefined : undefined,
        preferences: preferences.status === 'fulfilled' ? preferences.value || undefined : undefined
      }
    } catch (error) {
      secureLogger.error('Error validating user session', {
         timestamp: new Date().toISOString(),
         error: error instanceof Error ? error.message : 'Unknown error'
       })
      return null
    }
  }

  /**
   * Clear all sync locks (useful for cleanup)
   */
  static clearSyncLocks(): void {
    syncLocks.clear()
  }

  /**
   * Get current sync lock status (for debugging)
   */
  static getSyncLockStatus(): { activeUsers: number; users: string[] } {
    return {
      activeUsers: syncLocks.size,
      users: Array.from(syncLocks.keys()).map(() => '[REDACTED]') // Don't expose actual wallet addresses
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
    validateSession: AuthManager.validateUserSession,
    clearSyncLocks: AuthManager.clearSyncLocks,
    getSyncLockStatus: AuthManager.getSyncLockStatus
  }
}