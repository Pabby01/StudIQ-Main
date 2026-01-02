'use client'

import { useWalletAuth } from '@/hooks/useWalletAuth'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function HomePage() {
  const { address, connected } = useWalletAuth()
  const router = useRouter()

  // Redirect to dashboard if already connected
  useEffect(() => {
    if (connected && address) {
      router.push('/dashboard')
    }
  }, [connected, address, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full glass-card p-8 text-center">
        <div className="mb-8">
          <img
            src="https://i.postimg.cc/jjrt2Kdw/logo-2.jpg"
            alt="StudIQ Logo"
            className="h-20 mx-auto mb-4"
          />
          <h1 className="text-4xl font-bold text-gradient-primary mb-2">
            Welcome to StudIQ
          </h1>
          <p className="text-gray-600">
            AI-Powered Student Financial Platform
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Connect Your Wallet</h2>
          <p className="text-sm text-gray-600 mb-6">
            Connect your Solana wallet to access your dashboard, AI tutor, and campus store.
          </p>

          <WalletMultiButton className="!w-full !bg-blue-600 hover:!bg-blue-700" />
        </div>

        <div className="text-xs text-gray-500 space-y-2">
          <p>
            <strong>New to Web3?</strong> We recommend Solflare wallet.
          </p>
          <a
            href="https://solflare.com/download"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline block"
          >
            Download Solflare →
          </a>
        </div>
      </div>
    </div>
  )
}
