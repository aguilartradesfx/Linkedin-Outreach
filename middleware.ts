import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

const INTERNAL_PREFIXES = [
  '/admin',
  '/contratos',
  '/clientes',
  '/linkedin-pipeline',
  '/solicitudes',
  '/conversaciones',
  '/usuarios',
]

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
    const isInternal = INTERNAL_PREFIXES.some((prefix) => path.startsWith(prefix))

    if (isInternal && !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  } catch {
    const path = request.nextUrl.pathname
    const isInternal = INTERNAL_PREFIXES.some((prefix) => path.startsWith(prefix))
    if (isInternal) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/contratos/:path*',
    '/clientes/:path*',
    '/linkedin-pipeline/:path*',
    '/solicitudes/:path*',
    '/conversaciones/:path*',
    '/usuarios/:path*',
  ],
}
