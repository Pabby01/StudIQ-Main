import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js'
import { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Regular client for authenticated operations
export const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Service role client for admin operations (bypasses RLS)
export const supabaseAdmin: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl, 
  supabaseServiceKey || supabaseAnonKey, // Fallback to anon key if service key not available
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Helper function to handle Supabase errors
export const handleSupabaseError = (error: PostgrestError | null, operation: string) => {
  console.error(`Supabase ${operation} error:`, error)
  
  if (error?.code === 'PGRST116') {
    throw new Error('No data found')
  }
  
  if (error?.code === '23505') {
    throw new Error('Data already exists')
  }
  
  if (error?.code === '42501') {
    throw new Error('Insufficient permissions')
  }
  
  if (error?.message) {
    throw new Error(error.message)
  }
  
  throw new Error(`Failed to ${operation}`)
}

// Type-safe query builder
export const createQuery = () => {
  return {
    from: <T extends keyof Database['public']['Tables']>(table: T) => {
      return supabase.from(table)
    }
  }
}

export default supabase