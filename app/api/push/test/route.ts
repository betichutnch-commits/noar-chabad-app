import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { isTechAdminUser } from '@/lib/auth'
import type { User } from '@supabase/supabase-js'
import { createSupabaseServiceRoleClient } from '@/lib/supabaseService'
import { sendPushToUserDetailed } from '@/lib/notifications/push'
import { resolveRecipientUserIds } from '@/lib/notifications/recipients'
import type { NotificationKind } from '@/lib/notifications/types'

type Body = {
  target?: 'self' | 'safety_admins' | 'tech_admins' | 'dept_trips_officers' | 'all_managers'
  kind?: NotificationKind
  title?: string
  message?: string
  url?: string
}

const ALLOWED_KINDS: NotificationKind[] = [
  'trip.submitted_dept_review',
  'trip.submitted_safety',
  'trip.dept_forwarded_safety',
  'trip.dept_review_coordinator',
  'trip.safety_status',
  'trip.cancelled',
  'contact.new',
  'contact.reply',
  'user.registration_pending',
  'user.status_changed',
  'user.role_changed',
  'trip.secondary_staff',
]

export async function POST(request: Request) {
  const hasVapidPublic = Boolean(process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
  const hasVapidPrivate = Boolean(process.env.VAPID_PRIVATE_KEY)
  if (!hasVapidPublic || !hasVapidPrivate) {
    return NextResponse.json(
      {
        error:
          'VAPID לא מוגדר בשרת. נדרש VAPID_PUBLIC_KEY/NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY.',
      },
      { status: 503 },
    )
  }

  const body = (await request.json().catch(() => ({}))) as Body

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
  if (!isTechAdminUser(userLike, profile)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createSupabaseServiceRoleClient()
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 503 })
  }

  const kind = ALLOWED_KINDS.includes(body.kind as NotificationKind)
    ? (body.kind as NotificationKind)
    : 'contact.new'
  const title = String(body.title || 'טסט התראות Push').trim()
  const message = String(body.message || 'אם ראית את זה — הפוש עובד.').trim()
  const url = String(body.url || '/manager/profile').trim() || '/manager/profile'
  const target = body.target || 'self'

  let recipientIds: string[] = [user.id]
  if (target === 'safety_admins') {
    recipientIds = await resolveRecipientUserIds(admin, { mode: 'safety_admins' })
  } else if (target === 'tech_admins') {
    recipientIds = await resolveRecipientUserIds(admin, { mode: 'tech_admins' })
  } else if (target === 'dept_trips_officers') {
    recipientIds = await resolveRecipientUserIds(admin, {
      mode: 'dept_trips_officers',
      department: profile?.department || user.user_metadata?.department || null,
      orFallbackSafetyAdmins: false,
    })
  } else if (target === 'all_managers') {
    const [safety, tech] = await Promise.all([
      resolveRecipientUserIds(admin, { mode: 'safety_admins' }),
      resolveRecipientUserIds(admin, { mode: 'tech_admins' }),
    ])
    recipientIds = Array.from(new Set([...safety, ...tech]))
  }

  if (!recipientIds.length) {
    return NextResponse.json({
      ok: false,
      message: 'no_recipients',
      hint: 'לא נמצאו נמענים ליעד שנבחר.',
      target,
      totalRecipients: 0,
      sentCount: 0,
    })
  }

  let sentCount = 0
  let totalSubscriptions = 0
  let removedSubscriptions = 0
  const debugErrors: Array<{ statusCode: number; message: string; recipientId: string }> = []
  for (const recipientId of recipientIds) {
    const result = await sendPushToUserDetailed(admin, recipientId, {
      kind,
      title,
      body: message,
      url,
      inAppType: 'info',
    })
    if (result.ok) sentCount += 1
    totalSubscriptions += result.totalSubscriptions
    removedSubscriptions += result.removedSubscriptions
    for (const err of result.errors) debugErrors.push({ ...err, recipientId })
  }

  const ok = sentCount > 0
  return NextResponse.json({
    ok,
    message: ok ? 'sent' : 'send_failed_or_no_subscriptions',
    target,
    totalRecipients: recipientIds.length,
    sentCount,
    totalSubscriptions,
    removedSubscriptions,
    firstError: debugErrors[0] || null,
    hint: ok
      ? undefined
      : 'אם יש subscriptions ועדיין נכשל — בדוק VAPID (public+private תואמים, בלי גרשיים) ו־VAPID_SUBJECT תקין (email או mailto:email).',
  })
}
