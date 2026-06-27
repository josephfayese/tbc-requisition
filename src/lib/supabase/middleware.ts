import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh the session — must await getUser to keep session alive
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Protect all dashboard routes (except viewer which has its own passcode gate)
  if (pathname.startsWith('/dashboard') && pathname !== '/dashboard/viewer') {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Force password change before accessing any dashboard screen
    if (pathname !== '/change-password') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('must_change_password')
        .eq('id', user.id)
        .single()

      if (profile?.must_change_password) {
        const url = request.nextUrl.clone()
        url.pathname = '/change-password'
        return NextResponse.redirect(url)
      }
    }
  }

  // Also protect /change-password — must be logged in
  if (pathname === '/change-password') {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  // Redirect logged-in users away from login/signup
  if ((pathname === '/login' || pathname === '/signup') && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
