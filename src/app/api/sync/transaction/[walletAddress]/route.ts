import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { secureLogger } from '@/lib/secure-logger'

/**
 * GET /api/sync/transaction/:walletAddress
 * Get all transactions for a wallet
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

        // Get user
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('user_id')
            .eq('wallet_address', walletAddress)
            .single()

        if (!profile) {
            return NextResponse.json({ transactions: [] })
        }

        // Get transactions
        const { data: transactions } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', (profile as any).user_id)
            .order('created_at', { ascending: false })
            .limit(100)

        return NextResponse.json({
            walletAddress,
            transactions: transactions || []
        })
    } catch (error) {
        secureLogger.error('Transaction fetch error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch transactions' },
            { status: 500 }
        )
    }
}
