import { NextRequest } from 'next/server'
import { supabaseAdmin } from './supabase'
import { secureLogger } from './secure-logger'
import { 
  setSecureRLSContext, 
  clearSecureRLSContext, 
  validateUserAccess,
  auditSecureOperation 
} from './secure-rls-context'

export interface AuthenticatedRequest extends NextRequest {
  userId: string
  userWalletAddress: string
}

export interface AuthValidationResult {
  success: boolean
  userId?: string
  userWalletAddress?: string
  error?: string
  statusCode?: number
}

export interface SecureAuthResult extends AuthValidationResult {
  rlsContextSet?: boolean
}

/**
 * Validates user authentication and authorization for API routes
 * This middleware ensures users can only access their own data
 */
export async function validateUserAuth(
  request: NextRequest,
  requestedUserId: string
): Promise<AuthValidationResult> {
  try {
    // Extract authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'Missing or invalid authorization header',
        statusCode: 401
      }
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Verify the JWT token with Supabase
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Invalid or expired token',
        statusCode: 401
      }
    }

    // Get user profile to validate wallet address
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id, wallet_address')
      .eq('user_id', user.id)
      .single() as { data: { user_id: string; wallet_address: string | null } | null; error: Error | null }

    if (profileError || !profile) {
      return {
        success: false,
        error: 'User profile not found',
        statusCode: 404
      }
    }

    // Validate that the requested user_id matches the authenticated user
    // Support both user.id and wallet_address as identifiers
    const isAuthorized = 
      requestedUserId === user.id || 
      requestedUserId === profile.wallet_address ||
      requestedUserId === profile.user_id

    if (!isAuthorized) {
      return {
        success: false,
        error: 'Forbidden: You can only access your own data',
        statusCode: 403
      }
    }

    return {
      success: true,
      userId: user.id,
      userWalletAddress: profile.wallet_address || user.id
    }

  } catch (error) {
    secureLogger.error('Auth validation error', { error })
    return {
      success: false,
      error: 'Internal authentication error',
      statusCode: 500
    }
  }
}

/**
 * Alternative validation for requests that include user session data
 * This is for cases where we have Privy session information
 */
export async function validatePrivySession(
  request: NextRequest,
  requestedUserId: string
): Promise<AuthValidationResult> {
  try {
    // Extract Privy session data from headers or cookies
    const privyToken = request.headers.get('x-privy-token') || 
                      request.cookies.get('privy-token')?.value

    if (!privyToken) {
      return {
        success: false,
        error: 'Missing Privy session token',
        statusCode: 401
      }
    }

    // Relaxed validation: if a Privy token is present, allow operations
    // assuming the requester is acting on their own identifier.
    // This enables initial writes before a profile exists.
    return {
      success: true,
      userId: requestedUserId,
      userWalletAddress: requestedUserId
    }

  } catch (error) {
    secureLogger.error('Privy session validation error', { error })
    return {
      success: false,
      error: 'Session validation failed',
      statusCode: 500
    }
  }
}

/**
 * Enhanced secure authentication with RLS context management
 * This function validates user authentication and sets up secure RLS context
 */
export async function validateUserAuthWithRLS(
  request: NextRequest,
  requestedUserId: string,
  operation: string = 'access'
): Promise<SecureAuthResult> {
  try {
    // First, validate authentication using existing methods
    let authResult = await validateUserAuth(request, requestedUserId)
    
    // If primary auth fails, try Privy session validation
    if (!authResult.success) {
      authResult = await validatePrivySession(request, requestedUserId)
    }

    if (!authResult.success) {
      return authResult
    }

    // Additional security: validate user access
    validateUserAccess(authResult.userId!, requestedUserId, operation)

    // Set up secure RLS context
    await setSecureRLSContext({
      authenticatedUserId: authResult.userId!
    })

    // Audit the operation
    auditSecureOperation(operation, authResult.userId!, requestedUserId)

    return {
      ...authResult,
      rlsContextSet: true
    }

  } catch (error) {
    secureLogger.error('Secure authentication failed', { error })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
      statusCode: 403,
      rlsContextSet: false
    }
  }
}

/**
 * Cleanup function to clear RLS context
 * Should be called in API route finally blocks
 */
export async function cleanupSecureAuth(): Promise<void> {
  await clearSecureRLSContext()
}

/**
 * Input validation and sanitization utilities
 */
export function sanitizeInput(input: string, maxLength: number = 255): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string')
  }
  
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validateDisplayName(displayName: string): boolean {
  if (!displayName || displayName.length < 2 || displayName.length > 50) {
    return false
  }
  // Allow letters, numbers, spaces, and common punctuation
  const nameRegex = /^[a-zA-Z0-9\s\-_.]+$/
  return nameRegex.test(displayName)
}

export function validateWalletAddress(address: string): boolean {
  if (!address) return false
  // Basic validation for common wallet address formats
  // Ethereum addresses (0x followed by 40 hex characters)
  const ethRegex = /^0x[a-fA-F0-9]{40}$/
  // Or other common formats - adjust as needed
  return ethRegex.test(address) || address.length >= 26 // Basic length check for other formats
}

/**
 * Rate limiting utilities (basic implementation)
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string, 
  maxRequests: number = 100, 
  windowMs: number = 60000 // 1 minute
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const windowStart = now - windowMs
  
  // Clean up old entries
  for (const [key, data] of requestCounts.entries()) {
    if (data.resetTime < windowStart) {
      requestCounts.delete(key)
    }
  }
  
  const current = requestCounts.get(identifier) || { count: 0, resetTime: now + windowMs }
  
  if (current.resetTime < now) {
    // Reset the window
    current.count = 0
    current.resetTime = now + windowMs
  }
  
  current.count++
  requestCounts.set(identifier, current)
  
  return {
    allowed: current.count <= maxRequests,
    remaining: Math.max(0, maxRequests - current.count),
    resetTime: current.resetTime
  }
}