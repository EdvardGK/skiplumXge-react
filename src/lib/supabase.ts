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

// Single unified client instance
let clientInstance: ReturnType<typeof createClient<Database>> | null = null

// Get or create Supabase client (singleton)
function getSupabaseClient() {
  if (clientInstance) {
    return clientInstance
  }

  // Determine which credentials to use
  const url = (typeof window !== 'undefined' ? publicSupabaseUrl : supabaseUrl) || supabaseUrl
  const key = (typeof window !== 'undefined' ? publicSupabaseAnonKey : supabaseAnonKey) || supabaseAnonKey

  if (!url || !key) {
    throw new Error('Supabase configuration missing')
  }

  // Create single instance with unique storage key
  clientInstance = createClient<Database>(url, key, {
    auth: {
      persistSession: typeof window !== 'undefined',
      storageKey: 'skiplum-energi-auth',
      autoRefreshToken: typeof window !== 'undefined',
      detectSessionInUrl: typeof window !== 'undefined',
    }
  })

  return clientInstance
}

// Export single client for both server and client use
export const supabase = getSupabaseClient()
export const supabaseClient = supabase

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