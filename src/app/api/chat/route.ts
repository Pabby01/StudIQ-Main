/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient, FINANCIAL_TUTOR_SYSTEM_PROMPT } from '@/lib/openai';
import { supabaseAdmin, handleSupabaseError } from '@/lib/supabase';
import { secureLogger } from '@/lib/secure-logger';
import { 
  validateUserAuth, 
  validatePrivySession, 
  checkRateLimit,
  sanitizeInput
} from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
  try {
    const { messages, sessionId, userId } = await request.json();

    // Validate required fields
    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Rate limiting check - more restrictive for AI chat
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
    const rateLimit = checkRateLimit(`chat_${clientIP}`, 20, 60000) // 20 chat requests per minute
    
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

    // Check if OpenAI API key is configured (without exposing key details)
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      secureLogger.security('OpenAI API key not configured', {
        timestamp: new Date().toISOString(),
        error: 'Missing API key'
      });
      return NextResponse.json(
        { 
          error: 'AI service temporarily unavailable',
          details: 'The AI tutor service is currently unavailable. Please try again later.'
        },
        { status: 503 }
      );
    }

    // Validate API key format (without exposing key details)
    if (!apiKey.startsWith('sk-')) {
      secureLogger.security('Invalid OpenAI API key format', {
        timestamp: new Date().toISOString(),
        error: 'Invalid key format'
      });
      return NextResponse.json(
        { 
          error: 'AI service configuration error',
          details: 'The AI tutor service is misconfigured. Please contact support.'
        },
        { status: 503 }
      );
    }

    // Validate session ownership and get user_id from session
    const { data: session, error: sessionError } = await (supabaseAdmin as any)
      .from('ai_chat_sessions')
      .select('id, user_id')
      .eq('id', sanitizedSessionId)
      .single();

    if (sessionError) {
      handleSupabaseError(sessionError, 'verify chat session');
    }

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Enforce strict session ownership validation
    if (session.user_id !== sanitizedUserId) {
      return NextResponse.json(
        { error: 'Forbidden: session does not belong to user' },
        { status: 403 }
      );
    }

    // Validate and sanitize messages
    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages must be an array' },
        { status: 400 }
      );
    }

    // Sanitize message content and validate structure
    const sanitizedMessages = messages.map((msg: any) => {
      if (!msg.role || !msg.content) {
        throw new Error('Invalid message structure');
      }
      
      const validRoles = ['user', 'assistant', 'system'];
      if (!validRoles.includes(msg.role)) {
        throw new Error('Invalid message role');
      }

      return {
        role: msg.role,
        content: sanitizeInput(msg.content, 2000) // Limit message content length
      };
    });

    // Persist the latest user message (if provided)
    const lastUserMessage = [...sanitizedMessages].reverse().find((m: any) => m.role === 'user');

    if (lastUserMessage && lastUserMessage.content) {
      const { error: insertUserMsgError } = await (supabaseAdmin as any)
        .from('ai_chat_messages')
        .insert({
          session_id: sanitizedSessionId,
          user_id: session.user_id,
          role: 'user',
          content: lastUserMessage.content
        });

      if (insertUserMsgError) {
        handleSupabaseError(insertUserMsgError, 'add user chat message');
      }

      // Touch session updated_at
      await (supabaseAdmin as any)
        .from('ai_chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sanitizedSessionId);
    }

    secureLogger.info('Making OpenAI API request', {
      timestamp: new Date().toISOString(),
      sessionId: '[REDACTED]',
      userId: '[REDACTED]',
      messageCount: sanitizedMessages.length
    });
    
    // Enhanced system prompt with session context
    let systemPrompt = FINANCIAL_TUTOR_SYSTEM_PROMPT;
    
    // If we have a session ID, try to get session context
    if (sanitizedSessionId) {
      try {
        systemPrompt += '\n\nThis is a continuing conversation. Maintain context and build upon previous discussions while staying focused on financial education.';
      } catch (error) {
        secureLogger.warn('Could not load session context', {
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        ...sanitizedMessages
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const message = completion.choices[0]?.message?.content || 
      "I'm sorry, I couldn't generate a response. Please try again.";

    // Sanitize AI response before storing
    const sanitizedAIMessage = sanitizeInput(message, 2000);

    // Persist assistant message
    const { error: insertAssistantMsgError } = await (supabaseAdmin as any)
      .from('ai_chat_messages')
      .insert({
        session_id: sanitizedSessionId,
        user_id: session.user_id,
        role: 'assistant',
        content: sanitizedAIMessage
      });

    if (insertAssistantMsgError) {
      handleSupabaseError(insertAssistantMsgError, 'add assistant chat message');
    }

    // Touch session updated_at again
    await (supabaseAdmin as any)
      .from('ai_chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sanitizedSessionId);

    return NextResponse.json({ message: sanitizedAIMessage });
  } catch (error: unknown) {
    // Log error without exposing sensitive details
    secureLogger.error('Chat API error', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      sessionId: '[REDACTED]',
      userId: '[REDACTED]'
    });
    
    // Type guard for error objects
    const isErrorWithDetails = (err: unknown): err is { error?: { type?: string }; message?: string } => {
      return typeof err === 'object' && err !== null;
    };
    
    // Handle specific OpenAI errors without exposing API key details
    if (isErrorWithDetails(error) && error.error?.type === 'invalid_api_key') {
      return NextResponse.json(
        { 
          error: 'AI service authentication error',
          details: 'The AI service is temporarily unavailable due to authentication issues.'
        },
        { status: 503 }
      );
    }
    
    if (isErrorWithDetails(error) && error.error?.type === 'insufficient_quota') {
      return NextResponse.json(
        { 
          error: 'AI service quota exceeded',
          details: 'The AI service is temporarily unavailable due to usage limits.'
        },
        { status: 503 }
      );
    }

    // Handle validation errors
    if (error instanceof Error && error.message.includes('Invalid message')) {
      return NextResponse.json(
        { 
          error: 'Invalid request format',
          details: 'Please check your message format and try again.'
        },
        { status: 400 }
      );
    }

    // Generic error handling
    return NextResponse.json(
      { 
        error: 'Failed to get AI response',
        details: 'An unexpected error occurred while processing your request. Please try again later.'
      },
      { status: 500 }
    );
  }
}