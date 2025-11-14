import { UserProfileManager, UserStatsManager, UserPreferencesManager } from './database-utils'
import { ClientUserProfileManager, ClientUserPreferencesManager } from './client-database-utils'
import { secureLogger, secureLogUtils } from './secure-logger'
import { normalizeWalletAddress } from './wallet-utils'
import { UserProfileInsert } from './database-types'

export interface UserProfile {
  id: string;
  walletAddress: string;
  displayName: string;
  email?: string;
  phone?: string;
  avatar?: string;
  avatarUrl?: string;
  bio?: string;
  university?: string;
  major?: string;
  graduationYear?: number;
  twitter?: string;
  github?: string;
  linkedin?: string;
  instagram?: string;
  website?: string;
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
    wallet_address?: string | null;
    display_name: string;
    email?: string | null;
    phone?: string | null;
    avatar_url?: string | null;
    bio?: string | null;
    university?: string | null;
    major?: string | null;
    graduation_year?: number | null;
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
    avatarUrl: dbProfile.avatar_url || undefined,
    bio: dbProfile.bio || undefined,
    university: dbProfile.university || undefined,
    major: dbProfile.major || undefined,
    graduationYear: dbProfile.graduation_year || undefined,
    twitter: undefined, // Database doesn't have social fields
    github: undefined,
    linkedin: undefined,
    instagram: undefined,
    website: undefined,
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
      const normalizedAddress = normalizeWalletAddress(walletAddress)
      // First try to find by wallet address
      const dbProfile = await UserProfileManager.getProfile(normalizedAddress)
      if (!dbProfile) return null

      // Get user preferences
      const dbPrefs = await UserPreferencesManager.getPreferences(normalizedAddress)
      
      return await convertDbProfileToLegacy(
        {
          id: dbProfile.id,
          wallet_address: dbProfile.wallet_address || undefined,
          display_name: dbProfile.display_name,
          email: dbProfile.email,
          phone: dbProfile.phone,
          avatar_url: dbProfile.avatar_url,
          bio: dbProfile.bio,
          university: dbProfile.university,
          major: dbProfile.major,
          graduation_year: dbProfile.graduation_year,
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
      const normalizedAddress = normalizeWalletAddress(profile.walletAddress)
      await UserProfileManager.updateProfile(normalizedAddress, {
        display_name: profile.displayName,
        email: profile.email || null,
        phone: profile.phone || null,
        wallet_address: normalizedAddress,
        avatar_url: profile.avatarUrl || profile.avatar || null,
        bio: profile.bio || null
      })

      // Update preferences
      await UserPreferencesManager.updatePreferences(normalizedAddress, {
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
      const normalizedAddress = normalizeWalletAddress(walletAddress)
      const dbProfile = await ClientUserProfileManager.createProfile({
        user_id: normalizedAddress,
        display_name: displayName,
        email: email || null,
        phone: phone || null,
        wallet_address: normalizedAddress,
        avatar_url: generateAvatar(displayName)
      })

      // Create default preferences
      const dbPrefs = await ClientUserPreferencesManager.createPreferences({
        user_id: normalizedAddress,
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
          bio: dbProfile.bio,
          university: dbProfile.university,
          major: dbProfile.major,
          graduation_year: dbProfile.graduation_year,
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

      // Map camelCase client fields to snake_case database fields
      const mappedUpdates: Record<string, string | number | null> = {}
      if (updates.displayName !== undefined) mappedUpdates.display_name = updates.displayName
      if (updates.avatarUrl !== undefined) mappedUpdates.avatar_url = updates.avatarUrl
      if (updates.bio !== undefined) mappedUpdates.bio = updates.bio
      if (updates.email !== undefined) mappedUpdates.email = updates.email
      if (updates.phone !== undefined) mappedUpdates.phone = updates.phone
      if (updates.university !== undefined) mappedUpdates.university = updates.university
      if (updates.major !== undefined) mappedUpdates.major = updates.major
      if (updates.graduationYear !== undefined) mappedUpdates.graduation_year = updates.graduationYear
      if (updates.walletAddress !== undefined) mappedUpdates.wallet_address = updates.walletAddress

      // Handle social fields - these are NOT in the database schema
      const socialUpdates: Record<string, string> = {}
      if (updates.twitter) socialUpdates.twitter = updates.twitter
      if (updates.github) socialUpdates.github = updates.github
      if (updates.linkedin) socialUpdates.linkedin = updates.linkedin
      if (updates.website) socialUpdates.website = updates.website

      // Log warning about unsupported social fields
      if (Object.keys(socialUpdates).length > 0) {
        secureLogger.warn('Social media fields are not supported in user_profiles table', {
          walletAddress: secureLogUtils.maskWalletAddress(walletAddress),
          socialFields: Object.keys(socialUpdates)
        })
      }

      // Update profile via client manager for consistency
      const updatedDbProfile = await ClientUserProfileManager.updateProfile(walletAddress, mappedUpdates)

      // Convert the database response back to client format
      const dbPrefs = await UserPreferencesManager.getPreferences(walletAddress)
      return await convertDbProfileToLegacy(
        {
          id: updatedDbProfile.id,
          wallet_address: updatedDbProfile.wallet_address || undefined,
          display_name: updatedDbProfile.display_name,
          email: updatedDbProfile.email,
          phone: updatedDbProfile.phone,
          avatar_url: updatedDbProfile.avatar_url,
          bio: updatedDbProfile.bio,
          university: updatedDbProfile.university,
          major: updatedDbProfile.major,
          graduation_year: updatedDbProfile.graduation_year,
          created_at: updatedDbProfile.created_at,
          updated_at: updatedDbProfile.updated_at
        },
        dbPrefs
      )
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
}

// Comprehensive profile validation function
export const validateProfileUpdate = (updates: Partial<UserProfile>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  // Validate display name
  if (updates.displayName !== undefined) {
    if (typeof updates.displayName !== 'string') {
      errors.push('Display name must be a string')
    } else if (updates.displayName.trim().length < 2) {
      errors.push('Display name must be at least 2 characters long')
    } else if (updates.displayName.trim().length > 50) {
      errors.push('Display name must not exceed 50 characters')
    }
  }

  // Validate email
  if (updates.email !== undefined && updates.email !== null) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(updates.email)) {
      errors.push('Invalid email format')
    }
  }

  // Validate phone
  if (updates.phone !== undefined && updates.phone !== null) {
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/
    if (!phoneRegex.test(updates.phone)) {
      errors.push('Invalid phone number format')
    } else if (updates.phone.replace(/\D/g, '').length < 10) {
      errors.push('Phone number must be at least 10 digits')
    }
  }

  // Validate bio
  if (updates.bio !== undefined && updates.bio !== null) {
    if (typeof updates.bio !== 'string') {
      errors.push('Bio must be a string')
    } else if (updates.bio.length > 500) {
      errors.push('Bio must not exceed 500 characters')
    }
  }

  // Validate university
  if (updates.university !== undefined && updates.university !== null) {
    if (typeof updates.university !== 'string') {
      errors.push('University must be a string')
    } else if (updates.university.length > 100) {
      errors.push('University name must not exceed 100 characters')
    }
  }

  // Validate major
  if (updates.major !== undefined && updates.major !== null) {
    if (typeof updates.major !== 'string') {
      errors.push('Major must be a string')
    } else if (updates.major.length > 100) {
      errors.push('Major must not exceed 100 characters')
    }
  }

  // Validate graduation year
  if (updates.graduationYear !== undefined && updates.graduationYear !== null) {
    const currentYear = new Date().getFullYear()
    if (typeof updates.graduationYear !== 'number' || !Number.isInteger(updates.graduationYear)) {
      errors.push('Graduation year must be a whole number')
    } else if (updates.graduationYear < currentYear || updates.graduationYear > currentYear + 10) {
      errors.push('Graduation year must be between current year and 10 years in the future')
    }
  }

  // Validate avatar URL
  if (updates.avatarUrl !== undefined && updates.avatarUrl !== null) {
    if (typeof updates.avatarUrl !== 'string') {
      errors.push('Avatar URL must be a string')
    } else {
      try {
        new URL(updates.avatarUrl)
      } catch {
        errors.push('Avatar URL must be a valid URL')
      }
    }
  }

  // Validate social media URLs
  const socialFields = ['twitter', 'linkedin', 'instagram', 'website'] as const
  for (const field of socialFields) {
    if (updates[field] !== undefined && updates[field] !== null) {
      if (typeof updates[field] !== 'string') {
        errors.push(`${field} must be a string`)
      } else if (updates[field] && !updates[field].startsWith('http')) {
        // Allow empty strings but validate non-empty ones
        if (updates[field].length > 0) {
          errors.push(`${field} must be a valid URL starting with http`)
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Enhanced profile update function with validation and error handling
export const patchProfile = async (
  userId: string, 
  updates: Partial<UserProfile>, 
  options: { validate?: boolean; preserveSocial?: boolean } = {}
): Promise<UserProfile> => {
  const { validate = true, preserveSocial = true } = options

  try {
    // Validate updates if requested
    if (validate) {
      const validation = validateProfileUpdate(updates)
      if (!validation.isValid) {
        throw new Error(`Profile validation failed: ${validation.errors.join(', ')}`)
      }
    }

    // Get existing profile to preserve social fields if requested
    let existingProfile: UserProfile | null = null
    if (preserveSocial) {
      existingProfile = await userProfileManager.getProfile(userId)
    }

    // Map camelCase to snake_case for database
    const mappedUpdates: Partial<UserProfileInsert> = {}
    
    // Map supported fields
    if (updates.displayName !== undefined) mappedUpdates.display_name = updates.displayName
    if (updates.avatarUrl !== undefined) mappedUpdates.avatar_url = updates.avatarUrl
    if (updates.bio !== undefined) mappedUpdates.bio = updates.bio
    if (updates.email !== undefined) mappedUpdates.email = updates.email
    if (updates.phone !== undefined) mappedUpdates.phone = updates.phone
    if (updates.university !== undefined) mappedUpdates.university = updates.university
    if (updates.major !== undefined) mappedUpdates.major = updates.major
    if (updates.graduationYear !== undefined) mappedUpdates.graduation_year = updates.graduationYear
    if (updates.walletAddress !== undefined) mappedUpdates.wallet_address = updates.walletAddress

    // Use client API for consistency
    const updatedDbProfile = await ClientUserProfileManager.updateProfile(userId, mappedUpdates)

    // Convert back to client format and preserve social fields if needed
    let resultProfile = await convertDbProfileToLegacy(updatedDbProfile, null)
    
    if (preserveSocial && existingProfile) {
      // Preserve existing social fields if not explicitly updated
      resultProfile = {
        ...resultProfile,
        twitter: updates.twitter !== undefined ? updates.twitter : existingProfile.twitter,
        linkedin: updates.linkedin !== undefined ? updates.linkedin : existingProfile.linkedin,
        instagram: updates.instagram !== undefined ? updates.instagram : existingProfile.instagram,
        website: updates.website !== undefined ? updates.website : existingProfile.website,
        github: updates.github !== undefined ? updates.github : existingProfile.github
      }
    } else if (!preserveSocial) {
      // Apply updates for social fields if explicitly provided
      resultProfile = {
        ...resultProfile,
        twitter: updates.twitter !== undefined ? updates.twitter : resultProfile.twitter,
        linkedin: updates.linkedin !== undefined ? updates.linkedin : resultProfile.linkedin,
        instagram: updates.instagram !== undefined ? updates.instagram : resultProfile.instagram,
        website: updates.website !== undefined ? updates.website : resultProfile.website,
        github: updates.github !== undefined ? updates.github : resultProfile.github
      }
    }

    secureLogger.info('Profile updated successfully', {
      userId: secureLogUtils.maskUserId(userId),
      updatedFields: Object.keys(mappedUpdates),
      timestamp: new Date().toISOString()
    })

    return resultProfile

  } catch (error) {
    secureLogger.error('Error in patchProfile', {
      userId: secureLogUtils.maskUserId(userId),
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    })
    throw error
  }
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
