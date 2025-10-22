/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { UserProfileManager } from '@/lib/database-utils'
import { secureLogger } from '@/lib/secure-logger'
import { 
  validateUserAuthWithRLS, 
  cleanupSecureAuth,
  checkRateLimit,
  sanitizeInput,
  validateDisplayName,
  validateEmail,
  validateWalletAddress
} from '@/lib/auth-middleware'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    // Rate limiting check
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
    const rateLimit = checkRateLimit(`profile_get_${clientIP}`, 60, 60000) // 60 requests per minute
    
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

      // Get the user profile
      const profile = await UserProfileManager.getProfile(sanitizedUserId)
    
      if (!profile) {
        return NextResponse.json(
          { error: 'Profile not found' },
          { status: 404 }
        )
      }
      
      return NextResponse.json({ profile }, { status: 200 })
    } finally {
      await cleanupSecureAuth()
    }
  } catch (error) {
    // Log error without exposing sensitive details
    secureLogger.error('Profile GET error', {
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
  let profileData: any
  
  try {
    profileData = await request.json()
    
    // Validate required fields
    if (!profileData.user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    // Rate limiting check
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
    const rateLimit = checkRateLimit(`profile_post_${clientIP}`, 20, 60000) // 20 creates per minute
    
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
    const authResult = await validateUserAuthWithRLS(request, profileData.user_id, 'write')
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode }
      )
    }

    try {
      // Sanitize and validate input data
      const sanitizedData = {
        ...profileData,
        user_id: sanitizeInput(profileData.user_id, 100),
        display_name: profileData.display_name ? sanitizeInput(profileData.display_name, 50) : undefined,
        email: profileData.email ? sanitizeInput(profileData.email, 255) : undefined,
        wallet_address: profileData.wallet_address ? sanitizeInput(profileData.wallet_address, 100) : undefined
      }

      // Additional validation for specific fields
      if (sanitizedData.display_name && !validateDisplayName(sanitizedData.display_name)) {
        return NextResponse.json(
          { error: 'Invalid display name format' },
          { status: 400 }
        )
      }

      if (sanitizedData.email && !validateEmail(sanitizedData.email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      }

      if (sanitizedData.wallet_address && !validateWalletAddress(sanitizedData.wallet_address)) {
        return NextResponse.json(
          { error: 'Invalid wallet address format' },
          { status: 400 }
        )
      }

      // Use upsert approach to handle race conditions elegantly
      const profile = await UserProfileManager.upsertProfile(sanitizedData)
      
      return NextResponse.json({ profile }, { status: 201 })
    } finally {
      await cleanupSecureAuth()
    }
  } catch (error) {
    // Log error without exposing sensitive details
    secureLogger.error('Profile POST error', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: profileData?.user_id ? '[REDACTED]' : 'none'
    })
    
    return NextResponse.json(
      { error: 'Failed to create/update user profile' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const updateData = await request.json()
    
    // Validate required fields
    if (!updateData.user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    // Rate limiting check
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
    const rateLimit = checkRateLimit(`profile_put_${clientIP}`, 30, 60000) // 30 updates per minute
    
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
    const authResult = await validateUserAuthWithRLS(request, updateData.user_id, 'write')
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode }
      )
    }

    // Extract user_id and sanitize the rest of the update data
    const { user_id, ...updates } = updateData
    const sanitizedUserId = sanitizeInput(user_id, 100)
    
    // Sanitize update fields
    const sanitizedUpdates: any = {}
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === 'string') {
        switch (key) {
          case 'display_name':
            sanitizedUpdates[key] = sanitizeInput(value, 50)
            if (!validateDisplayName(sanitizedUpdates[key])) {
              return NextResponse.json(
                { error: 'Invalid display name format' },
                { status: 400 }
              )
            }
            break
          case 'email':
            sanitizedUpdates[key] = sanitizeInput(value, 255)
            if (!validateEmail(sanitizedUpdates[key])) {
              return NextResponse.json(
                { error: 'Invalid email format' },
                { status: 400 }
              )
            }
            break
          case 'wallet_address':
            sanitizedUpdates[key] = sanitizeInput(value, 100)
            if (!validateWalletAddress(sanitizedUpdates[key])) {
              return NextResponse.json(
                { error: 'Invalid wallet address format' },
                { status: 400 }
              )
            }
            break
          default:
            sanitizedUpdates[key] = sanitizeInput(value, 255)
        }
      } else {
        sanitizedUpdates[key] = value
      }
    }

    try {
      // Update the user profile using the server-side admin client
      const profile = await UserProfileManager.updateProfile(sanitizedUserId, sanitizedUpdates)
      
      return NextResponse.json({ profile }, { status: 200 })
    } finally {
      await cleanupSecureAuth()
    }
  } catch (error) {
    // Log error without exposing sensitive details
    secureLogger.error('Profile PUT error', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: '[REDACTED]'
    })
    
    return NextResponse.json(
      { error: 'Failed to update user profile' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')
    
    // Validate required fields
    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    // Rate limiting check - more restrictive for deletions
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
    const rateLimit = checkRateLimit(`profile_delete_${clientIP}`, 5, 60000) // 5 deletions per minute
    
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
    const authResult = await validateUserAuthWithRLS(request, user_id, 'write')
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode }
      )
    }

    try {
      // Sanitize the user ID input
      const sanitizedUserId = sanitizeInput(user_id, 100)

      // Delete the user profile using the server-side admin client
      await UserProfileManager.deleteProfile(sanitizedUserId)
      
      return NextResponse.json({ message: 'Profile deleted successfully' }, { status: 200 })
    } finally {
      await cleanupSecureAuth()
    }
  } catch (error) {
    // Log error without exposing sensitive details
    secureLogger.error('Profile DELETE error', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: '[REDACTED]'
    })
    
    return NextResponse.json(
      { error: 'Failed to delete user profile' },
      { status: 500 }
    )
  }
}
