'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { secureLogger } from '@/lib/secure-logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Wallet, 
  Shield, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  User,
  Key,
  UserPlus
} from 'lucide-react';

interface OnboardingFlowProps {
  onComplete?: () => void;
  className?: string;
}

export default function OnboardingFlow({ onComplete, className }: OnboardingFlowProps) {
  const { 
    isReady,
    isAuthenticated,
    isLoading: authLoading,
    user,
    login,
    error: authError,
    walletAddress,
    hasWallet,
    updateProfile
  } = useAuth();
  
  const [currentStep, setCurrentStep] = useState<'welcome' | 'auth' | 'profile' | 'complete'>('welcome');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  // Check authentication status and update steps
  useEffect(() => {
    if (!isReady) return;

    if (isAuthenticated && user) {
      // If user is new or doesn't have a display name, go to profile setup
      if (user.isNewUser || !user.displayName) {
        setCurrentStep('profile');
      } else {
        setCurrentStep('complete');
      }
    } else {
      setCurrentStep('auth');
    }
  }, [isReady, isAuthenticated, user]);

  // Auto-complete onboarding when user is fully set up
  useEffect(() => {
    if (currentStep === 'complete' && onComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentStep, onComplete]);

  // Update error state from auth
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const handleAuth = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await login();
    } catch (err) {
      setError('Authentication failed. Please try again.');
      secureLogger.error('Auth error', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileSubmit = async () => {
    setNameError(null);
    setError(null);
    
    if (!displayName.trim()) {
      setNameError('Please enter your name');
      return;
    }

    if (displayName.trim().length < 2) {
      setNameError('Name must be at least 2 characters long');
      return;
    }

    setIsLoading(true);

    try {
      await updateProfile({
        displayName: displayName.trim()
      });
      setCurrentStep('complete');
    } catch (err) {
      setError('Failed to create profile. Please try again.');
      secureLogger.error('Profile creation error', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
        <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`max-w-md mx-auto space-y-4 sm:space-y-6 ${className}`}>
      {/* Welcome Step */}
      {currentStep === 'welcome' && (
        <Card className="glass-card">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 sm:mb-4 w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            </div>
            <CardTitle className="text-xl sm:text-2xl">Welcome to StudIQ</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Get started with your secure, decentralized account in just a few steps
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setCurrentStep('auth')} 
              className="w-full min-h-[48px] touch-manipulation"
              size="lg"
            >
              Get Started
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Authentication Step */}
      {currentStep === 'auth' && (
        <Card className="glass-card mt-16 sm:mt-24 md:mt-32">
          <CardHeader className="text-center">
            <CardTitle className="text-lg sm:text-xl">Sign In to StudIQ</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Connect your wallet or use social login to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-blue-900">Secure Authentication</div>
                  <div className="text-blue-700">Multiple login options with wallet integration</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <Key className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-green-900">Automatic Wallet Creation</div>
                  <div className="text-green-700">We&apos;ll create a secure wallet for you automatically</div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleAuth}
              disabled={isLoading || authLoading}
              className="w-full min-h-[48px] touch-manipulation"
              size="lg"
            >
              {(isLoading || authLoading) ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2 flex-shrink-0" />
                  <span className="text-sm sm:text-base">Connecting...</span>
                </>
              ) : (
                <>
                  <Wallet className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="text-sm sm:text-base">Connect & Sign In</span>
                </>
              )}
            </Button>

            <div className="text-xs sm:text-sm text-center text-muted-foreground">
              Supports email, phone, social login, and external wallets
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Setup Step */}
      {currentStep === 'profile' && (
        <Card className="glass-card">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 sm:mb-4 w-12 h-12 sm:w-16 sm:h-16 bg-purple-100 rounded-full flex items-center justify-center">
              <UserPlus className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
            </div>
            <CardTitle className="text-lg sm:text-xl">Tell us your name</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              We&apos;ll use this to personalize your StudIQ experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="displayName" className="text-sm font-medium text-gray-700">
                Display Name
              </label>
              <Input
                id="displayName"
                type="text"
                placeholder="Enter your full name"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setNameError(null);
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleProfileSubmit();
                  }
                }}
                className={nameError ? 'border-red-300 focus:border-red-500' : ''}
                aria-describedby={nameError ? 'name-error' : undefined}
              />
              {nameError && (
                <p id="name-error" className="text-sm text-red-600">{nameError}</p>
              )}
              <p className="text-xs text-gray-500">
                This will be displayed on your dashboard and profile
              </p>
            </div>

            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <User className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-blue-900">Personalized Experience</div>
                  <div className="text-blue-700">Get customized greetings and recommendations</div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleProfileSubmit}
              disabled={!displayName.trim() || isLoading}
              className="w-full min-h-[48px] touch-manipulation"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2 flex-shrink-0" />
                  <span className="text-sm sm:text-base">Creating Profile...</span>
                </>
              ) : (
                <span className="text-sm sm:text-base">Continue</span>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Completion Step */}
      {currentStep === 'complete' && (
        <Card className="glass-card">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 sm:mb-4 w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
            </div>
            <CardTitle className="text-xl sm:text-2xl">
              {user?.displayName ? `Welcome, ${user.displayName}!` : 'Welcome to StudIQ!'}
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Your account is set up and ready to go
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            {/* User Info */}
            {user && (
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Account</span>
                  <Badge variant="secondary" className="text-xs sm:text-sm">
                    {user.email || user.phone || 'Connected'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Wallet</span>
                  <Badge variant="secondary" className="text-xs sm:text-sm">
                    {hasWallet ? 'Connected' : 'Created'}
                  </Badge>
                </div>

                {walletAddress && (
                  <div className="text-xs text-muted-foreground text-center">
                    Wallet Address: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </div>
                )}
              </div>
            )}

            <Button
              onClick={onComplete}
              className="w-full min-h-[48px] touch-manipulation"
              size="lg"
            >
              <span className="text-sm sm:text-base">Continue to Dashboard</span>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
