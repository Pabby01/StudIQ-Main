/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Application initialization and startup validation
 * This module ensures all required services and configurations are properly set up
 * before the application starts, preventing runtime failures.
 */

import { validateEnvironment } from './env-validation';
import { secureLogger } from './secure-logger';

let isInitialized = false;

export async function initializeApplication(): Promise<boolean> {
  try {
    secureLogger.info('Starting application initialization...');

    // Validate environment variables
    const envValidation = validateEnvironment();
    
    if (!envValidation.isValid) {
      secureLogger.error('Environment validation failed', {
        missing: envValidation.missing,
        errors: envValidation.errors,
      });
      
      // Log detailed errors for debugging (server-side only)
      if (typeof window === 'undefined') {
        console.error('Environment validation errors:', envValidation.errors);
        console.error('Missing variables:', envValidation.missing);
      }
      
      throw new Error(`Application initialization failed: ${envValidation.errors.join(', ')}`);
    }

    // Log warnings if any
    if (envValidation.warnings.length > 0) {
      secureLogger.warn('Environment configuration warnings', {
        warnings: envValidation.warnings,
      });
    }

    // Additional initialization checks can be added here
    await performAdditionalChecks();

    isInitialized = true;
    secureLogger.info('Application initialization completed successfully');
    return true;

  } catch (error) {
    secureLogger.error('Application initialization failed', error);
    
    // Provide helpful error message to developers
    if (typeof window === 'undefined') {
      console.error(`
🚨 Application Initialization Failed

This error occurred because required environment variables are missing or invalid.

To fix this:
1. Copy .env.example to .env.local (if it exists)
2. Set all required environment variables
3. Generate a secure encryption key (at least 32 characters)
4. Get your API keys from:
   - Privy: https://dashboard.privy.io
   - Supabase: https://app.supabase.com
   - Solana RPC: https://www.quicknode.com or similar

Run this command to generate a template:
npm run generate-env

Error details: ${error instanceof Error ? error.message : 'Unknown error'}
      `);
    }
    
    throw error;
  }
}

async function performAdditionalChecks(): Promise<void> {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    // Client-side checks
    checkBrowserCompatibility();
  } else {
    // Server-side checks
    await checkServerSideDependencies();
  }
}

function checkBrowserCompatibility(): void {
  const requiredFeatures = [
    'localStorage',
    'sessionStorage',
    'crypto',
    'fetch',
  ];

  const missingFeatures = requiredFeatures.filter(feature => {
    try {
      return typeof (window as any)[feature] === 'undefined';
    } catch {
      return true; // Consider missing if access throws error
    }
  });

  if (missingFeatures.length > 0) {
    secureLogger.warn('Browser missing required features', { missingFeatures });
    throw new Error(`Browser does not support required features: ${missingFeatures.join(', ')}`);
  }
}

async function checkServerSideDependencies(): Promise<void> {
  // Placeholder for server-side dependency checks
  // This could include database connectivity, external API availability, etc.
  
  // Example: Check if we can connect to Supabase
  try {
    const { supabase } = await import('./supabase');
    // Test connection with a simple query
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error && error.code !== 'PGRST116') { // PGRST116 = no data found (expected for empty table)
      throw new Error(`Supabase connection test failed: ${error.message}`);
    }
  } catch (error) {
    secureLogger.error('Server-side dependency check failed', error);
    throw new Error(`Server dependency check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function isApplicationInitialized(): boolean {
  return isInitialized;
}

export function requireInitialization(): void {
  if (!isInitialized) {
    throw new Error('Application has not been initialized. Call initializeApplication() first.');
  }
}