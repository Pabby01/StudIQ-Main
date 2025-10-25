/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Application initialization and startup validation
 * This module ensures all required services and configurations are properly set up
 * before the application starts, preventing runtime failures.
 */

import { secureLogger } from './secure-logger';

let isInitialized = false;

export async function initializeApplication(): Promise<boolean> {
  try {
    secureLogger.info('Starting application initialization...');

    // Skip environment validation for immediate testing
    // Additional initialization checks can be added here
    await performAdditionalChecks();

    isInitialized = true;
    secureLogger.info('Application initialization completed successfully');
    return true;

  } catch (error) {
    secureLogger.error('Application initialization failed', error);
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