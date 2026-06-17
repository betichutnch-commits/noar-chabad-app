import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { isManagerUser } from '@/lib/auth'
import type { User } from '@supabase/supabase-js'
import { notifyUserIds } from '@/lib/notifications'
import { createSupabaseServiceRoleClient } from '@/lib/supabaseService'

type RouteContext = { params: Promise<{ id: string }> }
type Body = { new_role?: string; can_dept_review?: boolean }

const ALLOWED = new Set(['coordinator', 'dept_staff', 'safety_admin', 'secretary', 'user'])

export async function POST(request: Request, { params }: RouteContext) {
  const { id: targetUserId } = await params
  const body = (await request.json()) as Body
  const newRole = String(body?.new_role || '').trim().toLowerCase()
  const canDeptReview = typeof body?.can_dept_review === 'boolean' ? body.can_dept_review : undefined
  if (!targetUserId || !ALLOWED.has(newRole)) {
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

  const { error } = await supabase.rpc('update_user_role', {
    target_user_id: targetUserId,
    new_role: newRole,
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (canDeptReview !== undefined || newRole !== 'dept_staff') {
    const admin = createSupabaseServiceRoleClient()
    if (!admin) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 503 })
    }

    const { data: authData, error: authErr } = await admin.auth.admin.getUserById(targetUserId)
    if (authErr || !authData?.user) {
      return NextResponse.json({ error: authErr?.message || 'User metadata fetch failed' }, { status: 400 })
    }

    const currentMeta = (authData.user.user_metadata || {}) as Record<string, unknown>
    const nextCanDeptReview =
      newRole === 'dept_staff'
        ? canDeptReview ?? (currentMeta.can_dept_review === true || String(currentMeta.can_dept_review || '').toLowerCase() === 'true')
        : false
    const { error: updateErr } = await admin.auth.admin.updateUserById(targetUserId, {
      user_metadata: {
        ...currentMeta,
        role: newRole,
        can_dept_review: nextCanDeptReview,
      },
    })
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 })
    }
  }

  await notifyUserIds(
    [targetUserId],
    {
      kind: 'user.role_changed',
      title: 'עודכן התפקיד במערכת',
      body: `התפקיד שלך עודכן ל: ${newRole}${canDeptReview ? ' (עם הרשאת אישור ראשוני מחלקתי)' : ''}.`,
      url: '/dashboard/profile',
      inAppType: 'info',
    },
  )

  return NextResponse.json({ ok: true })
}
