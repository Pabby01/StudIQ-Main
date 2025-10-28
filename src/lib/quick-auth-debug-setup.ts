/**
 * Quick Auth Debug Setup
 * Provides quick debugging utilities for authentication issues
 */

import { authDebugLogger } from '@/lib/auth-debug-logger';
import { secureLogger } from '@/lib/secure-logger';

export interface QuickAuthDebugSetup {
  enableVerboseLogging: () => void;
  disableVerboseLogging: () => void;
  logCurrentAuthState: (userId?: string, state?: Record<string, unknown>) => void;
  getAuthDebugInfo: () => Record<string, unknown>;
}

class QuickAuthDebugSetupImpl implements QuickAuthDebugSetup {
  private verboseLogging = false;

  /**
   * Enable verbose authentication logging
   */
  enableVerboseLogging(): void {
    this.verboseLogging = true;
    authDebugLogger.logAuthStep(undefined, 'verbose_logging_enabled', {
      timestamp: new Date().toISOString(),
      message: 'Verbose authentication logging enabled'
    });
    
    secureLogger.info('Quick auth debug setup: Verbose logging enabled');
  }

  /**
   * Disable verbose authentication logging
   */
  disableVerboseLogging(): void {
    this.verboseLogging = false;
    authDebugLogger.logAuthStep(undefined, 'verbose_logging_disabled', {
      timestamp: new Date().toISOString(),
      message: 'Verbose authentication logging disabled'
    });
    
    secureLogger.info('Quick auth debug setup: Verbose logging disabled');
  }

  /**
   * Log current authentication state
   */
  logCurrentAuthState(userId?: string, state: Record<string, unknown> = {}): void {
    const authState = {
      userId: userId || 'unknown',
      timestamp: new Date().toISOString(),
      verboseLogging: this.verboseLogging,
      ...state
    };

    authDebugLogger.logAuthStep(userId, 'current_auth_state', authState);
    
    if (this.verboseLogging) {
      secureLogger.info('Current auth state logged', authState);
    }
  }

  /**
   * Get authentication debug information
   */
  getAuthDebugInfo(): Record<string, unknown> {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      verboseLogging: this.verboseLogging,
      recentLogs: authDebugLogger.getRecentLogs(10),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server'
    };

    return debugInfo;
  }

  /**
   * Quick authentication health check
   */
  quickAuthHealthCheck(): { healthy: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      issues.push('Not running in browser environment');
    }

    // Check for common authentication issues
    if (typeof window !== 'undefined') {
      if (!window.localStorage) {
        issues.push('LocalStorage not available');
      }
      
      if (!window.sessionStorage) {
        issues.push('SessionStorage not available');
      }
    }

    const healthy = issues.length === 0;

    authDebugLogger.logAuthStep(undefined, 'quick_auth_health_check', {
      healthy,
      issues,
      timestamp: new Date().toISOString()
    });

    return { healthy, issues };
  }

  /**
   * Log authentication timing information
   */
  logAuthTiming(step: string, duration: number, userId?: string): void {
    const timingInfo = {
      step,
      duration,
      timestamp: new Date().toISOString(),
      userId: userId || 'unknown'
    };

    authDebugLogger.logAuthStep(userId, 'auth_timing', timingInfo);

    if (this.verboseLogging) {
      secureLogger.info(`Auth timing: ${step} took ${duration}ms`, timingInfo);
    }
  }
}

export const quickAuthDebugSetup = new QuickAuthDebugSetupImpl();