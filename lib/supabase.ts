import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Document = {
  id: string
  title: string
  file_path: string
  text_content: string
  word_count: number
  is_public: boolean
  created_at: string
  updated_at: string
}
