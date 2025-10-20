'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
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

  // Get primary wallet address
  const walletAddress = wallets.length > 0 ? wallets[0].address : null
  const hasWallet = wallets.length > 0

  /**
   * Sync user data with Supabase when authentication state changes
   */
  const syncUserData = useCallback(async () => {
    if (!privyAuthenticated || !privyUser || !walletAddress) {
      setUser(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const authUser = await AuthManager.handleUserLogin(privyUser, walletAddress)
      setUser(authUser)
    } catch (err) {
      console.error('Failed to sync user data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load user data')
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [privyAuthenticated, privyUser, walletAddress])

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
      console.error('Login failed:', err)
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
      console.error('Logout failed:', err)
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
      console.error('Failed to update profile:', err)
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
      console.error('Failed to update preferences:', err)
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
      console.error('Failed to delete account:', err)
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
      console.error('Failed to refresh user data:', err)
      setError(err instanceof Error ? err.message : 'Failed to refresh user data')
    } finally {
      setIsLoading(false)
    }
  }, [walletAddress])

  /**
   * Sync user data when authentication state changes
   */
  useEffect(() => {
    if (privyReady) {
      syncUserData()
    }
  }, [privyReady, syncUserData])

  /**
   * Clear error after a delay
   */
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
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