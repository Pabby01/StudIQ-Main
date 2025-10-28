'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePrivy } from '@privy-io/react-auth';
import { AlertCircle } from 'lucide-react';
import GamifiedAccountCreation from './GamifiedAccountCreation';

interface AuthWrapperProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  onboardingComponent?: React.ComponentType<{ onComplete: () => void }>;
}

const AuthWrapper = React.memo(function AuthWrapper({ 
  children, 
  requireAuth = false, 
  onboardingComponent: OnboardingComponent 
}: AuthWrapperProps) {
  const { 
    isReady,
    isAuthenticated,
    isLoading,
    user,
    error,
    retryWalletCreation
  } = useAuth();
  
  // Also get Privy authentication state to handle intermediate states
  const { 
    ready: privyReady, 
    authenticated: privyAuthenticated,
    user: privyUser 
  } = usePrivy();
  
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Memoize authentication state to prevent unnecessary re-renders
  const authState = useMemo(() => {
    // Check if we're in an intermediate state where Privy is authenticated but user data is still syncing
    const isPrivyAuthenticatedButSyncing = privyReady && privyAuthenticated && privyUser && !user && !error;
    
    return {
      isReady,
      isAuthenticated,
      isLoading,
      hasUser: !!user,
      hasError: !!error,
      isPrivyAuthenticatedButSyncing
    };
  }, [isReady, isAuthenticated, isLoading, user, error, privyReady, privyAuthenticated, privyUser]);

  // Determine if onboarding should be shown
  useEffect(() => {
    if (!authState.isReady) return;

    console.log('AuthWrapper: Authentication state:', {
      isReady: authState.isReady,
      isAuthenticated: authState.isAuthenticated,
      hasUser: authState.hasUser,
      isPrivyAuthenticatedButSyncing: authState.isPrivyAuthenticatedButSyncing,
      privyAuthenticated,
      requireAuth,
      showOnboarding
    });

    // Don't show onboarding if Privy is authenticated and we're just waiting for user data sync
    if (authState.isPrivyAuthenticatedButSyncing) {
      console.log('AuthWrapper: Privy authenticated, waiting for user data sync');
      setShowOnboarding(false);
      return;
    }

    // Show onboarding if auth is required but user is not authenticated
    // Add a small delay to allow user data to sync after Privy authentication
    const timer = setTimeout(() => {
      const needsOnboarding = requireAuth && !authState.isAuthenticated && !authState.isPrivyAuthenticatedButSyncing;
      console.log('AuthWrapper: Setting onboarding state:', needsOnboarding);
      setShowOnboarding(needsOnboarding);
    }, 2000); // Increased delay to 2 seconds to allow more time for wallet creation

    return () => clearTimeout(timer);
  }, [authState.isReady, authState.isAuthenticated, authState.isPrivyAuthenticatedButSyncing, authState.hasUser, privyAuthenticated, requireAuth, showOnboarding]);

  // Loading state while auth system initializes
  if (!authState.isReady || authState.isLoading || authState.isPrivyAuthenticatedButSyncing) {
    let loadingMessage = "Initializing...";
    
    if (authState.isPrivyAuthenticatedButSyncing) {
      loadingMessage = "Setting up your account...";
    } else if (authState.isLoading) {
      loadingMessage = "Loading your data...";
    }
    
    return (
      <GamifiedAccountCreation 
        isWalletCreation={!!authState.isPrivyAuthenticatedButSyncing}
        loadingMessage={loadingMessage}
      />
    );
  }

  // Error state
  if (authState.hasError) {
    const isWalletError = error && (
      error.includes('Wallet creation') || 
      error.includes('wallet') ||
      error.includes('timeout')
    );
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {isWalletError ? 'Wallet Setup Issue' : 'Authentication Error'}
          </h2>
          <p className="text-gray-600 mb-4">
            {error || 'An unexpected error occurred during authentication.'}
          </p>
          <div className="space-y-2">
            {isWalletError && (
              <button
                onClick={retryWalletCreation}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Retry Wallet Setup
              </button>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show onboarding if needed
  if (showOnboarding && OnboardingComponent) {
    return (
      <OnboardingComponent 
        onComplete={() => setShowOnboarding(false)} 
      />
    );
  }

  // Render children if authenticated or auth not required
  if (!requireAuth || authState.isAuthenticated) {
    return <>{children}</>;
  }

  // Fallback - should not reach here
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center">
        <p className="text-gray-600">Access denied</p>
      </div>
    </div>
  );
});

export default AuthWrapper;

// Hook for components that need authentication status
export function useAuthStatus() {
  const { 
    isReady,
    isAuthenticated,
    user,
    walletAddress,
    hasWallet
  } = useAuth();

  return {
    ready: isReady,
    authenticated: isAuthenticated,
    user,
    walletAddress,
    hasWallet,
    isEmailUser: !!user?.email,
    isPhoneUser: !!user?.phone,
  };
}