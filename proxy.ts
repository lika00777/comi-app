import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function updateSession(request: NextRequest) {
  try {
    let supabaseResponse = NextResponse.next({
      request,
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Se as variáveis de ambiente não estiverem definidas, não crashar o proxy
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('SUPABASE_ENV_MISSING: NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY não definidas')
      return supabaseResponse
    }

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            // Tentar atualizar o request, mas não crashar se falhar (algumas versões do edge runtime são read-only)
            try {
              cookiesToSet.forEach(({ name, value }) =>
                request.cookies.set(name, value)
              )
            } catch (e) {
              // Silencioso: o request pode ser read-only
            }

            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Importante: não remover - necessário para atualizar cookies
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Proteger rotas do dashboard
    if (
      !user &&
      !request.nextUrl.pathname.startsWith('/entrar') &&
      !request.nextUrl.pathname.startsWith('/registar') &&
      request.nextUrl.pathname !== '/'
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/entrar'
      const response = NextResponse.redirect(url)
      // Copiar cookies da supabaseResponse para o redirect
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        response.cookies.set(cookie.name, cookie.value)
      })
      return response
    }

    // Redirecionar para dashboard se já autenticado
    if (
      user &&
      (request.nextUrl.pathname === '/entrar' ||
        request.nextUrl.pathname === '/registar' ||
        request.nextUrl.pathname === '/')
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      const response = NextResponse.redirect(url)
      // Copiar cookies da supabaseResponse para o redirect
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        response.cookies.set(cookie.name, cookie.value)
      })
      return response
    }

    return supabaseResponse
  } catch (e) {
    console.error('PROXY_RUNTIME_ERROR:', e)
    // Em caso de erro crítico no proxy, deixar passar para não bloquear o utilizador
    return NextResponse.next({
      request,
    })
  }
}

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
