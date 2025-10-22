/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { UserProfileManager, UserStatsManager, UserPreferencesManager } from '@/lib/database-utils'
import { secureLogger } from '@/lib/secure-logger'
import { 
  validateUserAuthWithRLS, 
  cleanupSecureAuth,
  checkRateLimit,
  sanitizeInput
} from '@/lib/auth-middleware'

export interface BatchUserData {
  profile?: any
  stats?: any
  preferences?: any
}

export interface BatchUpsertRequest {
  user_id: string
  profile?: any
  stats?: any
  preferences?: any
}

export interface BatchUpsertResponse {
  success: boolean
  data: BatchUserData
  errors?: {
    profile?: string
    stats?: string
    preferences?: string
  }
}

/**
 * GET /api/user/batch - Retrieve all user data in a single request
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'user_id parameter is required' },
        { status: 400 }
      )
    }

    // Rate limiting check
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
    const rateLimit = checkRateLimit(`batch_get_${clientIP}`, 30, 60000) // 30 requests per minute
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString()
          }
        }
      )
    }

    // Validate user authentication with secure RLS context
    const authResult = await validateUserAuthWithRLS(request, userId, 'read')
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode }
      )
    }

    try {
      // Sanitize the user ID input
      const sanitizedUserId = sanitizeInput(userId, 100)

      // Perform all queries in parallel for optimal performance
      const [profileResult, statsResult, preferencesResult] = await Promise.allSettled([
        UserProfileManager.getProfile(sanitizedUserId),
        UserStatsManager.getStats(sanitizedUserId),
        UserPreferencesManager.getPreferences(sanitizedUserId)
      ])

      const batchData: BatchUserData = {}

      // Handle profile result
      if (profileResult.status === 'fulfilled') {
        batchData.profile = profileResult.value
      }

      // Handle stats result
      if (statsResult.status === 'fulfilled') {
        batchData.stats = statsResult.value
      }

      // Handle preferences result
      if (preferencesResult.status === 'fulfilled') {
        batchData.preferences = preferencesResult.value
      }

      return NextResponse.json({ 
        success: true,
        data: batchData 
      }, { status: 200 })

    } finally {
      await cleanupSecureAuth()
    }

  } catch (error) {
    // Log error without exposing sensitive details
    secureLogger.error('Batch GET error', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: '[REDACTED]'
    })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/user/batch - Upsert all user data in a single atomic operation
 */
export async function POST(request: NextRequest) {
  let requestData: BatchUpsertRequest | undefined
  
  try {
    requestData = await request.json()
    
    // Validate that requestData exists and has required fields
    if (!requestData || !requestData.user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    // At this point, requestData is guaranteed to be defined
    const validatedRequestData = requestData as BatchUpsertRequest

    // Rate limiting check - more restrictive for batch operations
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
    const rateLimit = checkRateLimit(`batch_post_${clientIP}`, 10, 60000) // 10 batch operations per minute
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString()
          }
        }
      )
    }

    // Validate user authentication with secure RLS context
    const authResult = await validateUserAuthWithRLS(request, validatedRequestData.user_id, 'write')
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode }
      )
    }

    try {
      // Sanitize the user ID input
      const sanitizedUserId = sanitizeInput(validatedRequestData.user_id, 100)

      // Prepare operations array
      const operations: Promise<any>[] = []
      const operationTypes: string[] = []

      // Add profile upsert if provided
      if (validatedRequestData.profile) {
        const sanitizedProfile = {
          ...validatedRequestData.profile,
          user_id: sanitizedUserId,
          display_name: validatedRequestData.profile.display_name ? 
            sanitizeInput(validatedRequestData.profile.display_name, 100) : undefined,
          email: validatedRequestData.profile.email ? 
            sanitizeInput(validatedRequestData.profile.email, 255) : undefined,
          phone: validatedRequestData.profile.phone ? 
            sanitizeInput(validatedRequestData.profile.phone, 20) : undefined,
          wallet_address: sanitizedUserId
        }
        operations.push(UserProfileManager.upsertProfile(sanitizedProfile))
        operationTypes.push('profile')
      }

      // Add stats upsert if provided
      if (validatedRequestData.stats) {
        const sanitizedStats = {
          ...validatedRequestData.stats,
          user_id: sanitizedUserId
        }
        operations.push(UserStatsManager.upsertStats(sanitizedStats))
        operationTypes.push('stats')
      }

      // Add preferences upsert if provided
      if (validatedRequestData.preferences) {
        const sanitizedPreferences = {
          ...validatedRequestData.preferences,
          user_id: sanitizedUserId,
          theme: validatedRequestData.preferences.theme ? 
            sanitizeInput(validatedRequestData.preferences.theme, 20) : undefined,
          language: validatedRequestData.preferences.language ? 
            sanitizeInput(validatedRequestData.preferences.language, 10) : undefined
        }

        // Validate theme and language values
        const validThemes = ['light', 'dark', 'system']
        const validLanguages = ['en', 'es', 'fr', 'de', 'zh', 'ja']
        
        if (sanitizedPreferences.theme && !validThemes.includes(sanitizedPreferences.theme)) {
          return NextResponse.json(
            { error: 'Invalid theme value' },
            { status: 400 }
          )
        }

        if (sanitizedPreferences.language && !validLanguages.includes(sanitizedPreferences.language)) {
          return NextResponse.json(
            { error: 'Invalid language value' },
            { status: 400 }
          )
        }

        operations.push(UserPreferencesManager.upsertPreferences(sanitizedPreferences))
        operationTypes.push('preferences')
      }

      // If no operations to perform, return error
      if (operations.length === 0) {
        return NextResponse.json(
          { error: 'At least one data type (profile, stats, or preferences) must be provided' },
          { status: 400 }
        )
      }

      // Execute all operations in parallel
      const results = await Promise.allSettled(operations)

      // Process results
      const batchData: BatchUserData = {}
      const errors: { [key: string]: string } = {}
      let hasErrors = false

      results.forEach((result, index) => {
        const operationType = operationTypes[index]
        
        if (result.status === 'fulfilled') {
          batchData[operationType as keyof BatchUserData] = result.value
        } else {
          hasErrors = true
          errors[operationType] = result.reason instanceof Error ? 
            result.reason.message : 'Unknown error'
          
          secureLogger.error(`Batch ${operationType} upsert error`, {
            timestamp: new Date().toISOString(),
            error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
            userId: '[REDACTED]'
          })
        }
      })

      const response: BatchUpsertResponse = {
        success: !hasErrors,
        data: batchData
      }

      if (hasErrors) {
        response.errors = errors
      }

      return NextResponse.json(response, { 
        status: hasErrors ? 207 : 201 // 207 Multi-Status for partial success
      })

    } finally {
      await cleanupSecureAuth()
    }

  } catch (error) {
    // Log error without exposing sensitive details
    secureLogger.error('Batch POST error', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: requestData?.user_id ? '[REDACTED]' : 'none'
    })
    
    return NextResponse.json(
      { error: 'Failed to process batch operation' },
      { status: 500 }
    )
  }
}