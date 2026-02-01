import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // יצירת תגובה ראשונית שתאפשר לנו לעדכן עוגיות
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
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // עדכון העוגיות גם בבקשה (כדי ש-getUser יעבוד עכשיו) וגם בתגובה (כדי שישמרו בדפדפן)
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

  // שימוש ב-getUser הבטוח כדי לוודא שהמשתמש באמת קיים בבסיס הנתונים
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // הגנה על נתיבים
  if (!user && (request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/manager'))) {
    // אם המשתמש לא מחובר ומנסה להיכנס - זרוק אותו לדף הבית
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/manager/:path*'],
}