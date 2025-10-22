/**
 * Secure RLS Context Manager
 * 
 * This utility manages the secure Row Level Security context for API routes,
 * ensuring proper user authorization and preventing unauthorized access.
 */

import { supabaseAdmin } from './supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { secureLogger, secureLogUtils } from './secure-logger'

export interface RLSContext {
  authenticatedUserId: string
  bypassRLS?: boolean
}

/**
 * Sets the secure RLS context for the current database session
 * This must be called at the beginning of each API route that uses supabaseAdmin
 */
export async function setSecureRLSContext(context: RLSContext): Promise<void> {
  try {
    // Use the helper function to set API context
    await (supabaseAdmin as any).rpc('set_api_context', {
      authenticated_user_id: context.authenticatedUserId,
      bypass_rls: context.bypassRLS || false
    })

    secureLogger.security('Secure RLS context set', {
      userId: secureLogUtils.maskUserId(context.authenticatedUserId),
      bypassRLS: context.bypassRLS || false,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    secureLogger.error('Failed to set secure RLS context', {
      userId: secureLogUtils.maskUserId(context.authenticatedUserId),
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    })
    throw new Error('Failed to establish secure database context')
  }
}

/**
 * Clears the RLS context at the end of the request
 * This should be called in a finally block to ensure cleanup
 */
export async function clearSecureRLSContext(): Promise<void> {
  try {
    // Use the helper function to clear API context
    await (supabaseAdmin as any).rpc('clear_api_context')

    secureLogger.security('Secure RLS context cleared', {
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    secureLogger.error('Failed to clear secure RLS context', {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    })
    // Don't throw here as this is cleanup - log the error but continue
  }
}

/**
 * Wrapper function that automatically manages RLS context for database operations
 * Use this for simple operations that don't need manual context management
 */
export async function withSecureRLSContext<T>(
  context: RLSContext,
  operation: () => Promise<T>
): Promise<T> {
  await setSecureRLSContext(context)
  
  try {
    return await operation()
  } finally {
    await clearSecureRLSContext()
  }
}

/**
 * Validates that the requesting user has permission to access the target user's data
 * This adds an additional layer of security beyond RLS policies
 */
export function validateUserAccess(
  requestingUserId: string,
  targetUserId: string,
  operation: string = 'access'
): void {
  if (requestingUserId !== targetUserId) {
    secureLogger.error('Unauthorized access attempt', {
      requestingUserId: secureLogUtils.maskUserId(requestingUserId),
      targetUserId: secureLogUtils.maskUserId(targetUserId),
      operation,
      timestamp: new Date().toISOString()
    })
    throw new Error(`Unauthorized: Cannot ${operation} data for user ${targetUserId}`)
  }
}

/**
 * Enhanced error handler that prevents sensitive information leakage
 * while maintaining useful debugging information for developers
 */
export function handleSecureRLSError(error: any, operation: string, userId?: string): never {
  // Log detailed error for debugging (server-side only)
  secureLogger.security('Secure RLS operation failed', {
    operation,
    userId: userId ? `***${userId.slice(-4)}` : 'unknown', // Partially mask user ID
    error: {
      message: error.message,
      code: error.code,
      details: error.details
    },
    timestamp: new Date().toISOString()
  })

  // Return sanitized error to client
  if (error.code === '42501') {
    throw new Error('Access denied: Insufficient permissions for this operation')
  }

  if (error.code === 'PGRST116') {
    throw new Error('Resource not found or access denied')
  }

  if (error.message?.includes('RLS')) {
    throw new Error('Security policy violation: Operation not permitted')
  }

  // Generic error for anything else to prevent information leakage
  throw new Error(`Operation failed: ${operation}`)
}

/**
 * Middleware function for API routes to automatically handle RLS context
 * Use this as a wrapper around your API route handlers
 */
export function withSecureRLS(
  handler: (context: RLSContext) => Promise<Response>
) {
  return async (request: Request): Promise<Response> => {
    let rlsContext: RLSContext | null = null

    try {
      // Extract user ID from request (this should be set by your auth middleware)
      const userId = request.headers.get('x-authenticated-user-id')
      
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      }

      rlsContext = { authenticatedUserId: userId }
      await setSecureRLSContext(rlsContext)

      return await handler(rlsContext)
    } catch (error) {
      handleSecureRLSError(error, 'API request', rlsContext?.authenticatedUserId)
    } finally {
      if (rlsContext) {
        await clearSecureRLSContext()
      }
    }
  }
}

/**
 * Type guard to check if an error is RLS-related
 */
export function isRLSError(error: any): boolean {
  return error.code === '42501' || 
         error.message?.includes('RLS') ||
         error.message?.includes('Row Level Security')
}

/**
 * Audit logging for sensitive operations
 * This helps track access patterns and potential security issues
 */
export function auditSecureOperation(
  operation: string,
  userId: string,
  resourceId?: string,
  metadata?: Record<string, any>
): void {
  secureLogger.security('Security audit log', {
    operation,
    userId: secureLogUtils.maskUserId(userId),
    resourceId,
    metadata,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server'
  })
}

export default {
  setSecureRLSContext,
  clearSecureRLSContext,
  withSecureRLSContext,
  validateUserAccess,
  handleSecureRLSError,
  withSecureRLS,
  isRLSError,
  auditSecureOperation
}
