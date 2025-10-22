import { UserProfileManager, UserStatsManager, UserPreferencesManager } from './database-utils'
import { ClientUserProfileManager, ClientUserPreferencesManager } from './client-database-utils'
import { secureLogger, secureLogUtils } from './secure-logger'

export interface UserProfile {
  id: string;
  walletAddress: string;
  displayName: string;
  email?: string;
  phone?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
    language: string;
  };
}

export interface UserStats {
  totalPoints: number;
  totalCashback: number;
  level: string;
  nextLevelPoints: number;
  completedLessons: number;
  portfolioValue: number;
  totalXP: number;
  streak: number;
  totalSessions: number; // Assuming this is a number, adjust if it's a specific type
  totalTimeSpent: number;
  achievements: string[]; // Changed to string[] as Achievement is not defined
  coursesCompleted: number;
  averageScore: number;
}

// Helper function to calculate level from points
const calculateLevel = (points: number): { level: string; nextLevelPoints: number } => {
  if (points < 500) return { level: 'Bronze', nextLevelPoints: 500 - points }
  if (points < 1500) return { level: 'Silver', nextLevelPoints: 1500 - points }
  if (points < 3000) return { level: 'Gold', nextLevelPoints: 3000 - points }
  if (points < 5000) return { level: 'Platinum', nextLevelPoints: 5000 - points }
  return { level: 'Diamond', nextLevelPoints: 0 }
}

// Helper function to convert database profile to legacy format
const convertDbProfileToLegacy = async (
  dbProfile: {
    id: string;
    wallet_address?: string;
    display_name: string;
    email?: string | null;
    phone?: string | null;
    avatar_url?: string | null;
    created_at: string;
    updated_at: string;
  },
  dbPrefs: {
    theme?: string;
    notifications_enabled?: boolean;
    language?: string;
  } | null
): Promise<UserProfile> => {
  return {
    id: dbProfile.id,
    walletAddress: dbProfile.wallet_address || '',
    displayName: dbProfile.display_name,
    email: dbProfile.email || undefined,
    phone: dbProfile.phone || undefined,
    avatar: dbProfile.avatar_url || undefined,
    createdAt: new Date(dbProfile.created_at),
    updatedAt: new Date(dbProfile.updated_at),
    preferences: {
      theme: dbPrefs?.theme === 'dark' ? 'dark' : 'light',
      notifications: dbPrefs?.notifications_enabled ?? true,
      language: dbPrefs?.language || 'en'
    }
  }
}

// Helper function to convert database stats to legacy format
const convertDbStatsToLegacy = (dbStats: {
  total_points: number;
  total_cashback: string | number;
  completed_lessons: number;
  portfolio_value: string | number;
  streak_days: number;
}): UserStats => {
  const { level, nextLevelPoints } = calculateLevel(dbStats.total_points)
  return {
    totalPoints: dbStats.total_points,
    totalCashback: Number(dbStats.total_cashback),
    level,
    nextLevelPoints,
    completedLessons: dbStats.completed_lessons,
    portfolioValue: Number(dbStats.portfolio_value),
    totalXP: dbStats.total_points, // Map total_points to totalXP
    streak: dbStats.streak_days,
    totalSessions: 0, // Not available in current schema
    totalTimeSpent: 0, // Not available in current schema
    achievements: [], // Not available in current schema
    coursesCompleted: dbStats.completed_lessons,
    averageScore: 0 // Not available in current schema
  }
}

// User Profile Management
export const userProfileManager = {
  // Get user profile from Supabase
  getProfile: async (walletAddress: string): Promise<UserProfile | null> => {
    try {
      // First try to find by wallet address
      const dbProfile = await UserProfileManager.getProfile(walletAddress)
      if (!dbProfile) return null

      // Get user preferences
      const dbPrefs = await UserPreferencesManager.getPreferences(walletAddress)
      
      return await convertDbProfileToLegacy(
        {
          id: dbProfile.id,
          wallet_address: dbProfile.wallet_address || undefined,
          display_name: dbProfile.display_name,
          email: dbProfile.email,
          phone: dbProfile.phone,
          avatar_url: dbProfile.avatar_url,
          created_at: dbProfile.created_at,
          updated_at: dbProfile.updated_at
        },
        dbPrefs
      )
    } catch (error) {
      secureLogger.error('Error getting user profile', {
        walletAddress: secureLogUtils.maskWalletAddress(walletAddress),
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return null
    }
  },

  // Save user profile to Supabase
  saveProfile: async (profile: UserProfile): Promise<void> => {
    try {
      await UserProfileManager.updateProfile(profile.walletAddress, {
        display_name: profile.displayName,
        email: profile.email || null,
        phone: profile.phone || null,
        wallet_address: profile.walletAddress,
        avatar_url: profile.avatar || null
      })

      // Update preferences
      await UserPreferencesManager.updatePreferences(profile.walletAddress, {
        theme: profile.preferences.theme === 'dark' ? 'dark' : 'light',
        notifications_enabled: profile.preferences.notifications,
        language: profile.preferences.language
      })
    } catch (error) {
      secureLogger.error('Error saving user profile', {
        walletAddress: secureLogUtils.maskWalletAddress(profile.walletAddress),
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  },

  // Create new user profile
  createProfile: async (walletAddress: string, displayName: string, email?: string, phone?: string): Promise<UserProfile> => {
    try {
      const dbProfile = await ClientUserProfileManager.createProfile({
        user_id: walletAddress,
        display_name: displayName,
        email: email || null,
        phone: phone || null,
        wallet_address: walletAddress,
        avatar_url: generateAvatar(displayName)
      })

      // Create default preferences
      const dbPrefs = await ClientUserPreferencesManager.createPreferences({
        user_id: walletAddress,
        theme: 'light',
        notifications_enabled: true,
        language: 'en'
      })

      return await convertDbProfileToLegacy(
        {
          id: dbProfile.id,
          wallet_address: dbProfile.wallet_address || undefined,
          display_name: dbProfile.display_name,
          email: dbProfile.email,
          phone: dbProfile.phone,
          avatar_url: dbProfile.avatar_url,
          created_at: dbProfile.created_at,
          updated_at: dbProfile.updated_at
        },
        dbPrefs
      )
    } catch (error) {
      secureLogger.error('Error creating user profile', {
        walletAddress: secureLogUtils.maskWalletAddress(walletAddress),
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  },

  // Update user profile
  updateProfile: async (walletAddress: string, updates: Partial<UserProfile>): Promise<UserProfile | null> => {
    try {
      const existingProfile = await userProfileManager.getProfile(walletAddress)
      if (!existingProfile) return null

      const updatedProfile = {
        ...existingProfile,
        ...updates,
        updatedAt: new Date(),
      }

      await userProfileManager.saveProfile(updatedProfile)
      return updatedProfile
    } catch (error) {
      secureLogger.error('Error updating user profile', {
        walletAddress: secureLogUtils.maskWalletAddress(walletAddress),
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return null
    }
  },

  // Delete user profile
  deleteProfile: async (walletAddress: string): Promise<void> => {
    try {
      await UserProfileManager.deleteProfile(walletAddress)
    } catch (error) {
      secureLogger.error('Error deleting user profile', {
        walletAddress: secureLogUtils.maskWalletAddress(walletAddress),
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  },
};

// User Stats Management
export const userStatsManager = {
  // Get user stats from Supabase
  getStats: async (walletAddress: string): Promise<UserStats | null> => {
    try {
      const dbStats = await UserStatsManager.getStats(walletAddress)
      if (!dbStats) return null

      return convertDbStatsToLegacy(dbStats)
    } catch (error) {
      secureLogger.error('Error getting user stats', {
        walletAddress: secureLogUtils.maskWalletAddress(walletAddress),
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return null
    }
  },

  // Save user stats to Supabase
  saveStats: async (walletAddress: string, stats: UserStats): Promise<void> => {
    try {
      await UserStatsManager.updateStats(walletAddress, {
        total_points: stats.totalXP,
        level: typeof stats.level === 'string' ? 1 : stats.level, // Convert string level to number
        streak_days: stats.streak,
        completed_lessons: stats.coursesCompleted,
        portfolio_value: stats.portfolioValue,
        total_cashback: stats.totalCashback,
        last_activity: new Date().toISOString()
      })
    } catch (error) {
      secureLogger.error('Error saving user stats', {
        walletAddress: secureLogUtils.maskWalletAddress(walletAddress),
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  },

  // Initialize user stats
  initializeStats: async (walletAddress: string): Promise<UserStats> => {
    try {
      const dbStats = await UserStatsManager.createStats({
        user_id: walletAddress,
        total_points: 0,
        level: 1,
        streak_days: 0,
        completed_lessons: 0,
        portfolio_value: 0,
        total_cashback: 0,
        last_activity: new Date().toISOString()
      })

      return convertDbStatsToLegacy(dbStats)
    } catch (error) {
      secureLogger.error('Error initializing user stats', {
        walletAddress: secureLogUtils.maskWalletAddress(walletAddress),
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  },

  // Update user stats
  updateStats: async (walletAddress: string, updates: Partial<UserStats>): Promise<UserStats | null> => {
    try {
      let existingStats = await userStatsManager.getStats(walletAddress)
      if (!existingStats) {
        existingStats = await userStatsManager.initializeStats(walletAddress)
      }
      
      const updatedStats = {
        ...existingStats,
        ...updates,
      };

      await userStatsManager.saveStats(walletAddress, updatedStats)
      return updatedStats
    } catch (error) {
      secureLogger.error('Error updating user stats', {
        walletAddress: secureLogUtils.maskWalletAddress(walletAddress),
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return null
    }
  },
};

// Utility functions
export const formatDisplayName = (name: string): string => {
  return name.trim().split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
};

export const getGreeting = (name: string): string => {
  const hour = new Date().getHours();
  let timeGreeting = 'Good morning';
  
  if (hour >= 12 && hour < 17) {
    timeGreeting = 'Good afternoon';
  } else if (hour >= 17) {
    timeGreeting = 'Good evening';
  }
  
  return `${timeGreeting}, ${name}!`;
};

export const generateAvatar = (name: string): string => {
  // Generate a simple avatar based on initials
  const initials = name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
  
  return initials;
};
