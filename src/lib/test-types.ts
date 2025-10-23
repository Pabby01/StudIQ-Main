/* eslint-disable @typescript-eslint/no-unused-vars */
import { Database } from './database.types'
// import { secureLogger } from './secure-logger' // Commented out to avoid unused import warning

// Simple test to check if types are working
type TestUserProfile = Database['public']['Tables']['user_profiles']['Row']
type TestUserProfileInsert = Database['public']['Tables']['user_profiles']['Insert']

// Commented out to avoid unused variable warnings
// const testProfile: TestUserProfileInsert = {
//   user_id: 'test-user-id',
//   display_name: 'Test User'
// }

// secureLogger.info('Type test passed', {
//   testProfile,
//   timestamp: new Date().toISOString()
// })