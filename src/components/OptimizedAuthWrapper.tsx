/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useEffect } from 'react'
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth'
import { useLazyUserData } from '@/hooks/useLazyUserData'
import { OptimizedOnboardingFlow } from '@/components/OptimizedOnboardingFlow'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { secureLogger } from '@/lib/secure-logger'

interface OptimizedAuthWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  showLoadingStates?: boolean
}

/**
 * Optimized authentication wrapper that provides:
 * - Fast authentication with progress tracking
 * - Lazy loading of non-critical data
 * - Seamless user experience
 * - Background data initialization
 */
export function OptimizedAuthWrapper({ 
  children, 
  fallback,
  showLoadingStates = true 
}: OptimizedAuthWrapperProps) {
  
  const { 
    isLoading, 
    isAuthenticated, 
    user, 
    walletAddress, 
    error, 
    stage 
  } = useOptimizedAuth()

  const { 
    data: lazyData, 
    loading: lazyLoading, 
    loadingProgress,
    preloadCriticalData 
  } = useLazyUserData(user?.id || null, walletAddress, isAuthenticated)

  const [showOnboarding, setShowOnboarding] = useState(false)
  const [isReady, setIsReady] = useState(false)

  // Determine if we should show onboarding
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      setShowOnboarding(true)
      setIsReady(false)
    } else if (isAuthenticated && walletAddress) {
      setShowOnboarding(false)
      setIsReady(true)
      
      // Log successful authentication
      secureLogger.info('🚀 OPTIMIZED - User authenticated successfully:', {
        userId: user?.id,
        walletAddress,
        stage,
        hasLazyData: Object.keys(lazyData).length > 0
      })
    }
  }, [isAuthenticated, isLoading, walletAddress, user?.id, stage, lazyData])

  // Handle onboarding completion
  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
    setIsReady(true)
    
    // Preload critical data after onboarding
    if (user?.id && walletAddress) {
      preloadCriticalData()
    }
  }

  // Show onboarding flow
  if (showOnboarding) {
    return <OptimizedOnboardingFlow onComplete={handleOnboardingComplete} />
  }

  // Show loading state while authenticating
  if (isLoading || !isReady) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="text-center space-y-4">
            <LoadingSpinner size="lg" />
            <div className="space-y-2">
              <p className="text-lg font-medium text-gray-900">
                {stage === 'connecting' && 'Connecting to your account...'}
                {stage === 'creating_wallet' && 'Creating your secure wallet...'}
                {stage === 'initializing_user' && 'Setting up your profile...'}
                {stage === 'complete' && 'Almost ready...'}
                {stage === 'idle' && 'Loading...'}
              </p>
              {showLoadingStates && (
                <p className="text-sm text-gray-600">
                  ⚡ Optimized for speed - this should only take a few seconds
                </p>
              )}
            </div>
          </div>
        </div>
      )
    )
  }

  // Show error state
  if (error && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
        <div className="text-center space-y-4 max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900">Authentication Error</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Render authenticated content with lazy loading context
  return (
    <div className="min-h-screen">
      {/* Background data loading indicator (optional) */}
      {showLoadingStates && loadingProgress < 100 && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <div 
            className="h-1 bg-blue-500 transition-all duration-300 ease-out"
            style={{ width: `${loadingProgress}%` }}
          />
        </div>
      )}

      {/* Main content */}
      <LazyDataProvider value={{ data: lazyData, loading: lazyLoading }}>
        {children}
      </LazyDataProvider>

      {/* Development info (only in development) */}
      {process.env.NODE_ENV === 'development' && showLoadingStates && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white text-xs p-2 rounded max-w-xs">
          <div>🚀 Optimized Auth Active</div>
          <div>User: {user?.id?.slice(-8) || 'N/A'}</div>
          <div>Wallet: {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4) || 'N/A'}</div>
          <div>Lazy Data: {loadingProgress.toFixed(0)}%</div>
          <div>Stage: {stage}</div>
        </div>
      )}
    </div>
  )
}

// Context for lazy data
const LazyDataContext = React.createContext<{
  data: any
  loading: any
} | null>(null)

function LazyDataProvider({ children, value }: { children: React.ReactNode, value: any }) {
  return (
    <LazyDataContext.Provider value={value}>
      {children}
    </LazyDataContext.Provider>
  )
}

// Hook to access lazy data in components
export function useLazyData() {
  const context = React.useContext(LazyDataContext)
  if (!context) {
    throw new Error('useLazyData must be used within OptimizedAuthWrapper')
  }
  return context
}