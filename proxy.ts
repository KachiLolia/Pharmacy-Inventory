import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Mock routing logic if no Supabase credentials
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const mockRole = request.cookies.get('mock_role')?.value

    const isAuthPage = request.nextUrl.pathname.startsWith('/login')
    const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
    const isStaffRoute = request.nextUrl.pathname.startsWith('/staff')

    if (!mockRole && (isAdminRoute || isStaffRoute)) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (mockRole && isAuthPage) {
      return NextResponse.redirect(new URL(`/${mockRole}`, request.url))
    }

    if (mockRole === 'staff' && isAdminRoute) {
      return NextResponse.redirect(new URL('/staff', request.url))
    }

    if (mockRole === 'admin' && isStaffRoute) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    if (mockRole && request.nextUrl.pathname === '/') {
        return NextResponse.redirect(new URL(`/${mockRole}`, request.url))
    }

    return supabaseResponse
  }

  // --- Real Supabase Auth Logic ---
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  const isStaffRoute = request.nextUrl.pathname.startsWith('/staff')

  if (!user && (isAdminRoute || isStaffRoute)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user) {
    // Fetch role from app_users
    const { data: userData } = await supabase
      .from('app_users')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    const role = userData?.role

    if (!userData?.is_active && !isAuthPage) {
        // In a real middleware, you can't easily sign out. Better to redirect to an error page or login with error.
        return NextResponse.redirect(new URL('/login?error=account_inactive', request.url))
    }

    if (isAuthPage) {
      return NextResponse.redirect(new URL(`/${role || 'staff'}`, request.url))
    }

    if (role === 'staff' && isAdminRoute) {
      return NextResponse.redirect(new URL('/staff', request.url))
    }

    if (role === 'admin' && isStaffRoute) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    if (request.nextUrl.pathname === '/') {
        return NextResponse.redirect(new URL(`/${role || 'staff'}`, request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
