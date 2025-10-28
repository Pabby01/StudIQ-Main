/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePrivy, useWallets, useCreateWallet } from '@privy-io/react-auth'
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
  
  // Wallet management
  retryWalletCreation: () => Promise<void>
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
  
  const { createWallet } = useCreateWallet({
    onSuccess: ({ wallet }) => {
      secureLogger.info('Manual wallet creation successful', { 
        walletAddress: wallet.address,
        walletType: wallet.walletClientType 
      })
    },
    onError: (error) => {
      secureLogger.error('Manual wallet creation failed', { error })
      setError('Failed to create wallet. Please try again.')
    }
  })
  
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Get primary wallet address with Solana prioritization
  const getPrimaryWallet = () => {
    if (wallets.length === 0) return null
    
    // Log all available wallets for debugging
    secureLogger.info('🔍 WALLET SELECTION - Evaluating all available wallets:', {
      walletsCount: wallets.length,
      walletDetails: wallets.map((wallet, index) => ({
        index,
        address: wallet.address,
        addressLength: wallet.address.length,
        chainType: (wallet as any).chainType || 'unknown',
        walletClientType: wallet.walletClientType,
        connectorType: wallet.connectorType,
        isSolanaByLength: wallet.address.length >= 32 && wallet.address.length <= 44,
        isSolanaByChainType: (wallet as any).chainType === 'solana',
        startsWithNumber: /^[1-9]/.test(wallet.address),
        isEthereumFormat: wallet.address.startsWith('0x')
      }))
    })
    
    // First, try to find a Solana wallet using multiple detection methods
    const solanaWallet = wallets.find(wallet => {
      const chainType = (wallet as any).chainType
      const address = wallet.address
      
      // Method 1: Explicit chainType
      if (chainType === 'solana') return true
      
      // Method 2: Address format detection
      // Solana addresses are base58 encoded, 32-44 characters, start with 1-9 or A-Z (not 0x)
      const isSolanaFormat = !address.startsWith('0x') && 
                            address.length >= 32 && 
                            address.length <= 44 &&
                            /^[1-9A-HJ-NP-Za-km-z]+$/.test(address)
      
      return isSolanaFormat
    })
    
    if (solanaWallet) {
      secureLogger.info('🔍 WALLET SELECTION - Solana wallet found and selected as primary', {
        address: solanaWallet.address,
        chainType: (solanaWallet as any).chainType || 'detected-solana',
        walletClientType: solanaWallet.walletClientType,
        detectionMethod: (solanaWallet as any).chainType === 'solana' ? 'chainType' : 'addressFormat'
      })
      return solanaWallet
    }
    
    // Fallback to first wallet if no Solana wallet found
    secureLogger.warn('🔍 WALLET SELECTION - No Solana wallet found, using first available wallet', {
      address: wallets[0].address,
      chainType: (wallets[0] as any).chainType || 'unknown',
      walletClientType: wallets[0].walletClientType
    })
    return wallets[0]
  }
  
  const primaryWallet = getPrimaryWallet()
  const walletAddress = primaryWallet?.address || null
  const hasWallet = wallets.length > 0

  // Log detailed wallet information from Privy
  useEffect(() => {
    if (privyReady) {
      secureLogger.info('🔍 PRIVY WALLET DEBUG - Wallet state from Privy:', {
        timestamp: new Date().toISOString(),
        privyReady,
        privyAuthenticated,
        privyUserId: privyUser?.id || 'NO_USER',
        walletsCount: wallets.length,
        walletDetails: wallets.map((wallet, index) => ({
          index,
          address: wallet.address,
          walletClientType: wallet.walletClientType,
          connectorType: wallet.connectorType,
          chainType: (wallet as any).chainType || 'unknown',
          imported: wallet.imported,
          delegated: (wallet as any).delegated || false,
          recovery: (wallet as any).recovery || false
        })),
        primaryWalletAddress: walletAddress,
        hasWallet,
        privyUserData: privyUser ? {
          id: privyUser.id,
          hasEmail: !!privyUser.email?.address,
          hasPhone: !!privyUser.phone?.number,
          hasWallet: !!privyUser.wallet,
          hasLinkedAccounts: !!privyUser.linkedAccounts?.length,
          createdAt: privyUser.createdAt,
          emailAddress: privyUser.email?.address || 'NO_EMAIL',
          phoneNumber: privyUser.phone?.number || 'NO_PHONE'
        } : 'NO_PRIVY_USER_DATA'
      })
    }
  }, [privyReady, privyAuthenticated, privyUser, wallets, walletAddress, hasWallet])

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
      secureLogger.info('🔍 SYNC DEBUG - Skipping sync due to missing requirements:', {
        privyAuthenticated,
        hasPrivyUser: !!privyUser,
        walletAddress: walletAddress || 'NO_WALLET_ADDRESS',
        timestamp: new Date().toISOString()
      })
      setUser(null)
      clearUserCache()
      return
    }

    secureLogger.info('🔍 SYNC DEBUG - Starting user sync with complete data:', {
      timestamp: new Date().toISOString(),
      privyUserId: privyUser.id,
      walletAddress: walletAddress,
      privyUserFullData: {
        id: privyUser.id,
        email: privyUser.email?.address || null,
        phone: privyUser.phone?.number || null,
        wallet: privyUser.wallet ? {
          address: privyUser.wallet.address,
          chainType: privyUser.wallet.chainType,
          walletClientType: privyUser.wallet.walletClientType
        } : null,
        linkedAccounts: privyUser.linkedAccounts?.map(account => ({
          type: account.type,
          address: (account as any).address || null
        })) || [],
        createdAt: privyUser.createdAt
      }
    })
    setIsLoading(true)
    setError(null)

    try {
      // Obtain Privy access token and store for API calls
      secureLogger.info('🔍 TOKEN DEBUG - Obtaining Privy access token', {
        timestamp: new Date().toISOString(),
        getAccessTokenType: typeof getAccessToken
      })
      
      const privyToken = await (typeof getAccessToken === 'function' ? getAccessToken() : Promise.resolve(null))
      if (privyToken) {
        secureLogger.info('🔍 TOKEN DEBUG - Privy access token obtained successfully', {
          tokenLength: privyToken.length,
          tokenPrefix: privyToken.substring(0, 20) + '...',
          timestamp: new Date().toISOString()
        })
        setPrivyToken(privyToken)
        saveTokenToCache(privyToken)
      } else {
        secureLogger.warn('🔍 TOKEN DEBUG - Privy access token missing; proceeding without token', {
          timestamp: new Date().toISOString()
        })
        setPrivyToken(null)
      }

      secureLogger.info('🔍 AUTH_MANAGER DEBUG - Calling AuthManager.handleUserLogin with data:', {
        privyUserId: privyUser.id,
        walletAddress: walletAddress,
        dataBeingSent: {
          privyUser: {
            id: privyUser.id,
            email: privyUser.email?.address || null,
            phone: privyUser.phone?.number || null,
            createdAt: privyUser.createdAt,
            hasWallet: !!privyUser.wallet,
            walletData: privyUser.wallet || null
          },
          walletAddress: walletAddress,
          walletsFromHook: wallets.map(w => ({
            address: w.address,
            chainType: (w as any).chainType || 'unknown',
            walletClientType: w.walletClientType
          }))
        },
        timestamp: new Date().toISOString()
      })

      const authUser = await AuthManager.handleUserLogin(privyUser, walletAddress)

      secureLogger.info('🔍 AUTH_MANAGER DEBUG - AuthManager.handleUserLogin completed successfully with result:', {
        userId: authUser.id?.startsWith('did:privy:') ? '[PRIVY_ID]' : '[USER_ID]',
        walletAddress: authUser.walletAddress,
        isNewUser: authUser.isNewUser,
        hasProfile: !!authUser.profile,
        hasStats: !!authUser.stats,
        hasPreferences: !!authUser.preferences,
        returnedUserData: {
          id: authUser.id,
          walletAddress: authUser.walletAddress,
          displayName: authUser.displayName,
          email: authUser.email || null,
          phone: authUser.phone || null,
          avatar: authUser.avatar || null
        },
        timestamp: new Date().toISOString()
      })

      setUser(authUser)
      saveUserToCache(authUser) // Cache the user data
      secureLogger.info('🔍 SYNC DEBUG - User sync completed successfully', {
        timestamp: new Date().toISOString()
      })
    } catch (err) {
      secureLogger.error('🔍 SYNC DEBUG - Failed to sync user data', {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        privyUserId: privyUser.id,
        walletAddress: walletAddress,
        timestamp: new Date().toISOString()
      })
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

  const retryWalletCreation = useCallback(async () => {
    if (!privyUser) {
      secureLogger.warn('Cannot retry wallet creation - no Privy user')
      return
    }

    try {
      setError(null)
      setIsLoading(true)
      secureLogger.info('Manually creating wallet for user', { userId: privyUser.id })
      
      // Use the manual wallet creation hook
      await createWallet()
      
      secureLogger.info('Manual wallet creation initiated successfully')
    } catch (error) {
      secureLogger.error('Error during manual wallet creation', { error })
      setError('Failed to create wallet. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [privyUser, createWallet])

  /**
   * Update user profile
   */
  const updateProfile = useCallback(async (updates: {
    displayName?: string
    email?: string
    phone?: string
    avatar?: string
  }) => {
    if (!user?.id) {
      throw new Error('User not authenticated')
    }

    setIsLoading(true)
    setError(null)

    try {
      const updatedProfile = await AuthManager.updateUserProfile(user.id, updates)
      
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
  }, [user])

  /**
   * Update user preferences
   */
  const updatePreferences = useCallback(async (preferences: {
    theme?: 'light' | 'dark'
    notifications?: boolean
    language?: string
  }) => {
    if (!user?.id) {
      throw new Error('User not authenticated')
    }

    setIsLoading(true)
    setError(null)

    try {
      const updatedPrefs = await AuthManager.updateUserPreferences(user.id, preferences)
      
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
  }, [user])

  /**
   * Delete user account
   */
  const deleteAccount = useCallback(async () => {
    if (!user?.id) {
      throw new Error('User not authenticated')
    }

    setIsLoading(true)
    setError(null)

    try {
      await AuthManager.deleteUserAccount(user.id)
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
  }, [user, privyLogout])

  /**
   * Refresh user data from database
   */
  const refreshUser = useCallback(async () => {
    const targetUserId = user?.id || privyUser?.id
    if (!targetUserId) {
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
      
      const authUser = await AuthManager.validateUserSession(targetUserId)
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
  }, [user, privyUser, getAccessToken])

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
   * For new users, we need to wait for wallet creation which can take a few seconds
   */
  useEffect(() => {
    if (privyReady && privyAuthenticated && !user && !isLoading && isInitialized) {
      if (walletAddress) {
        // Wallet is ready, sync immediately
        secureLogger.debug('Wallet available, syncing user data', { 
          userId: privyUser?.id,
          walletAddress: walletAddress.substring(0, 8) + '...'
        })
        syncUserData()
      } else if (privyUser?.id) {
        // Wallet not ready yet, wait for it to be created
        secureLogger.debug('Waiting for wallet creation for new user', { 
          userId: privyUser.id,
          walletsCount: wallets.length,
          privyUserLinkedAccounts: privyUser.linkedAccounts?.length || 0
        })
        
        // Set up a retry mechanism for wallet creation with improved detection
        let retryCount = 0
        const maxRetries = 90 // Increased to 90 seconds for better reliability
        
        const retryInterval = setInterval(() => {
          retryCount++
          
          // Check if wallet is now available
          const currentWalletAddress = wallets.length > 0 ? wallets[0].address : null
          
          // Log more detailed information for debugging
          secureLogger.debug(`Wallet detection retry ${retryCount}/${maxRetries}`, {
            userId: privyUser.id,
            hasWallet: !!currentWalletAddress,
            walletsLength: wallets.length,
            privyReady,
            privyAuthenticated,
            walletTypes: wallets.map(w => w.walletClientType || 'unknown')
          })
          
          if (currentWalletAddress) {
            secureLogger.info('Wallet created successfully, proceeding with user sync', { 
              userId: privyUser.id,
              walletAddress: currentWalletAddress.substring(0, 8) + '...',
              retryCount
            })
            clearInterval(retryInterval)
            // Don't call syncUserData here - let the useEffect dependency change handle it
            return
          }
          
          // Try to trigger manual wallet creation if we're past halfway and still no wallet
          if (retryCount === Math.floor(maxRetries / 2) && wallets.length === 0) {
            secureLogger.warn('No wallets found at halfway point, attempting manual wallet creation', {
              userId: privyUser.id,
              retryCount
            })
            
            // Trigger manual wallet creation as fallback
            try {
              secureLogger.info('Triggering manual wallet creation fallback')
              createWallet().catch((error) => {
                secureLogger.error('Manual wallet creation fallback failed', { error })
              })
            } catch (error) {
              secureLogger.warn('Error during manual wallet creation fallback', { error })
            }
          }
          
          // Log progress every 10 seconds
          if (retryCount % 10 === 0) {
            secureLogger.debug('Still waiting for wallet creation', { 
              userId: privyUser.id,
              retryCount,
              walletsCount: wallets.length,
              maxRetries
            })
          }
          
          // Timeout after maxRetries
          if (retryCount >= maxRetries) {
            clearInterval(retryInterval)
            secureLogger.error('Wallet creation timeout - attempting final manual creation', { 
              userId: privyUser.id,
              retryCount,
              walletsCount: wallets.length,
              linkedAccountsCount: privyUser.linkedAccounts?.length || 0,
              finalWalletsLength: wallets.length,
              privyUserLinkedAccounts: privyUser.linkedAccounts?.length || 0
            })
            
            // Final attempt with manual wallet creation
            try {
              secureLogger.info('Final attempt: manual wallet creation')
              createWallet().catch((error) => {
                secureLogger.error('Final manual wallet creation attempt failed', { error })
                setError('Wallet creation failed. Please try the "Create Wallet" button or refresh the page.')
              })
            } catch (error) {
              secureLogger.error('Error during final manual wallet creation attempt', { error })
              setError('Wallet creation failed. Please try the "Create Wallet" button or refresh the page.')
            }
          }
        }, 1000) // Check every second
        
        return () => {
          clearInterval(retryInterval)
        }
      }
    }
  }, [privyReady, privyAuthenticated, walletAddress, user, isLoading, isInitialized, syncUserData, wallets, privyUser?.id, privyUser?.linkedAccounts, createWallet])

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

  // Add logging to debug authentication state
  useEffect(() => {
    console.log('useAuth: Authentication state changed:', {
      privyReady,
      privyAuthenticated,
      hasUser: !!user,
      isAuthenticated: privyAuthenticated && !!user,
      walletAddress,
      isLoading
    });
  }, [privyReady, privyAuthenticated, user, walletAddress, isLoading]);

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
    retryWalletCreation,

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
