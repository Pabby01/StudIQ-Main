/**
 * Auth Debug Logger
 * Provides secure logging for authentication debugging
 */

import { secureLogger } from './secure-logger';

export interface AuthDebugLog {
  timestamp: string;
  userId?: string;
  action: string;
  details: Record<string, unknown>;
  severity: 'info' | 'warning' | 'error' | 'debug';
}

class AuthDebugLogger {
  private logs: AuthDebugLog[] = [];
  private maxLogs = 1000;

  /**
   * Log authentication debug information
   */
  log(logEntry: AuthDebugLog): void {
    this.logs.push(logEntry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Also log to secure logger
    secureLogger.info(`[AUTH_DEBUG] ${logEntry.action}`, {
      userId: logEntry.userId,
      details: logEntry.details,
      timestamp: logEntry.timestamp
    });
  }

  /**
   * Get recent authentication debug logs
   */
  getRecentLogs(limit = 50): AuthDebugLog[] {
    return this.logs.slice(-limit);
  }

  /**
   * Clear all debug logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Log authentication flow step
   */
  logAuthStep(userId: string | undefined, step: string, details: Record<string, unknown> = {}): void {
    this.log({
      timestamp: new Date().toISOString(),
      userId,
      action: step,
      details,
      severity: 'info'
    });
  }

  /**
   * Log authentication error
   */
  logAuthError(userId: string | undefined, error: string, details: Record<string, unknown> = {}): void {
    this.log({
      timestamp: new Date().toISOString(),
      userId,
      action: 'auth_error',
      details: { error, ...details },
      severity: 'error'
    });
  }

  /**
   * Log token validation
   */
  logTokenValidation(userId: string | undefined, tokenType: string, isValid: boolean, details: Record<string, unknown> = {}): void {
    this.log({
      timestamp: new Date().toISOString(),
      userId,
      action: 'token_validation',
      details: { tokenType, isValid, ...details },
      severity: isValid ? 'info' : 'error'
    });
  }
}

export const authDebugLogger = new AuthDebugLogger();