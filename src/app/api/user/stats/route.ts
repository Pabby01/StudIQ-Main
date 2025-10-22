/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { UserStatsManager } from '@/lib/database-utils'
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
    const rateLimit = checkRateLimit(`stats_get_${clientIP}`, 60, 60000) // 60 requests per minute
    
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

      const stats = await UserStatsManager.getStats(sanitizedUserId)
      
      if (!stats) {
        return NextResponse.json(
          { error: 'User stats not found' },
          { status: 404 }
        )
      }
      
      return NextResponse.json({ stats }, { status: 200 })
    } finally {
      await cleanupSecureAuth()
    }
  } catch (error) {
    // Log error without exposing sensitive details
    secureLogger.error('Stats GET error', {
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
  let statsData: any
  
  try {
    statsData = await request.json()
    
    // Validate required fields
    if (!statsData.user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    // Rate limiting check
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
    const rateLimit = checkRateLimit(`stats_post_${clientIP}`, 20, 60000) // 20 creates per minute
    
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
    const authResult = await validateUserAuthWithRLS(request, statsData.user_id, 'write')
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode }
      )
    }

    try {
      // Sanitize input data
      const sanitizedData = {
        ...statsData,
        user_id: sanitizeInput(statsData.user_id, 100)
      }

      // Check if stats already exist
      const existingStats = await UserStatsManager.getStats(sanitizedData.user_id)
      if (existingStats) {
        return NextResponse.json({ stats: existingStats }, { status: 200 })
      }

      // Create the user stats using the server-side admin client
      const stats = await UserStatsManager.createStats(sanitizedData)
      
      return NextResponse.json({ stats }, { status: 201 })
    } finally {
      await cleanupSecureAuth()
    }
  } catch (error) {
    // Handle race condition: if stats were created by another request
    if (error instanceof Error && (error.message.includes('Data already exists') || error.message.includes('duplicate key value violates unique constraint')) && statsData?.user_id) {
      try {
        const sanitizedUserId = sanitizeInput(statsData.user_id, 100)
        const existingStats = await UserStatsManager.getStats(sanitizedUserId)
        if (existingStats) {
          return NextResponse.json({ stats: existingStats }, { status: 200 })
        }
      } catch (fetchError) {
        secureLogger.error('Stats POST race condition recovery error', {
          timestamp: new Date().toISOString(),
          error: fetchError instanceof Error ? fetchError.message : 'Unknown error'
        })
      }
    }
    
    // Log error without exposing sensitive details
    secureLogger.error('Stats POST error', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: statsData?.user_id ? '[REDACTED]' : 'none'
    })
    
    return NextResponse.json(
      { error: 'Failed to create user stats' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const statsData = await request.json()
    
    // Validate required fields
    if (!statsData.user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    // Rate limiting check
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
    const rateLimit = checkRateLimit(`stats_put_${clientIP}`, 30, 60000) // 30 updates per minute
    
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
    const authResult = await validateUserAuthWithRLS(request, statsData.user_id, 'write')
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode }
      )
    }

    try {
      // Sanitize input data
      const sanitizedStatsData = {
        ...statsData,
        user_id: sanitizeInput(statsData.user_id, 100)
      }

      // Check if this is an upsert operation
      if (sanitizedStatsData.upsert) {
        // Remove the upsert flag before passing to the database
        const { upsert, ...cleanStatsData } = sanitizedStatsData
        const stats = await UserStatsManager.upsertStats(cleanStatsData)
        return NextResponse.json({ stats }, { status: 200 })
      }

      // Regular update operation
      const { user_id, ...updates } = sanitizedStatsData
      const sanitizedUserId = sanitizeInput(user_id, 100)
      const stats = await UserStatsManager.updateStats(sanitizedUserId, updates)
      
      return NextResponse.json({ stats }, { status: 200 })
    } finally {
      await cleanupSecureAuth()
    }
  } catch (error) {
    // Log error without exposing sensitive details
    secureLogger.error('Stats PUT error', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: '[REDACTED]'
    })
    
    return NextResponse.json(
      { error: 'Failed to update user stats' },
      { status: 500 }
    )
  }
}