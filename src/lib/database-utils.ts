/* eslint-disable @typescript-eslint/no-explicit-any */
import { secureLogger } from './secure-logger'
import type {
  UserProfile,
  UserProfileInsert,
  UserStats,
  UserStatsInsert,
  UserPreferences,
  UserPreferencesInsert,
} from './database-types'

const nowISO = () => new Date().toISOString()

const profiles = new Map<string, UserProfile>()
const stats = new Map<string, UserStats>()
const preferences = new Map<string, UserPreferences>()

export class UserProfileManager {
  static async getProfile(userId: string): Promise<UserProfile | null> {
    const p = profiles.get(userId) || null
    return p
  }

  static async upsertProfile(input: UserProfileInsert): Promise<UserProfile> {
    const id = input.user_id
    const existing = profiles.get(id)
    const next: UserProfile = {
      id,
      user_id: id,
      display_name: input.display_name ?? existing?.display_name ?? `User${id.slice(-4)}`,
      email: input.email ?? existing?.email ?? null,
      phone: input.phone ?? existing?.phone ?? null,
      wallet_address: input.wallet_address ?? existing?.wallet_address ?? id,
      avatar_url: input.avatar_url ?? existing?.avatar_url ?? null,
      bio: input.bio ?? existing?.bio ?? null,
      university: input.university ?? existing?.university ?? null,
      major: input.major ?? existing?.major ?? null,
      graduation_year: input.graduation_year ?? existing?.graduation_year ?? null,
      created_at: existing?.created_at ?? nowISO(),
      updated_at: nowISO(),
    }
    profiles.set(id, next)
    secureLogger.info('Profile upsert (in-memory)', { userId: id })
    return next
  }

  static async deleteProfile(userId: string): Promise<void> {
    profiles.delete(userId)
    secureLogger.info('Profile deleted (in-memory)', { userId })
  }
}

export class UserStatsManager {
  static async getStats(userId: string): Promise<UserStats | null> {
    return stats.get(userId) || null
  }
  static async createStats(input: UserStatsInsert): Promise<UserStats> {
    const user_id = input.user_id
    const s: UserStats = {
      id: user_id,
      user_id,
      total_points: input.total_points ?? 0,
      level: input.level ?? 1,
      streak_days: input.streak_days ?? 0,
      completed_lessons: input.completed_lessons ?? 0,
      portfolio_value: input.portfolio_value ?? 0,
      total_cashback: input.total_cashback ?? 0,
      last_activity: input.last_activity ?? nowISO(),
      created_at: nowISO(),
      updated_at: nowISO(),
    }
    stats.set(user_id, s)
    return s
  }
  static async updateStats(userId: string, patch: Partial<UserStats>): Promise<UserStats> {
    const existing = stats.get(userId) ?? (await this.createStats({ user_id: userId }))
    const next: UserStats = { ...existing, ...patch, user_id: userId, id: userId, updated_at: nowISO() }
    stats.set(userId, next)
    return next
  }
  static async upsertStats(input: UserStatsInsert): Promise<UserStats> {
    const existing = await this.getStats(input.user_id)
    if (existing) return this.updateStats(input.user_id, input)
    return this.createStats(input)
  }
}

export class UserPreferencesManager {
  static async getPreferences(userId: string): Promise<UserPreferences | null> {
    return preferences.get(userId) || null
  }
  static async createPreferences(input: UserPreferencesInsert): Promise<UserPreferences> {
    const p: UserPreferences = {
      id: input.user_id,
      user_id: input.user_id,
      theme: input.theme ?? 'light',
      notifications_enabled: input.notifications_enabled ?? true,
      language: input.language ?? 'en',
      created_at: nowISO(),
      updated_at: nowISO(),
    }
    preferences.set(input.user_id, p)
    return p
  }
  static async updatePreferences(userId: string, patch: Partial<UserPreferences>): Promise<UserPreferences> {
    const existing = preferences.get(userId) ?? (await this.createPreferences({ user_id: userId }))
    const next: UserPreferences = { ...existing, ...patch, user_id: userId, id: userId, updated_at: nowISO() }
    preferences.set(userId, next)
    return next
  }
  static async upsertPreferences(input: UserPreferencesInsert): Promise<UserPreferences> {
    const existing = await this.getPreferences(input.user_id)
    if (existing) return this.updatePreferences(input.user_id, input)
    return this.createPreferences(input)
  }
}
