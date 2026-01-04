import { useWalletAuth } from '@/hooks/useWalletAuth'
import { useCallback, useEffect, useState } from 'react'
import { secureLogger } from '@/lib/secure-logger'
import { buildHeaders, setWalletAddress } from '@/lib/client-database-utils'
import { patchProfile, validateProfileUpdate } from '@/lib/user-data'

// Helper function to convert user-data.ts UserProfile to hook UserProfile
function convertUserProfile(profile: import('@/lib/user-data').UserProfile): UserProfile {
  return {
    id: profile.id,
    user_id: profile.walletAddress,
    display_name: profile.displayName,
    email: profile.email || '',
    wallet_address: profile.walletAddress,
    avatar_url: profile.avatarUrl || profile.avatar || '',
    bio: profile.bio || '',
    level: 1, // Default level, will be updated from stats
    total_points: 0, // Default points, will be updated from stats
    created_at: profile.createdAt.toISOString(),
    updated_at: profile.updatedAt.toISOString()
  }
}

export interface UserProfile {
  id: string
  user_id: string
  display_name: string
  email: string
  wallet_address: string
  avatar_url: string
  bio: string
  level: number
  total_points: number
  created_at: string
  updated_at: string
}

export interface UserStats {
  id: string
  user_id: string
  total_points: number
  total_cashback: number
  level: number
  completed_lessons: number
  portfolio_value: number
  streak_days: number
  last_activity: string
  created_at: string
  updated_at: string
}

export interface UserPreferences {
  id: string
  user_id: string
  theme: 'light' | 'dark'
  notifications_enabled: boolean
  language: string
  currency: string
  privacy_level: 'public' | 'friends' | 'private'
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  type: 'purchase' | 'reward' | 'cashback' | 'transfer'
  amount: number
  description: string
  created_at: string
  status: 'completed' | 'pending' | 'failed'
}

export interface UserData {
  profile: UserProfile | null
  stats: UserStats | null
  preferences: UserPreferences | null
  transactions: Transaction[]
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
}

export interface UseUserDataReturn extends UserData {
  refreshData: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>
}

export function useUserData(): UseUserDataReturn {
  const { address, connected } = useWalletAuth()
  const [userData, setUserData] = useState<UserData>({
    profile: null,
    stats: null,
    preferences: null,
    transactions: [],
    isLoading: true,
    error: null,
    lastUpdated: null
  })

  const userId = address
  const authenticated = connected

  // Set wallet address for API auth headers when wallet connects
  useEffect(() => {
    if (address) {
      setWalletAddress(address)
      secureLogger.info('Wallet address set for API authentication', {
        address: address.substring(0, 8) + '...'
      })
    } else {
      setWalletAddress(null)
    }
  }, [address])

  // Helper: safely parse JSON, treating 404 as empty
  const parseJSONSafe = useCallback(async (response: Response) => {
    if (response.status === 404) {
      return null
    }
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(text || response.statusText || 'Failed to fetch')
    }
    return response.json()
  }, [])

  const fetchUserData = useCallback(async (uid: string) => {
    try {
      setUserData(prev => ({ ...prev, isLoading: true, error: null }))

      const headers = buildHeaders()

      // Log the headers to debug authentication
      secureLogger.info('Fetching user data with headers', {
        userId: uid,
        hasAuthHeader: !!headers.Authorization,
        hasPrivyToken: !!headers['x-privy-token']
      })

      // If no auth headers, wait a bit and try again
      if (!headers.Authorization && !headers['x-privy-token']) {
        secureLogger.warn('No authentication headers available, waiting and retrying...', { userId: uid })
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Try building headers again
        const retryHeaders = buildHeaders()
        secureLogger.info('Retrying with headers', {
          userId: uid,
          hasAuthHeader: !!retryHeaders.Authorization,
          hasPrivyToken: !!retryHeaders['x-privy-token']
        })
      }

      const [profileResponse, statsResponse, preferencesResponse, transactionsResponse] = await Promise.all([
        fetch(`/api/user/profile?user_id=${encodeURIComponent(uid)}`, { headers }),
        fetch(`/api/user/stats?user_id=${encodeURIComponent(uid)}`, { headers }),
        fetch(`/api/user/preferences?user_id=${encodeURIComponent(uid)}`, { headers }),
        fetch(`/api/user/transactions?user_id=${encodeURIComponent(uid)}`, { headers })
      ])

      // Log response statuses for debugging
      secureLogger.info('User data API responses', {
        profileStatus: profileResponse.status,
        statsStatus: statsResponse.status,
        preferencesStatus: preferencesResponse.status,
        transactionsStatus: transactionsResponse.status
      })

      // Safely parse each response
      const profileData = await parseJSONSafe(profileResponse)
      const statsData = await parseJSONSafe(statsResponse)
      const preferencesData = await parseJSONSafe(preferencesResponse)
      const transactionsData = await parseJSONSafe(transactionsResponse)

      setUserData({
        profile: profileData?.profile || null,
        stats: statsData?.stats || null,
        preferences: preferencesData?.preferences || null,
        transactions: transactionsData?.transactions || [],
        isLoading: false,
        error: null,
        lastUpdated: new Date()
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user data'
      secureLogger.error('Error fetching user data', { userId: uid, error: errorMessage })
      setUserData(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }))
    }
  }, [parseJSONSafe])

  // Refresh data
  const refreshData = useCallback(async () => {
    if (userId && authenticated) {
      await fetchUserData(userId)
    }
  }, [userId, authenticated, fetchUserData])

  // Update profile
  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!userId) {
      secureLogger.error('updateProfile called without userId')
      throw new Error('User ID is required')
    }

    try {
      // Validate updates
      const validation = validateProfileUpdate(updates)
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
      }

      // Use the comprehensive patch function
      const updatedProfile = await patchProfile(userId, updates, {
        validate: false, // Already validated above
        preserveSocial: true // Preserve existing social fields
      })

      if (updatedProfile) {
        setUserData(prev => ({
          ...prev,
          profile: convertUserProfile(updatedProfile),
          lastUpdated: new Date()
        }))
      } else {
        throw new Error('Failed to update profile')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile'
      secureLogger.error('Error updating profile', { userId, error: errorMessage })
      setUserData(prev => ({
        ...prev,
        error: errorMessage
      }))
      throw error
    }
  }, [userId])

  // Update preferences
  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    if (!userId) return

    try {
      const headers = buildHeaders()
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({
          user_id: userId,
          ...updates
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update preferences')
      }

      const { preferences } = await response.json()
      setUserData(prev => ({
        ...prev,
        preferences,
        lastUpdated: new Date()
      }))

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update preferences'
      secureLogger.error('Error updating preferences', { userId, error: errorMessage })
      setUserData(prev => ({
        ...prev,
        error: errorMessage
      }))
    }
  }, [userId])

  // Fetch data when user is authenticated and token is available
  useEffect(() => {
    if (userId && authenticated) {
      // Add a small delay to ensure Privy token is set
      const timer = setTimeout(() => {
        fetchUserData(userId)
      }, 1000) // Increased delay to 1 second

      return () => clearTimeout(timer)
    } else {
      setUserData({
        profile: null,
        stats: null,
        preferences: null,
        transactions: [],
        isLoading: false,
        error: null,
        lastUpdated: null
      })
    }
  }, [userId, authenticated, fetchUserData])

  return {
    ...userData,
    refreshData,
    updateProfile,
    updatePreferences
  }
}