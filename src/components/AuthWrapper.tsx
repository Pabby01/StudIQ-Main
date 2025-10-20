'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface AuthWrapperProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  onboardingComponent?: React.ComponentType<{ onComplete: () => void }>;
}

export default function AuthWrapper({ 
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

  // Determine if onboarding should be shown
  useEffect(() => {
    if (!isReady) return;

    // Show onboarding if auth is required but user is not authenticated
    const needsOnboarding = requireAuth && !isAuthenticated;
    setShowOnboarding(needsOnboarding);
  }, [isReady, isAuthenticated, requireAuth]);

  // Loading state while auth system initializes
  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Initializing...</p>
        </div>
      </div>
    );
  }

  // Show loading state during authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    );
  }

  // Show error state if authentication failed
  if (error && requireAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="text-red-600">Authentication Error</div>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  // Show onboarding if needed and component is provided
  if (showOnboarding && OnboardingComponent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <OnboardingComponent onComplete={() => setShowOnboarding(false)} />
      </div>
    );
  }

  // Show children if all requirements are met
  return <>{children}</>;
}

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