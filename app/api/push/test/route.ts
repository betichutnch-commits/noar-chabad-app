import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { isManagerUser } from '@/lib/auth'
import type { User } from '@supabase/supabase-js'
import { createSupabaseServiceRoleClient } from '@/lib/supabaseService'
import { sendWebPushToUser } from '@/lib/notifications/push'

export async function POST() {
  const hasVapidPublic = Boolean(process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
  const hasVapidPrivate = Boolean(process.env.VAPID_PRIVATE_KEY)
  if (!hasVapidPublic || !hasVapidPrivate) {
    return NextResponse.json(
      {
        error:
          'VAPID לא מוגדר בוורסל. נדרש VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY (וגם NEXT_PUBLIC_VAPID_PUBLIC_KEY מומלץ).',
      },
      { status: 503 },
    )
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, department, is_tech_admin')
    .eq('id', user.id)
    .single()

  const userLike = { id: user.id, user_metadata: user.user_metadata ?? {} } as User
  if (!isManagerUser(userLike, profile)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createSupabaseServiceRoleClient()
  if (!admin) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY not configured' },
      { status: 503 },
    )
  }

  const ok = await sendWebPushToUser(admin, user.id, {
    kind: 'contact.new',
    title: 'טסט התראות Push',
    body: 'אם ראית את זה — הפוש עובד.',
    url: '/manager/profile',
    inAppType: 'info',
  })

  return NextResponse.json({
    ok,
    message: ok ? 'sent' : 'send_failed_or_no_subscriptions',
    hint:
      ok
        ? undefined
        : 'אם יש subscriptions ועדיין נכשל — בדוק שה-VAPID בוורסל תואם למפתח הציבורי שבו נרשמת (צריך רישום מחדש אחרי החלפת VAPID).',
  })
}
