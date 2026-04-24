import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            response = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            )
          },
        },
      },
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const path = request.nextUrl.pathname
    const isInternalRoute =
      path.startsWith('/admin') ||
      path.startsWith('/contratos') ||
      path.startsWith('/clientes') ||
      path.startsWith('/linkedin-pipeline')

    if (isInternalRoute && !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  } catch {
    // If Supabase is unreachable, redirect to login for internal routes
    const path = request.nextUrl.pathname
    if (
      path.startsWith('/admin') ||
      path.startsWith('/contratos') ||
      path.startsWith('/clientes') ||
      path.startsWith('/linkedin-pipeline')
    ) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/contratos/:path*', '/clientes/:path*', '/linkedin-pipeline/:path*'],
}
