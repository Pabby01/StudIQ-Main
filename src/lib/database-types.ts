export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string;
  email?: string | null;
  phone?: string | null;
  wallet_address?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  university?: string | null;
  major?: string | null;
  graduation_year?: number | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfileInsert {
  user_id: string;
  display_name?: string;
  email?: string | null;
  phone?: string | null;
  wallet_address?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  university?: string | null;
  major?: string | null;
  graduation_year?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface UserStats {
  user_id: string;
  total_points: number;
  level: number;
  streak_days: number;
  completed_lessons: number;
  portfolio_value: number;
  total_cashback: number;
  last_activity: string;
}

export interface UserStatsInsert extends Partial<UserStats> {
  user_id: string;
}

export interface UserPreferences {
  user_id: string;
  theme?: string | null;
  notifications_enabled?: boolean | null;
  language?: string | null;
}

export interface UserPreferencesInsert extends Partial<UserPreferences> {
  user_id: string;
}

