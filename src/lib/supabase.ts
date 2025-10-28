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
    throw new Error('Server-side operation not available')
  }

  if (!_supabaseAdmin) {
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseServiceKey) {
      secureLogger.error('CRITICAL: SUPABASE_SERVICE_ROLE_KEY environment variable is missing', {
        error: 'Missing required environment variable',
        variable: 'SUPABASE_SERVICE_ROLE_KEY',
        impact: 'Database writes will fail, new users cannot be created',
        solution: 'Set SUPABASE_SERVICE_ROLE_KEY in .env.local file'
      })
      throw new Error('CRITICAL: SUPABASE_SERVICE_ROLE_KEY environment variable is missing. New users cannot be created without this. Please set it in your .env.local file.')
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
    throw new Error('Access denied. Please contact support.')
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
