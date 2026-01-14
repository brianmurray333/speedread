import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

/**
 * Get the Supabase client with lazy initialization.
 * Use this instead of a module-level client to avoid build-time errors
 * when environment variables are not available.
 */
export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
  }
  return supabaseInstance
}

export type Document = {
  id: string
  title: string
  file_path: string
  text_content: string
  word_count: number
  is_public: boolean
  price_sats: number // 0 = free, >0 = paid (L402)
  lightning_address: string | null // Creator's Lightning Address for payments
  creator_name: string | null // Optional display name
  created_at: string
  updated_at: string
}
