/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js'
import { secureLogger } from '@/lib/secure-logger'

// Enhanced Supabase client with optimizations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'x-application-name': 'studiq-optimized'
      }
    }
  }
)

// Batch operation utilities
class BatchOperationManager {
  private static instance: BatchOperationManager
  private pendingOperations: Map<string, any[]> = new Map()
  private batchTimers: Map<string, NodeJS.Timeout> = new Map()
  private readonly BATCH_SIZE = 10
  private readonly BATCH_DELAY = 100 // ms

  static getInstance(): BatchOperationManager {
    if (!BatchOperationManager.instance) {
      BatchOperationManager.instance = new BatchOperationManager()
    }
    return BatchOperationManager.instance
  }

  async addOperation(table: string, operation: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const key = table
      
      if (!this.pendingOperations.has(key)) {
        this.pendingOperations.set(key, [])
      }
      
      this.pendingOperations.get(key)!.push({ operation, resolve, reject })
      
      // Clear existing timer
      if (this.batchTimers.has(key)) {
        clearTimeout(this.batchTimers.get(key)!)
      }
      
      // Set new timer or execute immediately if batch is full
      const pending = this.pendingOperations.get(key)!
      if (pending.length >= this.BATCH_SIZE) {
        this.executeBatch(key)
      } else {
        this.batchTimers.set(key, setTimeout(() => {
          this.executeBatch(key)
        }, this.BATCH_DELAY))
      }
    })
  }

  private async executeBatch(table: string) {
    const pending = this.pendingOperations.get(table)
    if (!pending || pending.length === 0) return

    this.pendingOperations.set(table, [])
    if (this.batchTimers.has(table)) {
      clearTimeout(this.batchTimers.get(table)!)
      this.batchTimers.delete(table)
    }

    try {
      // Execute operations in parallel
      const results = await Promise.allSettled(
        pending.map(({ operation }) => operation())
      )

      // Resolve/reject individual promises
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          pending[index].resolve(result.value)
        } else {
          pending[index].reject(result.reason)
        }
      })
    } catch (error) {
      // Reject all pending operations
      pending.forEach(({ reject }) => reject(error))
    }
  }
}

// Optimized User Profile Manager
export class OptimizedUserProfileManager {
  private static batchManager = BatchOperationManager.getInstance()

  static async upsertProfile(profileData: any): Promise<any> {
    const startTime = Date.now()
    
    try {
      const operation = async () => {
        const { data, error } = await supabaseAdmin
          .from('user_profiles')
          .upsert(profileData, { 
            onConflict: 'user_id',
            ignoreDuplicates: false 
          })
          .select()
          .single()

        if (error) throw error
        return data
      }

      const result = await this.batchManager.addOperation('user_profiles', operation)
      
      const duration = Date.now() - startTime
      secureLogger.info('🚀 OPTIMIZED - Profile upsert completed:', {
        userId: profileData.user_id,
        duration,
        batched: true
      })

      return result
    } catch (error) {
      secureLogger.error('🚀 OPTIMIZED - Profile upsert failed:', {
        userId: profileData.user_id,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      })
      throw error
    }
  }

  static async getProfile(userId: string): Promise<any> {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error
      }

      return data
    } catch (error) {
      secureLogger.warn('Profile fetch failed:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return null
    }
  }

  static async batchGetProfiles(userIds: string[]): Promise<any[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .in('user_id', userIds)

      if (error) throw error
      return data || []
    } catch (error) {
      secureLogger.error('Batch profile fetch failed:', error)
      return []
    }
  }
}

// Optimized User Stats Manager
export class OptimizedUserStatsManager {
  private static batchManager = BatchOperationManager.getInstance()

  static async upsertStats(statsData: any): Promise<any> {
    const startTime = Date.now()
    
    try {
      const operation = async () => {
        const { data, error } = await supabaseAdmin
          .from('user_stats')
          .upsert(statsData, { 
            onConflict: 'user_id',
            ignoreDuplicates: false 
          })
          .select()
          .single()

        if (error) throw error
        return data
      }

      const result = await this.batchManager.addOperation('user_stats', operation)
      
      const duration = Date.now() - startTime
      secureLogger.info('🚀 OPTIMIZED - Stats upsert completed:', {
        userId: statsData.user_id,
        duration,
        batched: true
      })

      return result
    } catch (error) {
      secureLogger.error('🚀 OPTIMIZED - Stats upsert failed:', {
        userId: statsData.user_id,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      })
      throw error
    }
  }

  static async incrementStats(userId: string, increments: Record<string, number>): Promise<any> {
    try {
      // Build the update query dynamically
      let query = supabaseAdmin.from('user_stats').update(increments).eq('user_id', userId)
      
      const { data, error } = await query.select().single()
      if (error) throw error
      
      return data
    } catch (error) {
      secureLogger.error('Stats increment failed:', {
        userId,
        increments,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }
}

// Optimized User Preferences Manager
export class OptimizedUserPreferencesManager {
  private static batchManager = BatchOperationManager.getInstance()

  static async upsertPreferences(preferencesData: any): Promise<any> {
    const startTime = Date.now()
    
    try {
      const operation = async () => {
        const { data, error } = await supabaseAdmin
          .from('user_preferences')
          .upsert(preferencesData, { 
            onConflict: 'user_id',
            ignoreDuplicates: false 
          })
          .select()
          .single()

        if (error) throw error
        return data
      }

      const result = await this.batchManager.addOperation('user_preferences', operation)
      
      const duration = Date.now() - startTime
      secureLogger.info('🚀 OPTIMIZED - Preferences upsert completed:', {
        userId: preferencesData.user_id,
        duration,
        batched: true
      })

      return result
    } catch (error) {
      secureLogger.error('🚀 OPTIMIZED - Preferences upsert failed:', {
        userId: preferencesData.user_id,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      })
      throw error
    }
  }

  static async updatePreferences(userId: string, updates: Record<string, any>): Promise<any> {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_preferences')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      secureLogger.error('Preferences update failed:', {
        userId,
        updates,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }
}

// Connection health monitoring
export class DatabaseHealthMonitor {
  private static lastHealthCheck = 0
  private static readonly HEALTH_CHECK_INTERVAL = 30000 // 30 seconds

  static async checkHealth(): Promise<boolean> {
    const now = Date.now()
    if (now - this.lastHealthCheck < this.HEALTH_CHECK_INTERVAL) {
      return true // Skip frequent checks
    }

    try {
      const { error } = await supabaseAdmin
        .from('user_profiles')
        .select('user_id')
        .limit(1)

      this.lastHealthCheck = now
      
      if (error) {
        secureLogger.warn('Database health check failed:', error)
        return false
      }

      return true
    } catch (error) {
      secureLogger.error('Database health check error:', error)
      return false
    }
  }
}

// Performance monitoring
export class DatabasePerformanceMonitor {
  private static queryTimes: number[] = []
  private static readonly MAX_SAMPLES = 100

  static recordQueryTime(duration: number) {
    this.queryTimes.push(duration)
    if (this.queryTimes.length > this.MAX_SAMPLES) {
      this.queryTimes.shift()
    }
  }

  static getAverageQueryTime(): number {
    if (this.queryTimes.length === 0) return 0
    return this.queryTimes.reduce((sum, time) => sum + time, 0) / this.queryTimes.length
  }

  static getPerformanceStats() {
    const times = this.queryTimes
    if (times.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0 }
    }

    return {
      avg: this.getAverageQueryTime(),
      min: Math.min(...times),
      max: Math.max(...times),
      count: times.length
    }
  }
}

// Export optimized managers as default exports for backward compatibility
export const UserProfileManager = OptimizedUserProfileManager
export const UserStatsManager = OptimizedUserStatsManager
export const UserPreferencesManager = OptimizedUserPreferencesManager