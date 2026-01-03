/**
 * Cross-App Session Token Manager
 * 
 * Manages wallet session tokens that work across both
 * StudIQ Main App (studiq.app) and Campus Store (store.studiq.fun)
 */

import { sign, verify } from 'jsonwebtoken'

const SESSION_TOKEN_SECRET = process.env.SESSION_TOKEN_SECRET || 'your-super-secret-key-here'
const TOKEN_EXPIRY = '7d' // 7 days

export interface SessionTokenPayload {
    walletAddress: string
    connectedAt: number
    source: 'main_app' | 'campus_store'
}

export class CrossAppSessionManager {
    /**
     * Create a session token when wallet connects
     */
    static createSessionToken(walletAddress: string, source: 'main_app' | 'campus_store'): string {
        const payload: SessionTokenPayload = {
            walletAddress,
            connectedAt: Date.now(),
            source
        }

        const token = sign(payload, SESSION_TOKEN_SECRET, {
            expiresIn: TOKEN_EXPIRY
        })

        // Store in localStorage for cross-domain access
        if (typeof window !== 'undefined') {
            localStorage.setItem('studiq_session_token', token)
            localStorage.setItem('studiq_wallet_address', walletAddress)
        }

        return token
    }

    /**
     * Verify and decode session token
     */
    static verifySessionToken(token: string): SessionTokenPayload | null {
        try {
            const decoded = verify(token, SESSION_TOKEN_SECRET) as SessionTokenPayload
            return decoded
        } catch (error) {
            console.error('Invalid session token:', error)
            return null
        }
    }

    /**
     * Get current session from localStorage
     */
    static getCurrentSession(): { token: string; walletAddress: string } | null {
        if (typeof window === 'undefined') return null

        const token = localStorage.getItem('studiq_session_token')
        const walletAddress = localStorage.getItem('studiq_wallet_address')

        if (!token || !walletAddress) return null

        // Verify token is still valid
        const payload = this.verifySessionToken(token)
        if (!payload) {
            this.clearSession()
            return null
        }

        return { token, walletAddress }
    }

    /**
     * Clear session on disconnect
     */
    static clearSession(): void {
        if (typeof window === 'undefined') return

        localStorage.removeItem('studiq_session_token')
        localStorage.removeItem('studiq_wallet_address')
    }

    /**
     * Check if wallet should auto-connect based on session
     */
    static shouldAutoConnect(): string | null {
        const session = this.getCurrentSession()
        return session?.walletAddress || null
    }
}
