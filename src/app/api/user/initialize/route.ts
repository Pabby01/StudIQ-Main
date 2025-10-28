 
import { NextRequest, NextResponse } from 'next/server'
import { validatePrivySession, sanitizeInput } from '@/lib/auth-middleware'
import { UserProfileManager, UserStatsManager, UserPreferencesManager } from '@/lib/database-utils'
import { secureLogger } from '@/lib/secure-logger'

/**
 * POST /api/user/initialize
 * Initialize a new user by creating all required database records
 * This endpoint ensures atomic creation of profile, stats, and preferences
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, wallet_address, display_name, email, phone } = body

    secureLogger.info('🔍 API DEBUG - Received user initialization request:', {
      timestamp: new Date().toISOString(),
      requestBody: {
        user_id: user_id || 'NO_USER_ID',
        wallet_address: wallet_address || 'NO_WALLET_ADDRESS',
        display_name: display_name || 'NO_DISPLAY_NAME',
        email: email || 'NO_EMAIL',
        phone: phone || 'NO_PHONE'
      },
      headers: {
        'content-type': request.headers.get('content-type'),
        'x-privy-token': request.headers.get('x-privy-token') ? 'PRESENT' : 'MISSING',
        'authorization': request.headers.get('authorization') ? 'PRESENT' : 'MISSING'
      }
    })

    // Validate required fields
    if (!user_id || !wallet_address) {
      secureLogger.error('🔍 API DEBUG - Missing required fields:', {
        hasUserId: !!user_id,
        hasWalletAddress: !!wallet_address,
        receivedData: { user_id, wallet_address }
      })
      return NextResponse.json(
        { error: 'Missing required fields: user_id and wallet_address' },
        { status: 400 }
      )
    }

    // Sanitize inputs
    const sanitizedUserId = sanitizeInput(user_id, 100)
    const sanitizedWalletAddress = sanitizeInput(wallet_address, 100)
    const sanitizedDisplayName = display_name ? sanitizeInput(display_name, 100) : null
    const sanitizedEmail = email ? sanitizeInput(email, 100) : null
    const sanitizedPhone = phone ? sanitizeInput(phone, 20) : null

    secureLogger.info('🔍 API DEBUG - Data sanitization completed:', {
      original: {
        user_id: user_id,
        wallet_address: wallet_address,
        display_name: display_name || 'NULL',
        email: email || 'NULL',
        phone: phone || 'NULL'
      },
      sanitized: {
        user_id: sanitizedUserId,
        wallet_address: sanitizedWalletAddress,
        display_name: sanitizedDisplayName || 'NULL',
        email: sanitizedEmail || 'NULL',
        phone: sanitizedPhone || 'NULL'
      }
    })

    // Validate authentication
    secureLogger.info('🔍 API DEBUG - Validating authentication for user initialization', {
      userId: sanitizedUserId,
      walletAddress: sanitizedWalletAddress,
      hasPrivyToken: !!(request.headers.get('x-privy-token') || request.cookies.get('privy-token')?.value)
    })
    
    const authResult = await validatePrivySession(request, sanitizedUserId)
    if (!authResult.success) {
      secureLogger.error('🔍 API DEBUG - Authentication failed for user initialization', {
        userId: sanitizedUserId,
        walletAddress: sanitizedWalletAddress,
        error: authResult.error,
        statusCode: authResult.statusCode
      })
      return NextResponse.json(
        { error: authResult.error || 'Authentication failed' },
        { status: 401 }
      )
    }
    
    secureLogger.info('🔍 API DEBUG - Authentication successful for user initialization', {
      userId: sanitizedUserId,
      walletAddress: sanitizedWalletAddress,
      authUserId: authResult.userId,
      authWalletAddress: authResult.userWalletAddress
    })

    secureLogger.info('🔍 API DEBUG - Initializing new user with final data:', {
      userId: sanitizedUserId,
      walletAddress: sanitizedWalletAddress.slice(0, 6) + '...' + sanitizedWalletAddress.slice(-4),
      hasDisplayName: !!sanitizedDisplayName,
      hasEmail: !!sanitizedEmail,
      hasPhone: !!sanitizedPhone,
      finalDataToProcess: {
        user_id: sanitizedUserId,
        wallet_address: sanitizedWalletAddress,
        display_name: sanitizedDisplayName,
        email: sanitizedEmail,
        phone: sanitizedPhone
      }
    })

    // Check if user already exists
    secureLogger.info('🔍 DATABASE DEBUG - Checking if user profile already exists:', {
      userId: sanitizedUserId,
      operation: 'UserProfileManager.getProfile'
    })
    
    const existingProfile = await UserProfileManager.getProfile(sanitizedUserId)
    const isNewUser = !existingProfile

    secureLogger.info('🔍 DATABASE DEBUG - User existence check completed:', {
      userId: sanitizedUserId,
      isNewUser,
      hasExistingProfile: !!existingProfile,
      existingProfileData: existingProfile ? {
        id: existingProfile.id,
        user_id: existingProfile.user_id,
        wallet_address: existingProfile.wallet_address,
        display_name: existingProfile.display_name,
        email: existingProfile.email || 'NO_EMAIL',
        phone: existingProfile.phone || 'NO_PHONE'
      } : 'NO_EXISTING_PROFILE'
    })

    // Create user profile
    const profileData = {
      user_id: sanitizedUserId,
      wallet_address: sanitizedWalletAddress,
      display_name: sanitizedDisplayName || `User ${sanitizedUserId.slice(-8)}`,
      email: sanitizedEmail,
      phone: sanitizedPhone,
      avatar_url: null
    }

    secureLogger.info('🔍 DATABASE DEBUG - Creating/updating user profile with data:', {
      userId: sanitizedUserId,
      operation: 'UserProfileManager.upsertProfile',
      profileDataToStore: {
        user_id: profileData.user_id,
        wallet_address: profileData.wallet_address,
        display_name: profileData.display_name,
        email: profileData.email || 'NO_EMAIL',
        phone: profileData.phone || 'NO_PHONE',
        avatar_url: profileData.avatar_url || 'NO_AVATAR'
      }
    })

    const profile = await UserProfileManager.upsertProfile(profileData)

    secureLogger.info('🔍 DATABASE DEBUG - User profile created/updated successfully:', {
      userId: sanitizedUserId,
      profileId: profile.id,
      storedProfileData: {
        id: profile.id,
        user_id: profile.user_id,
        wallet_address: profile.wallet_address,
        display_name: profile.display_name,
        email: profile.email || 'NO_EMAIL',
        phone: profile.phone || 'NO_PHONE',
        avatar_url: profile.avatar_url || 'NO_AVATAR',
        created_at: profile.created_at,
        updated_at: profile.updated_at
      }
    })

    // Create user stats
    const statsData = {
      user_id: sanitizedUserId,
      total_points: 0,
      total_cashback: 0,
      level: 1,
      completed_lessons: 0,
      portfolio_value: 0,
      streak_days: 0,
      last_activity: new Date().toISOString()
    }

    secureLogger.info('🔍 DATABASE DEBUG - Creating/updating user stats with data:', {
      userId: sanitizedUserId,
      operation: 'UserStatsManager.upsertStats',
      statsDataToStore: statsData
    })

    const stats = await UserStatsManager.upsertStats(statsData)

    secureLogger.info('🔍 DATABASE DEBUG - User stats created/updated successfully:', {
      userId: sanitizedUserId,
      statsId: stats.id,
      storedStatsData: {
        id: stats.id,
        user_id: stats.user_id,
        total_points: stats.total_points,
        total_cashback: stats.total_cashback,
        level: stats.level,
        completed_lessons: stats.completed_lessons,
        portfolio_value: stats.portfolio_value,
        streak_days: stats.streak_days,
        last_activity: stats.last_activity,
        created_at: stats.created_at,
        updated_at: stats.updated_at
      }
    })

    // Create user preferences
    const preferencesData = {
      user_id: sanitizedUserId,
      theme: 'light' as const,
      notifications_enabled: true,
      language: 'en'
    }

    secureLogger.info('🔍 DATABASE DEBUG - Creating/updating user preferences with data:', {
      userId: sanitizedUserId,
      operation: 'UserPreferencesManager.upsertPreferences',
      preferencesDataToStore: preferencesData
    })

    const preferences = await UserPreferencesManager.upsertPreferences(preferencesData)

    secureLogger.info('🔍 DATABASE DEBUG - User preferences created/updated successfully:', {
      userId: sanitizedUserId,
      preferencesId: preferences.id,
      storedPreferencesData: {
        id: preferences.id,
        user_id: preferences.user_id,
        theme: preferences.theme,
        notifications_enabled: preferences.notifications_enabled,
        language: preferences.language,
        created_at: preferences.created_at,
        updated_at: preferences.updated_at
      }
    })

    const finalResponse = {
      success: true,
      user: {
        id: sanitizedUserId,
        walletAddress: sanitizedWalletAddress,
        displayName: sanitizedDisplayName || profile.display_name,
        email: sanitizedEmail,
        phone: sanitizedPhone,
        isNewUser: isNewUser
      },
      profile: profile,
      stats: stats,
      preferences: preferences
    }

    secureLogger.info('🔍 API DEBUG - User initialization completed successfully, sending response:', {
      userId: sanitizedUserId,
      walletAddress: sanitizedWalletAddress,
      responseData: {
        success: finalResponse.success,
        user: {
          id: finalResponse.user.id,
          walletAddress: finalResponse.user.walletAddress,
          displayName: finalResponse.user.displayName,
          email: finalResponse.user.email || 'NO_EMAIL',
          phone: finalResponse.user.phone || 'NO_PHONE',
          isNewUser: finalResponse.user.isNewUser
        },
        hasProfile: !!finalResponse.profile,
        hasStats: !!finalResponse.stats,
        hasPreferences: !!finalResponse.preferences
      }
    })

    return NextResponse.json(finalResponse)

  } catch (error) {
    secureLogger.error('🔍 API DEBUG - User initialization failed with error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      { error: 'Failed to initialize user', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}