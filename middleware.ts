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

// Specific permission required to access each route prefix.
// Routes not listed here (e.g. /admin) require auth only.
const ROUTE_PERMISSIONS: Record<string, string> = {
  '/contratos':         'can_view_contracts',
  '/clientes':          'can_view_clients',
  '/solicitudes':       'can_submit_proposals',
  '/conversaciones':    'can_view_linkedin',
  '/linkedin-pipeline': 'can_view_linkedin',
  '/usuarios':          'is_admin',
}

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

    const { data: { user } } = await supabase.auth.getUser()
    const path = request.nextUrl.pathname
    const isInternal = INTERNAL_PREFIXES.some((prefix) => path.startsWith(prefix))

    if (isInternal && !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (user && isInternal) {
      const requiredPermission = Object.entries(ROUTE_PERMISSIONS).find(
        ([prefix]) => path.startsWith(prefix),
      )?.[1]

      if (requiredPermission) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        const p = profile as Record<string, unknown> | null
        const hasAccess =
          p?.['is_admin'] === true ||
          !!p?.[requiredPermission]

        if (!hasAccess) {
          return NextResponse.redirect(new URL('/admin', request.url))
        }
      }
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
