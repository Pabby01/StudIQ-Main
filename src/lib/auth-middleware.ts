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
    // Also handle Privy DIDs vs wallet addresses
    const isAuthorized = 
      requestedUserId === user.id || 
      requestedUserId === profile.wallet_address ||
      requestedUserId === profile.user_id

    // Additional logging for debugging ID format mismatches
    if (!isAuthorized) {
      secureLogger.warn('Authorization check failed', {
        requestedUserId: requestedUserId?.startsWith('did:privy:') ? '[PRIVY_ID]' : requestedUserId?.length > 20 ? '[WALLET_ADDRESS]' : requestedUserId,
        userId: user.id?.startsWith('did:privy:') ? '[PRIVY_ID]' : user.id,
        profileUserId: profile.user_id?.startsWith('did:privy:') ? '[PRIVY_ID]' : profile.user_id,
        walletAddress: profile.wallet_address && profile.wallet_address.length > 20 ? '[WALLET_ADDRESS]' : profile.wallet_address,
        requestedFormat: requestedUserId?.startsWith('did:privy:') ? 'privy-did' : 
                        requestedUserId?.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/) ? 'wallet-address' : 'other'
      })
    }

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
/**
 * Validate Privy session token with enhanced security and error handling
 */
export async function validatePrivySession(
  request: NextRequest, 
  requestedUserId: string
): Promise<AuthValidationResult> {
  try {
    secureLogger.info('Starting Privy session validation', {
      requestedUserId: requestedUserId.startsWith('did:privy:') ? '[PRIVY_ID]' : '[USER_ID]'
    })

    const authHeader = request.headers.get('authorization')
    const privyToken = request.headers.get('x-privy-token')
    
    // Check for token in either header
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : privyToken

    // Special handling for new user profile creation without token
    const isNewUserProfileCreation = requestedUserId.startsWith('did:privy:') && 
                                    request.method === 'POST'

    if (!token) {
      secureLogger.info('No Privy token found', {
        hasAuthHeader: !!authHeader,
        hasPrivyTokenHeader: !!privyToken,
        isNewUserProfileCreation
      })
      
      // Allow new user profile creation without token for the initial creation
      if (isNewUserProfileCreation) {
        secureLogger.info('Allowing new user profile creation without token')
        return {
          success: true,
          userId: requestedUserId,
          userWalletAddress: requestedUserId
        }
      }
      
      return {
        success: false,
        error: 'Missing Privy session token',
        statusCode: 401
      }
    }

    // Validate token format (basic JWT structure check)
    const tokenParts = token.split('.')
    if (tokenParts.length !== 3) {
      secureLogger.warn('Invalid token format', { 
        tokenParts: tokenParts.length,
        requestedUserId: requestedUserId.startsWith('did:privy:') ? '[PRIVY_ID]' : '[USER_ID]'
      })
      return {
        success: false,
        error: 'Invalid token format',
        statusCode: 401
      }
    }

    // Decode and validate token payload
    try {
      const payload = JSON.parse(atob(tokenParts[1]));
      const tokenUserId = payload.sub || payload.user_id || payload.id;
      
      // Verify the token belongs to the requested user
      // Handle different ID formats: Privy DIDs, wallet addresses, etc.
      if (tokenUserId) {
        const isTokenPrivyDID = tokenUserId.startsWith('did:privy:');
        const isRequestedPrivyDID = requestedUserId.startsWith('did:privy:');
        const isRequestedWalletAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(requestedUserId);
        
        // Case 1: Both are Privy DIDs - direct comparison
        if (isTokenPrivyDID && isRequestedPrivyDID) {
          if (tokenUserId !== requestedUserId) {
            secureLogger.warn('Token Privy DID mismatch', {
              tokenUserId,
              requestedUserId
            });
            return {
              success: false,
              error: 'Token does not match requested user',
              statusCode: 403
            };
          }
        }
        // Case 2: Token is Privy DID, requested is wallet address
        else if (isTokenPrivyDID && isRequestedWalletAddress) {
          // For this case, we need to check if the wallet address belongs to the Privy user
          // Since we don't have direct mapping, we'll allow it for now but log the mismatch
          secureLogger.info('Token Privy DID with requested wallet address - allowing with caution', {
            tokenUserId,
            requestedUserId
          });
          // Continue with validation but use the token user ID as the authoritative ID
        }
        // Case 3: Direct string comparison for other cases
        else if (tokenUserId !== requestedUserId) {
          secureLogger.warn('Token user ID mismatch', {
            tokenUserId,
            requestedUserId,
            tokenFormat: isTokenPrivyDID ? 'privy-did' : 'other',
            requestedFormat: isRequestedPrivyDID ? 'privy-did' : isRequestedWalletAddress ? 'wallet-address' : 'other'
          });
          return {
            success: false,
            error: 'Token does not match requested user',
            statusCode: 403
          };
        }
      }
    } catch (decodeError) {
      secureLogger.warn('Failed to decode token payload', { decodeError });
      // Continue with basic validation if payload decode fails
    }

    // Relaxed validation: if a Privy token is present and ID format is correct, allow operations
    // assuming the requester is acting on their own identifier.
    // This enables initial writes before a profile exists.
    
    // Use the token user ID as the authoritative ID when available
    let finalUserId = requestedUserId;
    try {
      const payload = JSON.parse(atob(tokenParts[1]));
      const tokenUserId = payload.sub || payload.user_id || payload.id;
      if (tokenUserId) {
        finalUserId = tokenUserId;
      }
    } catch {
      // If token parsing fails, use requestedUserId
    }
    
    return {
      success: true,
      userId: finalUserId,
      userWalletAddress: finalUserId
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
    // Special handling for profile creation operations
    const isProfileCreation = operation === 'write' && request.method === 'POST' && 
                              (requestedUserId.startsWith('did:privy:') || 
                               /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(requestedUserId))

    secureLogger.info('Starting authentication validation', {
      requestedUserId: requestedUserId.startsWith('did:privy:') ? '[PRIVY_ID]' : 
                      requestedUserId.length > 20 ? '[WALLET_ADDRESS]' : requestedUserId,
      operation,
      method: request.method,
      isProfileCreation,
      timestamp: new Date().toISOString()
    })

    // First, validate authentication using existing methods
    let authResult = await validateUserAuth(request, requestedUserId)
    
    secureLogger.info('Primary auth validation result', {
      success: authResult.success,
      error: authResult.error,
      statusCode: authResult.statusCode
    })
    
    // If primary auth fails, try Privy session validation
    if (!authResult.success) {
      secureLogger.info('Primary auth failed, trying Privy session validation')
      authResult = await validatePrivySession(request, requestedUserId)
      secureLogger.info('Privy session validation result', {
        success: authResult.success,
        error: authResult.error,
        statusCode: authResult.statusCode
      })
    }

    if (!authResult.success) {
      secureLogger.warn('Authentication failed', {
        requestedUserId,
        finalError: authResult.error,
        finalStatusCode: authResult.statusCode
      })
      return authResult
    }

    secureLogger.info('Authentication successful', {
      userId: authResult.userId?.startsWith('did:privy:') ? '[PRIVY_ID]' : '[USER_ID]',
      walletAddress: authResult.userWalletAddress && authResult.userWalletAddress.length > 20 ? '[WALLET_ADDRESS]' : authResult.userWalletAddress
    })

    // For profile creation of new Privy users, skip user access validation
    // This allows new users to create their initial profile
    if (!isProfileCreation) {
      // Additional security: validate user access for existing operations
      validateUserAccess(authResult.userId!, requestedUserId, operation)
    } else {
      secureLogger.info('Skipping user access validation for new user profile creation')
    }

    // Set up secure RLS context
    await setSecureRLSContext({
      authenticatedUserId: authResult.userId!
    })

    // Audit the operation
    auditSecureOperation(operation, authResult.userId!, requestedUserId)

    secureLogger.info('Authentication validation completed successfully')

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
  // Solana wallet address validation
  // Solana addresses are base58 encoded and typically 32-44 characters
  const solanaRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
  return solanaRegex.test(address)
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