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

  // --- CHANGE STARTS HERE ---
  // Use supabase.auth.getUser() instead of getSession() for more secure authentication
  const { data: { user }, error } = await supabase.auth.getUser(); // Directly get the user object
  // --- CHANGE ENDS HERE ---

  const pathname = request.nextUrl.pathname

  // Log authentication attempts
  // Check 'user' directly for authentication status
  console.log(`Auth check for ${pathname}:`, user ? 'Authenticated' : 'Not authenticated')

  // Protect routes that require authentication
  if (pathname.startsWith('/ranking') || pathname.startsWith('/api/')) {
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

    // Check 'user' directly to see if they are logged in
    if (!user) { // 'session' is replaced by 'user'
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

  // Add user ID to headers if user exists
  if (user) { // Use 'user' instead of 'session?.user'
    response.headers.set('x-user-id', user.id)
  }

  return response
}

export const config = {
  matcher: [
    '/ranking/:path*',
    '/api/:path*'
  ],
}