import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient, FINANCIAL_TUTOR_SYSTEM_PROMPT } from '@/lib/openai';
import { ChatManager } from '@/lib/database-utils';

export async function POST(request: NextRequest) {
  try {
    const { messages, sessionId } = await request.json();

    // Check if OpenAI API key is configured
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OpenAI API key not found in environment variables');
      return NextResponse.json(
        { 
          error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.',
          details: 'The AI tutor requires an OpenAI API key to function. Please contact your administrator.'
        },
        { status: 500 }
      );
    }

    // Validate API key format
    if (!apiKey.startsWith('sk-')) {
      console.error('Invalid OpenAI API key format');
      return NextResponse.json(
        { 
          error: 'Invalid OpenAI API key format',
          details: 'The OpenAI API key should start with "sk-"'
        },
        { status: 500 }
      );
    }

    console.log('Making OpenAI API request...');
    
    // Enhanced system prompt with session context
    let systemPrompt = FINANCIAL_TUTOR_SYSTEM_PROMPT;
    
    // If we have a session ID, try to get session context
    if (sessionId) {
      try {
        // Get session details for context (optional enhancement)
        // This could include subject, difficulty level, etc.
        systemPrompt += '\n\nThis is a continuing conversation. Maintain context and build upon previous discussions while staying focused on financial education.';
      } catch (error) {
        console.warn('Could not load session context:', error);
      }
    }
    
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const message = completion.choices[0]?.message?.content || 
      "I'm sorry, I couldn't generate a response. Please try again.";

    return NextResponse.json({ message });
  } catch (error: unknown) {
    console.error('OpenAI API error:', error);
    
    // Type guard for error objects
    const isErrorWithDetails = (err: unknown): err is { error?: { type?: string }; message?: string } => {
      return typeof err === 'object' && err !== null;
    };
    
    // Handle specific OpenAI errors
    if (isErrorWithDetails(error) && error.error?.type === 'invalid_api_key') {
      return NextResponse.json(
        { 
          error: 'Invalid OpenAI API key',
          details: 'The provided OpenAI API key is invalid. Please check your API key and try again.'
        },
        { status: 401 }
      );
    }
    
    if (isErrorWithDetails(error) && error.error?.type === 'insufficient_quota') {
      return NextResponse.json(
        { 
          error: 'OpenAI quota exceeded',
          details: 'The OpenAI API quota has been exceeded. Please check your billing and usage.'
        },
        { status: 429 }
      );
    }

    // Generic error handling
    return NextResponse.json(
      { 
        error: 'Failed to get AI response',
        details: isErrorWithDetails(error) && error.message ? error.message : 'An unexpected error occurred while processing your request.'
      },
      { status: 500 }
    );
  }
}