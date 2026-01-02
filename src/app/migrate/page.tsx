'use client'

import { useState } from 'react'
import { useWalletAuth } from '@/hooks/useWalletAuth'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react'

/**
 * Dedicated migration page with full instructions
 * For users who need more guidance
 */
export default function MigratePage() {
    const { address, connected } = useWalletAuth()
    const [migrating, setMigrating] = useState(false)
    const [migrated, setMigrated] = useState(false)

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
            <div className="max-w-3xl mx-auto">
                <div className="glass-card p-8">
                    <h1 className="text-4xl font-bold text-gradient-primary mb-4">
                        🔄 Migrate to Wallet Authentication
                    </h1>
                    <p className="text-lg text-gray-700 mb-8">
                        We're upgrading to a simpler, more secure wallet-based login system.
                    </p>

                    {/* Step 1: Get Solflare */}
                    <div className="mb-8">
                        <div className="flex items-start">
                            <div className="bg-blue-100 rounded-full p-3 mr-4">
                                <span className="text-2xl font-bold text-blue-600">1</span>
                            </div>
                            <div className="flex-1">
                                <h2 className="text-2xl font-semibold mb-3">Get Solflare Wallet</h2>
                                <p className="text-gray-700 mb-4">
                                    If you don't have a Solana wallet yet, we recommend Solflare (our partner).
                                </p>
                                <div className="flex gap-3">
                                    <a
                                        href="https://chrome.google.com/webstore/detail/solflare-wallet/bhhhlbepdkbapadjdnnojkbgioiodbic"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-primary"
                                    >
                                        Get Solflare (Chrome)
                                    </a>
                                    <a
                                        href="https://solflare.com/download"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-secondary"
                                    >
                                        Other Platforms →
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 2: Connect Wallet */}
                    <div className="mb-8">
                        <div className="flex items-start">
                            <div className="bg-purple-100 rounded-full p-3 mr-4">
                                <span className="text-2xl font-bold text-purple-600">2</span>
                            </div>
                            <div className="flex-1">
                                <h2 className="text-2xl font-semibold mb-3">Connect Your Wallet</h2>
                                <p className="text-gray-700 mb-4">
                                    Click the button below to connect your Solflare (or other Solana) wallet.
                                </p>

                                {connected ? (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <div className="flex items-center">
                                            <CheckCircle2 className="h-6 w-6 text-green-600 mr-3" />
                                            <div>
                                                <p className="font-semibold text-green-900">Wallet Connected!</p>
                                                <p className="text-sm text-green-700 mt-1 font-mono">
                                                    {address?.slice(0, 8)}...{address?.slice(-8)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <WalletMultiButton />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Step 3: Migration Status */}
                    <div className="mb-8">
                        <div className="flex items-start">
                            <div className="bg-green-100 rounded-full p-3 mr-4">
                                <span className="text-2xl font-bold text-green-600">3</span>
                            </div>
                            <div className="flex-1">
                                <h2 className="text-2xl font-semibold mb-3">Migration Status</h2>

                                {migrated ? (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <div className="flex items-center">
                                            <CheckCircle2 className="h-6 w-6 text-green-600 mr-3" />
                                            <div>
                                                <p className="font-semibold text-green-900">✅ Migration Complete!</p>
                                                <p className="text-sm text-green-700 mt-1">
                                                    You can now use StudIQ with your wallet. No more email/password!
                                                </p>
                                            </div>
                                        </div>
                                        <a
                                            href="/dashboard"
                                            className="btn-primary mt-4 inline-block"
                                        >
                                            Go to Dashboard →
                                        </a>
                                    </div>
                                ) : connected ? (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <div className="flex items-center">
                                            <Clock className="h-6 w-6 text-blue-600 mr-3 animate-spin" />
                                            <div>
                                                <p className="font-semibold text-blue-900">Migrating...</p>
                                                <p className="text-sm text-blue-700 mt-1">
                                                    We're linking your wallet to your StudIQ account.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                        <div className="flex items-center">
                                            <AlertCircle className="h-6 w-6 text-yellow-600 mr-3" />
                                            <div>
                                                <p className="font-semibold text-yellow-900">Waiting for wallet connection</p>
                                                <p className="text-sm text-yellow-700 mt-1">
                                                    Connect your wallet in Step 2 to begin migration.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* FAQs */}
                    <div className="border-t border-gray-200 pt-8">
                        <h3 className="text-xl font-semibold mb-4">Frequently Asked Questions</h3>

                        <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold text-gray-900">Why are you making this change?</h4>
                                <p className="text-gray-700 text-sm mt-1">
                                    Wallet-based auth is simpler, more secure, and completely free. It also aligns with Web3 best practices.
                                </p>
                            </div>

                            <div>
                                <h4 className="font-semibold text-gray-900">Will I lose my data?</h4>
                                <p className="text-gray-700 text-sm mt-1">
                                    No! All your data (profile, stats,transactions) will be automatically transferred to your wallet-based account.
                                </p>
                            </div>

                            <div>
                                <h4 className="font-semibold text-gray-900">What if I don't migrate?</h4>
                                <p className="text-gray-700 text-sm mt-1">
                                    You'll need to migrate within 14 days to continue using StudIQ. After the deadline, old accounts will be archived.
                                </p>
                            </div>

                            <div>
                                <h4 className="font-semibold text-gray-900">Need help?</h4>
                                <p className="text-gray-700 text-sm mt-1">
                                    Contact support at <a href="mailto:support@studiq.app" className="text-blue-600 underline">support@studiq.app</a>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
