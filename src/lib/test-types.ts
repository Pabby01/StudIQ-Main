import { Database } from './database.types'

// Simple test to check if types are working
type TestUserProfile = Database['public']['Tables']['user_profiles']['Row']
type TestUserProfileInsert = Database['public']['Tables']['user_profiles']['Insert']

const testProfile: TestUserProfileInsert = {
  user_id: 'test-user-id',
  display_name: 'Test User'
}

console.log('Type test passed:', testProfile)