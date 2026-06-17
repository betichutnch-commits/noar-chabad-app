import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { createSupabaseServiceRoleClient } from '@/lib/supabaseService'
import { isManagerUser } from '@/lib/auth'
import type { User } from '@supabase/supabase-js'
import { notifyUserIds } from '@/lib/notifications'

type RouteContext = { params: Promise<{ id: string }> }
type Body = { assignee_id?: string | null }

const ASSIGNABLE_STATUSES = new Set(['pending', 'approved', 'approved_for_execution'])

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params
  const body = (await request.json().catch(() => ({}))) as Body
  const nextAssigneeId = body.assignee_id ? String(body.assignee_id).trim() : null

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'אין הרשאת גישה' }, { status: 401 })

  const { data: actorProfile } = await supabase
    .from('profiles')
    .select('id, full_name, role, department, is_tech_admin')
    .eq('id', user.id)
    .single()

  const userLike = { id: user.id, user_metadata: user.user_metadata ?? {} } as User
  if (!isManagerUser(userLike, actorProfile)) {
    return NextResponse.json({ error: 'אין הרשאה לביצוע פעולה זו' }, { status: 403 })
  }

  const admin = createSupabaseServiceRoleClient()
  if (!admin) {
    return NextResponse.json({ error: 'המערכת אינה מוגדרת לשיוך כרגע (Service Role חסר)' }, { status: 503 })
  }

  const { data: trip } = await admin
    .from('trips')
    .select('id, name, status, safety_assignee_id')
    .eq('id', id)
    .single()
  if (!trip) return NextResponse.json({ error: 'הטיול לא נמצא' }, { status: 404 })

  if (!ASSIGNABLE_STATUSES.has(String(trip.status || '').toLowerCase())) {
    return NextResponse.json({ error: 'לא ניתן לשייך טיול בסטטוס הנוכחי' }, { status: 409 })
  }

  let assigneeInfo: { id: string; full_name: string | null; role: string | null } | null = null
  if (nextAssigneeId) {
    const { data: target } = await admin
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', nextAssigneeId)
      .single()
    if (!target) {
      return NextResponse.json({ error: 'המשתמש שנבחר לשיוך לא נמצא' }, { status: 404 })
    }
    const role = String(target.role || '').toLowerCase()
    if (role !== 'safety_admin' && role !== 'admin') {
      return NextResponse.json({ error: 'ניתן לשייך רק לחבר צוות בטיחות/מנהל' }, { status: 400 })
    }
    assigneeInfo = target
  }

  const payload: Record<string, unknown> = {
    safety_assignee_id: nextAssigneeId,
    safety_assigned_by: user.id,
    safety_assigned_at: nextAssigneeId ? new Date().toISOString() : null,
  }
  const { error: updateError } = await admin.from('trips').update(payload).eq('id', id)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  await admin.from('trip_assignment_events').insert({
    trip_id: trip.id,
    assigned_by: user.id,
    assigned_to: nextAssigneeId,
    assigned_from: trip.safety_assignee_id || null,
  })

  if (nextAssigneeId) {
    const actorName = String(
      actorProfile?.full_name || user.user_metadata?.full_name || user.user_metadata?.official_name || 'חבר צוות',
    )
    await notifyUserIds([nextAssigneeId], {
      kind: 'trip.assigned_safety',
      title: 'טיול שויך לטיפולך',
      body: `${actorName} שייך אליך את הטיול "${trip.name}".`,
      url: `/manager/approvals/${trip.id}`,
      inAppType: 'assignment',
    })
  }

  return NextResponse.json({
    ok: true,
    assignee: assigneeInfo,
    safety_assignee_id: nextAssigneeId,
  })
}

