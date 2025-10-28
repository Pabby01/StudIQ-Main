/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { secureLogger } from '@/lib/secure-logger'

interface OptimizedAuthState {
  isLoading: boolean
  isAuthenticated: boolean
  user: any
  walletAddress: string | null
  error: string | null
  progress: number
  stage: 'idle' | 'connecting' | 'creating_wallet' | 'initializing_user' | 'complete'
}

interface UseOptimizedAuthReturn extends OptimizedAuthState {
  login: () => Promise<void>
  logout: () => Promise<void>
  retryWalletCreation: () => Promise<void>
}

/**
 * Optimized authentication hook that reduces account creation time
 * Features:
 * - Immediate wallet creation without waiting for Privy auto-creation
 * - Background user initialization
 * - Progress tracking for better UX
 * - Reduced timeout from 90s to 15s
 */
export function useOptimizedAuth(): UseOptimizedAuthReturn {
  const { 
    ready, 
    authenticated, 
    user, 
    login: privyLogin, 
    logout: privyLogout,
    createWallet,
    linkWallet
  } = usePrivy()

  const [state, setState] = useState<OptimizedAuthState>({
    isLoading: false,
    isAuthenticated: false,
    user: null,
    walletAddress: null,
    error: null,
    progress: 0,
    stage: 'idle'
  })

  // Extract wallet address from user
  const getWalletAddress = useCallback((user: any): string | null => {
    if (!user?.wallet?.address) {
      // Check linked wallets
      const linkedWallet = user?.linkedAccounts?.find((account: any) => 
        account.type === 'wallet' && account.address
      )
      return linkedWallet?.address || null
    }
    return user.wallet.address
  }, [])

  // Initialize user data in background
  const initializeUserData = useCallback(async (userId: string, walletAddress: string) => {
    try {
      setState(prev => ({ ...prev, stage: 'initializing_user', progress: 70 }))
      
      const response = await fetch('/api/user/initialize-optimized', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          wallet_address: walletAddress,
          display_name: `User ${userId.slice(-8)}`,
          email: user?.email?.address || null,
          phone: user?.phone?.number || null
        })
      })

      if (!response.ok) {
        throw new Error(`User initialization failed: ${response.statusText}`)
      }

      const result = await response.json()
      secureLogger.info('🚀 OPTIMIZED - User initialization completed:', {
        userId,
        performance: result.performance,
        isNewUser: result.user?.isNewUser
      })

      setState(prev => ({ 
        ...prev, 
        stage: 'complete', 
        progress: 100,
        error: null
      }))

      return result
    } catch (error) {
      secureLogger.error('🚀 OPTIMIZED - User initialization failed:', error)
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'User initialization failed',
        stage: 'complete',
        progress: 100
      }))
      throw error
    }
  }, [user])

  // Optimized wallet creation with immediate action
  const createWalletOptimized = useCallback(async (userId: string): Promise<string | null> => {
    try {
      setState(prev => ({ ...prev, stage: 'creating_wallet', progress: 30 }))
      
      secureLogger.info('🚀 OPTIMIZED - Starting immediate wallet creation for user:', userId)
      
      // Try to create wallet immediately instead of waiting for auto-creation
      const wallet = await createWallet()
      
      if (wallet?.address) {
        secureLogger.info('🚀 OPTIMIZED - Wallet created successfully:', {
          userId,
          walletAddress: wallet.address,
          method: 'immediate_creation'
        })
        setState(prev => ({ ...prev, progress: 60 }))
        return wallet.address
      }

      // Fallback: Check if wallet was auto-created
      let attempts = 0
      const maxAttempts = 5 // Reduced from 30 attempts (90s) to 5 attempts (15s)
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 3000)) // 3s intervals
        
        const currentUser = user || (await new Promise(resolve => {
          // Get fresh user data
          setTimeout(() => resolve(user), 100)
        }))
        
        const walletAddress = getWalletAddress(currentUser)
        if (walletAddress) {
          secureLogger.info('🚀 OPTIMIZED - Wallet found via auto-creation:', {
            userId,
            walletAddress,
            attempts: attempts + 1,
            method: 'auto_creation_fallback'
          })
          setState(prev => ({ ...prev, progress: 60 }))
          return walletAddress
        }
        
        attempts++
        setState(prev => ({ ...prev, progress: 30 + (attempts * 5) }))
      }

      throw new Error('Wallet creation timeout after 15 seconds')
    } catch (error) {
      secureLogger.error('🚀 OPTIMIZED - Wallet creation failed:', error)
      throw error
    }
  }, [createWallet, user, getWalletAddress])

  // Optimized login process
  const login = useCallback(async () => {
    try {
      setState(prev => ({ 
        ...prev, 
        isLoading: true, 
        error: null, 
        stage: 'connecting',
        progress: 10
      }))

      secureLogger.info('🚀 OPTIMIZED - Starting login process')
      
      // Step 1: Authenticate with Privy
      await privyLogin()
      setState(prev => ({ ...prev, progress: 20 }))

      // Wait for authentication to complete
      let authAttempts = 0
      while (!authenticated && authAttempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 500))
        authAttempts++
      }

      if (!authenticated || !user?.id) {
        throw new Error('Authentication failed')
      }

      // Step 2: Handle wallet creation
      let walletAddress = getWalletAddress(user)
      
      if (!walletAddress) {
        walletAddress = await createWalletOptimized(user.id)
      } else {
        setState(prev => ({ ...prev, progress: 60 }))
      }

      if (!walletAddress) {
        throw new Error('Failed to create or find wallet')
      }

      // Step 3: Initialize user data in background (non-blocking)
      initializeUserData(user.id, walletAddress).catch(error => {
        secureLogger.warn('Background user initialization failed:', error)
        // Don't block login for this
      })

      setState(prev => ({
        ...prev,
        isLoading: false,
        isAuthenticated: true,
        user,
        walletAddress,
        stage: 'complete',
        progress: 100
      }))

      secureLogger.info('🚀 OPTIMIZED - Login completed successfully:', {
        userId: user.id,
        walletAddress,
        hasWallet: !!walletAddress
      })

    } catch (error) {
      secureLogger.error('🚀 OPTIMIZED - Login failed:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
        stage: 'idle',
        progress: 0
      }))
    }
  }, [privyLogin, authenticated, user, getWalletAddress, createWalletOptimized, initializeUserData])

  // Logout
  const logout = useCallback(async () => {
    try {
      await privyLogout()
      setState({
        isLoading: false,
        isAuthenticated: false,
        user: null,
        walletAddress: null,
        error: null,
        progress: 0,
        stage: 'idle'
      })
    } catch (error) {
      secureLogger.error('Logout failed:', error)
    }
  }, [privyLogout])

  // Retry wallet creation
  const retryWalletCreation = useCallback(async () => {
    if (!user?.id) return
    
    try {
      setState(prev => ({ ...prev, error: null, isLoading: true }))
      const walletAddress = await createWalletOptimized(user.id)
      
      if (walletAddress) {
        setState(prev => ({ ...prev, walletAddress, isLoading: false }))
        // Initialize user data in background
        initializeUserData(user.id, walletAddress).catch(console.warn)
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Wallet creation failed',
        isLoading: false
      }))
    }
  }, [user, createWalletOptimized, initializeUserData])

  // Update state when Privy state changes
  useEffect(() => {
    if (ready && authenticated && user) {
      const walletAddress = getWalletAddress(user)
      setState(prev => ({
        ...prev,
        isAuthenticated: true,
        user,
        walletAddress
      }))
    } else if (ready && !authenticated) {
      setState(prev => ({
        ...prev,
        isAuthenticated: false,
        user: null,
        walletAddress: null
      }))
    }
  }, [ready, authenticated, user, getWalletAddress])

  return {
    ...state,
    login,
    logout,
    retryWalletCreation
  }
}