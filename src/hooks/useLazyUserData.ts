/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react'
import { secureLogger } from '@/lib/secure-logger'

interface LazyUserData {
  portfolio?: any
  transactions?: any[]
  achievements?: any[]
  preferences?: any
  stats?: any
  socialConnections?: any[]
}

interface UseLazyUserDataState {
  data: LazyUserData
  loading: {
    portfolio: boolean
    transactions: boolean
    achievements: boolean
    preferences: boolean
    stats: boolean
    socialConnections: boolean
  }
  errors: {
    portfolio?: string
    transactions?: string
    achievements?: string
    preferences?: string
    stats?: string
    socialConnections?: string
  }
  loadingProgress: number
}

interface UseLazyUserDataReturn extends UseLazyUserDataState {
  refreshData: (dataType?: keyof LazyUserData) => Promise<void>
  preloadCriticalData: () => Promise<void>
}

/**
 * Hook for lazy loading non-critical user data in the background
 * This prevents blocking the initial user experience while still providing rich data
 */
export function useLazyUserData(
  userId: string | null, 
  walletAddress: string | null,
  enabled: boolean = true
): UseLazyUserDataReturn {
  
  const [state, setState] = useState<UseLazyUserDataState>({
    data: {},
    loading: {
      portfolio: false,
      transactions: false,
      achievements: false,
      preferences: false,
      stats: false,
      socialConnections: false
    },
    errors: {},
    loadingProgress: 0
  })

  // Calculate loading progress
  const calculateProgress = useCallback((loading: typeof state.loading) => {
    const totalItems = Object.keys(loading).length
    const loadingItems = Object.values(loading).filter(Boolean).length
    return totalItems > 0 ? ((totalItems - loadingItems) / totalItems) * 100 : 100
  }, [])

  // Generic data loader with error handling
  const loadData = useCallback(async <T>(
    dataType: keyof LazyUserData,
    loader: () => Promise<T>,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<T | null> => {
    if (!userId || !enabled) return null

    try {
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, [dataType]: true },
        errors: { ...prev.errors, [dataType]: undefined }
      }))

      const startTime = Date.now()
      const result = await loader()
      const loadTime = Date.now() - startTime

      secureLogger.info(`🔄 Lazy loaded ${dataType}:`, {
        userId,
        loadTime,
        priority,
        hasData: !!result
      })

      setState(prev => {
        const newLoading = { ...prev.loading, [dataType]: false }
        return {
          ...prev,
          data: { ...prev.data, [dataType]: result },
          loading: newLoading,
          loadingProgress: calculateProgress(newLoading)
        }
      })

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      secureLogger.warn(`🔄 Failed to lazy load ${dataType}:`, {
        userId,
        error: errorMessage,
        priority
      })

      setState(prev => {
        const newLoading = { ...prev.loading, [dataType]: false }
        return {
          ...prev,
          loading: newLoading,
          errors: { ...prev.errors, [dataType]: errorMessage },
          loadingProgress: calculateProgress(newLoading)
        }
      })

      return null
    }
  }, [userId, enabled, calculateProgress])

  // Data loaders for different types
  const loadPortfolio = useCallback(() => 
    loadData('portfolio', async () => {
      if (!walletAddress) throw new Error('No wallet address')
      
      const response = await fetch(`/api/portfolio/${walletAddress}`)
      if (!response.ok) throw new Error('Failed to fetch portfolio')
      return response.json()
    }, 'high'), 
  [loadData, walletAddress])

  const loadTransactions = useCallback(() =>
    loadData('transactions', async () => {
      if (!walletAddress) throw new Error('No wallet address')
      
      const response = await fetch(`/api/transactions/${walletAddress}?limit=50`)
      if (!response.ok) throw new Error('Failed to fetch transactions')
      return response.json()
    }, 'medium'),
  [loadData, walletAddress])

  const loadAchievements = useCallback(() =>
    loadData('achievements', async () => {
      const response = await fetch(`/api/user/${userId}/achievements`)
      if (!response.ok) throw new Error('Failed to fetch achievements')
      return response.json()
    }, 'low'),
  [loadData, userId])

  const loadPreferences = useCallback(() =>
    loadData('preferences', async () => {
      const response = await fetch(`/api/user/${userId}/preferences`)
      if (!response.ok) throw new Error('Failed to fetch preferences')
      return response.json()
    }, 'medium'),
  [loadData, userId])

  const loadStats = useCallback(() =>
    loadData('stats', async () => {
      const response = await fetch(`/api/user/${userId}/stats`)
      if (!response.ok) throw new Error('Failed to fetch stats')
      return response.json()
    }, 'medium'),
  [loadData, userId])

  const loadSocialConnections = useCallback(() =>
    loadData('socialConnections', async () => {
      const response = await fetch(`/api/user/${userId}/social`)
      if (!response.ok) throw new Error('Failed to fetch social connections')
      return response.json()
    }, 'low'),
  [loadData, userId])

  // Preload critical data immediately
  const preloadCriticalData = useCallback(async () => {
    if (!userId || !enabled) return

    secureLogger.info('🔄 Starting critical data preload:', { userId })
    
    // Load high-priority data first
    await Promise.allSettled([
      loadPortfolio(),
      loadPreferences()
    ])

    // Then load medium-priority data
    setTimeout(() => {
      Promise.allSettled([
        loadStats(),
        loadTransactions()
      ])
    }, 1000)

    // Finally load low-priority data
    setTimeout(() => {
      Promise.allSettled([
        loadAchievements(),
        loadSocialConnections()
      ])
    }, 3000)
  }, [userId, enabled, loadPortfolio, loadPreferences, loadStats, loadTransactions, loadAchievements, loadSocialConnections])

  // Refresh specific data type or all data
  const refreshData = useCallback(async (dataType?: keyof LazyUserData) => {
    if (!userId || !enabled) return

    if (dataType) {
      // Refresh specific data type
      switch (dataType) {
        case 'portfolio':
          await loadPortfolio()
          break
        case 'transactions':
          await loadTransactions()
          break
        case 'achievements':
          await loadAchievements()
          break
        case 'preferences':
          await loadPreferences()
          break
        case 'stats':
          await loadStats()
          break
        case 'socialConnections':
          await loadSocialConnections()
          break
      }
    } else {
      // Refresh all data
      await preloadCriticalData()
    }
  }, [userId, enabled, loadPortfolio, loadTransactions, loadAchievements, loadPreferences, loadStats, loadSocialConnections, preloadCriticalData])

  // Auto-load data when user is available
  useEffect(() => {
    if (userId && walletAddress && enabled) {
      // Small delay to not interfere with initial authentication
      const timer = setTimeout(() => {
        preloadCriticalData()
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [userId, walletAddress, enabled, preloadCriticalData])

  // Periodic refresh for dynamic data
  useEffect(() => {
    if (!userId || !enabled) return

    // Refresh portfolio and transactions every 30 seconds
    const portfolioInterval = setInterval(() => {
      if (state.data.portfolio && !state.loading.portfolio) {
        loadPortfolio()
      }
    }, 30000)

    const transactionsInterval = setInterval(() => {
      if (state.data.transactions && !state.loading.transactions) {
        loadTransactions()
      }
    }, 60000)

    return () => {
      clearInterval(portfolioInterval)
      clearInterval(transactionsInterval)
    }
  }, [userId, enabled, state.data.portfolio, state.data.transactions, state.loading.portfolio, state.loading.transactions, loadPortfolio, loadTransactions])

  return {
    ...state,
    refreshData,
    preloadCriticalData
  }
}