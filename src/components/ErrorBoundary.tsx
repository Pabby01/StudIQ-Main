'use client';

import React from 'react';
import { secureLogger } from '@/lib/secure-logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retry: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    secureLogger.error('ErrorBoundary caught an error', { error, errorInfo });
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} retry={this.retry} />;
      }

      return <DefaultErrorFallback error={this.state.error} retry={this.retry} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error, retry }: { error?: Error; retry: () => void }) {
  const isAuthError = error?.message?.includes('auth') || 
                     error?.message?.includes('RLS') || 
                     error?.message?.includes('policy');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-red-900 dark:text-red-300">
            {isAuthError ? 'Authentication Error' : 'Something went wrong'}
          </CardTitle>
          <CardDescription>
            {isAuthError 
              ? 'There was a problem with authentication. This might be due to database configuration issues.'
              : 'An unexpected error occurred while loading the application.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
              <p className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                {error.message}
              </p>
            </div>
          )}
          
          {isAuthError && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Tip:</strong> If you&apos;re seeing RLS policy errors, you may need to apply the database migration script in your Supabase dashboard.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={retry} className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()} 
              className="flex-1"
            >
              Refresh Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ErrorBoundary;
