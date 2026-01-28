import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

export const createClient = async () => {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('SERVER_SUPABASE_ENV_MISSING: Variáveis de ambiente do Supabase não encontradas.')
    // Durante a build ou se faltarem as chaves, retornamos um objeto que não crasha ao ser usado
    // mas que avisa quando os métodos são chamados.
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signOut: async () => ({ error: null }),
      },
      from: () => ({
        select: () => ({
          order: () => ({
            eq: () => ({
              neq: () => ({
                lt: () => ({
                  contains: () => Promise.resolve({ data: [], error: null })
                })
              })
            }),
            then: (cb: any) => cb({ data: [], error: null })
          }),
          then: (cb: any) => cb({ data: [], error: null })
        }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => Promise.resolve({ data: null, error: null }),
        delete: () => Promise.resolve({ data: null, error: null }),
      })
    } as any
  }

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component pode não conseguir set cookies
          }
        },
      },
    }
  )
}
