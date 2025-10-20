import { UserProfileManager, UserStatsManager, UserPreferencesManager, formatDisplayName, generateAvatar, getGreeting } from './database-utils'
import { Database } from './database.types'

// Type aliases for compatibility with existing code
export type UserProfile = {
  id: string
  userId: string
  displayName: string
  email?: string
  phone?: string
  walletAddress?: string
  avatarUrl?: string
  bio?: string
  university?: string
  major?: string
  graduationYear?: number
  createdAt: string
  updatedAt: string
}

export type UserStats = {
  id: string
  userId: string
  totalPoints: number
  totalCashback: number
  level: number
  completedLessons: number
  portfolioValue: number
  streakDays: number
  lastActivity: string
  createdAt: string
  updatedAt: string
}

export type UserPreferences = {
  id: string
  userId: string
  notificationsEnabled: boolean
  emailNotifications: boolean
  pushNotifications: boolean
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  privacySettings: Record<string, any>
  createdAt: string
  updatedAt: string
}

// Helper function to convert database format to app format
const convertDbProfileToApp = (dbProfile: Database['public']['Tables']['user_profiles']['Row']): UserProfile => ({
  id: dbProfile.id,
  userId: dbProfile.user_id,
  displayName: dbProfile.display_name,
  email: dbProfile.email || undefined,
  phone: dbProfile.phone || undefined,
  walletAddress: dbProfile.wallet_address || undefined,
  avatarUrl: dbProfile.avatar_url || undefined,
  bio: dbProfile.bio || undefined,
  university: dbProfile.university || undefined,
  major: dbProfile.major || undefined,
  graduationYear: dbProfile.graduation_year || undefined,
  createdAt: dbProfile.created_at,
  updatedAt: dbProfile.updated_at
})

const convertDbStatsToApp = (dbStats: Database['public']['Tables']['user_stats']['Row']): UserStats => ({
  id: dbStats.id,
  userId: dbStats.user_id,
  totalPoints: dbStats.total_points,
  totalCashback: Number(dbStats.total_cashback),
  level: dbStats.level,
  completedLessons: dbStats.completed_lessons,
  portfolioValue: Number(dbStats.portfolio_value),
  streakDays: dbStats.streak_days,
  lastActivity: dbStats.last_activity,
  createdAt: dbStats.created_at,
  updatedAt: dbStats.updated_at
})

const convertDbPreferencesToApp = (dbPrefs: Database['public']['Tables']['user_preferences']['Row']): UserPreferences => ({
  id: dbPrefs.id,
  userId: dbPrefs.user_id,
  notificationsEnabled: dbPrefs.notifications_enabled,
  emailNotifications: dbPrefs.email_notifications,
  pushNotifications: dbPrefs.push_notifications,
  theme: dbPrefs.theme,
  language: dbPrefs.language,
  timezone: dbPrefs.timezone,
  privacySettings: (dbPrefs.privacy_settings as Record<string, any>) || {},
  createdAt: dbPrefs.created_at,
  updatedAt: dbPrefs.updated_at
})

// User Profile Manager - Compatible with existing interface
export const userProfileManager = {
  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const dbProfile = await UserProfileManager.getProfile(userId)
      return dbProfile ? convertDbProfileToApp(dbProfile) : null
    } catch (error) {
      console.error('Error getting user profile:', error)
      return null
    }
  },

  async saveProfile(profile: UserProfile): Promise<void> {
    try {
      await UserProfileManager.updateProfile(profile.userId, {
        display_name: profile.displayName,
        email: profile.email || null,
        phone: profile.phone || null,
        wallet_address: profile.walletAddress || null,
        avatar_url: profile.avatarUrl || null,
        bio: profile.bio || null,
        university: profile.university || null,
        major: profile.major || null,
        graduation_year: profile.graduationYear || null
      })
    } catch (error) {
      console.error('Error saving user profile:', error)
      throw error
    }
  },

  async createProfile(userId: string, displayName: string, email?: string): Promise<UserProfile> {
    try {
      const dbProfile = await UserProfileManager.createProfile({
        user_id: userId,
        display_name: formatDisplayName(displayName),
        email: email || null,
        avatar_url: generateAvatar(displayName)
      })
      return convertDbProfileToApp(dbProfile)
    } catch (error) {
      console.error('Error creating user profile:', error)
      throw error
    }
  },

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const dbUpdates: any = {}
      
      if (updates.displayName) dbUpdates.display_name = formatDisplayName(updates.displayName)
      if (updates.email !== undefined) dbUpdates.email = updates.email || null
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone || null
      if (updates.walletAddress !== undefined) dbUpdates.wallet_address = updates.walletAddress || null
      if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl || null
      if (updates.bio !== undefined) dbUpdates.bio = updates.bio || null
      if (updates.university !== undefined) dbUpdates.university = updates.university || null
      if (updates.major !== undefined) dbUpdates.major = updates.major || null
      if (updates.graduationYear !== undefined) dbUpdates.graduation_year = updates.graduationYear || null

      const dbProfile = await UserProfileManager.updateProfile(userId, dbUpdates)
      return convertDbProfileToApp(dbProfile)
    } catch (error) {
      console.error('Error updating user profile:', error)
      throw error
    }
  },

  async deleteProfile(userId: string): Promise<void> {
    try {
      await UserProfileManager.deleteProfile(userId)
    } catch (error) {
      console.error('Error deleting user profile:', error)
      throw error
    }
  }
}

// User Stats Manager - Compatible with existing interface
export const userStatsManager = {
  async getStats(userId: string): Promise<UserStats | null> {
    try {
      const dbStats = await UserStatsManager.getStats(userId)
      return dbStats ? convertDbStatsToApp(dbStats) : null
    } catch (error) {
      console.error('Error getting user stats:', error)
      return null
    }
  },

  async saveStats(stats: UserStats): Promise<void> {
    try {
      await UserStatsManager.updateStats(stats.userId, {
        total_points: stats.totalPoints,
        total_cashback: stats.totalCashback,
        level: stats.level,
        completed_lessons: stats.completedLessons,
        portfolio_value: stats.portfolioValue,
        streak_days: stats.streakDays,
        last_activity: stats.lastActivity
      })
    } catch (error) {
      console.error('Error saving user stats:', error)
      throw error
    }
  },

  async initializeDefaultStats(userId: string): Promise<UserStats> {
    try {
      const dbStats = await UserStatsManager.createStats({
        user_id: userId,
        total_points: 0,
        total_cashback: 0,
        level: 1,
        completed_lessons: 0,
        portfolio_value: 0,
        streak_days: 0,
        last_activity: new Date().toISOString()
      })
      return convertDbStatsToApp(dbStats)
    } catch (error) {
      console.error('Error initializing user stats:', error)
      throw error
    }
  },

  async updateStats(userId: string, updates: Partial<UserStats>): Promise<UserStats> {
    try {
      const dbUpdates: any = {}
      
      if (updates.totalPoints !== undefined) dbUpdates.total_points = updates.totalPoints
      if (updates.totalCashback !== undefined) dbUpdates.total_cashback = updates.totalCashback
      if (updates.level !== undefined) dbUpdates.level = updates.level
      if (updates.completedLessons !== undefined) dbUpdates.completed_lessons = updates.completedLessons
      if (updates.portfolioValue !== undefined) dbUpdates.portfolio_value = updates.portfolioValue
      if (updates.streakDays !== undefined) dbUpdates.streak_days = updates.streakDays
      if (updates.lastActivity !== undefined) dbUpdates.last_activity = updates.lastActivity

      const dbStats = await UserStatsManager.updateStats(userId, dbUpdates)
      return convertDbStatsToApp(dbStats)
    } catch (error) {
      console.error('Error updating user stats:', error)
      throw error
    }
  },

  async incrementPoints(userId: string, points: number): Promise<UserStats> {
    try {
      const dbStats = await UserStatsManager.incrementPoints(userId, points)
      return convertDbStatsToApp(dbStats)
    } catch (error) {
      console.error('Error incrementing points:', error)
      throw error
    }
  },

  async addCashback(userId: string, amount: number): Promise<UserStats> {
    try {
      const dbStats = await UserStatsManager.addCashback(userId, amount)
      return convertDbStatsToApp(dbStats)
    } catch (error) {
      console.error('Error adding cashback:', error)
      throw error
    }
  }
}

// User Preferences Manager
export const userPreferencesManager = {
  async getPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const dbPrefs = await UserPreferencesManager.getPreferences(userId)
      return dbPrefs ? convertDbPreferencesToApp(dbPrefs) : null
    } catch (error) {
      console.error('Error getting user preferences:', error)
      return null
    }
  },

  async savePreferences(preferences: UserPreferences): Promise<void> {
    try {
      await UserPreferencesManager.updatePreferences(preferences.userId, {
        notifications_enabled: preferences.notificationsEnabled,
        email_notifications: preferences.emailNotifications,
        push_notifications: preferences.pushNotifications,
        theme: preferences.theme,
        language: preferences.language,
        timezone: preferences.timezone,
        privacy_settings: preferences.privacySettings
      })
    } catch (error) {
      console.error('Error saving user preferences:', error)
      throw error
    }
  },

  async createPreferences(userId: string): Promise<UserPreferences> {
    try {
      const dbPrefs = await UserPreferencesManager.createPreferences({
        user_id: userId,
        notifications_enabled: true,
        email_notifications: true,
        push_notifications: true,
        theme: 'system',
        language: 'en',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        privacy_settings: {}
      })
      return convertDbPreferencesToApp(dbPrefs)
    } catch (error) {
      console.error('Error creating user preferences:', error)
      throw error
    }
  },

  async updatePreferences(userId: string, updates: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      const dbUpdates: any = {}
      
      if (updates.notificationsEnabled !== undefined) dbUpdates.notifications_enabled = updates.notificationsEnabled
      if (updates.emailNotifications !== undefined) dbUpdates.email_notifications = updates.emailNotifications
      if (updates.pushNotifications !== undefined) dbUpdates.push_notifications = updates.pushNotifications
      if (updates.theme !== undefined) dbUpdates.theme = updates.theme
      if (updates.language !== undefined) dbUpdates.language = updates.language
      if (updates.timezone !== undefined) dbUpdates.timezone = updates.timezone
      if (updates.privacySettings !== undefined) dbUpdates.privacy_settings = updates.privacySettings

      const dbPrefs = await UserPreferencesManager.updatePreferences(userId, dbUpdates)
      return convertDbPreferencesToApp(dbPrefs)
    } catch (error) {
      console.error('Error updating user preferences:', error)
      throw error
    }
  }
}

// Export utility functions for compatibility
export { formatDisplayName, generateAvatar, getGreeting }