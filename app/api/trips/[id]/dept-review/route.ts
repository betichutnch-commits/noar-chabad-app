import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { isDeptReviewOfficer } from '@/lib/auth'
import type { User } from '@supabase/supabase-js'
import { notifyUserIds, notifyUsers } from '@/lib/notifications'

type RouteContext = { params: Promise<unknown> }

type DeptReviewAction = 'return' | 'forward'

interface DeptReviewBody {
  action: DeptReviewAction
  notes?: string
}

const NOTIFY_BY_ACTION: Record<DeptReviewAction, { title: string; message: (tripName: string) => string; type: string }> = {
  return: {
    title: 'הבקשה הוחזרה להערות',
    message: (name) => `אחראי המחלקה החזיר את הטיול "${name}" להערות. כנס/י לפרטים לעדכון הבקשה ושליחה מחדש.`,
    type: 'warning',
  },
  forward: {
    title: 'הבקשה הועברה למחלקת הבטיחות',
    message: (name) => `הטיול "${name}" עבר את שלב האישור הראשוני והועבר למחלקת הבטיחות לאישור סופי.`,
    type: 'success',
  },
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = (await params) as { id: string }
  const body = (await request.json()) as DeptReviewBody

  if (!body || !['return', 'forward'].includes(body.action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  if (body.action === 'return' && !body.notes?.trim()) {
    return NextResponse.json(
      { error: 'יש לציין הערות עבור החזרה לרכז.' },
      { status: 400 },
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
  if (!isDeptReviewOfficer(userLike, profile)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: trip } = await supabase
    .from('trips')
    .select('id, user_id, name, status, department')
    .eq('id', id)
    .single()
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })

  if (
    String(profile?.department || '').trim() !== String(trip.department || '').trim()
  ) {
    return NextResponse.json(
      { error: 'הטיול שייך למחלקה אחרת.' },
      { status: 403 },
    )
  }

  if (trip.status !== 'pending_dept_review') {
    return NextResponse.json(
      { error: 'הטיול אינו ממתין לאישור ראשוני כרגע.' },
      { status: 409 },
    )
  }

  const now = new Date().toISOString()
  const updatePayload: Record<string, unknown> = {
    dept_reviewed_by: user.id,
    dept_reviewed_at: now,
    dept_review_notes: body.notes?.trim() || null,
  }

  switch (body.action) {
    case 'return':
      updatePayload.status = 'returned_for_changes'
      break
    case 'forward':
      updatePayload.status = 'pending'
      updatePayload.dept_forwarded_at = now
      break
  }

  const { error } = await supabase.from('trips').update(updatePayload).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const notify = NOTIFY_BY_ACTION[body.action]
  const tripName = String(trip.name || '')
  await notifyUserIds([trip.user_id], {
    kind: 'trip.dept_review_coordinator',
    title: notify.title,
    body: notify.message(tripName),
    url: `/dashboard/trip/${trip.id}`,
    inAppType: notify.type,
  })

  if (body.action === 'forward') {
    await notifyUsers(
      { mode: 'safety_admins' },
      {
        kind: 'trip.dept_forwarded_safety',
        title: 'טיול הועבר לאישור בטיחות',
        body: `הטיול "${tripName}" הועבר ממחלקתך למחלקת הבטיחות לאישור סופי.`,
        url: `/manager/approvals/${trip.id}`,
        inAppType: 'info',
      },
    )
  }

  return NextResponse.json({ ok: true })
}
