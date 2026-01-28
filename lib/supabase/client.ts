import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Anon Key is missing')
    // Retornamos o cliente mesmo assim, o erro será apanhado na chamada
  }

  return createBrowserClient<Database>(
    supabaseUrl || '',
    supabaseAnonKey || ''
  )
}
