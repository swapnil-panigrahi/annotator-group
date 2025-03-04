import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { session }, error } = await supabase.auth.getSession()
  const pathname = request.nextUrl.pathname

  // Log authentication attempts
  console.log(`Auth check for ${pathname}:`, session ? 'Authenticated' : 'Not authenticated')

  // Protect routes that require authentication
  if (pathname.startsWith('/annotate') || pathname.startsWith('/api/')) {
    if (error) {
      console.error('Auth error:', error)
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Authentication error' },
          { status: 401 }
        )
      } else {
        const redirectUrl = new URL('/login', request.url)
        return NextResponse.redirect(redirectUrl)
      }
    }

    if (!session) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      } else {
        const redirectUrl = new URL('/login', request.url)
        return NextResponse.redirect(redirectUrl)
      }
    }
  }

  // Add user ID to headers if session exists
  if (session?.user) {
    response.headers.set('x-user-id', session.user.id)
  }

  return response
}

export const config = {
  matcher: [
    '/annotate/:path*',
    '/api/:path*'
  ],
} 