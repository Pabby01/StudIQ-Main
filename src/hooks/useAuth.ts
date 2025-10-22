/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { secureLogger } from '@/lib/secure-logger'
import { AuthManager, AuthUser } from '@/lib/auth-manager'
import { setPrivyToken } from '@/lib/client-database-utils'

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

// Session storage keys
const USER_CACHE_KEY = 'studiq_user_cache'
const TOKEN_CACHE_KEY = 'studiq_privy_token'
const CACHE_EXPIRY_KEY = 'studiq_cache_expiry'
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

// Helper functions for session persistence
const saveUserToCache = (user: AuthUser) => {
  try {
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user))
    localStorage.setItem(CACHE_EXPIRY_KEY, (Date.now() + CACHE_DURATION).toString())
  } catch (error) {
    secureLogger.warn('Failed to save user to cache', { error })
  }
}

const loadUserFromCache = (): AuthUser | null => {
  try {
    const cachedUser = localStorage.getItem(USER_CACHE_KEY)
    const cacheExpiry = localStorage.getItem(CACHE_EXPIRY_KEY)
    
    if (!cachedUser || !cacheExpiry) return null
    
    // Check if cache is expired
    if (Date.now() > parseInt(cacheExpiry)) {
      clearUserCache()
      return null
    }
    
    return JSON.parse(cachedUser)
  } catch (error) {
    secureLogger.warn('Failed to load user from cache', { error })
    clearUserCache()
    return null
  }
}

const clearUserCache = () => {
  try {
    localStorage.removeItem(USER_CACHE_KEY)
    localStorage.removeItem(CACHE_EXPIRY_KEY)
    localStorage.removeItem(TOKEN_CACHE_KEY)
  } catch (error) {
    secureLogger.warn('Failed to clear user cache', { error })
  }
}

const saveTokenToCache = (token: string) => {
  try {
    localStorage.setItem(TOKEN_CACHE_KEY, token)
  } catch (error) {
    secureLogger.warn('Failed to save token to cache', { error })
  }
}

const loadTokenFromCache = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_CACHE_KEY)
  } catch (error) {
    secureLogger.warn('Failed to load token from cache', { error })
    return null
  }
}

export function useAuth(): UseAuthReturn {
  const {
    ready: privyReady,
    authenticated: privyAuthenticated,
    user: privyUser,
    login: privyLogin,
    logout: privyLogout,
    getAccessToken
  } = usePrivy()
  
  const { wallets } = useWallets()
  
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Get primary wallet address
  const walletAddress = wallets.length > 0 ? wallets[0].address : null
  const hasWallet = wallets.length > 0

  /**
   * Initialize user data from cache or sync with server
   */
  const initializeUser = useCallback(async () => {
    if (isInitialized) return
    
    setIsInitialized(true)
    
    // Try to load user from cache first
    const cachedUser = loadUserFromCache()
    if (cachedUser && privyAuthenticated && walletAddress === cachedUser.walletAddress) {
      setUser(cachedUser)
      
      // Load cached token
      const cachedToken = loadTokenFromCache()
      if (cachedToken) {
        setPrivyToken(cachedToken)
      }
      
      secureLogger.info('User loaded from cache', {
        walletAddress: cachedUser.walletAddress,
        timestamp: new Date().toISOString()
      })
      return
    }
    
    // If no valid cache, proceed with sync
    if (privyAuthenticated && privyUser && walletAddress) {
      await syncUserData()
    }
  }, [isInitialized, privyAuthenticated, privyUser, walletAddress])

  /**
   * Sync user data with Supabase when authentication state changes
   */
  const syncUserData = useCallback(async () => {
    if (!privyAuthenticated || !privyUser || !walletAddress) {
      setUser(null)
      clearUserCache()
      return
    }

    secureLogger.info('Starting user sync', {
      timestamp: new Date().toISOString()
    })
    setIsLoading(true)
    setError(null)

    try {
      // Obtain Privy access token and store for API calls
      const privyToken = await (typeof getAccessToken === 'function' ? getAccessToken() : Promise.resolve(null))
      if (privyToken) {
        setPrivyToken(privyToken)
        saveTokenToCache(privyToken)
      } else {
        secureLogger.warn('Privy access token missing; proceeding without token', {
          timestamp: new Date().toISOString()
        })
        setPrivyToken(null)
      }

      const authUser = await AuthManager.handleUserLogin(privyUser, walletAddress)

      setUser(authUser)
      saveUserToCache(authUser) // Cache the user data
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
      clearUserCache()
    } finally {
      setIsLoading(false)
    }
  }, [privyAuthenticated, privyUser, walletAddress, getAccessToken])

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
      setPrivyToken(null)
      setUser(null)
      clearUserCache() // Clear cached data on logout
      setIsInitialized(false) // Reset initialization state
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
      const updatedUser = user ? {
        ...user,
        displayName: updatedProfile.display_name,
        email: updatedProfile.email || undefined,
        phone: updatedProfile.phone || undefined,
        avatar: updatedProfile.avatar_url || undefined,
        profile: updatedProfile
      } : null
      setUser(updatedUser)
      
      // Save to cache
      if (updatedUser) {
        saveUserToCache(updatedUser)
      }
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
      const updatedUser = user ? {
        ...user,
        preferences: updatedPrefs
      } : null
      setUser(updatedUser)
      
      // Save to cache
      if (updatedUser) {
        saveUserToCache(updatedUser)
      }
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
      setPrivyToken(null)
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
      clearUserCache()
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const privyToken = await (typeof getAccessToken === 'function' ? getAccessToken() : Promise.resolve(null))
      if (privyToken) {
        setPrivyToken(privyToken)
        saveTokenToCache(privyToken)
      }
      
      const authUser = await AuthManager.validateUserSession(walletAddress)
      setUser(authUser)
      
      if (authUser) {
        saveUserToCache(authUser) // Cache the refreshed user data
      } else {
        clearUserCache()
      }
    } catch (err) {
      secureLogger.error('Failed to refresh user data', err)
      setError(err instanceof Error ? err.message : 'Failed to refresh user data')
      clearUserCache()
    } finally {
      setIsLoading(false)
    }
  }, [walletAddress, getAccessToken])

  /**
   * Initialize user data when Privy is ready
   */
  useEffect(() => {
    if (privyReady && !isInitialized) {
      initializeUser()
    }
  }, [privyReady, isInitialized, initializeUser])

  /**
   * Sync user data when authentication state changes (only if not already cached)
   */
  useEffect(() => {
    if (privyReady && privyAuthenticated && walletAddress && !user && !isLoading && isInitialized) {
      syncUserData()
    }
  }, [privyReady, privyAuthenticated, walletAddress, user, isLoading, isInitialized, syncUserData])

  /**
   * Reset sync attempts when user logs out
   */
  useEffect(() => {
    if (!privyAuthenticated) {
      setUser(null)
      setError(null)
      setPrivyToken(null)
      clearUserCache()
      setIsInitialized(false)
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
