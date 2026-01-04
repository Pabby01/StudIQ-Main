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
 * Validate wallet session from localStorage/cookies
 * This replaces Privy session validation
 */
export async function validateWalletSession(
  request: NextRequest,
  requestedUserId: string
): Promise<AuthValidationResult> {
  try {
    secureLogger.info('Starting wallet session validation', {
      requestedUserId: requestedUserId.length > 20 ? '[WALLET_ADDRESS]' : requestedUserId
    })

    // Get session from cookie or Authorization header
    const authHeader = request.headers.get('authorization')
    const cookieHeader = request.headers.get('cookie')

    let walletAddress: string | null = null

    // Try to extract wallet address from Authorization header
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      // For wallet auth, the "token" is just the wallet address
      if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(token)) {
        walletAddress = token
      }
    }

    // If not in auth header, try cookies
    if (!walletAddress && cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=')
        acc[key] = value
        return acc
      }, {} as Record<string, string>)

      // Try to get session from cookie
      const sessionCookie = cookies['studiq_wallet_session']
      if (sessionCookie) {
        try {
          const sessionData = JSON.parse(decodeURIComponent(sessionCookie))
          if (sessionData.walletAddress) {
            walletAddress = sessionData.walletAddress
          }
        } catch (e) {
          secureLogger.warn('Failed to parse session cookie', { error: e })
        }
      }
    }

    // If still no wallet address, check if it's in the request body for POST requests
    if (!walletAddress && request.method === 'POST') {
      // For initial profile creation, we'll validate later
      if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(requestedUserId)) {
        walletAddress = requestedUserId
        secureLogger.info('Using requested wallet address for POST request')
      }
    }

    if (!walletAddress) {
      return {
        success: false,
        error: 'No wallet session found',
        statusCode: 401
      }
    }

    // Validate wallet address format
    if (!validateWalletAddress(walletAddress)) {
      return {
        success: false,
        error: 'Invalid wallet address format',
        statusCode: 401
      }
    }

    // Verify the wallet address matches the requested user ID
    const isAuthorized = walletAddress === requestedUserId

    if (!isAuthorized) {
      secureLogger.warn('Wallet address mismatch', {
        sessionWallet: walletAddress.substring(0, 8) + '...',
        requestedId: requestedUserId.substring(0, 8) + '...'
      })
      return {
        success: false,
        error: 'Forbidden: Wallet address mismatch',
        statusCode: 403
      }
    }

    secureLogger.info('Wallet session validation successful', {
      walletAddress: walletAddress.substring(0, 8) + '...'
    })

    return {
      success: true,
      userId: walletAddress,
      userWalletAddress: walletAddress
    }

  } catch (error) {
    secureLogger.error('Wallet session validation error', { error })
    return {
      success: false,
      error: 'Session validation failed',
      statusCode: 500
    }
  }
}

/**
 * Enhanced secure authentication with RLS context management
 * Now uses wallet-only authentication (Privy removed)
 */
export async function validateUserAuthWithRLS(
  request: NextRequest,
  requestedUserId: string,
  operation: string = 'access'
): Promise<SecureAuthResult> {
  try {
    // Special handling for profile creation operations
    const isProfileCreation = operation === 'write' && request.method === 'POST' &&
      /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(requestedUserId)

    secureLogger.info('Starting authentication validation', {
      requestedUserId: requestedUserId.length > 20 ? '[WALLET_ADDRESS]' : requestedUserId,
      operation,
      method: request.method,
      isProfileCreation,
      timestamp: new Date().toISOString()
    })

    // Validate wallet session
    const authResult = await validateWalletSession(request, requestedUserId)

    secureLogger.info('Wallet session validation result', {
      success: authResult.success,
      error: authResult.error,
      statusCode: authResult.statusCode
    })

    if (!authResult.success) {
      secureLogger.warn('Authentication failed', {
        requestedUserId,
        finalError: authResult.error,
        finalStatusCode: authResult.statusCode
      })
      return authResult
    }

    secureLogger.info('Authentication successful', {
      userId: authResult.userId?.substring(0, 8) + '...',
      walletAddress: authResult.userWalletAddress?.substring(0, 8) + '...'
    })

    // For profile creation of new users, skip user access validation
    // This allows new users to create their initial profile
    if (!isProfileCreation) {
      const isTargetOwnId = requestedUserId === authResult.userId || requestedUserId === authResult.userWalletAddress
      if (!isTargetOwnId) {
        validateUserAccess(authResult.userId!, requestedUserId, operation)
      }
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
    .replace(/[<>"'&]/g, '') // Remove potentially dangerous characters
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