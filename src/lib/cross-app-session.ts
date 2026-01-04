/**
 * Cross-App Session Manager (Client-Side Version)
 * 
 * Manages wallet sessions across studiq.app and store.studiq.fun
 * Uses localStorage for cross-domain session persistence
 * 
 * NOTE: This is the CLIENT-SIDE version - no JWT signing needed here
 * Server-side validation happens in API endpoints
 */

const SESSION_STORAGE_KEY = 'studiq_wallet_session'
const SESSION_EXPIRY_DAYS = 7

export interface WalletSession {
    walletAddress: string
    connectedAt: number
    expiresAt: number
    appOrigin: 'main_app' | 'campus_store'
}

export class CrossAppSessionManager {
    /**
     * Create a new wallet session (client-side - no JWT needed)
     */
    static createSessionToken(
        walletAddress: string,
        appOrigin: 'main_app' | 'campus_store'
    ): string {
        const now = Date.now()
        const expiresAt = now + (SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

        const session: WalletSession = {
            walletAddress,
            connectedAt: now,
            expiresAt,
            appOrigin
        }

        // Store in localStorage for cross-tab/cross-domain persistence
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
                console.log('✅ Session created:', { walletAddress, appOrigin })
            } catch (error) {
                console.error('Failed to store session:', error)
            }
        }

        // Return wallet address as simple "token" (not a real JWT)
        return walletAddress
    }

    /**
     * Get current session from localStorage
     */
    static getCurrentSession(): WalletSession | null {
        if (typeof window === 'undefined') return null

        try {
            const stored = localStorage.getItem(SESSION_STORAGE_KEY)
            if (!stored) return null

            const session: WalletSession = JSON.parse(stored)

            // Check if session is expired
            if (Date.now() > session.expiresAt) {
                this.clearSession()
                return null
            }

            return session
        } catch (error) {
            console.error('Failed to get session:', error)
            return null
        }
    }

    /**
     * Clear current session
     */
    static clearSession(): void {
        if (typeof window !== 'undefined') {
            try {
                localStorage.removeItem(SESSION_STORAGE_KEY)
                console.log('🧹 Session cleared')
            } catch (error) {
                console.error('Failed to clear session:', error)
            }
        }
    }

    /**
     * Check if there's an active valid session
     */
    static hasActiveSession(): boolean {
        return this.getCurrentSession() !== null
    }
}
