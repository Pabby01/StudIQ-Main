/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, handleSupabaseError } from '@/lib/supabase'
import { secureLogger } from '@/lib/secure-logger'
import { 
  validateUserAuth, 
  validatePrivySession, 
  checkRateLimit,
  sanitizeInput
} from '@/lib/auth-middleware'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')
    const userId = searchParams.get('user_id')

    // Validate required parameters
    if (!sessionId) {
      return NextResponse.json(
        { error: 'session_id parameter is required' },
        { status: 400 }
      )
    }

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
    const rateLimit = checkRateLimit(`chat_messages_${clientIP}`, 30, 60000) // 30 requests per minute
    
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

    // Validate user authentication and authorization
    const authResult = await validateUserAuth(request, userId)
    if (!authResult.success) {
      // Fallback to Privy session validation
      const privyResult = await validatePrivySession(request, userId)
      if (!privyResult.success) {
        return NextResponse.json(
          { error: authResult.error || 'Unauthorized' },
          { status: authResult.statusCode || 401 }
        )
      }
    }

    // Sanitize inputs
    const sanitizedSessionId = sanitizeInput(sessionId, 100)
    const sanitizedUserId = sanitizeInput(userId, 100)

    // Verify session ownership before retrieving messages
    const { data: session, error: sessionError } = await (supabaseAdmin as any)
      .from('ai_chat_sessions')
      .select('id, user_id')
      .eq('id', sanitizedSessionId)
      .single()

    if (sessionError) {
      handleSupabaseError(sessionError, 'verify chat session ownership')
    }

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Enforce strict session ownership validation
    if (session.user_id !== sanitizedUserId) {
      return NextResponse.json(
        { error: 'Forbidden: session does not belong to user' },
        { status: 403 }
      )
    }

    // Retrieve messages for the validated session
    const { data, error } = await (supabaseAdmin as any)
      .from('ai_chat_messages')
      .select('id, role, content, created_at')
      .eq('session_id', sanitizedSessionId)
      .eq('user_id', sanitizedUserId) // Additional security check
      .order('created_at', { ascending: true })

    if (error) {
      handleSupabaseError(error, 'get chat messages')
    }

    return NextResponse.json({ messages: data || [] }, { status: 200 })
  } catch (error) {
    // Log error without exposing sensitive details
    secureLogger.error('Chat messages API error', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      sessionId: '[REDACTED]',
      userId: '[REDACTED]'
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to get chat messages',
        details: 'An unexpected error occurred while retrieving messages. Please try again later.'
      },
      { status: 500 }
    )
  }
}