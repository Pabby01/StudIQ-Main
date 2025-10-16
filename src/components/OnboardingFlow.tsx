'use client';

import React, { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Wallet, 
  Mail, 
  Phone, 
  Shield, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  User,
  Key,
  Globe
} from 'lucide-react';

interface OnboardingFlowProps {
  onComplete?: () => void;
  className?: string;
}

export default function OnboardingFlow({ onComplete, className }: OnboardingFlowProps) {
  const { 
    ready, 
    authenticated, 
    user, 
    login, 
    linkEmail, 
    linkPhone, 
    createWallet 
  } = usePrivy();
  
  const { wallets } = useWallets();
  
  const [currentStep, setCurrentStep] = useState<'welcome' | 'auth' | 'wallet' | 'complete'>('welcome');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [specificAuthMethod, setSpecificAuthMethod] = useState<'email' | 'phone' | 'wallet' | 'google' | 'apple' | null>(null);

  // Check authentication status and update steps
  useEffect(() => {
    if (!ready) return;

    if (authenticated && user) {
      // Check if user has a wallet
      if (wallets.length > 0) {
        setCurrentStep('complete');
      } else {
        setCurrentStep('wallet');
      }
    } else {
      setCurrentStep('auth');
    }
  }, [ready, authenticated, user, wallets]);

  // Auto-complete onboarding when user is fully set up
  useEffect(() => {
    if (currentStep === 'complete' && onComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentStep, onComplete]);

  const handleAuth = async (method: 'email' | 'phone' | 'wallet' | 'google' | 'apple') => {
    setIsLoading(true);
    setError(null);
    
    setSpecificAuthMethod(method);

    try {
      await login();
    } catch (err) {
      setError(`Authentication failed. Please try again.`);
      console.error('Auth error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWallet = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await createWallet();
      setCurrentStep('complete');
    } catch (err) {
      setError('Failed to create wallet. Please try again.');
      console.error('Wallet creation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkAccount = async (type: 'email' | 'phone') => {
    setIsLoading(true);
    setError(null);

    try {
      if (type === 'email') {
        await linkEmail();
      } else {
        await linkPhone();
      }
    } catch (err) {
      setError(`Failed to link ${type}. Please try again.`);
      console.error(`Link ${type} error:`, err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`max-w-md mx-auto space-y-6 ${className}`}>
      {/* Welcome Step */}
      {currentStep === 'welcome' && (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Welcome to StudIQ</CardTitle>
            <CardDescription>
              Get started with your secure, decentralized account in just a few steps
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setCurrentStep('auth')} 
              className="w-full"
              size="lg"
            >
              Get Started
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Authentication Step */}
      {currentStep === 'auth' && (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Choose Your Sign-In Method</CardTitle>
            <CardDescription>
              Select how you&lsquo;d like to authenticate. We&apos;ll automatically create a secure wallet for you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Email Authentication */}
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => handleAuth('email')}
              disabled={isLoading}
            >
              <Mail className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Continue with Email</div>
                <div className="text-xs text-muted-foreground">Quick and secure</div>
              </div>
              {isLoading && specificAuthMethod === 'email' && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
            </Button>

            {/* Phone Authentication */}
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => handleAuth('phone')}
              disabled={isLoading}
            >
              <Phone className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Continue with Phone</div>
                <div className="text-xs text-muted-foreground">SMS verification</div>
              </div>
              {isLoading && specificAuthMethod === 'phone' && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
            </Button>

            <Separator className="my-4" />

            {/* Social Authentication */}
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => handleAuth('google')}
              disabled={isLoading}
            >
              <Globe className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Continue with Google</div>
                <div className="text-xs text-muted-foreground">One-click sign in</div>
              </div>
              {isLoading && specificAuthMethod === 'google' && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => handleAuth('apple')}
              disabled={isLoading}
            >
              <Globe className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Continue with Apple</div>
                <div className="text-xs text-muted-foreground">Secure and private</div>
              </div>
              {isLoading && specificAuthMethod === 'apple' && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
            </Button>

            <Separator className="my-4" />

            {/* Wallet Authentication */}
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => handleAuth('wallet')}
              disabled={isLoading}
            >
              <Wallet className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Connect Existing Wallet</div>
                <div className="text-xs text-muted-foreground">MetaMask, WalletConnect, etc.</div>
              </div>
              {isLoading && specificAuthMethod === 'wallet' && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Wallet Creation Step */}
      {currentStep === 'wallet' && (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Wallet className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle>Create Your Wallet</CardTitle>
            <CardDescription>
              We&apos;ll create a secure wallet for you automatically. This wallet will be linked to your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Shield className="h-5 w-5 text-blue-600" />
                <div className="text-sm">
                  <div className="font-medium text-blue-900">Secure & Private</div>
                  <div className="text-blue-700">Your wallet is encrypted and only you have access</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <Key className="h-5 w-5 text-green-600" />
                <div className="text-sm">
                  <div className="font-medium text-green-900">Automatic Backup</div>
                  <div className="text-green-700">Your wallet is automatically backed up and recoverable</div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleCreateWallet}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating Wallet...
                </>
              ) : (
                'Create My Wallet'
              )}
            </Button>

            {/* Additional account linking options */}
            {user && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-3">
                  Secure your account further by adding additional authentication methods:
                </p>
                <div className="flex gap-2">
                  {!user.email && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLinkAccount('email')}
                      disabled={isLoading}
                    >
                      <Mail className="h-4 w-4 mr-1" />
                      Link Email
                    </Button>
                  )}
                  {!user.phone && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLinkAccount('phone')}
                      disabled={isLoading}
                    >
                      <Phone className="h-4 w-4 mr-1" />
                      Link Phone
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Completion Step */}
      {currentStep === 'complete' && (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Welcome to StudIQ!</CardTitle>
            <CardDescription>
              Your account is set up and ready to go
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* User Info */}
            {user && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Account</span>
                  <Badge variant="secondary">
                    {user.email?.address || user.phone?.number || 'Connected'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Wallet</span>
                  <Badge variant="secondary">
                    {wallets.length} wallet{wallets.length !== 1 ? 's' : ''} connected
                  </Badge>
                </div>

                {wallets.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Wallet Address: {wallets[0].address.slice(0, 6)}...{wallets[0].address.slice(-4)}
                  </div>
                )}
              </div>
            )}

            <Button
              onClick={onComplete}
              className="w-full"
              size="lg"
            >
              Continue to Dashboard
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}