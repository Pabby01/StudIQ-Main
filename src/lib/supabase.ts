import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js'
import { Database } from './database.types'
import { secureLogger } from './secure-logger'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required')
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

// Lazy initialization of admin client to ensure it's only created on server-side
let _supabaseAdmin: SupabaseClient<Database> | null = null

// Service role client for admin operations (bypasses RLS)
export const getSupabaseAdmin = (): SupabaseClient<Database> => {
  // Check if we're on the server-side
  if (typeof window !== 'undefined') {
    throw new Error('supabaseAdmin can only be used on the server-side')
  }

  if (!_supabaseAdmin) {
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseServiceKey) {
      secureLogger.security('CRITICAL: SUPABASE_SERVICE_ROLE_KEY is not set!')
      secureLogger.security('This will cause RLS policy violations when creating user profiles.')
      secureLogger.security('Please add SUPABASE_SERVICE_ROLE_KEY to your .env.local file.')
      secureLogger.security('You can find this key in your Supabase dashboard under Settings > API')
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations. Please add it to your .env.local file.')
    }

    _supabaseAdmin = createClient<Database>(
      supabaseUrl, 
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  }

  return _supabaseAdmin
}

// For backward compatibility, export as supabaseAdmin but with a getter
export const supabaseAdmin = new Proxy({} as SupabaseClient<Database>, {
  get(target, prop) {
    return getSupabaseAdmin()[prop as keyof SupabaseClient<Database>]
  }
})

// Helper function to handle Supabase errors
export const handleSupabaseError = (error: PostgrestError | null, operation: string) => {
  secureLogger.error(`Supabase ${operation} error`, { error })
  
  if (error?.code === 'PGRST116') {
    throw new Error('No data found')
  }
  
  if (error?.code === '23505') {
    throw new Error('Data already exists')
  }
  
  if (error?.code === '42501') {
    secureLogger.security('RLS Policy Error - This indicates a Row Level Security policy is blocking the operation')
    secureLogger.security('Error details', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    })
    throw new Error(`Row Level Security policy violation: ${error.message}. This usually means the RLS policies need to be updated to allow service role access.`)
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
