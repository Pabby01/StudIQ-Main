'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  RefreshCw, 
  Wifi, 
  Shield, 
  Clock,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

export interface AuthError {
  code: string;
  message: string;
  details?: string;
  retryable?: boolean;
  timestamp: number;
}

interface AuthErrorHandlerProps {
  error: AuthError | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export default function AuthErrorHandler({ 
  error, 
  onRetry, 
  onDismiss, 
  className 
}: AuthErrorHandlerProps) {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Reset retry count when error changes
  useEffect(() => {
    if (error) {
      setRetryCount(0);
    }
  }, [error]);

  if (!error) return null;

  const handleRetry = async () => {
    if (!onRetry || retryCount >= 3) return;
    
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    try {
      await onRetry();
    } catch (retryError) {
      console.error('Retry failed:', retryError);
    } finally {
      setIsRetrying(false);
    }
  };

  const getErrorInfo = (errorCode: string) => {
    switch (errorCode) {
      case 'NETWORK_ERROR':
        return {
          title: 'Connection Issue',
          description: 'Unable to connect to authentication services. Please check your internet connection.',
          icon: Wifi,
          severity: 'warning' as const,
          retryable: true,
          suggestions: [
            'Check your internet connection',
            'Try switching networks (WiFi/Mobile)',
            'Disable VPN if active'
          ]
        };
      
      case 'WALLET_CONNECTION_FAILED':
        return {
          title: 'Wallet Connection Failed',
          description: 'Could not connect to your wallet. Please ensure your wallet is unlocked and accessible.',
          icon: Shield,
          severity: 'error' as const,
          retryable: true,
          suggestions: [
            'Unlock your wallet',
            'Refresh the wallet extension',
            'Try a different wallet'
          ]
        };
      
      case 'EMAIL_VERIFICATION_FAILED':
        return {
          title: 'Email Verification Failed',
          description: 'Unable to verify your email address. Please check your email and try again.',
          icon: AlertTriangle,
          severity: 'warning' as const,
          retryable: true,
          suggestions: [
            'Check your email inbox and spam folder',
            'Ensure the verification link hasn\'t expired',
            'Request a new verification email'
          ]
        };
      
      case 'SMS_VERIFICATION_FAILED':
        return {
          title: 'SMS Verification Failed',
          description: 'Unable to verify your phone number. Please check the SMS code and try again.',
          icon: AlertTriangle,
          severity: 'warning' as const,
          retryable: true,
          suggestions: [
            'Check for SMS messages',
            'Ensure you entered the correct code',
            'Request a new verification code'
          ]
        };
      
      case 'WALLET_CREATION_FAILED':
        return {
          title: 'Wallet Creation Failed',
          description: 'Unable to create your wallet. This might be a temporary issue.',
          icon: Shield,
          severity: 'error' as const,
          retryable: true,
          suggestions: [
            'Try again in a few moments',
            'Clear browser cache and cookies',
            'Contact support if the issue persists'
          ]
        };
      
      case 'RATE_LIMITED':
        return {
          title: 'Too Many Attempts',
          description: 'You\'ve made too many authentication attempts. Please wait before trying again.',
          icon: Clock,
          severity: 'warning' as const,
          retryable: false,
          suggestions: [
            'Wait 5-10 minutes before retrying',
            'Clear browser cache',
            'Contact support if needed'
          ]
        };
      
      case 'UNSUPPORTED_WALLET':
        return {
          title: 'Unsupported Wallet',
          description: 'The selected wallet is not supported. Please try a different wallet.',
          icon: Shield,
          severity: 'error' as const,
          retryable: false,
          suggestions: [
            'Try MetaMask or WalletConnect',
            'Update your wallet extension',
            'Use email or phone authentication instead'
          ]
        };
      
      case 'USER_REJECTED':
        return {
          title: 'Authentication Cancelled',
          description: 'You cancelled the authentication process.',
          icon: HelpCircle,
          severity: 'info' as const,
          retryable: true,
          suggestions: [
            'Click "Connect" to try again',
            'Approve the connection in your wallet',
            'Contact support if you need help'
          ]
        };
      
      default:
        return {
          title: 'Authentication Error',
          description: error.message || 'An unexpected error occurred during authentication.',
          icon: AlertTriangle,
          severity: 'error' as const,
          retryable: true,
          suggestions: [
            'Try refreshing the page',
            'Clear browser cache and cookies',
            'Contact support if the issue persists'
          ]
        };
    }
  };

  const errorInfo = getErrorInfo(error.code);
  const Icon = errorInfo.icon;
  const canRetry = errorInfo.retryable && retryCount < 3 && onRetry;

  return (
    <div className={className}>
      <Card className="border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              errorInfo.severity === 'error' ? 'bg-red-100 text-red-600' :
              errorInfo.severity === 'warning' ? 'bg-yellow-100 text-yellow-600' :
              'bg-blue-100 text-blue-600'
            }`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{errorInfo.title}</CardTitle>
              <CardDescription>{errorInfo.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Error Details */}
          {error.details && (
            <Alert>
              <AlertDescription className="text-sm font-mono">
                {error.details}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Suggestions */}
          <div>
            <h4 className="font-medium mb-2">What you can try:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {errorInfo.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-xs mt-1">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Retry Information */}
          {retryCount > 0 && (
            <div className="text-sm text-muted-foreground">
              Attempt {retryCount} of 3
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {canRetry && (
              <Button 
                onClick={handleRetry}
                disabled={isRetrying}
                variant="default"
                size="sm"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </>
                )}
              </Button>
            )}
            
            {onDismiss && (
              <Button 
                onClick={onDismiss}
                variant="outline"
                size="sm"
              >
                Dismiss
              </Button>
            )}
            
            <Button 
              onClick={() => window.open('https://docs.privy.io/troubleshooting', '_blank')}
              variant="ghost"
              size="sm"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Get Help
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Error factory functions for common authentication errors
export const createAuthError = {
  networkError: (details?: string): AuthError => ({
    code: 'NETWORK_ERROR',
    message: 'Network connection failed',
    details,
    retryable: true,
    timestamp: Date.now()
  }),
  
  walletConnectionFailed: (details?: string): AuthError => ({
    code: 'WALLET_CONNECTION_FAILED',
    message: 'Wallet connection failed',
    details,
    retryable: true,
    timestamp: Date.now()
  }),
  
  emailVerificationFailed: (details?: string): AuthError => ({
    code: 'EMAIL_VERIFICATION_FAILED',
    message: 'Email verification failed',
    details,
    retryable: true,
    timestamp: Date.now()
  }),
  
  smsVerificationFailed: (details?: string): AuthError => ({
    code: 'SMS_VERIFICATION_FAILED',
    message: 'SMS verification failed',
    details,
    retryable: true,
    timestamp: Date.now()
  }),
  
  walletCreationFailed: (details?: string): AuthError => ({
    code: 'WALLET_CREATION_FAILED',
    message: 'Wallet creation failed',
    details,
    retryable: true,
    timestamp: Date.now()
  }),
  
  rateLimited: (details?: string): AuthError => ({
    code: 'RATE_LIMITED',
    message: 'Rate limited',
    details,
    retryable: false,
    timestamp: Date.now()
  }),
  
  unsupportedWallet: (details?: string): AuthError => ({
    code: 'UNSUPPORTED_WALLET',
    message: 'Unsupported wallet',
    details,
    retryable: false,
    timestamp: Date.now()
  }),
  
  userRejected: (details?: string): AuthError => ({
    code: 'USER_REJECTED',
    message: 'User rejected authentication',
    details,
    retryable: true,
    timestamp: Date.now()
  }),
  
  generic: (message: string, details?: string): AuthError => ({
    code: 'GENERIC_ERROR',
    message,
    details,
    retryable: true,
    timestamp: Date.now()
  })
};