 
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { TransactionManager } from '@/lib/database-utils'
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
    const rateLimit = checkRateLimit(`transactions_get_${clientIP}`, 60, 60000) // 60 requests per minute
    
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

      const transactions = await TransactionManager.getUserTransactions(sanitizedUserId)
      
      return NextResponse.json({ transactions }, { status: 200 })
    } finally {
      await cleanupSecureAuth()
    }
  } catch (error) {
    // Log error without exposing sensitive details
    secureLogger.error('Transactions GET error', {
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
  let transactionData: any
  
  try {
    transactionData = await request.json()
    
    // Validate required fields
    if (!transactionData.user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    // Rate limiting check
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
    const rateLimit = checkRateLimit(`transactions_post_${clientIP}`, 20, 60000) // 20 creates per minute
    
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
    const authResult = await validateUserAuthWithRLS(request, transactionData.user_id, 'write')
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode }
      )
    }

    try {
      // Sanitize input data
      const sanitizedData = {
        ...transactionData,
        user_id: sanitizeInput(transactionData.user_id, 100)
      }

      // Create the transaction using the server-side admin client
      const transaction = await TransactionManager.createTransaction(sanitizedData)
      
      return NextResponse.json({ transaction }, { status: 201 })
    } finally {
      await cleanupSecureAuth()
    }
  } catch (error) {
    // Log error without exposing sensitive details
    secureLogger.error('Transactions POST error', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: transactionData?.user_id ? '[REDACTED]' : 'none'
    })
    
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    )
  }
}