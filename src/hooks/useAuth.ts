'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { secureLogger } from '@/lib/secure-logger'
import { AuthManager, AuthUser } from '@/lib/auth-manager'

export interface UseAuthReturn {
  // Authentication state
  isReady: boolean
  isAuthenticated: boolean
  isLoading: boolean
  user: AuthUser | null
  error: string | null

  // Authentication actions
  login: () => Promise<void>
  logout: () => Promise<void>
  
  // User management
  updateProfile: (updates: {
    displayName?: string
    email?: string
    phone?: string
    avatar?: string
  }) => Promise<void>
  
  updatePreferences: (preferences: {
    theme?: 'light' | 'dark'
    notifications?: boolean
    language?: string
  }) => Promise<void>
  
  deleteAccount: () => Promise<void>
  refreshUser: () => Promise<void>

  // Wallet information
  walletAddress: string | null
  hasWallet: boolean
}

export function useAuth(): UseAuthReturn {
  const {
    ready: privyReady,
    authenticated: privyAuthenticated,
    user: privyUser,
    login: privyLogin,
    logout: privyLogout
  } = usePrivy()
  
  const { wallets } = useWallets()
  
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncAttempts, setSyncAttempts] = useState(0)
  const [lastSyncTime, setLastSyncTime] = useState<number>(0)

  // Get primary wallet address
  const walletAddress = wallets.length > 0 ? wallets[0].address : null
  const hasWallet = wallets.length > 0

  /**
   * Sync user data with Supabase when authentication state changes
   */
  const syncUserData = useCallback(async () => {
    // Prevent infinite loops and rate limiting
    const now = Date.now()
    const timeSinceLastSync = now - lastSyncTime
    const MIN_SYNC_INTERVAL = 2000 // 2 seconds minimum between syncs
    const MAX_SYNC_ATTEMPTS = 3

    if (timeSinceLastSync < MIN_SYNC_INTERVAL && syncAttempts > 0) {
      secureLogger.info('Skipping sync - too soon since last attempt', {
        timeSinceLastSync,
        minInterval: MIN_SYNC_INTERVAL,
        syncAttempts,
        timestamp: new Date().toISOString()
      })
      return
    }

    if (syncAttempts >= MAX_SYNC_ATTEMPTS) {
      secureLogger.warn('Max sync attempts reached, stopping', {
        syncAttempts,
        maxAttempts: MAX_SYNC_ATTEMPTS,
        timestamp: new Date().toISOString()
      })
      setError('Authentication failed after multiple attempts. Please refresh the page.')
      return
    }

    if (!privyAuthenticated || !privyUser || !walletAddress) {
      setUser(null)
      setSyncAttempts(0)
      return
    }

    secureLogger.info('Starting user sync attempt', {
      currentAttempt: syncAttempts + 1,
      maxAttempts: MAX_SYNC_ATTEMPTS,
      timestamp: new Date().toISOString()
    })
    setIsLoading(true)
    setError(null)
    setLastSyncTime(now)
    setSyncAttempts(prev => prev + 1)

    // Add timeout to prevent hanging
    const syncTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Authentication timeout')), 15000)
    )

    try {
      const authUser = await Promise.race([
        AuthManager.handleUserLogin(privyUser, walletAddress),
        syncTimeout
      ]) as AuthUser

      setUser(authUser)
      setSyncAttempts(0) // Reset on success
      secureLogger.info('User sync completed successfully', {
        timestamp: new Date().toISOString()
      })
    } catch (err) {
      secureLogger.error('Failed to sync user data', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load user data'
      
      // Check if it's an RLS policy error
      if (errorMessage.includes('RLS') || errorMessage.includes('policy') || errorMessage.includes('42501')) {
        setError('Database access issue detected. Please apply the RLS policy fix in Supabase dashboard.')
      } else if (errorMessage.includes('timeout')) {
        setError('Authentication is taking too long. Please check your connection and try again.')
      } else {
        setError(errorMessage)
      }
      
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [privyAuthenticated, privyUser, walletAddress, syncAttempts, lastSyncTime])

  /**
   * Handle user login
   */
  const login = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      await privyLogin()
      // User sync will happen automatically via useEffect
    } catch (err) {
      secureLogger.error('Login failed', err)
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }, [privyLogin])

  /**
   * Handle user logout
   */
  const logout = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Clean up Supabase data before Privy logout
      if (walletAddress) {
        await AuthManager.handleUserLogout(walletAddress)
      }
      
      await privyLogout()
      setUser(null)
    } catch (err) {
      secureLogger.error('Logout failed', err)
      setError(err instanceof Error ? err.message : 'Logout failed')
    } finally {
      setIsLoading(false)
    }
  }, [privyLogout, walletAddress])

  /**
   * Update user profile
   */
  const updateProfile = useCallback(async (updates: {
    displayName?: string
    email?: string
    phone?: string
    avatar?: string
  }) => {
    if (!walletAddress || !user) {
      throw new Error('User not authenticated')
    }

    setIsLoading(true)
    setError(null)

    try {
      const updatedProfile = await AuthManager.updateUserProfile(walletAddress, updates)
      
      // Update local user state
      setUser(prev => prev ? {
        ...prev,
        displayName: updatedProfile.display_name,
        email: updatedProfile.email || undefined,
        phone: updatedProfile.phone || undefined,
        avatar: updatedProfile.avatar_url || undefined,
        profile: updatedProfile
      } : null)
    } catch (err) {
      secureLogger.error('Failed to update profile', err)
      setError(err instanceof Error ? err.message : 'Failed to update profile')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [walletAddress, user])

  /**
   * Update user preferences
   */
  const updatePreferences = useCallback(async (preferences: {
    theme?: 'light' | 'dark'
    notifications?: boolean
    language?: string
  }) => {
    if (!walletAddress || !user) {
      throw new Error('User not authenticated')
    }

    setIsLoading(true)
    setError(null)

    try {
      const updatedPrefs = await AuthManager.updateUserPreferences(walletAddress, preferences)
      
      // Update local user state
      setUser(prev => prev ? {
        ...prev,
        preferences: updatedPrefs
      } : null)
    } catch (err) {
      secureLogger.error('Failed to update preferences', err)
      setError(err instanceof Error ? err.message : 'Failed to update preferences')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [walletAddress, user])

  /**
   * Delete user account
   */
  const deleteAccount = useCallback(async () => {
    if (!walletAddress) {
      throw new Error('User not authenticated')
    }

    setIsLoading(true)
    setError(null)

    try {
      await AuthManager.deleteUserAccount(walletAddress)
      await privyLogout()
      setUser(null)
    } catch (err) {
      secureLogger.error('Failed to delete account', err)
      setError(err instanceof Error ? err.message : 'Failed to delete account')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [walletAddress, privyLogout])

  /**
   * Refresh user data from database
   */
  const refreshUser = useCallback(async () => {
    if (!walletAddress) {
      setUser(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const authUser = await AuthManager.validateUserSession(walletAddress)
      setUser(authUser)
    } catch (err) {
      secureLogger.error('Failed to refresh user data', error)
      setError(err instanceof Error ? err.message : 'Failed to refresh user data')
    } finally {
      setIsLoading(false)
    }
  }, [walletAddress])

  /**
   * Sync user data when authentication state changes
   */
  useEffect(() => {
    if (privyReady && privyAuthenticated && walletAddress && !user && !isLoading) {
      syncUserData()
    }
  }, [privyReady, privyAuthenticated, walletAddress, user, isLoading, syncUserData])

  /**
   * Reset sync attempts when user logs out
   */
  useEffect(() => {
    if (!privyAuthenticated) {
      setSyncAttempts(0)
      setLastSyncTime(0)
      setUser(null)
      setError(null)
    }
  }, [privyAuthenticated])

  /**
   * Clear error after a delay
   */
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 10000) // Increased to 10 seconds for better UX
      return () => clearTimeout(timer)
    }
  }, [error])

  return {
    // Authentication state
    isReady: privyReady,
    isAuthenticated: privyAuthenticated && !!user,
    isLoading,
    user,
    error,

    // Authentication actions
    login,
    logout,

    // User management
    updateProfile,
    updatePreferences,
    deleteAccount,
    refreshUser,

    // Wallet information
    walletAddress,
    hasWallet
  }
}
