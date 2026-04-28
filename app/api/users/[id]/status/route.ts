import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { isManagerUser } from '@/lib/auth'
import type { User } from '@supabase/supabase-js'
import { notifyUserIds } from '@/lib/notifications'

type RouteContext = { params: Promise<{ id: string }> }
type Body = { new_status?: string; sync_role?: string }

export async function POST(request: Request, { params }: RouteContext) {
  const { id: targetUserId } = await params
  const body = (await request.json()) as Body
  const newStatus = String(body?.new_status || '').trim()
  const syncRole = body.sync_role ? String(body.sync_role).trim().toLowerCase() : ''
  if (!targetUserId || !newStatus) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
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

  const { error } = await supabase.rpc('update_user_status', {
    user_id: targetUserId,
    new_status: newStatus,
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (newStatus === 'approved' && syncRole) {
    const allowed = new Set(['coordinator', 'dept_staff', 'dept_trips_officer', 'safety_admin', 'user'])
    if (allowed.has(syncRole)) {
      const { error: roleErr } = await supabase.rpc('update_user_role', {
        target_user_id: targetUserId,
        new_role: syncRole,
      })
      if (roleErr) {
        console.warn('[users/status] sync role failed', roleErr.message)
      }
    }
  }

  const label =
    newStatus === 'approved' ? 'החשבון אושר' : newStatus === 'pending' ? 'הסטטוס עודכן' : 'עדכון סטטוס חשבון'

  const bodyText =
    newStatus === 'approved'
      ? syncRole
        ? `החשבון אושר. התפקיד במערכת: ${syncRole}. ניתן להתחבר.`
        : 'החשבון אושר. ניתן להתחבר למערכת.'
      : `סטטוס החשבון עודכן ל: ${newStatus}.`

  await notifyUserIds(
    [targetUserId],
    {
      kind: 'user.status_changed',
      title: label,
      body: bodyText,
      url: '/dashboard',
      inAppType: newStatus === 'approved' ? 'success' : 'info',
    },
  )

  return NextResponse.json({ ok: true })
}
