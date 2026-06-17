import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { isManagerUser } from '@/lib/auth'
import type { User } from '@supabase/supabase-js'
import { notifyUserIds } from '@/lib/notifications'
import { createSupabaseServiceRoleClient } from '@/lib/supabaseService'

type RouteContext = { params: Promise<{ id: string }> }
type Body = { new_status?: string; sync_role?: string; sync_can_dept_review?: boolean }

export async function POST(request: Request, { params }: RouteContext) {
  const { id: targetUserId } = await params
  const body = (await request.json()) as Body
  const newStatus = String(body?.new_status || '').trim()
  const syncRole = body.sync_role ? String(body.sync_role).trim().toLowerCase() : ''
  const syncCanDeptReview =
    typeof body?.sync_can_dept_review === 'boolean' ? body.sync_can_dept_review : undefined
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
    const allowed = new Set(['coordinator', 'dept_staff', 'safety_admin', 'user'])
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

  if (newStatus === 'approved' && syncCanDeptReview !== undefined) {
    const admin = createSupabaseServiceRoleClient()
    if (admin) {
      const { data: authData, error: authErr } = await admin.auth.admin.getUserById(targetUserId)
      if (!authErr && authData?.user) {
        const currentMeta = (authData.user.user_metadata || {}) as Record<string, unknown>
        const role = String(currentMeta.role || syncRole || '').toLowerCase()
        const { error: updateErr } = await admin.auth.admin.updateUserById(targetUserId, {
          user_metadata: {
            ...currentMeta,
            role: role || 'user',
            can_dept_review: role === 'dept_staff' ? syncCanDeptReview : false,
          },
        })
        if (updateErr) {
          console.warn('[users/status] sync can_dept_review failed', updateErr.message)
        }
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
