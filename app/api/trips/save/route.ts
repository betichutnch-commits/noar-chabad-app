import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { isManagerUser } from '@/lib/auth'
import type { User } from '@supabase/supabase-js'
import { notifyUsers } from '@/lib/notifications'

type SaveTripBody = {
  editId?: string | null
  status: 'pending' | 'draft'
  tripData: {
    coordinator_name: string
    branch?: string | null
    department?: string | null
    name: string
    start_date: string
    details: Record<string, unknown>
  }
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as SaveTripBody
  if (!body?.tripData || (body.status !== 'pending' && body.status !== 'draft')) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, department, is_tech_admin')
    .eq('id', user.id)
    .single()

  const userLike = { id: user.id, user_metadata: user.user_metadata ?? {} } as User
  const isManager = isManagerUser(userLike, profile)

  const submissionStatus =
    body.status === 'pending' && !isManager ? 'pending_dept_review' : body.status

  const departmentForTrip =
    body.tripData.department ?? (profile?.department ? String(profile.department) : null)

  const tripPayload = {
    user_id: user.id,
    coordinator_name: body.tripData.coordinator_name,
    branch: body.tripData.branch ?? null,
    department: departmentForTrip,
    name: body.tripData.name,
    start_date: body.tripData.start_date,
    status: submissionStatus,
    details: body.tripData.details,
  }

  const sendSubmitNotifications = async (tripId: string) => {
    if (body.status !== 'pending') return
    const tripName = String(body.tripData.name || 'טיול')
    const coord = String(body.tripData.coordinator_name || 'רכז')

    if (submissionStatus === 'pending_dept_review') {
      await notifyUsers(
        {
          mode: 'dept_trips_officers',
          department: departmentForTrip,
          orFallbackSafetyAdmins: true,
        },
        {
          kind: 'trip.submitted_dept_review',
          title: 'בקשת טיול חדשה לאישור ראשוני',
          body: `${coord} הגיש/ה את "${tripName}" לאישור במחלקה.`,
          url: `/hq/dept-review/${tripId}`,
          inAppType: 'info',
        },
      )
      return
    }

    if (submissionStatus === 'pending') {
      await notifyUsers(
        { mode: 'safety_admins' },
        {
          kind: 'trip.submitted_safety',
          title: 'בקשת טיול חדשה',
          body: `${coord} הגיש/ה את "${tripName}" למחלקת הבטיחות.`,
          url: `/manager/approvals/${tripId}`,
          inAppType: 'info',
        },
      )
    }
  }

  if (body.editId) {
    const { data: ownedTrip } = await supabase
      .from('trips')
      .select('id, user_id, status')
      .eq('id', body.editId)
      .single()

    if (!ownedTrip || ownedTrip.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updatePayload: Record<string, unknown> = { ...tripPayload }
    if (body.status === 'pending' && !isManager) {
      updatePayload.dept_review_notes = null
    }

    const { error } = await supabase.from('trips').update(updatePayload).eq('id', body.editId)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    await sendSubmitNotifications(body.editId)
    return NextResponse.json({ id: body.editId })
  }

  const { data, error } = await supabase.from('trips').insert([tripPayload]).select('id').single()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await sendSubmitNotifications(data.id)
  return NextResponse.json({ id: data.id })
}
