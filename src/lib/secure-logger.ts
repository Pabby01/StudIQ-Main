/**
 * Secure Logger Utility
 * 
 * This utility provides secure logging functionality that:
 * 1. Sanitizes sensitive data before logging
 * 2. Provides structured logging with consistent format
 * 3. Supports different log levels with appropriate filtering
 * 4. Masks or redacts sensitive information
 * 5. Includes security audit capabilities
 */

// Environment-based logging configuration
const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development'
const LOG_LEVEL = process.env.LOG_LEVEL || (IS_PRODUCTION ? 'error' : 'debug')

// Log levels in order of severity
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  security: 4
} as const

type LogLevel = keyof typeof LOG_LEVELS

// Type definitions for better type safety
type LoggableValue = string | number | boolean | null | undefined | Record<string, unknown> | unknown[] | Error | unknown
type LogContext = Record<string, LoggableValue> | LoggableValue | undefined
type LogMetadata = Record<string, LoggableValue> | undefined

// Log entry structure
type LogEntry = {
  timestamp: string;
  level: string;
  message: string;
  context?: LoggableValue;
  metadata?: LoggableValue;
  env?: string;
}

// Sensitive data patterns to sanitize
const SENSITIVE_PATTERNS = {
  // Wallet addresses (Solana/Ethereum format)
  walletAddress: /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g,
  // Email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  // Phone numbers (various formats)
  phone: /(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
  // API keys and tokens (common patterns)
  apiKey: /\b[A-Za-z0-9]{20,}\b/g,
  // JWT tokens
  jwt: /eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g,
  // Private keys
  privateKey: /-----BEGIN [A-Z ]+-----[\s\S]*?-----END [A-Z ]+-----/g,
  // Credit card numbers
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g
}

// Sensitive field names to redact
const SENSITIVE_FIELDS = new Set([
  'password',
  'token',
  'secret',
  'key',
  'privateKey',
  'apiKey',
  'accessToken',
  'refreshToken',
  'sessionToken',
  'walletAddress',
  'wallet_address',
  'email',
  'phone',
  'ssn',
  'creditCard',
  'bankAccount'
])

/**
 * Sanitizes sensitive data from strings
 */
function sanitizeString(str: string): string {
  let sanitized = str

  // Apply pattern-based sanitization
  Object.entries(SENSITIVE_PATTERNS).forEach(([type, pattern]) => {
    sanitized = sanitized.replace(pattern, (match) => {
      if (type === 'walletAddress') {
        return `${match.slice(0, 4)}...${match.slice(-4)}`
      } else if (type === 'email') {
        const [local, domain] = match.split('@')
        return `${local.slice(0, 2)}***@${domain}`
      } else if (type === 'phone') {
        return '***-***-' + match.slice(-4)
      } else {
        return '[REDACTED]'
      }
    })
  })

  return sanitized
}

/**
 * Sanitizes sensitive data from objects
 */
function sanitizeObject(obj: LoggableValue, depth = 0): LoggableValue {
  // Prevent infinite recursion
  if (depth > 5) return '[MAX_DEPTH_REACHED]'
  
  if (obj === null || obj === undefined) return obj
  
  if (typeof obj === 'string') {
    return sanitizeString(obj)
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj
  }
  
  if (obj instanceof Date) {
    return obj.toISOString()
  }
  
  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: sanitizeString(obj.message),
      stack: IS_DEVELOPMENT ? sanitizeString(obj.stack || '') : '[REDACTED]'
    }
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1))
  }
  
  if (typeof obj === 'object') {
    const sanitized: Record<string, LoggableValue> = {}
    
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase()
      
      if (SENSITIVE_FIELDS.has(key) || SENSITIVE_FIELDS.has(lowerKey)) {
        // Redact sensitive fields
        if (typeof value === 'string' && value.length > 0) {
          if (lowerKey.includes('wallet') || lowerKey.includes('address')) {
            sanitized[key] = value.length > 8 ? `${value.slice(0, 4)}...${value.slice(-4)}` : '[REDACTED]'
          } else if (lowerKey.includes('email')) {
            const emailStr = value as string
            const atIndex = emailStr.indexOf('@')
            if (atIndex > 0) {
              sanitized[key] = `${emailStr.slice(0, 2)}***@${emailStr.slice(atIndex + 1)}`
            } else {
              sanitized[key] = '[REDACTED]'
            }
          } else {
            sanitized[key] = '[REDACTED]'
          }
        } else {
          sanitized[key] = '[REDACTED]'
        }
      } else {
        sanitized[key] = sanitizeObject(value, depth + 1)
      }
    }
    
    return sanitized
  }
  
  return obj
}

/**
 * Formats log entry with consistent structure
 */
function formatLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  metadata?: LogMetadata
): string {
  const timestamp = new Date().toISOString()
  const sanitizedContext = context ? sanitizeObject(context) : undefined
  const sanitizedMetadata = metadata ? sanitizeObject(metadata) : undefined
  
  const logEntry: Record<string, unknown> = {
    timestamp,
    level: level.toUpperCase(),
    message: sanitizeString(message)
  }
  if (sanitizedContext !== undefined) {
    logEntry.context = sanitizedContext
  }
  if (sanitizedMetadata !== undefined) {
    logEntry.metadata = sanitizedMetadata
  }
  if (IS_DEVELOPMENT) {
    logEntry.env = 'development'
  }
  
  return JSON.stringify(logEntry, null, IS_DEVELOPMENT ? 2 : 0)
}

/**
 * Checks if log level should be output
 */
function shouldLog(level: LogLevel): boolean {
  const currentLevelValue = LOG_LEVELS[LOG_LEVEL as LogLevel] ?? LOG_LEVELS.info
  const messageLevelValue = LOG_LEVELS[level]
  return messageLevelValue >= currentLevelValue
}

/**
 * Core logging function
 */
function log(
  level: LogLevel,
  message: string,
  context?: LogContext,
  metadata?: LogMetadata
): void {
  if (!shouldLog(level)) return
  
  const formattedEntry = formatLogEntry(level, message, context, metadata)
  
  // Use appropriate console method based on level
  switch (level) {
    case 'debug':
      console.debug(formattedEntry)
      break
    case 'info':
      console.info(formattedEntry)
      break
    case 'warn':
      console.warn(formattedEntry)
      break
    case 'error':
    case 'security':
      console.error(formattedEntry)
      break
    default:
      console.log(formattedEntry)
  }
}

/**
 * Secure Logger Interface
 */
export const secureLogger = {
  /**
   * Debug level logging (development only)
   */
  debug: (message: string, context?: LogContext, metadata?: LogMetadata) => {
    log('debug', message, context, metadata)
  },

  /**
   * Info level logging
   */
  info: (message: string, context?: LogContext, metadata?: LogMetadata) => {
    log('info', message, context, metadata)
  },

  /**
   * Warning level logging
   */
  warn: (message: string, context?: LogContext, metadata?: LogMetadata) => {
    log('warn', message, context, metadata)
  },

  /**
   * Error level logging
   */
  error: (message: string, context?: LogContext, metadata?: LogMetadata) => {
    log('error', message, context, metadata)
  },

  /**
   * Security-related logging (always logged)
   */
  security: (message: string, context?: LogContext, metadata?: LogMetadata) => {
    log('security', message, context, { 
      ...metadata, 
      securityEvent: true,
      timestamp: new Date().toISOString()
    })
  },

  /**
   * Authentication events
   */
  auth: (event: string, userId?: string, metadata?: LogMetadata) => {
    log('security', `Auth Event: ${event}`, 
      userId ? { userId: sanitizeObject(userId) } : undefined, 
      { ...metadata, authEvent: true }
    )
  },

  /**
   * Database operation logging
   */
  database: (operation: string, table: string, context?: LogContext, metadata?: LogMetadata) => {
    log('info', `Database ${operation}: ${table}`, context, {
      ...metadata,
      dbOperation: operation,
      table
    })
  },

  /**
   * API request logging
   */
  api: (method: string, endpoint: string, statusCode: number, context?: LogContext, metadata?: LogMetadata) => {
    const level = statusCode >= 400 ? 'error' : 'info'
    log(level, `API ${method} ${endpoint} - ${statusCode}`, context, {
      ...metadata,
      apiRequest: true,
      method,
      endpoint,
      statusCode
    })
  },

  /**
   * Performance logging
   */
  performance: (operation: string, duration: number, context?: LogContext, metadata?: LogMetadata) => {
    log('info', `Performance: ${operation} took ${duration}ms`, context, {
      ...metadata,
      performanceMetric: true,
      operation,
      duration
    })
  }
}

export type { LogEntry }

/**
 * Legacy console replacement for gradual migration
 * Use this to replace existing console.log statements
 */
export const safeConsole = {
  log: (message: LoggableValue, ...args: LoggableValue[]) => {
    secureLogger.info(typeof message === 'string' ? message : 'Log message', { message, args })
  },
  
  error: (message: LoggableValue, ...args: LoggableValue[]) => {
    secureLogger.error(typeof message === 'string' ? message : 'Error occurred', { message, args })
  },
  
  warn: (message: LoggableValue, ...args: LoggableValue[]) => {
    secureLogger.warn(typeof message === 'string' ? message : 'Warning', { message, args })
  },
  
  info: (message: LoggableValue, ...args: LoggableValue[]) => {
    secureLogger.info(typeof message === 'string' ? message : 'Info message', { message, args })
  },
  
  debug: (message: LoggableValue, ...args: LoggableValue[]) => {
    secureLogger.debug(typeof message === 'string' ? message : 'Debug message', { message, args })
  }
}

/**
 * Utility functions for specific use cases
 */
export const secureLogUtils = {
  /**
   * Log user action with sanitized context
   */
  logUserAction: (action: string, userId: string, details?: LoggableValue) => {
    secureLogger.info(`User Action: ${action}`, { userId }, { action, details })
  },

  /**
   * Log error with sanitized context
   */
  logError: (error: Error, context?: LogContext, operation?: string) => {
    secureLogger.error(
      operation ? `Error in ${operation}` : 'Application error',
      { error, context },
      { operation }
    )
  },

  /**
   * Log authentication attempt
   */
  logAuthAttempt: (type: 'login' | 'logout' | 'register', userId?: string, success = true) => {
    secureLogger.auth(`${type}_${success ? 'success' : 'failure'}`, userId, { type, success })
  },

  /**
   * Log sensitive operation
   */
  logSensitiveOperation: (operation: string, userId: string, resourceId?: string) => {
    secureLogger.security(`Sensitive operation: ${operation}`, { userId }, { 
      operation, 
      resourceId,
      sensitiveOperation: true 
    })
  },

  /**
   * Mask wallet address for logging
   */
  maskWalletAddress: (address: string): string => {
    if (!address || address.length < 8) return '[INVALID_ADDRESS]'
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  },

  /**
   * Mask user ID for logging
   */
  maskUserId: (userId: string): string => {
    if (!userId || userId.length < 8) return '[INVALID_USER_ID]'
    return `${userId.slice(0, 4)}...${userId.slice(-4)}`
  }
}

export default secureLogger