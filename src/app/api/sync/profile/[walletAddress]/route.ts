import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { secureLogger } from '@/lib/secure-logger'

/**
 * GET /api/sync/profile/:walletAddress
 * Fetch user profile from main app
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ walletAddress: string }> }
) {
    try {
        const { walletAddress } = await params

        if (!walletAddress) {
            return NextResponse.json(
                { error: 'Wallet address is required' },
                { status: 400 }
            )
        }

        const supabase = getSupabaseAdmin()

        // Get user profile by wallet address
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('wallet_address', walletAddress)
            .single()

        if (profileError && profileError.code !== 'PGRST116') {
            throw profileError
        }

        // Get user stats
        const { data: stats, error: statsError } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', (profile as any)?.user_id)
            .single()

        if (statsError && statsError.code !== 'PGRST116') {
            secureLogger.warn('Stats not found', { walletAddress })
        }

        return NextResponse.json({
            walletAddress,
            displayName: (profile as any)?.display_name || null,
            email: (profile as any)?.email || null,
            phone: (profile as any)?.phone || null,
            avatarUrl: (profile as any)?.avatar_url || null,
            totalPoints: (stats as any)?.total_points || 0,
            totalCashback: (stats as any)?.total_cashback || 0,
            level: (stats as any)?.level || 1,
            profileData: profile || null
        })
    } catch (error) {
        secureLogger.error('Profile sync error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch profile' },
            { status: 500 }
        )
    }
}

/**
 * POST /api/sync/profile
 * Update user profile in main app from store
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { walletAddress, displayName, email, school, campus } = body

        if (!walletAddress) {
            return NextResponse.json(
                { error: 'Wallet address is required' },
                { status: 400 }
            )
        }

        const supabase = getSupabaseAdmin()

        // Check if profile exists
        const { data: existingProfile } = await supabase
            .from('user_profiles')
            .select('user_id')
            .eq('wallet_address', walletAddress)
            .single()

        if (existingProfile) {
            // Update existing profile
            // @ts-ignore - Supabase types can be strict for dynamic updates
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    display_name: displayName || (existingProfile as any).display_name,
                    email: email || undefined,
                    university: school || undefined,
                    updated_at: new Date().toISOString()
                } as any)
                .eq('wallet_address', walletAddress)

            if (error) throw error

            return NextResponse.json({
                success: true,
                message: 'Profile updated'
            })
        } else {
            // Create new profile
            const userId = walletAddress // Use wallet address as user_id for new users

            const { error: profileError } = await supabase
                .from('user_profiles')
                .insert({
                    user_id: userId,
                    wallet_address: walletAddress,
                    display_name: displayName || 'Student',
                    email: email || null,
                    university: school || null
                } as any)

            if (profileError) throw profileError

            // Create stats
            const { error: statsError } = await supabase
                .from('user_stats')
                .insert({
                    user_id: userId,
                    total_points: 0
                } as any)

            if (statsError) {
                secureLogger.warn('Failed to create stats', { userId, error: statsError })
            }

            return NextResponse.json({
                success: true,
                message: 'Profile created'
            })
        }
    } catch (error) {
        secureLogger.error('Profile update error:', error)
        return NextResponse.json(
            { error: 'Failed to update profile' },
            { status: 500 }
        )
    }
}
