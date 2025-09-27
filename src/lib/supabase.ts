import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// Environment variables with proper client/server separation
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Client-side safe environment variables
const publicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const publicSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validation with helpful error messages
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration missing:', {
    supabaseUrl: !!supabaseUrl,
    supabaseAnonKey: !!supabaseAnonKey,
    publicUrl: !!publicSupabaseUrl,
    publicKey: !!publicSupabaseAnonKey
  })
  throw new Error(`Missing Supabase environment variables. Ensure .env.local contains:
    SUPABASE_URL and SUPABASE_KEY (server-side)
    NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (client-side)`)
}

// Create Supabase client for server-side operations
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Singleton instance for client-side operations
let clientInstance: ReturnType<typeof createClient<Database>> | null = null

// Create client-safe Supabase instance
export const createClientSupabase = () => {
  const clientUrl = publicSupabaseUrl || supabaseUrl
  const clientKey = publicSupabaseAnonKey || supabaseAnonKey

  if (!clientUrl || !clientKey) {
    throw new Error('Client-side Supabase configuration missing. Ensure NEXT_PUBLIC_* variables are set.')
  }

  return createClient<Database>(clientUrl, clientKey)
}

// Default client instance for client-side operations (singleton pattern)
export const supabaseClient = (() => {
  if (typeof window === 'undefined') {
    // Server-side: use the server instance
    return supabase
  }

  // Client-side: use singleton pattern to avoid multiple instances
  if (!clientInstance) {
    clientInstance = createClientSupabase()
  }
  return clientInstance
})()

// Session management helpers
export const setSessionContext = async (sessionId: string) => {
  const { error } = await supabase.rpc('set_session_context', { session_id: sessionId })
  if (error) {
    console.warn('Failed to set session context:', error.message)
  }
}

// Database type helpers
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Common table types
export type EnergyCertificate = Tables<'energy_certificates'>
export type MunicipalityPriceZone = Tables<'municipality_price_zones'>
export type ElectricityPrice = Tables<'electricity_prices_nve'>
export type UserSearch = Tables<'user_searches'>
export type AnalysisResult = Tables<'analysis_results'>
export type ConversionEvent = Tables<'conversion_events'>