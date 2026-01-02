'use client'

import { useWalletAuth } from '@/hooks/useWalletAuth'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { X } from 'lucide-react'
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface WalletModalProps {
    isOpen: boolean
    onClose: () => void
}

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
    const { address, connected } = useWalletAuth()

    // Close modal when wallet connects
    useEffect(() => {
        if (connected && address) {
            onClose()
        }
    }, [connected, address, onClose])

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose()
            }
        }
        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [isOpen, onClose])

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
                            className="relative w-full max-w-md pointer-events-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Glassmorphic Card */}
                            <div className="relative overflow-hidden rounded-3xl">
                                {/* Glass Background with Gradient Border */}
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-xl" />
                                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl" />

                                {/* Animated gradient border */}
                                <div className="absolute inset-0 rounded-3xl opacity-50">
                                    <div className="absolute inset-[-2px] rounded-3xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-20 blur-sm animate-pulse" />
                                </div>

                                {/* Content */}
                                <div className="relative p-8 sm:p-10">
                                    {/* Close Button */}
                                    <button
                                        onClick={onClose}
                                        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 transition-all duration-300 hover:scale-110 group z-50"
                                    >
                                        <X className="h-5 w-5 text-white/80 group-hover:text-white transition-colors" />
                                    </button>

                                    {/* Logo */}
                                    <div className="flex justify-center mb-6">
                                        <motion.div
                                            initial={{ scale: 0, rotate: -180 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            transition={{ delay: 0.1, type: 'spring', bounce: 0.5 }}
                                            className="relative"
                                        >
                                            <img
                                                src="https://i.postimg.cc/jjrt2Kdw/logo-2.jpg"
                                                alt="StudIQ Logo"
                                                className="h-16 w-16 rounded-2xl shadow-lg"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-2xl blur-lg animate-pulse" />
                                        </motion.div>
                                    </div>

                                    {/* Title */}
                                    <motion.h2
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 }}
                                        className="text-3xl sm:text-4xl font-bold text-center mb-2"
                                    >
                                        <span className="text-white">Welcome to StudIQ</span>
                                    </motion.h2>

                                    {/* Subtitle */}
                                    <motion.p
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                        className="text-white/90 text-center text-sm mb-2"
                                    >
                                        AI-Powered Student Financial Platform
                                    </motion.p>

                                    {/* Divider */}
                                    <div className="w-20 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-full mx-auto mb-8" />

                                    {/* Connect Wallet Section */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 }}
                                        className="space-y-6"
                                    >
                                        <div className="text-center">
                                            <h3 className="text-xl font-semibold text-white mb-2">
                                                Connect Your Wallet
                                            </h3>
                                            <p className="text-white/70 text-sm">
                                                Connect your Solana wallet to access your dashboard, AI tutor, and campus store.
                                            </p>
                                        </div>

                                        {/* Wallet Button */}
                                        <div className="flex justify-center">
                                            <WalletMultiButton className="!bg-gradient-to-r !from-blue-600 !to-purple-600 hover:!from-blue-700 hover:!to-purple-700 !rounded-full !py-3 !px-8 !font-semibold !shadow-lg hover:!shadow-xl !transition-all !duration-300 hover:!scale-105" />
                                        </div>

                                        {/* Info Box */}
                                        <div className="glass-panel p-4 rounded-xl border border-white/10">
                                            <p className="text-black/80 text-xs text-center">
                                                <strong className="text-black">New to Web3?</strong> We recommend Solflare wallet.
                                            </p>
                                            <a
                                                href="https://solflare.com/download"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block text-center text-black hover:text-black text-s mt-2 hover:underline transition-colors"
                                            >
                                                Download Solflare →
                                            </a>
                                        </div>
                                    </motion.div>

                                    {/* Decorative Elements */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full blur-3xl" />
                                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-500/20 to-transparent rounded-full blur-3xl" />
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    )
}
