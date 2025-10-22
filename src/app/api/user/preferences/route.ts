/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { UserPreferencesManager } from '@/lib/database-utils'
import { secureLogger } from '@/lib/secure-logger'
import { 
  validateUserAuthWithRLS, 
  cleanupSecureAuth, 
  checkRateLimit,
  sanitizeInput
} from '@/lib/auth-middleware'

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
    const rateLimit = checkRateLimit(`preferences_get_${clientIP}`, 60, 60000) // 60 requests per minute
    
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

      const preferences = await UserPreferencesManager.getPreferences(sanitizedUserId)
      
      if (!preferences) {
        return NextResponse.json(
          { error: 'User preferences not found' },
          { status: 404 }
        )
      }
      
      return NextResponse.json({ preferences }, { status: 200 })
    } finally {
      await cleanupSecureAuth()
    }
  } catch (error) {
    // Log error without exposing sensitive details
    secureLogger.error('Preferences GET error', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: request.url.includes('user_id') ? '[REDACTED]' : 'none'
    })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  let preferencesData: any
  
  try {
    preferencesData = await request.json()
    
    // Validate required fields
    if (!preferencesData.user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    // Rate limiting check
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
    const rateLimit = checkRateLimit(`preferences_post_${clientIP}`, 20, 60000) // 20 creates per minute
    
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
    const authResult = await validateUserAuthWithRLS(request, preferencesData.user_id, 'write')
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode }
      )
    }

    // Sanitize input data
    const sanitizedData = {
      ...preferencesData,
      user_id: sanitizeInput(preferencesData.user_id, 100),
      theme: preferencesData.theme ? sanitizeInput(preferencesData.theme, 20) : undefined,
      language: preferencesData.language ? sanitizeInput(preferencesData.language, 10) : undefined
    }

    // Validate theme and language values
    const validThemes = ['light', 'dark', 'system']
    const validLanguages = ['en', 'es', 'fr', 'de', 'zh', 'ja']
    
    if (sanitizedData.theme && !validThemes.includes(sanitizedData.theme)) {
      return NextResponse.json(
        { error: 'Invalid theme value' },
        { status: 400 }
      )
    }

    if (sanitizedData.language && !validLanguages.includes(sanitizedData.language)) {
      return NextResponse.json(
        { error: 'Invalid language value' },
        { status: 400 }
      )
    }

    try {
      // Check if preferences already exist
      const existingPreferences = await UserPreferencesManager.getPreferences(sanitizedData.user_id)
      if (existingPreferences) {
        return NextResponse.json({ preferences: existingPreferences }, { status: 200 })
      }

      // Create the user preferences using the server-side admin client
      const preferences = await UserPreferencesManager.createPreferences(sanitizedData)
      
      return NextResponse.json({ preferences }, { status: 201 })
    } finally {
      await cleanupSecureAuth()
    }
  } catch (error) {
    // Handle race condition: if preferences were created by another request
    if (error instanceof Error && (error.message.includes('Data already exists') || error.message.includes('duplicate key value violates unique constraint')) && preferencesData?.user_id) {
      try {
        const sanitizedUserId = sanitizeInput(preferencesData.user_id, 100)
        const existingPreferences = await UserPreferencesManager.getPreferences(sanitizedUserId)
        if (existingPreferences) {
          return NextResponse.json({ preferences: existingPreferences }, { status: 200 })
        }
      } catch (fetchError) {
        secureLogger.error('Preferences POST race condition recovery error', {
          timestamp: new Date().toISOString(),
          error: fetchError instanceof Error ? fetchError.message : 'Unknown error'
        })
      }
    }
    
    // Log error without exposing sensitive details
    secureLogger.error('Preferences POST error', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: preferencesData?.user_id ? '[REDACTED]' : 'none'
    })
    
    return NextResponse.json(
      { error: 'Failed to create user preferences' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const preferencesData = await request.json()
    
    // Validate required fields
    if (!preferencesData.user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    // Rate limiting check
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
    const rateLimit = checkRateLimit(`preferences_put_${clientIP}`, 30, 60000) // 30 updates per minute
    
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
    const authResult = await validateUserAuthWithRLS(request, preferencesData.user_id, 'write')
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode }
      )
    }

    // Sanitize input data
    const sanitizedPreferencesData = {
      ...preferencesData,
      user_id: sanitizeInput(preferencesData.user_id, 100),
      theme: preferencesData.theme ? sanitizeInput(preferencesData.theme, 20) : undefined,
      language: preferencesData.language ? sanitizeInput(preferencesData.language, 10) : undefined
    }

    // Validate theme and language values if provided
    const validThemes = ['light', 'dark', 'system']
    const validLanguages = ['en', 'es', 'fr', 'de', 'zh', 'ja']
    
    if (sanitizedPreferencesData.theme && !validThemes.includes(sanitizedPreferencesData.theme)) {
      return NextResponse.json(
        { error: 'Invalid theme value' },
        { status: 400 }
      )
    }

    if (sanitizedPreferencesData.language && !validLanguages.includes(sanitizedPreferencesData.language)) {
      return NextResponse.json(
        { error: 'Invalid language value' },
        { status: 400 }
      )
    }

    try {
      // Check if this is an upsert operation
      if (sanitizedPreferencesData.upsert) {
        // Remove the upsert flag before passing to the database
        const { upsert, ...cleanPreferencesData } = sanitizedPreferencesData
        const preferences = await UserPreferencesManager.upsertPreferences(cleanPreferencesData)
        return NextResponse.json({ preferences }, { status: 200 })
      }

      // Regular update operation
      const { user_id, ...updates } = sanitizedPreferencesData
      const sanitizedUserId = sanitizeInput(user_id, 100)
      const preferences = await UserPreferencesManager.updatePreferences(sanitizedUserId, updates)
      
      return NextResponse.json({ preferences }, { status: 200 })
    } finally {
      await cleanupSecureAuth()
    }
  } catch (error) {
    // Log error without exposing sensitive details
    secureLogger.error('Preferences PUT error', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: '[REDACTED]'
    })
    
    return NextResponse.json(
      { error: 'Failed to update user preferences' },
      { status: 500 }
    )
  }
}