import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { isManagerUser } from '@/lib/auth'
import type { User } from '@supabase/supabase-js'
import { notifyUserIds } from '@/lib/notifications'

type RouteContext = { params: Promise<unknown> }
type StaffBody = { name: string; idNumber: string; phone: string; email: string; role: string }

const canManageTrip = async (
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  tripId: string
) => {
  const [{ data: trip }, { data: profile }] = await Promise.all([
    supabase.from('trips').select('id, user_id, details').eq('id', tripId).single(),
    supabase.from('profiles').select('role, department, is_tech_admin').eq('id', userId).single(),
  ])

  const userLike = { id: userId, user_metadata: {} } as User
  return { trip, isManager: isManagerUser(userLike, profile) }
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = (await params) as { id: string }
  const body = (await request.json()) as StaffBody

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { trip, isManager } = await canManageTrip(supabase, user.id, id)
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
  if (!isManager) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: existingUser } = await supabase
    .from('profiles')
    .select('id, official_name, last_name')
    .eq('identity_number', body.idNumber)
    .single()

  if (!existingUser) {
    return NextResponse.json({ error: 'Staff user not found' }, { status: 404 })
  }

  const details = (trip.details as Record<string, unknown>) || {}
  const updatedDetails = {
    ...details,
    secondaryStaffObj: {
      ...body,
      userId: existingUser.id,
      verifiedName: `${existingUser.official_name} ${existingUser.last_name}`,
    },
  }

  const { error } = await supabase.from('trips').update({ details: updatedDetails }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await notifyUserIds([existingUser.id], {
    kind: 'trip.secondary_staff',
    title: 'שיבוץ לטיול',
    body: 'שובצת לטיול חדש. היכנס/י לפרטים במערכת.',
    url: `/dashboard/trip/${id}`,
    inAppType: 'assignment',
  })

  return NextResponse.json({ ok: true, details: updatedDetails })
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = (await params) as { id: string }
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { trip, isManager } = await canManageTrip(supabase, user.id, id)
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
  if (!isManager) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const details = { ...((trip.details as Record<string, unknown>) || {}) }
  delete details.secondaryStaffObj

  const { error } = await supabase.from('trips').update({ details }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, details })
}
