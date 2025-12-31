import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * API endpoint to link wallet address to existing Privy user
 * Called from MigrationBanner when user connects wallet
 */
export async function POST(req: NextRequest) {
    try {
        const { walletAddress } = await req.json()

        if (!walletAddress) {
            return NextResponse.json(
                { error: 'Wallet address required' },
                { status: 400 }
            )
        }

        // Get Privy user ID from session/auth header
        // TODO: Implement proper auth validation
        const authHeader = req.headers.get('authorization')
        if (!authHeader) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // For now, extract user ID from auth token
        // In production, validate Privy JWT token properly
        const privyUserId = 'did:privy:temp' // TODO: Extract from valid token

        // Use service role key for admin operations
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // 1. Check if migration record exists
        const { data: migrationRecord, error: fetchError } = await supabase
            .from('privy_to_wallet_migration')
            .select('*')
            .eq('privy_user_id', privyUserId)
            .single()

        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError
        }

        // 2. Update or create migration record
        const { error: upsertError } = await supabase
            .from('privy_to_wallet_migration')
            .upsert({
                privy_user_id: privyUserId,
                wallet_address: walletAddress,
                migration_status: 'linked',
                migration_started_at: migrationRecord?.migration_started_at || new Date().toISOString(),
                migration_method: 'banner',
            })

        if (upsertError) throw upsertError

        // 3. Get old user profile
        const { data: oldProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', privyUserId)
            .single()

        if (profileError) throw profileError

        // 4. Create new user profile with wallet address as ID
        const { error: newProfileError } = await supabase
            .from('user_profiles')
            .insert({
                user_id: walletAddress,
                wallet_address: walletAddress,
                display_name: oldProfile.display_name,
                email: oldProfile.email,
                avatar_url: oldProfile.avatar_url,
                // Copy other relevant fields
            })

        if (newProfileError && newProfileError.code !== '23505') {
            // Ignore duplicate key error (user might have already migrated)
            throw newProfileError
        }

        // 5. Mark migration as completed
        await supabase
            .from('privy_to_wallet_migration')
            .update({
                migration_status: 'completed',
                migration_completed_at: new Date().toISOString(),
            })
            .eq('privy_user_id', privyUserId)

        return NextResponse.json({
            success: true,
            walletAddress,
            message: 'Migration successful',
        })
    } catch (error) {
        console.error('Migration API error:', error)
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Migration failed',
            },
            { status: 500 }
        )
    }
}

/**
 * GET endpoint to check migration status
 */
export async function GET(req: NextRequest) {
    try {
        // TODO: Get user ID from auth
        const privyUserId = 'did:privy:temp'

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const { data, error } = await supabase
            .from('privy_to_wallet_migration')
            .select('migration_status, wallet_address, migration_completed_at')
            .eq('privy_user_id', privyUserId)
            .single()

        if (error && error.code !== 'PGRST116') throw error

        return NextResponse.json({
            migrated: data?.migration_status === 'completed',
            status: data?.migration_status || 'pending',
            walletAddress: data?.wallet_address,
        })
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to check migration status' },
            { status: 500 }
        )
    }
}
