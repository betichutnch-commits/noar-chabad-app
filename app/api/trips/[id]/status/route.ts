import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { isManagerUser } from '@/lib/auth'
import type { User } from '@supabase/supabase-js'
import { notifyUserIds, notifyUsers } from '@/lib/notifications'

type RouteContext = { params: Promise<unknown> }
type Body = { status: 'approved' | 'approved_for_execution' | 'rejected' }

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = (await params) as { id: string }
  const body = (await request.json()) as Body

  if (
    body.status !== 'approved' &&
    body.status !== 'approved_for_execution' &&
    body.status !== 'rejected'
  ) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
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

  const { data: trip } = await supabase
    .from('trips')
    .select('id, user_id, name, status, department')
    .eq('id', id)
    .single()
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })

  const canResolveFromPending = trip.status === 'pending'
  const canPromoteToExecution =
    trip.status === 'approved' && body.status === 'approved_for_execution'

  if (!canResolveFromPending && !canPromoteToExecution) {
    return NextResponse.json(
      {
        error:
          'Trip status cannot be changed to the requested value.',
      },
      { status: 409 },
    )
  }

  const { error } = await supabase.from('trips').update({ status: body.status }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const title =
    body.status === 'approved'
      ? 'הטיול אושר לפרסום ותכנון!'
      : body.status === 'approved_for_execution'
        ? 'הטיול אושר לביצוע!'
        : 'הטיול נדחה'
  const message =
    body.status === 'approved'
      ? `הטיול "${trip.name}" אושר לפרסום ותכנון.`
      : body.status === 'approved_for_execution'
        ? `הטיול "${trip.name}" אושר לביצוע.`
        : `הטיול "${trip.name}" נדחה. היכנס לפרטים לבירור.`

  await notifyUserIds([trip.user_id], {
    kind: 'trip.safety_status',
    title,
    body: message,
    url: `/dashboard/trip/${trip.id}`,
    inAppType: body.status === 'rejected' ? 'error' : 'success',
  })

  await notifyUsers(
    {
      mode: 'dept_trips_officers',
      department: trip.department as string | null,
      orFallbackSafetyAdmins: false,
    },
    {
      kind: 'trip.safety_status',
      title: 'עדכון ממחלקת הבטיחות',
      body: `הטיול "${trip.name}" עודכן: ${title}`,
      url: '/manager/dept-review',
      inAppType: 'info',
    },
  )

  return NextResponse.json({ ok: true })
}
