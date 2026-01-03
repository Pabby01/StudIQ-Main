import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { secureLogger } from '@/lib/secure-logger'

/**
 * GET /api/sync/points/:walletAddress
 * Get total points for a wallet address
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

        // Get user by wallet address
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('user_id')
            .eq('wallet_address', walletAddress)
            .single()

        if (!profile) {
            return NextResponse.json({ points: 0 })
        }

        // Get points from user_stats
        const { data: stats } = await supabase
            .from('user_stats')
            .select('total_points')
            .eq('user_id', (profile as any).user_id)
            .single()

        return NextResponse.json({
            walletAddress,
            points: (stats as any)?.total_points || 0
        })
    } catch (error) {
        secureLogger.error('Points fetch error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch points' },
            { status: 500 }
        )
    }
}

/**
 * POST /api/sync/points
 * Add points from campus store purchase
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { walletAddress, points, source, description } = body

        if (!walletAddress || points === undefined) {
            return NextResponse.json(
                { error: 'Wallet address and points are required' },
                { status: 400 }
            )
        }

        const supabase = getSupabaseAdmin()

        // Get user
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('user_id')
            .eq('wallet_address', walletAddress)
            .single()

        if (!profile) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            )
        }

        const userId = (profile as any).user_id

        // Get current stats to calculate new total
        const { data: currentStats } = await supabase
            .from('user_stats')
            .select('total_points')
            .eq('user_id', userId)
            .single()

        const newTotal = ((currentStats as any)?.total_points || 0) + points

        // Update points
        // @ts-ignore - Supabase types can be strict for dynamic updates
        await supabase
            .from('user_stats')
            .update({ total_points: newTotal } as any)
            .eq('user_id', userId)

        // Log transaction
        await supabase
            .from('transactions')
            .insert({
                user_id: userId,
                type: 'points',
                amount: points,
                currency: 'POINTS',
                description: description || `Points from ${source || 'campus store'}`,
                status: 'completed',
                metadata: {
                    source: source || 'campus_store',
                    synced_at: new Date().toISOString()
                }
            } as any)

        secureLogger.info('Points synced successfully', {
            walletAddress,
            points,
            source
        })

        return NextResponse.json({
            success: true,
            walletAddress,
            pointsAdded: points,
            newTotal
        })
    } catch (error) {
        secureLogger.error('Points sync error:', error)
        return NextResponse.json(
            { error: 'Failed to sync points' },
            { status: 500 }
        )
    }
}
