/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { User as PrivyUser } from '@privy-io/react-auth'
import { ClientUserProfileManager, ClientUserStatsManager, ClientUserPreferencesManager } from './client-database-utils'
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
   * DEPRECATED: Sync Privy user with Supabase database with race condition protection
   * This method has been replaced by API endpoint calls in handleUserLogin
   * Keeping for reference but should not be used from client-side code
   */
  /*
  static async syncUserWithDatabase(
    privyUser: PrivyUser, 
    walletAddress: string
  ): Promise<AuthUser> {
    secureLogger.info('Starting user database sync', {
      privyUserId: privyUser.id,
      walletAddress: secureLogUtils.maskWalletAddress(walletAddress),
      hasEmail: !!privyUser.email?.address,
      hasPhone: !!privyUser.phone?.number,
      timestamp: new Date().toISOString()
    })

    // Check if there's already a sync operation in progress for this user
    const existingSync = syncLocks.get(walletAddress)
    if (existingSync) {
      secureLogger.info('Sync already in progress for wallet', {
        walletAddress: secureLogUtils.maskWalletAddress(walletAddress)
      })
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
   * DEPRECATED: Internal method to perform the actual user sync
   * This method has been replaced by API endpoint calls
   */
  /*
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
      const batchData = await ClientUserBatchManager.getBatchUserData(privyUser.id)
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
  */



  /**
   * Handle user login - sync with database via API endpoint and return user data
   */
  static async handleUserLogin(
    privyUser: PrivyUser,
    walletAddress: string
  ): Promise<AuthUser> {
    try {
      secureLogger.info('🔍 AUTH_MANAGER DEBUG - Starting user login via API endpoint with detailed data:', {
        privyUserId: privyUser.id,
        walletAddress: secureLogUtils.maskWalletAddress(walletAddress),
        authMethod: this.getAuthMethod(privyUser),
        privyUserCompleteData: {
          id: privyUser.id,
          email: privyUser.email?.address || null,
          phone: privyUser.phone?.number || null,
          createdAt: privyUser.createdAt,
          wallet: privyUser.wallet ? {
            address: privyUser.wallet.address,
            chainType: privyUser.wallet.chainType,
            walletClientType: privyUser.wallet.walletClientType,
            connectorType: privyUser.wallet.connectorType
          } : null,
          linkedAccounts: privyUser.linkedAccounts?.map(account => ({
            type: account.type,
            address: (account as any).address || null,
            verifiedAt: (account as any).verifiedAt || null
          })) || []
        },
        timestamp: new Date().toISOString()
      })

      // Get the Privy access token for authentication
      secureLogger.info('🔍 AUTH_MANAGER DEBUG - Getting Privy access token', {
        privyUserId: privyUser.id,
        hasGetAccessTokenMethod: typeof (privyUser as { getAccessToken?: () => Promise<string> }).getAccessToken === 'function'
      })
      
      const token = await (privyUser as { getAccessToken?: () => Promise<string> }).getAccessToken?.();
      
      secureLogger.info('🔍 AUTH_MANAGER DEBUG - Access token result:', {
        privyUserId: privyUser.id,
        hasToken: !!token,
        tokenLength: token?.length || 0,
        tokenPrefix: token ? token.substring(0, 20) + '...' : 'NO_TOKEN'
      })

      // Prepare data to send to API
      const apiPayload = {
        user_id: privyUser.id,
        wallet_address: walletAddress,
        display_name: this.generateDisplayName(privyUser, walletAddress),
        email: privyUser.email?.address || null,
        phone: privyUser.phone?.number || null
      }

      secureLogger.info('🔍 AUTH_MANAGER DEBUG - Preparing API call to /api/user/initialize with payload:', {
        privyUserId: privyUser.id,
        apiPayload: {
          user_id: apiPayload.user_id,
          wallet_address: apiPayload.wallet_address,
          display_name: apiPayload.display_name,
          email: apiPayload.email || 'NO_EMAIL',
          phone: apiPayload.phone || 'NO_PHONE'
        },
        headers: {
          'Content-Type': 'application/json',
          hasPrivyToken: !!token,
          hasAuthorizationHeader: !!token
        }
      })
      
      // Call the API endpoint to initialize/sync user data
      const response = await fetch('/api/user/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 
            'x-privy-token': token,
            'Authorization': `Bearer ${token}`
          })
        },
        body: JSON.stringify(apiPayload)
      });

      secureLogger.info('🔍 AUTH_MANAGER DEBUG - API response received:', {
        privyUserId: privyUser.id,
        responseStatus: response.status,
        responseOk: response.ok,
        responseHeaders: Object.fromEntries(response.headers.entries())
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        secureLogger.error('🔍 AUTH_MANAGER DEBUG - API request failed:', {
          privyUserId: privyUser.id,
          status: response.status,
          errorData,
          walletAddress: secureLogUtils.maskWalletAddress(walletAddress)
        })
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }

      const result = await response.json();
      
      secureLogger.info('🔍 AUTH_MANAGER DEBUG - API response data received:', {
        privyUserId: privyUser.id,
        responseData: {
          success: result.success,
          hasUser: !!result.user,
          hasProfile: !!result.profile,
          hasStats: !!result.stats,
          hasPreferences: !!result.preferences,
          userData: result.user ? {
            id: result.user.id,
            walletAddress: result.user.walletAddress,
            displayName: result.user.displayName,
            email: result.user.email || 'NO_EMAIL',
            phone: result.user.phone || 'NO_PHONE',
            isNewUser: result.user.isNewUser
          } : 'NO_USER_DATA',
          profileData: result.profile ? {
            id: result.profile.id,
            user_id: result.profile.user_id,
            wallet_address: result.profile.wallet_address,
            display_name: result.profile.display_name,
            email: result.profile.email || 'NO_EMAIL',
            phone: result.profile.phone || 'NO_PHONE'
          } : 'NO_PROFILE_DATA'
        }
      })
      
      // Transform API response to AuthUser format
      const authUser: AuthUser = {
        id: privyUser.id,
        walletAddress: walletAddress,
        displayName: result.profile?.display_name || this.generateDisplayName(privyUser, walletAddress),
        email: result.profile?.email || privyUser.email?.address || null,
        phone: result.profile?.phone || privyUser.phone?.number || null,
        avatar: result.profile?.avatar || this.generateAvatar(result.profile?.display_name || this.generateDisplayName(privyUser, walletAddress)),
        isNewUser: !result.profile?.created_at || new Date(result.profile.created_at).getTime() > (Date.now() - 60000), // Consider new if created within last minute
        profile: result.profile,
        stats: result.stats,
        preferences: result.preferences
      };

      secureLogger.info('🔍 AUTH_MANAGER DEBUG - Final AuthUser object created:', {
        privyUserId: privyUser.id,
        finalAuthUser: {
          id: authUser.id,
          walletAddress: authUser.walletAddress,
          displayName: authUser.displayName,
          email: authUser.email || 'NO_EMAIL',
          phone: authUser.phone || 'NO_PHONE',
          avatar: authUser.avatar || 'NO_AVATAR',
          isNewUser: authUser.isNewUser,
          hasProfile: !!authUser.profile,
          hasStats: !!authUser.stats,
          hasPreferences: !!authUser.preferences
        }
      })
      
      // Log authentication event (without sensitive data)
      secureLogger.info('🔍 AUTH_MANAGER DEBUG - User authenticated successfully via API', {
        timestamp: new Date().toISOString(),
        isNewUser: authUser.isNewUser,
        authMethod: this.getAuthMethod(privyUser),
        hasProfile: !!authUser.profile,
        hasStats: !!authUser.stats,
        hasPreferences: !!authUser.preferences
      })

      return authUser
    } catch (error) {
      secureLogger.error('🔍 AUTH_MANAGER DEBUG - Error handling user login via API', {
        timestamp: new Date().toISOString(),
        privyUserId: privyUser.id,
        walletAddress: secureLogUtils.maskWalletAddress(walletAddress),
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
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
   * Update user profile via API endpoint
   */
  static async updateUserProfile(
    userId: string,
    updates: {
      displayName?: string
      email?: string
      phone?: string
      avatar?: string
    }
  ): Promise<UserProfile> {
    try {
      secureLogger.info('Updating user profile via API endpoint', {
        userId: userId,
        hasDisplayName: !!updates.displayName,
        hasEmail: !!updates.email,
        hasPhone: !!updates.phone,
        hasAvatar: !!updates.avatar
      })

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          display_name: updates.displayName,
          email: updates.email,
          phone: updates.phone,
          avatar_url: updates.avatar
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Profile update failed with status ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.profile) {
        throw new Error('Failed to update user profile - no profile returned')
      }

      secureLogger.info('User profile updated successfully via API', {
        userId: userId,
        timestamp: new Date().toISOString()
      })

      return result.profile
    } catch (error) {
      secureLogger.error('Error updating user profile via API', {
         timestamp: new Date().toISOString(),
         error: error instanceof Error ? error.message : 'Unknown error'
       })
      throw error
    }
  }

  /**
   * Update user preferences via API endpoint
   */
  static async updateUserPreferences(
    userId: string,
    preferences: {
      theme?: 'light' | 'dark'
      notifications?: boolean
      language?: string
    }
  ): Promise<UserPreferences> {
    try {
      secureLogger.info('Updating user preferences via API endpoint', {
        userId: userId,
        hasTheme: !!preferences.theme,
        hasNotifications: preferences.notifications !== undefined,
        hasLanguage: !!preferences.language
      })

      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          theme: preferences.theme,
          notifications_enabled: preferences.notifications,
          language: preferences.language
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Preferences update failed with status ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.preferences) {
        throw new Error('Failed to update user preferences - no preferences returned')
      }

      secureLogger.info('User preferences updated successfully via API', {
        userId: userId,
        timestamp: new Date().toISOString()
      })

      return result.preferences
    } catch (error) {
      secureLogger.error('Error updating user preferences via API', {
         timestamp: new Date().toISOString(),
         error: error instanceof Error ? error.message : 'Unknown error'
       })
      throw error
    }
  }

  /**
   * Delete user account and all associated data via API endpoint
   */
  static async deleteUserAccount(userId: string): Promise<void> {
    try {
      secureLogger.info('Deleting user account via API endpoint', {
        userId: userId,
        timestamp: new Date().toISOString()
      })

      // Clean up any pending sync operations
      // We cannot guarantee walletAddress here; clear locks to be safe
      syncLocks.clear()
      
      const response = await fetch('/api/user/profile', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Account deletion failed with status ${response.status}`);
      }
      
      secureLogger.info('User account deleted successfully via API', {
         userId: userId,
         timestamp: new Date().toISOString()
       })
    } catch (error) {
      secureLogger.error('Error deleting user account via API', {
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
  static async validateUserSession(userId: string): Promise<AuthUser | null> {
    try {
      // Try to get all user data in parallel to reduce latency
      const [profile, stats, preferences] = await Promise.allSettled([
        ClientUserProfileManager.getProfile(userId),
        ClientUserStatsManager.getStats(userId),
        ClientUserPreferencesManager.getPreferences(userId)
      ])

      // Profile is required for a valid session
      if (profile.status !== 'fulfilled' || !profile.value) {
        return null
      }

      const walletAddr = profile.value.wallet_address || userId

      return {
        id: userId,
        walletAddress: walletAddr,
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