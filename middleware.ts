import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: request.headers } })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // רק אם מישהו מנסה להיכנס לדשבורד ואין לו יוזר - תעיף אותו
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/', request.url))
  }
  
  if (!user && request.nextUrl.pathname.startsWith('/manager')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  // הקשחנו את המאצ'ר: ה-Middleware ירוץ *רק* על הנתיבים האלה ולא על דף הבית
  matcher: ['/dashboard/:path*', '/manager/:path*'],
}