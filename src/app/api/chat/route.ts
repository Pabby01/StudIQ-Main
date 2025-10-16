import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient, FINANCIAL_TUTOR_SYSTEM_PROMPT } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

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
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: FINANCIAL_TUTOR_SYSTEM_PROMPT },
        ...messages
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const message = completion.choices[0]?.message?.content || 
      "I'm sorry, I couldn't generate a response. Please try again.";

    return NextResponse.json({ message });
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    
    // Handle specific OpenAI errors
    if (error?.error?.type === 'invalid_api_key') {
      return NextResponse.json(
        { 
          error: 'Invalid OpenAI API key',
          details: 'The provided OpenAI API key is invalid. Please check your API key and try again.'
        },
        { status: 401 }
      );
    }
    
    if (error?.error?.type === 'insufficient_quota') {
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
        details: error?.message || 'An unexpected error occurred while processing your request.'
      },
      { status: 500 }
    );
  }
}