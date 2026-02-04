import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. אתחול תגובה בסיסית - חובה כדי שנוכל לערוך עליה קוקיז בהמשך
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. יצירת קליינט Supabase לשרת
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // עדכון הקוקיז ב-Request (כדי שהמשך העיבוד יכיר את השינוי)
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          
          // יצירה מחדש של ה-Response עם הקוקיז המעודכנים
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          
          // עדכון הקוקיז ב-Response הסופי (לדפדפן)
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 3. אימות משתמש (getUser בטוח יותר מ-getSession ב-Middleware)
  // פונקציה זו גם מרעננת את הטוקן במידת הצורך
  const { data: { user } } = await supabase.auth.getUser()

  // 4. הגדרת נתיבים מוגנים
  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard');
  const isManagerRoute = request.nextUrl.pathname.startsWith('/manager');

  // 5. לוגיקת הפניה
  // אם מנסים לגשת לאזור מוגן ואין משתמש מחובר -> זרוק לדף הבית
  if (!user && (isDashboardRoute || isManagerRoute)) {
    const loginUrl = new URL('/', request.url);
    // אופציונלי: אפשר להוסיף פרמטר ?next=... כדי להחזיר אותו לדף שרצה
    return NextResponse.redirect(loginUrl);
  }

  // *הערה:* בדיקת הרשאות מתקדמת (האם הוא מנהל?) מתבצעת בתוך הדפים עצמם (manager/page.tsx)
  // או באמצעות Hook, כדי לחסוך קריאות מסד נתונים כבדות ב-Middleware.

  return response
}

export const config = {
  // המידלוור ירוץ רק בנתיבים האלו. 
  // זה יעיל מאוד ומונע ריצה מיותרת על קבצים סטטיים או דף הבית.
  matcher: [
    '/dashboard/:path*', 
    '/manager/:path*'
  ],
}