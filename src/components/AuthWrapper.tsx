'use client';

import React, { useEffect, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Loader2 } from 'lucide-react';

interface AuthWrapperProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireWallet?: boolean;
  onboardingComponent?: React.ComponentType<{ onComplete: () => void }>;
}

export default function AuthWrapper({ 
  children, 
  requireAuth = false, 
  requireWallet = false,
  onboardingComponent: OnboardingComponent 
}: AuthWrapperProps) {
  const { 
    ready, 
    authenticated, 
    user, 
    createWallet 
  } = usePrivy();
  
  const { wallets } = useWallets();
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [walletCreationAttempted, setWalletCreationAttempted] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Auto-create wallet for email/phone users
  useEffect(() => {
    const shouldCreateWallet = async () => {
      // Only proceed if Privy is ready and user is authenticated
      if (!ready || !authenticated || !user) return;
      
      // Skip if wallet creation already attempted or user already has wallets
      if (walletCreationAttempted || wallets.length > 0) return;
      
      // Check if user authenticated via email or phone (not wallet)
      const hasEmailOrPhone = user.email || user.phone;
      const hasExternalWallet = user.wallet;
      
      // Auto-create wallet for email/phone users who don't have external wallets
      if (hasEmailOrPhone && !hasExternalWallet) {
        setIsCreatingWallet(true);
        setWalletCreationAttempted(true);
        
        try {
          await createWallet();
          console.log('Wallet automatically created for email/phone user');
        } catch (error) {
          console.error('Failed to auto-create wallet:', error);
          // Don't block the user if wallet creation fails
        } finally {
          setIsCreatingWallet(false);
        }
      } else {
        setWalletCreationAttempted(true);
      }
    };

    shouldCreateWallet();
  }, [ready, authenticated, user, wallets.length, createWallet, walletCreationAttempted]);

  // Determine if onboarding should be shown
  useEffect(() => {
    if (!ready) return;

    // Show onboarding if:
    // 1. Auth is required but user is not authenticated, OR
    // 2. Wallet is required but user has no wallets
    const needsOnboarding = 
      (requireAuth && !authenticated) || 
      (requireWallet && authenticated && wallets.length === 0 && !isCreatingWallet);

    setShowOnboarding(needsOnboarding);
  }, [ready, authenticated, wallets.length, requireAuth, requireWallet, isCreatingWallet]);

  // Loading state while Privy initializes
  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Initializing...</p>
        </div>
      </div>
    );
  }

  // Show wallet creation loading state
  if (isCreatingWallet) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Creating your secure wallet...</p>
          <p className="text-sm text-muted-foreground">This will only take a moment</p>
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
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();

  return {
    ready,
    authenticated,
    user,
    wallets,
    hasWallet: wallets.length > 0,
    isEmailUser: !!user?.email,
    isPhoneUser: !!user?.phone,
    isWalletUser: !!user?.wallet,
  };
}

// Hook for wallet operations
export function useWalletOperations() {
  const { createWallet, exportWallet } = usePrivy();
  const { wallets } = useWallets();
  const [isLoading, setIsLoading] = useState(false);

  const createNewWallet = async () => {
    setIsLoading(true);
    try {
      const wallet = await createWallet();
      return wallet;
    } catch (error) {
      console.error('Failed to create wallet:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const exportWalletPrivateKey = async (walletAddress?: string) => {
    setIsLoading(true);
    try {
      const targetWallet = walletAddress 
        ? wallets.find(w => w.address === walletAddress)
        : wallets[0];
      
      if (!targetWallet) {
        throw new Error('No wallet found');
      }

      const privateKey = await exportWallet();
      return privateKey;
    } catch (error) {
      console.error('Failed to export wallet:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    wallets,
    createNewWallet,
    exportWalletPrivateKey,
    isLoading,
  };
}