/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Application initialization component that validates environment on startup
 * This component runs on the client side and ensures proper configuration
 * before rendering the main application.
 */

'use client';

import { useEffect, useState } from 'react';
import { validateEnvironment } from '@/lib/env-validation';
import { secureLogger } from '@/lib/secure-logger';

interface AppInitializerProps {
  children: React.ReactNode;
}

export default function AppInitializer({ children }: AppInitializerProps) {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    // Only validate critical client-side environment variables
    const clientSideVars = [
      'NEXT_PUBLIC_PRIVY_APP_ID',
      'NEXT_PUBLIC_SUPABASE_URL', 
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_ENCRYPTION_KEY',
      'NEXT_PUBLIC_SOLANA_RPC_URL'
    ];
    
    const missingVars = clientSideVars.filter(varName => !process.env[varName]);
    const validationErrors = missingVars.map(varName => 
      `Required environment variable ${varName} is not set`
    );
    
    if (missingVars.length > 0) {
      secureLogger.error('Client-side environment validation failed', {
        missing: missingVars,
        errors: validationErrors,
      });
      
      setIsValid(false);
      setErrors(validationErrors);
    } else {
      secureLogger.info('Client-side environment validation passed');
      setIsValid(true);
    }
  }, []);

  if (isValid === null) {
    // Still validating
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing application...</p>
        </div>
      </div>
    );
  }

  if (!isValid) {
    // Environment validation failed
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Application Configuration Error
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              The application cannot start due to missing or invalid configuration.
            </p>
            <div className="bg-red-50 rounded-md p-4 mb-4">
              <h4 className="text-sm font-medium text-red-800 mb-2">Errors:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
            <div className="text-xs text-gray-500">
              <p>Please check your environment configuration and refresh the page.</p>
              <p className="mt-2">Contact support if you need assistance.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Environment validation passed - render children
  return <>{children}</>;
}