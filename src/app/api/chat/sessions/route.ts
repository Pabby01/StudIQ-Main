/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, handleSupabaseError } from '@/lib/supabase'
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
    const rateLimit = checkRateLimit(`chat_sessions_get_${clientIP}`, 60, 60000) // 60 requests per minute
    
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

      const { data, error } = await (supabaseAdmin as any)
        .from('ai_chat_sessions')
        .select('*')
        .eq('user_id', sanitizedUserId)
        .order('updated_at', { ascending: false })

      if (error) {
        handleSupabaseError(error, 'get chat sessions')
      }

      return NextResponse.json({ sessions: data || [] }, { status: 200 })
    } finally {
      await cleanupSecureAuth()
    }
  } catch (error) {
    // Log error without exposing sensitive details
    secureLogger.error('Chat sessions GET error', {
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
  try {
    const body = await request.json()
    const { user_id, title, subject, difficulty_level } = body || {}

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    // Rate limiting check
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
    const rateLimit = checkRateLimit(`chat_sessions_post_${clientIP}`, 10, 60000) // 10 creates per minute
    
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

    // Sanitize and validate input data
    const sanitizedUserId = sanitizeInput(user_id, 100)
    const sanitizedTitle = title ? sanitizeInput(title, 200) : `Chat ${new Date().toLocaleDateString()}`
    const sanitizedSubject = subject ? sanitizeInput(subject, 100) : null
    
    // Validate difficulty level if provided
    const validDifficultyLevels = ['beginner', 'intermediate', 'advanced']
    const sanitizedDifficultyLevel = difficulty_level && validDifficultyLevels.includes(difficulty_level) 
      ? difficulty_level 
      : null

    const session = {
      user_id: sanitizedUserId,
      title: sanitizedTitle,
      subject: sanitizedSubject,
      difficulty_level: sanitizedDifficultyLevel
    }

    try {
      const { data, error } = await (supabaseAdmin as any)
        .from('ai_chat_sessions')
        .insert(session)
        .select()
        .single()

      if (error) {
        handleSupabaseError(error, 'create chat session')
      }

      if (!data) {
        return NextResponse.json(
          { error: 'Failed to create chat session' },
          { status: 500 }
        )
      }

      return NextResponse.json({ session: data }, { status: 201 })
    } finally {
      await cleanupSecureAuth()
    }
  } catch (error) {
    // Log error without exposing sensitive details
    secureLogger.error('Chat sessions POST error', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: '[REDACTED]'
    })
    
    return NextResponse.json(
      { error: 'Failed to create chat session' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')
    const userId = searchParams.get('user_id')

    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: 'session_id and user_id are required' },
        { status: 400 }
      )
    }

    // Rate limiting check - more restrictive for deletions
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
    const rateLimit = checkRateLimit(`chat_sessions_delete_${clientIP}`, 5, 60000) // 5 deletions per minute
    
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
    const authResult = await validateUserAuthWithRLS(request, userId, 'write')
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode }
      )
    }

    try {
      // Sanitize input parameters
      const sanitizedSessionId = sanitizeInput(sessionId, 100)
      const sanitizedUserId = sanitizeInput(userId, 100)

      // Ensure the session belongs to the user
      const { data: session, error: fetchError } = await (supabaseAdmin as any)
        .from('ai_chat_sessions')
        .select('id, user_id')
        .eq('id', sanitizedSessionId)
        .single()

      if (fetchError) {
        handleSupabaseError(fetchError, 'verify chat session ownership')
      }

      if (!session || session.user_id !== sanitizedUserId) {
        return NextResponse.json(
          { error: 'Forbidden: session does not belong to user' },
          { status: 403 }
        )
      }

      const { error } = await (supabaseAdmin as any)
        .from('ai_chat_sessions')
        .delete()
        .eq('id', sanitizedSessionId)
        .eq('user_id', sanitizedUserId)

      if (error) {
        handleSupabaseError(error, 'delete chat session')
      }

      return NextResponse.json({ message: 'Session deleted successfully' }, { status: 200 })
    } finally {
      await cleanupSecureAuth()
    }
  } catch (error) {
    // Log error without exposing sensitive details
    secureLogger.error('Chat sessions DELETE error', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      sessionId: '[REDACTED]',
      userId: '[REDACTED]'
    })
    
    return NextResponse.json(
      { error: 'Failed to delete chat session' },
      { status: 500 }
    )
  }
}