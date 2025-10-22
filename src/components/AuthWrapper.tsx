'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import LoadingTimeout from './LoadingTimeout';

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
    error
  } = useAuth();
  
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Memoize authentication state to prevent unnecessary re-renders
  const authState = useMemo(() => ({
    isReady,
    isAuthenticated,
    isLoading,
    hasUser: !!user,
    hasError: !!error
  }), [isReady, isAuthenticated, isLoading, user, error]);

  // Determine if onboarding should be shown
  useEffect(() => {
    if (!authState.isReady) return;

    // Show onboarding if auth is required but user is not authenticated
    const needsOnboarding = requireAuth && !authState.isAuthenticated;
    setShowOnboarding(needsOnboarding);
  }, [authState.isReady, authState.isAuthenticated, requireAuth]);

  // Loading state while auth system initializes
  if (!authState.isReady || authState.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Initializing...</p>
          <LoadingTimeout>
            <div></div>
          </LoadingTimeout>
        </div>
      </div>
    );
  }

  // Error state
  if (authState.hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong className="font-bold">Authentication Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
          <p className="text-gray-600 mb-4">
            Please refresh the page or try logging in again.
          </p>
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