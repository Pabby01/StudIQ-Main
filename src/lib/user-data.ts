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
}

// Local storage keys
const USER_PROFILE_KEY = 'studiq_user_profile';
const USER_STATS_KEY = 'studiq_user_stats';

// User Profile Management
export const userProfileManager = {
  // Get user profile from localStorage
  getProfile: (walletAddress: string): UserProfile | null => {
    try {
      const stored = localStorage.getItem(`${USER_PROFILE_KEY}_${walletAddress}`);
      if (stored) {
        const profile = JSON.parse(stored);
        return {
          ...profile,
          createdAt: new Date(profile.createdAt),
          updatedAt: new Date(profile.updatedAt),
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  },

  // Save user profile to localStorage
  saveProfile: (profile: UserProfile): void => {
    try {
      const profileToSave = {
        ...profile,
        updatedAt: new Date(),
      };
      localStorage.setItem(
        `${USER_PROFILE_KEY}_${profile.walletAddress}`,
        JSON.stringify(profileToSave)
      );
    } catch (error) {
      console.error('Error saving user profile:', error);
    }
  },

  // Create new user profile
  createProfile: (walletAddress: string, displayName: string, email?: string, phone?: string): UserProfile => {
    const profile: UserProfile = {
      id: `user_${Date.now()}`,
      walletAddress,
      displayName,
      email,
      phone,
      createdAt: new Date(),
      updatedAt: new Date(),
      preferences: {
        theme: 'light',
        notifications: true,
        language: 'en',
      },
    };
    
    userProfileManager.saveProfile(profile);
    return profile;
  },

  // Update user profile
  updateProfile: (walletAddress: string, updates: Partial<UserProfile>): UserProfile | null => {
    const existingProfile = userProfileManager.getProfile(walletAddress);
    if (!existingProfile) return null;

    const updatedProfile = {
      ...existingProfile,
      ...updates,
      updatedAt: new Date(),
    };

    userProfileManager.saveProfile(updatedProfile);
    return updatedProfile;
  },

  // Delete user profile
  deleteProfile: (walletAddress: string): void => {
    try {
      localStorage.removeItem(`${USER_PROFILE_KEY}_${walletAddress}`);
      localStorage.removeItem(`${USER_STATS_KEY}_${walletAddress}`);
    } catch (error) {
      console.error('Error deleting user profile:', error);
    }
  },
};

// User Stats Management
export const userStatsManager = {
  // Get user stats from localStorage
  getStats: (walletAddress: string): UserStats | null => {
    try {
      const stored = localStorage.getItem(`${USER_STATS_KEY}_${walletAddress}`);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error getting user stats:', error);
      return null;
    }
  },

  // Save user stats to localStorage
  saveStats: (walletAddress: string, stats: UserStats): void => {
    try {
      localStorage.setItem(`${USER_STATS_KEY}_${walletAddress}`, JSON.stringify(stats));
    } catch (error) {
      console.error('Error saving user stats:', error);
    }
  },

  // Initialize default stats for new user
  initializeStats: (walletAddress: string): UserStats => {
    const defaultStats: UserStats = {
      totalPoints: 0,
      totalCashback: 0,
      level: 'Bronze',
      nextLevelPoints: 500,
      completedLessons: 0,
      portfolioValue: 0,
    };

    userStatsManager.saveStats(walletAddress, defaultStats);
    return defaultStats;
  },

  // Update user stats
  updateStats: (walletAddress: string, updates: Partial<UserStats>): UserStats | null => {
    const existingStats = userStatsManager.getStats(walletAddress) || userStatsManager.initializeStats(walletAddress);
    
    const updatedStats = {
      ...existingStats,
      ...updates,
    };

    userStatsManager.saveStats(walletAddress, updatedStats);
    return updatedStats;
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