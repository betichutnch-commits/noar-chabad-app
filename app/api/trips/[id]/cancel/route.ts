import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { notifyUsers } from '@/lib/notifications'

type RouteContext = { params: Promise<unknown> }
type Body = { reason: string }

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = (await params) as { id: string }
  const body = (await request.json()) as Body
  if (!body?.reason || body.reason.trim().length < 5) {
    return NextResponse.json({ error: 'Invalid reason' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: trip, error: fetchError } = await supabase
    .from('trips')
    .select('id, user_id, details, name, department')
    .eq('id', id)
    .single()

  if (fetchError || !trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
  }
  if (trip.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const details = (trip.details as Record<string, unknown>) || {}
  const updatedDetails = { ...details, cancellationReason: body.reason }

  const { error } = await supabase
    .from('trips')
    .update({ status: 'cancelled', cancellation_reason: body.reason, details: updatedDetails })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const tripName = String(trip.name || 'טיול')
  const dept = trip.department as string | null | undefined

  await notifyUsers(
    { mode: 'safety_admins' },
    {
      kind: 'trip.cancelled',
      title: 'ביטול טיול על ידי רכז',
      body: `הטיול "${tripName}" בוטל על ידי המגיש. סיבה: ${body.reason.trim().slice(0, 200)}`,
      url: '/manager/approvals',
      inAppType: 'warning',
    },
  )

  await notifyUsers(
    {
      mode: 'dept_trips_officers',
      department: dept,
      orFallbackSafetyAdmins: false,
    },
    {
      kind: 'trip.cancelled',
      title: 'ביטול טיול',
      body: `הטיול "${tripName}" בוטל על ידי הרכז.`,
      url: '/manager/dept-review',
      inAppType: 'warning',
    },
  )

  return NextResponse.json({ ok: true, details: updatedDetails })
}
