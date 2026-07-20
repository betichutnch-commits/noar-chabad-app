import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { isManagerUser } from '@/lib/auth'
import type { User } from '@supabase/supabase-js'
import { notifyUserIds } from '@/lib/notifications'
import { createSupabaseServiceRoleClient } from '@/lib/supabaseService'
import {
  ensureDefaultHqRoles,
  formatHqRolesLabel,
  hqRolesIncludeBranchOfficer,
  normalizeHqRoles,
} from '@/lib/hqRoles'

type RouteContext = { params: Promise<{ id: string }> }
type Body = { new_role?: string; can_dept_review?: boolean; hq_roles?: unknown }

const ALLOWED = new Set(['coordinator', 'dept_staff', 'safety_admin', 'secretary', 'user'])

export async function POST(request: Request, { params }: RouteContext) {
  const { id: targetUserId } = await params
  const body = (await request.json()) as Body
  const newRole = String(body?.new_role || '').trim().toLowerCase()
  const canDeptReview = typeof body?.can_dept_review === 'boolean' ? body.can_dept_review : undefined
  const hqRolesInput = body.hq_roles !== undefined ? normalizeHqRoles(body.hq_roles) : undefined
  if (!targetUserId || !ALLOWED.has(newRole)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
  if (newRole === 'dept_staff' && hqRolesInput !== undefined && hqRolesInput.length === 0) {
    return NextResponse.json({ error: 'יש לבחור לפחות תפקיד מטה אחד' }, { status: 400 })
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

  const admin = createSupabaseServiceRoleClient()
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 503 })
  }

  const { data: authData, error: authErr } = await admin.auth.admin.getUserById(targetUserId)
  if (authErr || !authData?.user) {
    return NextResponse.json({ error: authErr?.message || 'User metadata fetch failed' }, { status: 400 })
  }

  const currentMeta = (authData.user.user_metadata || {}) as Record<string, unknown>
  const department = String(currentMeta.department || '')

  let nextHqRoles = newRole === 'dept_staff' ? ensureDefaultHqRoles(hqRolesInput ?? normalizeHqRoles(currentMeta.hq_roles)) : []
  if (newRole === 'dept_staff' && hqRolesInput === undefined && canDeptReview !== undefined) {
    nextHqRoles = canDeptReview ? ensureDefaultHqRoles(['branch_officer']) : ensureDefaultHqRoles(['dept_member'])
  }
  const nextCanDeptReview = newRole === 'dept_staff' ? hqRolesIncludeBranchOfficer(nextHqRoles) : false

  const { error: updateErr } = await admin.auth.admin.updateUserById(targetUserId, {
    user_metadata: {
      ...currentMeta,
      role: newRole,
      can_dept_review: nextCanDeptReview,
      hq_roles: nextHqRoles,
    },
  })
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 400 })
  }

  await admin
    .from('profiles')
    .update({
      hq_roles: nextHqRoles,
    })
    .eq('id', targetUserId)

  const roleBody =
    newRole === 'dept_staff'
      ? formatHqRolesLabel(nextHqRoles, department)
      : newRole

  await notifyUserIds(
    [targetUserId],
    {
      kind: 'user.role_changed',
      title: 'עודכן התפקיד במערכת',
      body: `התפקיד שלך עודכן ל: ${roleBody}.`,
      url: '/dashboard/profile',
      inAppType: 'info',
    },
  )

  return NextResponse.json({
    ok: true,
    role: newRole,
    hq_roles: nextHqRoles,
    can_dept_review: nextCanDeptReview,
  })
}
