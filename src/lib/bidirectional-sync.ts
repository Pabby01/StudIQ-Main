/**
 * Bidirectional Sync Client
 * 
 * Handles data synchronization between Main App and Campus Store
 */

export interface SyncConfig {
    mainAppUrl: string
    storeUrl: string
    apiKey?: string
}

export interface UserSyncData {
    walletAddress: string
    displayName?: string
    email?: string
    school?: string
    campus?: string
    totalPoints: number
    profileData?: Record<string, any>
}

export interface TransactionSyncData {
    id: string
    walletAddress: string
    type: 'purchase' | 'points_earned' | 'points_spent'
    amount: number
    points?: number
    description: string
    source: 'main_app' | 'campus_store'
    timestamp: number
    metadata?: Record<string, any>
}

export class BidirectionalSyncClient {
    private config: SyncConfig

    constructor(config: SyncConfig) {
        this.config = config
    }

    /**
     * Sync user profile from one app to another
     */
    async syncUserProfile(walletAddress: string, targetApp: 'main' | 'store'): Promise<UserSyncData> {
        const targetUrl = targetApp === 'main' ? this.config.mainAppUrl : this.config.storeUrl

        const response = await fetch(`${targetUrl}/api/sync/profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(this.config.apiKey && { 'X-API-Key': this.config.apiKey })
            },
            body: JSON.stringify({ walletAddress })
        })

        if (!response.ok) {
            throw new Error(`Failed to sync profile: ${response.statusText}`)
        }

        return response.json()
    }

    /**
     * Sync points balance across both apps
     */
    async syncPoints(walletAddress: string): Promise<{ totalPoints: number; sources: Record<string, number> }> {
        // Get points from both sources
        const [mainAppPoints, storePoints] = await Promise.all([
            this.getPointsFromApp(walletAddress, 'main'),
            this.getPointsFromApp(walletAddress, 'store')
        ])

        return {
            totalPoints: mainAppPoints + storePoints,
            sources: {
                main_app: mainAppPoints,
                campus_store: storePoints
            }
        }
    }

    /**
     * Report transaction from one app to sync with the other
     */
    async reportTransaction(transaction: TransactionSyncData, targetApp: 'main' | 'store'): Promise<void> {
        const targetUrl = targetApp === 'main' ? this.config.mainAppUrl : this.config.storeUrl

        const response = await fetch(`${targetUrl}/api/sync/transaction`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(this.config.apiKey && { 'X-API-Key': this.config.apiKey })
            },
            body: JSON.stringify(transaction)
        })

        if (!response.ok) {
            throw new Error(`Failed to sync transaction: ${response.statusText}`)
        }
    }

    /**
     * Get points from specific app
     */
    private async getPointsFromApp(walletAddress: string, app: 'main' | 'store'): Promise<number> {
        const targetUrl = app === 'main' ? this.config.mainAppUrl : this.config.storeUrl

        const response = await fetch(`${targetUrl}/api/sync/points/${walletAddress}`, {
            method: 'GET',
            headers: {
                ...(this.config.apiKey && { 'X-API-Key': this.config.apiKey })
            }
        })

        if (!response.ok) {
            console.error(`Failed to get points from ${app}:`, response.statusText)
            return 0
        }

        const data = await response.json()
        return data.points || 0
    }

    /**
     * Sync all user data when connecting wallet
     */
    async syncOnConnect(walletAddress: string): Promise<void> {
        try {
            // Sync profile both ways
            await Promise.all([
                this.syncUserProfile(walletAddress, 'main'),
                this.syncUserProfile(walletAddress, 'store')
            ])

            // Sync points
            await this.syncPoints(walletAddress)

            console.log('✅ Cross-app sync completed for:', walletAddress)
        } catch (error) {
            console.error('❌ Sync error:', error)
            throw error
        }
    }
}

// Singleton instance
let syncClientInstance: BidirectionalSyncClient | null = null

export function getSyncClient(): BidirectionalSyncClient {
    if (!syncClientInstance) {
        syncClientInstance = new BidirectionalSyncClient({
            mainAppUrl: process.env.NEXT_PUBLIC_MAIN_APP_URL || 'https://studiq.app',
            storeUrl: process.env.NEXT_PUBLIC_STORE_URL || 'https://store.studiq.fun',
            apiKey: process.env.SYNC_API_KEY
        })
    }
    return syncClientInstance
}
