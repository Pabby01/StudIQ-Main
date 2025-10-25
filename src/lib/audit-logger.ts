/**
 * Audit Logger Service
 * Provides comprehensive logging for security events, transactions, and violations
 */

export interface AuditLogEntry {
  timestamp: number;
  userId: string;
  action: string;
  details: Record<string, unknown>;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export interface RateLimitViolation {
  userId: string;
  action: string;
  violationType: string;
  timestamp: number;
  details: Record<string, unknown>;
}

export interface ValidationViolation {
  userId: string;
  walletAddress: string;
  action: string;
  violationType: string;
  details: Record<string, unknown>;
}

export interface RLSViolation {
  userId: string;
  table: string;
  action: string;
  policy: string;
  timestamp: number;
}

class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private maxLogs = 10000;

  /**
   * Log a general audit event
   */
  log(entry: AuditLogEntry): void {
    this.logs.push(entry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // In production, you would send this to a logging service
    console.log(`[AUDIT] ${entry.severity.toUpperCase()}: ${entry.action} - User: ${entry.userId}`, entry.details);
  }

  /**
   * Log rate limit violations
   */
  logRateLimitViolation(violation: RateLimitViolation): void {
    this.log({
      timestamp: violation.timestamp,
      userId: violation.userId,
      action: violation.action,
      details: {
        type: 'rate_limit_violation',
        violationType: violation.violationType,
        ...violation.details
      },
      severity: 'warning'
    });
  }

  /**
   * Log validation violations
   */
  logValidationViolation(violation: ValidationViolation): void {
    this.log({
      timestamp: Date.now(),
      userId: violation.userId,
      action: violation.action,
      details: {
        type: 'validation_violation',
        walletAddress: violation.walletAddress,
        violationType: violation.violationType,
        ...violation.details
      },
      severity: 'warning'
    });
  }

  /**
   * Log RLS (Row Level Security) violations
   */
  logRLSViolation(violation: RLSViolation): void {
    this.log({
      timestamp: violation.timestamp,
      userId: violation.userId,
      action: violation.action,
      details: {
        type: 'rls_violation',
        table: violation.table,
        policy: violation.policy
      },
      severity: 'error'
    });
  }

  /**
   * Log transaction events
   */
  logTransaction(userId: string, action: string, details: Record<string, unknown>): void {
    this.log({
      timestamp: Date.now(),
      userId,
      action,
      details: {
        type: 'transaction',
        ...details
      },
      severity: 'info'
    });
  }

  /**
   * Log security events
   */
  logSecurityEvent(userId: string, action: string, details: Record<string, unknown>, severity: 'info' | 'warning' | 'error' | 'critical' = 'info'): void {
    this.log({
      timestamp: Date.now(),
      userId,
      action,
      details: {
        type: 'security_event',
        ...details
      },
      severity
    });
  }

  /**
   * Get recent audit logs
   */
  getRecentLogs(limit: number = 100): AuditLogEntry[] {
    return this.logs.slice(-limit);
  }

  /**
   * Get logs by user ID
   */
  getLogsByUser(userId: string, limit: number = 100): AuditLogEntry[] {
    return this.logs
      .filter(log => log.userId === userId)
      .slice(-limit);
  }

  /**
   * Get logs by action
   */
  getLogsByAction(action: string, limit: number = 100): AuditLogEntry[] {
    return this.logs
      .filter(log => log.action === action)
      .slice(-limit);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();
export default AuditLogger;