import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isDeptReviewOfficer, isManagerUser } from '@/lib/auth'
import { isUserApprovedForAppAccess } from '@/lib/accountApproval'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })
  let lockResponseToRedirect = false

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
          if (!lockResponseToRedirect) {
            supabaseResponse = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
          }
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard')
  const isManagerRoute = request.nextUrl.pathname.startsWith('/manager')
  const isHqRoute = request.nextUrl.pathname.startsWith('/hq')
  const isLegacyDeptReviewRoute = request.nextUrl.pathname.startsWith('/manager/dept-review')
  const isAppShell = isDashboardRoute || isManagerRoute || isHqRoute

  if (!user && isAppShell) {
    const loginUrl = new URL('/', request.url)
    return NextResponse.redirect(loginUrl)
  }

  if (user && isAppShell && !isUserApprovedForAppAccess(user)) {
    lockResponseToRedirect = true
    supabaseResponse = NextResponse.redirect(new URL('/?pending=1', request.url))
    await supabase.auth.signOut()
    return supabaseResponse
  }

  if (user && isManagerRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, department, is_tech_admin')
      .eq('id', user.id)
      .single()

    if (!isManagerUser(user, profile)) {
      const dashboardUrl = new URL('/dashboard', request.url)
      return NextResponse.redirect(dashboardUrl)
    }
  }

  if (user && isLegacyDeptReviewRoute) {
    const nextPath = request.nextUrl.pathname.replace('/manager/dept-review', '/hq/dept-review')
    const target = new URL(`${nextPath}${request.nextUrl.search}`, request.url)
    return NextResponse.redirect(target)
  }

  if (user && isHqRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, department, is_tech_admin')
      .eq('id', user.id)
      .single()

    if (!isDeptReviewOfficer(user, profile)) {
      const dashboardUrl = new URL('/dashboard', request.url)
      return NextResponse.redirect(dashboardUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/manager/:path*', '/hq/:path*'],
}
