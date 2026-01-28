import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('BROWSER_SUPABASE_ENV_MISSING: Variáveis de ambiente do Supabase não encontradas.')
    return {
      auth: {
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        getUser: async () => ({ data: { user: null }, error: null }),
        signInWithPassword: async () => ({ error: new Error('Supabase no configurado') }),
        resetPasswordForEmail: async () => ({ error: new Error('Supabase no configurado') }),
        updateUser: async () => ({ error: new Error('Supabase no configurado') }),
      },
      from: () => ({
        select: () => ({
          order: () => ({
            eq: () => ({
              then: (cb: any) => cb({ data: [], error: null })
            }),
            then: (cb: any) => cb({ data: [], error: null })
          }),
          then: (cb: any) => cb({ data: [], error: null })
        }),
      })
    } as any
  }

  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  )
}
