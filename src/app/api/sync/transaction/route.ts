import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { secureLogger } from '@/lib/secure-logger'

/**
 * POST /api/sync/transaction
 * Sync transaction from campus store to main app
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            walletAddress,
            type,
            amount,
            points,
            description,
            source,
            orderId,
            metadata
        } = body

        if (!walletAddress || !type || amount === undefined) {
            return NextResponse.json(
                { error: 'Missing required fields' },
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

        // Create transaction record
        const { data: transaction, error: txError } = await supabase
            .from('transactions')
            .insert({
                user_id: userId,
                type: type,
                amount: amount,
                currency: type === 'purchase' ? 'USD' : 'POINTS',
                description: description || `Transaction from ${source || 'campus store'}`,
                reference_id: orderId || null,
                status: 'completed',
                metadata: {
                    source: source || 'campus_store',
                    orderId,
                    points,
                    ...metadata,
                    synced_at: new Date().toISOString()
                }
            } as any)
            .select()
            .single()

        if (txError) throw txError

        // If points were earned, update user_stats
        if (points && points > 0) {
            const { data: currentStats } = await supabase
                .from('user_stats')
                .select('total_points')
                .eq('user_id', userId)
                .single()

            // @ts-ignore - Supabase types can be strict for dynamic updates
            await supabase
                .from('user_stats')
                .update({
                    total_points: ((currentStats as any)?.total_points || 0) + points
                } as any)
                .eq('user_id', userId)
        }

        secureLogger.info('Transaction synced successfully', {
            walletAddress,
            type,
            amount,
            points,
            source
        })

        return NextResponse.json({
            success: true,
            transaction,
            pointsAdded: points || 0
        })
    } catch (error) {
        secureLogger.error('Transaction sync error:', error)
        return NextResponse.json(
            { error: 'Failed to sync transaction' },
            { status: 500 }
        )
    }
}
