import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. הכנת התגובה הראשונית
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. יצירת הלקוח של סופאבייס שמותאם לשרת
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 3. בדיקה האם המשתמש מחובר
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 4. הגנה על נתיבים: אם לא מחובר ומנסה להיכנס למערכת -> זרוק לדף הבית
  if (!user && (request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/manager'))) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  // על אילו נתיבים הקובץ הזה משפיע
  matcher: ['/dashboard/:path*', '/manager/:path*'],
}