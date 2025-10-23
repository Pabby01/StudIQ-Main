import { useState, useEffect, useCallback } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { secureLogger } from '@/lib/secure-logger'

// Interfaces for user data
export interface UserProfile {
  id: string
  wallet_address?: string
  display_name: string
  email?: string
  phone?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface UserStats {
  user_id: string
  total_points: number
  total_cashback: number
  level: number
  streak_days: number
  completed_lessons: number
  portfolio_value: number
  last_activity: string
}

export interface UserPreferences {
  user_id: string
  theme: 'light' | 'dark'
  notifications: boolean
  language: string
  privacy_level: string
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

// Custom hook for fetching and managing user data
export function useUserData(): UseUserDataReturn {
  const { user, authenticated } = usePrivy()
  const [userData, setUserData] = useState<UserData>({
    profile: null,
    stats: null,
    preferences: null,
    transactions: [],
    isLoading: true,
    error: null,
    lastUpdated: null
  })

  const userId = user?.id

  // Fetch user data from API
  const fetchUserData = useCallback(async (userId: string) => {
    try {
      setUserData(prev => ({ ...prev, isLoading: true, error: null }))

      // Fetch all user data in parallel
      const [profileResponse, statsResponse, preferencesResponse, transactionsResponse] = await Promise.all([
        fetch(`/api/user/profile?user_id=${userId}`),
        fetch(`/api/user/stats?user_id=${userId}`),
        fetch(`/api/user/preferences?user_id=${userId}`),
        fetch(`/api/user/transactions?user_id=${userId}`)
      ])

      // Check for errors
      const responses = [profileResponse, statsResponse, preferencesResponse, transactionsResponse]
      const errors = responses.filter(response => !response.ok)
      
      if (errors.length > 0) {
        throw new Error(`Failed to fetch user data: ${errors.map(e => e.statusText).join(', ')}`)
      }

      // Parse responses
      const [profileData, statsData, preferencesData, transactionsData] = await Promise.all([
        profileResponse.json(),
        statsResponse.json(),
        preferencesResponse.json(),
        transactionsResponse.json()
      ])

      setUserData({
        profile: profileData.profile || null,
        stats: statsData.stats || null,
        preferences: preferencesData.preferences || null,
        transactions: transactionsData.transactions || [],
        isLoading: false,
        error: null,
        lastUpdated: new Date()
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user data'
      secureLogger.error('Error fetching user data', { userId, error: errorMessage })
      setUserData(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }))
    }
  }, [])

  // Refresh data
  const refreshData = useCallback(async () => {
    if (userId && authenticated) {
      await fetchUserData(userId)
    }
  }, [userId, authenticated, fetchUserData])

  // Update profile
  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!userId) return

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          ...updates
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      const { profile } = await response.json()
      setUserData(prev => ({
        ...prev,
        profile,
        lastUpdated: new Date()
      }))

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile'
      secureLogger.error('Error updating profile', { userId, error: errorMessage })
      setUserData(prev => ({
        ...prev,
        error: errorMessage
      }))
    }
  }, [userId])

  // Update preferences
  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    if (!userId) return

    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
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

  // Fetch data when user is authenticated
  useEffect(() => {
    if (userId && authenticated) {
      fetchUserData(userId)
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