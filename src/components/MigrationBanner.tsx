'use client'

import { useState } from 'react'
import { useWalletAuth } from '@/hooks/useWalletAuth'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

/**
 * Migration banner for existing Privy users
 * Shows on dashboard until user links wallet
 */
export function MigrationBanner() {
    const { address, connected } = useWalletAuth()
    const [migrating, setMigrating] = useState(false)
    const [migrated, setMigrated] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleMigration = async (walletAddress: string) => {
        try {
            setMigrating(true)
            setError(null)

            // Call migration API to link wallet to Privy account
            const res = await fetch('/api/migrate/link-wallet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress }),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Migration failed')
            }

            setMigrated(true)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Migration failed')
        } finally {
            setMigrating(false)
        }
    }

    // Auto-migrate when wallet connects
    if (connected && address && !migrated && !migrating) {
        handleMigration(address)
    }

    // Don't show if already migrated
    if (migrated) {
        return (
            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
                <div className="flex items-center">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mr-3" />
                    <div>
                        <h3 className="text-sm font-medium text-green-800">
                            ✅ Migration Complete!
                        </h3>
                        <p className="text-sm text-green-700 mt-1">
                            Your wallet is now connected. You can use StudIQ seamlessly!
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-6 rounded-lg">
            <div className="flex items-start">
                <AlertCircle className="h-6 w-6 text-yellow-600 mt-0.5 mr-4 flex-shrink-0" />
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                        🔄 Action Required: Migrate to Wallet Authentication
                    </h3>
                    <p className="text-sm text-yellow-800 mb-4">
                        We're upgrading to a simpler, more secure wallet-based login. Please connect your Solflare wallet to continue using StudIQ.
                    </p>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}

                    <div className="flex items-center gap-4">
                        {migrating ? (
                            <div className="flex items-center text-yellow-800">
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                <span className="text-sm">Migrating your account...</span>
                            </div>
                        ) : (
                            <>
                                <WalletMultiButton className="!bg-yellow-600 hover:!bg-yellow-700" />
                                <a
                                    href="/migrate"
                                    className="text-sm text-yellow-800 underline hover:text-yellow-900"
                                >
                                    Learn more →
                                </a>
                            </>
                        )}
                    </div>

                    <p className="text-xs text-yellow-700 mt-3">
                        <strong>Deadline:</strong> Please migrate within 14 days (by {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()})
                    </p>
                </div>
            </div>
        </div>
    )
}
