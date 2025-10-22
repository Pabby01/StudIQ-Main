/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { UserProfile, UserProfileInsert, UserStats, UserStatsInsert, UserPreferences, UserPreferencesInsert } from './database-types'
import { secureLogger, secureLogUtils } from './secure-logger'

/**
 * Client-side database utilities that call API routes instead of using supabaseAdmin directly
 */

// Helper function to handle API errors consistently
async function handleApiResponse(response: Response, operation: string): Promise<any> {
  if (!response.ok) {
    let errorMessage = `Failed to ${operation}`
    
    try {
      const errorData = await response.json()
      errorMessage = errorData.error || errorMessage
    } catch (parseError) {
      // If we can't parse the error response, use the status text
      errorMessage = `${errorMessage}: ${response.status} ${response.statusText}`
    }
    
    throw new Error(errorMessage)
  }
  
  try {
    return await response.json()
  } catch (parseError) {
    throw new Error(`Failed to parse response for ${operation}`)
  }
}

// Helper function to handle network and other errors
function handleNetworkError(error: any, operation: string): never {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    throw new Error(`Network error during ${operation}. Please check your connection and try again.`)
  }
  
  if (error.name === 'AbortError') {
    throw new Error(`Request timeout during ${operation}. Please try again.`)
  }
  
  // Re-throw the original error if it's already a proper Error object
  if (error instanceof Error) {
    throw error
  }
  
  // Handle unknown error types
  throw new Error(`Unknown error during ${operation}: ${String(error)}`)
}

export class ClientUserProfileManager {
  static async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const response = await fetch(`/api/user/profile?user_id=${encodeURIComponent(userId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // Handle 404 as a special case - profile doesn't exist
      if (response.status === 404) {
        return null
      }

      const data = await handleApiResponse(response, 'get user profile')
      return data.profile
    } catch (error) {
      secureLogger.error('Error getting user profile', {
        userId: secureLogUtils.maskUserId(userId),
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      })
      handleNetworkError(error, 'get user profile')
    }
  }

  static async createProfile(profile: UserProfileInsert): Promise<UserProfile> {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      })

      const data = await handleApiResponse(response, 'create user profile')
      return data.profile
    } catch (error) {
      secureLogger.error('Error creating user profile', {
        userId: secureLogUtils.maskUserId(profile.user_id),
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      })
      handleNetworkError(error, 'create user profile')
    }
  }

  static async upsertProfile(profile: UserProfileInsert): Promise<UserProfile> {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      })

      const data = await handleApiResponse(response, 'upsert user profile')
      return data.profile
    } catch (error) {
      secureLogger.error('Error upserting user profile', {
        userId: secureLogUtils.maskUserId(profile.user_id),
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      })
      handleNetworkError(error, 'upsert user profile')
    }
  }

  static async updateProfile(userId: string, updates: Partial<UserProfileInsert>): Promise<UserProfile> {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId, ...updates }),
      })

      const data = await handleApiResponse(response, 'update user profile')
      return data.profile
    } catch (error) {
      secureLogger.error('Error updating user profile', {
        userId: secureLogUtils.maskUserId(userId),
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      })
      handleNetworkError(error, 'update user profile')
    }
  }

  static async deleteProfile(userId: string): Promise<void> {
    try {
      const response = await fetch(`/api/user/profile?user_id=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      await handleApiResponse(response, 'delete user profile')
    } catch (error) {
      secureLogger.error('Error deleting user profile', {
        userId: secureLogUtils.maskUserId(userId),
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      })
      handleNetworkError(error, 'delete user profile')
    }
  }
}

export class ClientUserStatsManager {
  static async getStats(userId: string): Promise<UserStats | null> {
    try {
      const response = await fetch(`/api/user/stats?user_id=${encodeURIComponent(userId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // Handle 404 as a special case - stats don't exist
      if (response.status === 404) {
        return null
      }

      const data = await handleApiResponse(response, 'get user stats')
      return data.stats
    } catch (error) {
      secureLogger.error('Error getting user stats', {
        userId: secureLogUtils.maskUserId(userId),
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      })
      handleNetworkError(error, 'get user stats')
    }
  }

  static async createStats(stats: UserStatsInsert): Promise<UserStats> {
    try {
      const response = await fetch('/api/user/stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stats),
      })

      const data = await handleApiResponse(response, 'create user stats')
      return data.stats
    } catch (error) {
      secureLogger.error('Error creating user stats', {
        userId: secureLogUtils.maskUserId(stats.user_id),
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      })
      handleNetworkError(error, 'create user stats')
    }
  }

  static async upsertStats(stats: UserStatsInsert): Promise<UserStats> {
    try {
      const response = await fetch('/api/user/stats', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...stats, upsert: true }),
      })

      const data = await handleApiResponse(response, 'upsert user stats')
      return data.stats
    } catch (error) {
      secureLogger.error('Error upserting user stats', {
        userId: secureLogUtils.maskUserId(stats.user_id),
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      })
      handleNetworkError(error, 'upsert user stats')
    }
  }
}

export class ClientUserPreferencesManager {
  static async getPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const response = await fetch(`/api/user/preferences?user_id=${encodeURIComponent(userId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // Handle 404 as a special case - preferences don't exist
      if (response.status === 404) {
        return null
      }

      const data = await handleApiResponse(response, 'get user preferences')
      return data.preferences
    } catch (error) {
      secureLogger.error('Error getting user preferences', {
        userId: secureLogUtils.maskUserId(userId),
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      })
      handleNetworkError(error, 'get user preferences')
    }
  }

  static async createPreferences(preferences: UserPreferencesInsert): Promise<UserPreferences> {
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      })

      const data = await handleApiResponse(response, 'create user preferences')
      return data.preferences
    } catch (error) {
      secureLogger.error('Error creating user preferences', {
        userId: secureLogUtils.maskUserId(preferences.user_id),
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      })
      handleNetworkError(error, 'create user preferences')
    }
  }

  static async upsertPreferences(preferences: UserPreferencesInsert): Promise<UserPreferences> {
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...preferences, upsert: true }),
      })

      const data = await handleApiResponse(response, 'upsert user preferences')
      return data.preferences
    } catch (error) {
      secureLogger.error('Error upserting user preferences', {
        userId: secureLogUtils.maskUserId(preferences.user_id),
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      })
      handleNetworkError(error, 'upsert user preferences')
    }
  }

  static async updatePreferences(userId: string, updates: Partial<UserPreferencesInsert>): Promise<UserPreferences> {
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId, ...updates }),
      })

      const data = await handleApiResponse(response, 'update user preferences')
      return data.preferences
    } catch (error) {
      secureLogger.error('Error updating user preferences', {
        userId: secureLogUtils.maskUserId(userId),
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      })
      handleNetworkError(error, 'update user preferences')
    }
  }
}

// Batch operations interface
export interface BatchUserData {
  profile?: UserProfile
  stats?: UserStats
  preferences?: UserPreferences
}

export interface BatchUpsertRequest {
  user_id: string
  profile?: UserProfileInsert
  stats?: UserStatsInsert
  preferences?: UserPreferencesInsert
}

export interface BatchUpsertResponse {
  success: boolean
  data: BatchUserData
  errors?: {
    profile?: string
    stats?: string
    preferences?: string
  }
}

/**
 * Batch operations manager for efficient user data handling
 * Eliminates N+1 query patterns by combining multiple operations
 */
export class ClientUserBatchManager {
  /**
   * Get all user data in a single request
   */
  static async getBatchUserData(userId: string): Promise<BatchUserData> {
    try {
      const response = await fetch(`/api/user/batch?user_id=${encodeURIComponent(userId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await handleApiResponse(response, 'get batch user data')
      return data.data || {}
    } catch (error) {
      secureLogger.error('Error getting batch user data', {
        userId: secureLogUtils.maskUserId(userId),
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      })
      handleNetworkError(error, 'get batch user data')
    }
  }

  /**
   * Upsert multiple user data types in a single atomic operation
   */
  static async upsertBatchUserData(request: BatchUpsertRequest): Promise<BatchUpsertResponse> {
    try {
      const response = await fetch('/api/user/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      const data = await handleApiResponse(response, 'upsert batch user data')
      return data
    } catch (error) {
      secureLogger.error('Error upserting batch user data', {
        userId: secureLogUtils.maskUserId(request.user_id),
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      })
      handleNetworkError(error, 'upsert batch user data')
    }
  }

  /**
   * Sync user data efficiently - combines profile, stats, and preferences operations
   */
  static async syncUserData(
    userId: string,
    profileData?: UserProfileInsert,
    statsData?: UserStatsInsert,
    preferencesData?: UserPreferencesInsert
  ): Promise<BatchUserData> {
    try {
      const request: BatchUpsertRequest = {
        user_id: userId
      }

      if (profileData) {
        request.profile = profileData
      }
      if (statsData) {
        request.stats = statsData
      }
      if (preferencesData) {
        request.preferences = preferencesData
      }

      const result = await this.upsertBatchUserData(request)
      
      if (!result.success && result.errors) {
        secureLogger.warn('Partial success in batch sync', {
          timestamp: new Date().toISOString(),
          errors: result.errors,
          userId: secureLogUtils.maskUserId(userId)
        })
      }

      return result.data
    } catch (error) {
      secureLogger.error('Error syncing user data', {
        userId: secureLogUtils.maskUserId(userId),
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      })
      handleNetworkError(error, 'sync user data')
    }
  }

  /**
   * Get user data with fallback to individual requests if batch fails
   */
  static async getUserDataWithFallback(userId: string): Promise<BatchUserData> {
    try {
      // Try batch operation first
      return await this.getBatchUserData(userId)
    } catch (batchError) {
      secureLogger.warn('Batch operation failed, falling back to individual requests', {
        timestamp: new Date().toISOString(),
        error: batchError instanceof Error ? batchError.message : 'Unknown error',
        userId: secureLogUtils.maskUserId(userId)
      })

      // Fallback to individual requests
      const [profileResult, statsResult, preferencesResult] = await Promise.allSettled([
        ClientUserProfileManager.getProfile(userId),
        ClientUserStatsManager.getStats(userId),
        ClientUserPreferencesManager.getPreferences(userId)
      ])

      const batchData: BatchUserData = {}

      if (profileResult.status === 'fulfilled') {
        batchData.profile = profileResult.value || undefined
      }
      if (statsResult.status === 'fulfilled') {
        batchData.stats = statsResult.value || undefined
      }
      if (preferencesResult.status === 'fulfilled') {
        batchData.preferences = preferencesResult.value || undefined
      }

      return batchData
    }
  }
}
